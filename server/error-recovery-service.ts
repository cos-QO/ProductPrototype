import { db } from './db';
import { 
  importHistory, 
  importSessions, 
  fieldMappingCache,
  type ImportHistory,
  type ImportSession
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Types for error handling
interface ValidationError {
  recordIndex: number;
  field: string;
  value: any;
  rule: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  autoFix?: {
    action: string;
    newValue: any;
    confidence: number; // 0-100
  };
}

interface ErrorPattern {
  pattern: string;
  description: string;
  detector: (error: ValidationError) => boolean;
  fixer: (error: ValidationError, record: any) => AutoFixResult;
}

interface AutoFixResult {
  canFix: boolean;
  fixedValue?: any;
  confidence: number; // 0-100
  explanation: string;
  requiresConfirmation: boolean;
}

interface ErrorRecoveryOptions {
  autoFixThreshold: number; // Minimum confidence to auto-fix (0-100)
  skipErrors: boolean;
  transformations: {
    enableDataCleaning: boolean;
    enableTypeConversion: boolean;
    enableFormatStandardization: boolean;
  };
}

interface RecoverySession {
  sessionId: string;
  errors: ValidationError[];
  fixes: Map<number, AutoFixResult>; // recordIndex -> fix
  options: ErrorRecoveryOptions;
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private errorPatterns: ErrorPattern[] = [];
  private activeSessions: Map<string, RecoverySession> = new Map();

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * Initialize common error patterns and their fixes
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      // Empty/null required fields
      {
        pattern: 'EMPTY_REQUIRED_FIELD',
        description: 'Required field is empty or null',
        detector: (error) => error.rule.includes('required') || error.rule.includes('missing'),
        fixer: (error, record) => {
          if (error.field === 'name' && record.title) {
            return {
              canFix: true,
              fixedValue: record.title,
              confidence: 85,
              explanation: 'Used title field as product name',
              requiresConfirmation: false
            };
          }
          if (error.field === 'slug' && record.name) {
            return {
              canFix: true,
              fixedValue: this.generateSlug(record.name),
              confidence: 90,
              explanation: 'Generated slug from product name',
              requiresConfirmation: false
            };
          }
          return {
            canFix: false,
            confidence: 0,
            explanation: 'No suitable alternative field found',
            requiresConfirmation: false
          };
        }
      },

      // Invalid numeric values
      {
        pattern: 'INVALID_NUMBER',
        description: 'Field contains invalid numeric value',
        detector: (error) => error.rule.includes('number') || error.rule.includes('price'),
        fixer: (error, record) => {
          const value = String(error.value);
          
          // Remove currency symbols and formatting
          const cleaned = value.replace(/[^\d.,\-]/g, '');
          const number = parseFloat(cleaned.replace(',', '.'));
          
          if (!isNaN(number) && number >= 0) {
            return {
              canFix: true,
              fixedValue: error.field === 'price' || error.field === 'compareAtPrice' 
                ? Math.round(number * 100) // Convert to cents
                : Math.round(number),
              confidence: 95,
              explanation: `Cleaned and converted "${value}" to ${number}`,
              requiresConfirmation: false
            };
          }
          
          // Try to extract first number from string
          const matches = value.match(/\d+(?:\.\d+)?/);
          if (matches) {
            const extracted = parseFloat(matches[0]);
            return {
              canFix: true,
              fixedValue: error.field === 'price' || error.field === 'compareAtPrice' 
                ? Math.round(extracted * 100)
                : Math.round(extracted),
              confidence: 70,
              explanation: `Extracted number ${extracted} from "${value}"`,
              requiresConfirmation: true
            };
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot extract valid number from value',
            requiresConfirmation: false
          };
        }
      },

      // Invalid boolean values
      {
        pattern: 'INVALID_BOOLEAN',
        description: 'Field contains invalid boolean value',
        detector: (error) => error.rule.includes('boolean'),
        fixer: (error, record) => {
          const value = String(error.value).toLowerCase().trim();
          
          const trueValues = ['true', '1', 'yes', 'y', 'on', 'enabled', 'active'];
          const falseValues = ['false', '0', 'no', 'n', 'off', 'disabled', 'inactive'];
          
          if (trueValues.includes(value)) {
            return {
              canFix: true,
              fixedValue: true,
              confidence: 100,
              explanation: `Converted "${error.value}" to true`,
              requiresConfirmation: false
            };
          }
          
          if (falseValues.includes(value)) {
            return {
              canFix: true,
              fixedValue: false,
              confidence: 100,
              explanation: `Converted "${error.value}" to false`,
              requiresConfirmation: false
            };
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot determine boolean value',
            requiresConfirmation: false
          };
        }
      },

      // Invalid SKU format
      {
        pattern: 'INVALID_SKU',
        description: 'SKU format is invalid or contains special characters',
        detector: (error) => error.field === 'sku' && error.rule.includes('format'),
        fixer: (error, record) => {
          const value = String(error.value);
          const cleaned = value.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
          
          if (cleaned.length >= 3) {
            return {
              canFix: true,
              fixedValue: cleaned,
              confidence: 90,
              explanation: `Cleaned SKU from "${value}" to "${cleaned}"`,
              requiresConfirmation: false
            };
          }
          
          // Generate SKU from product name if available
          if (record.name) {
            const generated = this.generateSKU(record.name);
            return {
              canFix: true,
              fixedValue: generated,
              confidence: 75,
              explanation: `Generated SKU "${generated}" from product name`,
              requiresConfirmation: true
            };
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot clean SKU or generate alternative',
            requiresConfirmation: false
          };
        }
      },

      // Invalid date format
      {
        pattern: 'INVALID_DATE',
        description: 'Date field contains invalid date format',
        detector: (error) => error.rule.includes('date') || error.field.includes('date'),
        fixer: (error, record) => {
          const value = String(error.value);
          
          // Try common date formats
          const dateFormats = [
            /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
            /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
            /^\d{2}-\d{2}-\d{4}$/,           // MM-DD-YYYY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/,     // M/D/YYYY
          ];
          
          let parsed: Date | null = null;
          
          // Try parsing with different formats
          try {
            parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
              return {
                canFix: true,
                fixedValue: parsed.toISOString().split('T')[0],
                confidence: 95,
                explanation: `Converted "${value}" to ${parsed.toISOString().split('T')[0]}`,
                requiresConfirmation: false
              };
            }
          } catch (e) {
            // Continue to other attempts
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot parse date value',
            requiresConfirmation: false
          };
        }
      },

      // Duplicate values
      {
        pattern: 'DUPLICATE_VALUE',
        description: 'Field contains duplicate value',
        detector: (error) => error.rule.includes('unique') || error.rule.includes('duplicate'),
        fixer: (error, record) => {
          if (error.field === 'sku' && record.name) {
            const timestamp = Date.now().toString().slice(-6);
            const generated = `${this.generateSKU(record.name)}-${timestamp}`;
            return {
              canFix: true,
              fixedValue: generated,
              confidence: 80,
              explanation: `Generated unique SKU: ${generated}`,
              requiresConfirmation: true
            };
          }
          
          if (error.field === 'slug') {
            const timestamp = Date.now().toString().slice(-6);
            const cleaned = this.generateSlug(String(error.value));
            const unique = `${cleaned}-${timestamp}`;
            return {
              canFix: true,
              fixedValue: unique,
              confidence: 85,
              explanation: `Made slug unique: ${unique}`,
              requiresConfirmation: false
            };
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot generate unique value for this field',
            requiresConfirmation: false
          };
        }
      },

      // Data type mismatches
      {
        pattern: 'TYPE_MISMATCH',
        description: 'Field value does not match expected data type',
        detector: (error) => error.rule.includes('type') || error.rule.includes('format'),
        fixer: (error, record) => {
          const value = error.value;
          
          // Try to convert to expected type based on field name
          if (error.field === 'stock' || error.field === 'lowStockThreshold') {
            const num = parseInt(String(value));
            if (!isNaN(num) && num >= 0) {
              return {
                canFix: true,
                fixedValue: num,
                confidence: 95,
                explanation: `Converted "${value}" to integer ${num}`,
                requiresConfirmation: false
              };
            }
          }
          
          return {
            canFix: false,
            confidence: 0,
            explanation: 'Cannot convert to expected type',
            requiresConfirmation: false
          };
        }
      }
    ];
  }

  /**
   * Analyze errors and suggest fixes
   */
  async analyzeErrors(sessionId: string, errors: ValidationError[]): Promise<{
    totalErrors: number;
    autoFixable: number;
    manualRequired: number;
    suggestions: Array<{
      recordIndex: number;
      field: string;
      error: string;
      fix: AutoFixResult;
    }>;
  }> {
    const suggestions: Array<{
      recordIndex: number;
      field: string;
      error: string;
      fix: AutoFixResult;
    }> = [];

    let autoFixable = 0;
    let manualRequired = 0;

    // Get the original data for the session
    const originalData = await this.getSessionData(sessionId);
    
    for (const error of errors) {
      const record = originalData[error.recordIndex] || {};
      let bestFix: AutoFixResult | null = null;

      // Try each error pattern
      for (const pattern of this.errorPatterns) {
        if (pattern.detector(error)) {
          const fix = pattern.fixer(error, record);
          if (fix.canFix && (!bestFix || fix.confidence > bestFix.confidence)) {
            bestFix = fix;
          }
        }
      }

      if (bestFix) {
        suggestions.push({
          recordIndex: error.recordIndex,
          field: error.field,
          error: error.rule,
          fix: bestFix
        });

        if (bestFix.confidence >= 90 && !bestFix.requiresConfirmation) {
          autoFixable++;
        } else {
          manualRequired++;
        }
      } else {
        manualRequired++;
        suggestions.push({
          recordIndex: error.recordIndex,
          field: error.field,
          error: error.rule,
          fix: {
            canFix: false,
            confidence: 0,
            explanation: 'No automatic fix available',
            requiresConfirmation: false
          }
        });
      }
    }

    return {
      totalErrors: errors.length,
      autoFixable,
      manualRequired,
      suggestions
    };
  }

  /**
   * Apply automatic fixes to data
   */
  async applyAutoFixes(
    sessionId: string, 
    fixes: Array<{ recordIndex: number; field: string; newValue: any }>,
    options: ErrorRecoveryOptions = {
      autoFixThreshold: 90,
      skipErrors: false,
      transformations: {
        enableDataCleaning: true,
        enableTypeConversion: true,
        enableFormatStandardization: true
      }
    }
  ): Promise<{
    appliedFixes: number;
    skippedFixes: number;
    updatedRecords: any[];
    remainingErrors: ValidationError[];
  }> {
    let appliedFixes = 0;
    let skippedFixes = 0;
    const updatedRecords: any[] = [];

    // Get original data
    const originalData = await this.getSessionData(sessionId);
    
    // Apply fixes
    for (const fix of fixes) {
      try {
        if (originalData[fix.recordIndex]) {
          originalData[fix.recordIndex][fix.field] = fix.newValue;
          appliedFixes++;
        } else {
          skippedFixes++;
        }
      } catch (error) {
        console.error('Error applying fix:', error);
        skippedFixes++;
      }
    }

    // Re-validate data to find remaining errors
    const remainingErrors = await this.validateFixedData(originalData);

    return {
      appliedFixes,
      skippedFixes,
      updatedRecords: originalData,
      remainingErrors
    };
  }

  /**
   * Generate recovery suggestions for failed imports
   */
  async generateRecoverySuggestions(sessionId: string): Promise<{
    strategies: Array<{
      name: string;
      description: string;
      impact: string;
      confidence: number;
      actions: string[];
    }>;
    quickFixes: Array<{
      description: string;
      affectedRecords: number;
      autoFixable: boolean;
    }>;
  }> {
    // Get failed records
    const failedRecords = await db.select()
      .from(importHistory)
      .where(
        and(
          eq(importHistory.sessionId, sessionId),
          eq(importHistory.importStatus, 'failed')
        )
      );

    const strategies = [
      {
        name: 'Data Cleaning and Standardization',
        description: 'Clean and standardize data formats automatically',
        impact: `Could fix approximately ${Math.round(failedRecords.length * 0.6)} records`,
        confidence: 85,
        actions: [
          'Remove special characters from SKUs',
          'Standardize price formats',
          'Clean and validate email addresses',
          'Normalize boolean values'
        ]
      },
      {
        name: 'Smart Field Mapping',
        description: 'Use AI to map unmapped fields to similar alternatives',
        impact: `Could map ${Math.round(failedRecords.length * 0.3)} additional fields`,
        confidence: 75,
        actions: [
          'Map title to name if name is missing',
          'Use description for missing short_description',
          'Generate SKU from product name',
          'Extract brand from product name'
        ]
      },
      {
        name: 'Partial Import with Quarantine',
        description: 'Import valid records and quarantine problematic ones',
        impact: `Import ~${Math.round(failedRecords.length * 0.7)} records immediately`,
        confidence: 95,
        actions: [
          'Skip records with critical errors',
          'Import valid records',
          'Create detailed error report',
          'Provide manual editing interface'
        ]
      }
    ];

    const quickFixes = [
      {
        description: 'Convert price strings to numbers',
        affectedRecords: failedRecords.filter(r => 
          r.validationErrors && JSON.stringify(r.validationErrors).includes('price')
        ).length,
        autoFixable: true
      },
      {
        description: 'Generate missing SKUs from product names',
        affectedRecords: failedRecords.filter(r => 
          r.validationErrors && JSON.stringify(r.validationErrors).includes('sku')
        ).length,
        autoFixable: true
      },
      {
        description: 'Standardize boolean values',
        affectedRecords: failedRecords.filter(r => 
          r.validationErrors && JSON.stringify(r.validationErrors).includes('boolean')
        ).length,
        autoFixable: true
      }
    ];

    return { strategies, quickFixes };
  }

  /**
   * Create error recovery session
   */
  async createRecoverySession(
    sessionId: string, 
    errors: ValidationError[],
    options: ErrorRecoveryOptions
  ): Promise<string> {
    const recoverySessionId = `recovery_${sessionId}_${Date.now()}`;
    
    const recoverySession: RecoverySession = {
      sessionId: recoverySessionId,
      errors,
      fixes: new Map(),
      options
    };

    this.activeSessions.set(recoverySessionId, recoverySession);

    // Analyze errors and prepare fixes
    const analysis = await this.analyzeErrors(sessionId, errors);
    
    // Store potential fixes
    for (const suggestion of analysis.suggestions) {
      if (suggestion.fix.canFix) {
        recoverySession.fixes.set(suggestion.recordIndex, suggestion.fix);
      }
    }

    return recoverySessionId;
  }

  /**
   * Get recovery session details
   */
  getRecoverySession(recoverySessionId: string): RecoverySession | null {
    return this.activeSessions.get(recoverySessionId) || null;
  }

  /**
   * Execute recovery plan
   */
  async executeRecovery(
    recoverySessionId: string,
    selectedFixes: Array<{ recordIndex: number; field: string; accepted: boolean }>
  ): Promise<{
    success: boolean;
    recoveredRecords: number;
    remainingErrors: number;
    message: string;
  }> {
    const session = this.activeSessions.get(recoverySessionId);
    if (!session) {
      throw new Error('Recovery session not found');
    }

    const fixesToApply = selectedFixes
      .filter(f => f.accepted)
      .map(f => {
        const fix = session.fixes.get(f.recordIndex);
        return {
          recordIndex: f.recordIndex,
          field: f.field,
          newValue: fix?.fixedValue
        };
      })
      .filter(f => f.newValue !== undefined);

    const result = await this.applyAutoFixes(
      session.sessionId.replace('recovery_', '').split('_')[0],
      fixesToApply,
      session.options
    );

    // Clean up session
    this.activeSessions.delete(recoverySessionId);

    return {
      success: result.appliedFixes > 0,
      recoveredRecords: result.appliedFixes,
      remainingErrors: result.remainingErrors.length,
      message: `Applied ${result.appliedFixes} fixes, ${result.remainingErrors.length} errors remaining`
    };
  }

  // Helper methods
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private generateSKU(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8)
      .padEnd(6, '0');
  }

  private async getSessionData(sessionId: string): Promise<any[]> {
    // In a real implementation, this would retrieve cached session data
    // For now, return empty array
    return [];
  }

  private async validateFixedData(data: any[]): Promise<ValidationError[]> {
    // In a real implementation, this would re-validate the fixed data
    // For now, return empty array
    return [];
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();