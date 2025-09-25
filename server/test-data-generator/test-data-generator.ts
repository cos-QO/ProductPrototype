/**
 * Test Data Generator Service
 * LLM-powered CSV generation with specific error patterns for bulk upload testing
 */

import { OpenRouterClient } from "../services/openrouter-client";
import { 
  TestScenario, 
  TestDataGenerationRequest, 
  GeneratedTestData, 
  ErrorPattern,
  ErrorPatternType,
  EdgeCaseType,
  ValidationError,
  BusinessContext,
  BUSINESS_CONTEXTS,
  PRODUCT_SCHEMA_FIELDS,
  ProductSchemaField
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";

export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private openRouterClient: OpenRouterClient;
  private testFileDirectory: string;

  private constructor() {
    this.openRouterClient = OpenRouterClient.getInstance();
    this.testFileDirectory = path.join(process.cwd(), 'tests', 'fixtures', 'generated');
    this.ensureTestDirectory();
  }

  public static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  /**
   * Generate test data with specific error patterns
   */
  public async generateTestData(request: TestDataGenerationRequest): Promise<GeneratedTestData> {
    const startTime = Date.now();

    try {
      // Create scenario if not provided
      const scenario = await this.createTestScenario(request);
      
      // Generate CSV data using LLM
      const llmResult = await this.generateDataWithLLM(request, scenario);
      
      if (!llmResult.success) {
        throw new Error(`LLM generation failed: ${llmResult.error}`);
      }

      // Apply error patterns to the generated data
      const { modifiedData, injectedErrors } = await this.applyErrorPatterns(
        llmResult.data!,
        request.dataParams.errorPatterns
      );

      // Save test file
      const fileName = await this.saveTestFile(
        modifiedData,
        scenario,
        request.outputFormat
      );

      // Validate the generated data
      const validationErrors = await this.validateGeneratedData(
        modifiedData,
        request.dataParams.targetFields
      );

      const generationTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          content: modifiedData,
          fileName,
          recordCount: this.countRecords(modifiedData),
          validRecords: this.countValidRecords(modifiedData, validationErrors),
          invalidRecords: validationErrors.length,
          errorCount: injectedErrors.length + validationErrors.length
        },
        errors: [...injectedErrors, ...validationErrors],
        metadata: {
          generationTime,
          llmTokensUsed: llmResult.usage?.tokens || 0,
          llmCost: llmResult.usage?.cost || 0,
          errorPatterns: request.dataParams.errorPatterns,
          fieldMapping: this.analyzeFieldMapping(modifiedData)
        },
        scenario
      };

    } catch (error) {
      console.error('[TEST DATA GENERATOR] Generation failed:', error);
      
      return {
        success: false,
        data: {
          content: '',
          fileName: '',
          recordCount: 0,
          validRecords: 0,
          invalidRecords: 0,
          errorCount: 0
        },
        errors: [{
          recordIndex: -1,
          field: 'generation',
          value: null,
          rule: 'generation_failure',
          severity: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }],
        metadata: {
          generationTime: Date.now() - startTime,
          llmTokensUsed: 0,
          llmCost: 0,
          errorPatterns: request.dataParams.errorPatterns,
          fieldMapping: []
        },
        scenario: await this.createTestScenario(request)
      };
    }
  }

  /**
   * Generate multiple test scenarios for comprehensive testing
   */
  public async generateTestSuite(config: {
    edgeCaseTypes: EdgeCaseType[];
    recordCounts: number[];
    complexityLevels: Array<'low' | 'medium' | 'high'>;
    businessContexts: BusinessContext[];
  }): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    for (const edgeCaseType of config.edgeCaseTypes) {
      for (const recordCount of config.recordCounts) {
        for (const complexity of config.complexityLevels) {
          for (const businessContext of config.businessContexts) {
            const scenario = await this.createTestScenario({
              scenario: {
                type: edgeCaseType,
                complexity,
                metadata: {
                  businessContext: [businessContext]
                }
              },
              dataParams: {
                recordCount,
                errorPatterns: this.getErrorPatternsForType(edgeCaseType, complexity),
                includeValidData: true,
                targetFields: PRODUCT_SCHEMA_FIELDS.slice(),
                businessContext
              },
              outputFormat: 'csv'
            });

            scenarios.push(scenario);
          }
        }
      }
    }

    return scenarios;
  }

  /**
   * Create a test scenario based on request parameters
   */
  private async createTestScenario(request: TestDataGenerationRequest): Promise<TestScenario> {
    const scenario = request.scenario;
    
    return {
      id: uuidv4(),
      type: scenario.type || EdgeCaseType.VALIDATION_ERRORS,
      complexity: scenario.complexity || 'medium',
      description: scenario.description || this.generateScenarioDescription(request),
      testData: {
        recordCount: request.dataParams.recordCount,
        fileName: `test-${scenario.type || 'validation'}-${Date.now()}.csv`,
        format: request.outputFormat,
        content: '', // Will be filled after generation
        errorPatterns: request.dataParams.errorPatterns
      },
      expectations: {
        shouldSucceed: request.dataParams.errorPatterns.every(p => p.autoFixable),
        expectedErrors: [], // Will be filled after generation
        performanceTargets: this.getPerformanceTargets(request.dataParams.recordCount),
        userInteractionRequired: request.dataParams.errorPatterns.some(p => !p.autoFixable)
      },
      execution: {
        priority: this.calculatePriority(scenario.complexity || 'medium'),
        timeout: Math.max(30000, request.dataParams.recordCount * 10), // 10ms per record minimum
        retryAttempts: 2,
        requiresApproval: this.requiresApproval(request.dataParams.errorPatterns),
        approvalType: this.getApprovalType(request.dataParams.errorPatterns)
      },
      metadata: {
        generatedBy: 'llm',
        confidence: 0.85, // Default confidence
        riskLevel: this.assessRiskLevel(request.dataParams.errorPatterns),
        tags: this.generateTags(request),
        businessContext: scenario.metadata?.businessContext || ['general']
      }
    };
  }

  /**
   * Generate CSV data using LLM with intelligent error injection
   */
  private async generateDataWithLLM(
    request: TestDataGenerationRequest,
    scenario: TestScenario
  ): Promise<{
    success: boolean;
    data?: string;
    error?: string;
    usage?: { tokens: number; cost: number; responseTime: number };
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request, scenario);

    const result = await this.openRouterClient.createCompletion(
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: Math.min(4000, Math.max(1000, request.dataParams.recordCount * 50)),
        temperature: 0.7, // Higher creativity for diverse test data
        top_p: 0.9
      },
      {
        costLimit: 0.02 // $0.02 limit per generation request
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        usage: result.usage
      };
    }

    try {
      const content = result.data!.choices[0].message.content;
      const csvData = this.extractCSVFromResponse(content);

      return {
        success: true,
        data: csvData,
        usage: result.usage
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract CSV from LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        usage: result.usage
      };
    }
  }

  /**
   * Build system prompt for LLM data generation
   */
  private buildSystemPrompt(): string {
    return `You are an expert e-commerce data generator specializing in creating realistic product catalogs for testing purposes.

Your task is to generate CSV data that matches the QueenOne product schema with specific error patterns for testing bulk upload functionality.

Product Schema Fields (use these exact field names as headers):
${PRODUCT_SCHEMA_FIELDS.join(', ')}

Required Fields: name, slug, sku (these must always have values unless specifically requested to be empty for error testing)

Data Generation Rules:
1. Create realistic, diverse e-commerce product data
2. Maintain business logic consistency (prices, inventory, relationships)
3. Use proper data types and formats
4. Include variety across categories, brands, and price ranges
5. Generate unique SKUs and slugs
6. Use realistic product names and descriptions
7. Follow market distribution patterns (more mid-range products than luxury)

CSV Format Requirements:
- First row must be headers using exact schema field names
- Use comma as delimiter
- Quote fields containing commas or special characters
- Use UTF-8 encoding
- No empty lines except at the end

Output Format:
Return ONLY the CSV data, starting with headers. Do not include any explanations or markdown formatting.

Example header row:
name,slug,sku,gtin,shortDescription,longDescription,story,price,compareAtPrice,inventoryQuantity,trackInventory,isActive,tags,metaTitle,metaDescription,weight,weightUnit,hsCode,countryOfOrigin,material,color,size,gender,ageGroup,season,brand,vendor,productType,collection`;
  }

  /**
   * Build user prompt for specific data generation request
   */
  private buildUserPrompt(request: TestDataGenerationRequest, scenario: TestScenario): string {
    const businessContext = request.dataParams.businessContext || 'general';
    const contextInfo = BUSINESS_CONTEXTS[businessContext as BusinessContext];
    
    let prompt = `Generate ${request.dataParams.recordCount} realistic e-commerce product records in CSV format.\n\n`;

    if (contextInfo) {
      prompt += `Business Context: ${businessContext}\n`;
      prompt += `Categories: ${contextInfo.categories.join(', ')}\n`;
      prompt += `Brands: ${contextInfo.brands.join(', ')}\n`;
      prompt += `Price Ranges: ${contextInfo.priceRanges.map(r => `$${r[0]}-$${r[1]}`).join(', ')}\n\n`;
    }

    prompt += `Requirements:\n`;
    prompt += `- Create diverse products across different categories\n`;
    prompt += `- Use realistic pricing (store prices in cents, e.g., 2999 for $29.99)\n`;
    prompt += `- Generate unique SKUs (format: ${businessContext.toUpperCase()}-XXXX)\n`;
    prompt += `- Include realistic inventory quantities (1-500)\n`;
    prompt += `- Use proper boolean values (true/false)\n`;
    prompt += `- Create SEO-friendly slugs (lowercase, hyphens)\n`;

    if (request.dataParams.includeValidData) {
      prompt += `- Include ${Math.floor(request.dataParams.recordCount * 0.7)} fully valid records\n`;
    }

    // Add specific error pattern instructions
    if (request.dataParams.errorPatterns.length > 0) {
      prompt += `\nError Patterns to Include:\n`;
      request.dataParams.errorPatterns.forEach((pattern, index) => {
        prompt += `${index + 1}. ${pattern.description} (affect ${Math.floor(pattern.injectionRate * 100)}% of records)\n`;
      });
    }

    prompt += `\nReturn the CSV data with headers, no additional text or formatting.`;

    return prompt;
  }

  /**
   * Apply error patterns to generated data
   */
  private async applyErrorPatterns(
    csvData: string,
    errorPatterns: ErrorPattern[]
  ): Promise<{ modifiedData: string; injectedErrors: ValidationError[] }> {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    const injectedErrors: ValidationError[] = [];
    const modifiedLines: string[] = [lines[0]]; // Keep headers

    for (let i = 0; i < dataLines.length; i++) {
      let line = dataLines[i];
      const fields = this.parseCSVLine(line);

      for (const pattern of errorPatterns) {
        if (Math.random() < pattern.injectionRate) {
          const result = this.injectErrorPattern(fields, headers, pattern, i);
          line = this.buildCSVLine(result.fields);
          injectedErrors.push(...result.errors);
        }
      }

      modifiedLines.push(line);
    }

    return {
      modifiedData: modifiedLines.join('\n'),
      injectedErrors
    };
  }

  /**
   * Inject specific error pattern into a record
   */
  private injectErrorPattern(
    fields: string[],
    headers: string[],
    pattern: ErrorPattern,
    recordIndex: number
  ): { fields: string[]; errors: ValidationError[] } {
    const modifiedFields = [...fields];
    const errors: ValidationError[] = [];

    switch (pattern.type) {
      case ErrorPatternType.MISSING_REQUIRED_FIELDS:
        for (const fieldName of pattern.affectedFields) {
          const fieldIndex = headers.indexOf(fieldName);
          if (fieldIndex !== -1) {
            modifiedFields[fieldIndex] = '';
            errors.push({
              recordIndex,
              field: fieldName,
              value: '',
              rule: 'required_field',
              severity: 'error',
              message: `Required field '${fieldName}' is missing`,
              suggestion: `Provide a value for ${fieldName}`
            });
          }
        }
        break;

      case ErrorPatternType.INVALID_DATA_TYPES:
        for (const fieldName of pattern.affectedFields) {
          const fieldIndex = headers.indexOf(fieldName);
          if (fieldIndex !== -1) {
            // Inject invalid data type (e.g., text in numeric field)
            const invalidValue = fieldName.includes('price') ? 'INVALID_PRICE' : 'INVALID_VALUE';
            modifiedFields[fieldIndex] = invalidValue;
            errors.push({
              recordIndex,
              field: fieldName,
              value: invalidValue,
              rule: 'data_type',
              severity: 'error',
              message: `Invalid data type for ${fieldName}`,
              suggestion: 'Provide correct data type'
            });
          }
        }
        break;

      case ErrorPatternType.DUPLICATE_SKUS:
        const skuIndex = headers.indexOf('sku');
        if (skuIndex !== -1 && recordIndex > 0) {
          modifiedFields[skuIndex] = 'DUPLICATE-SKU-001'; // Force duplicate
          errors.push({
            recordIndex,
            field: 'sku',
            value: modifiedFields[skuIndex],
            rule: 'unique_constraint',
            severity: 'error',
            message: 'SKU already exists',
            suggestion: 'Use a unique SKU'
          });
        }
        break;

      case ErrorPatternType.SPECIAL_CHARACTERS:
        for (const fieldName of pattern.affectedFields) {
          const fieldIndex = headers.indexOf(fieldName);
          if (fieldIndex !== -1) {
            const originalValue = modifiedFields[fieldIndex];
            modifiedFields[fieldIndex] = originalValue + '™€®©‰';
            errors.push({
              recordIndex,
              field: fieldName,
              value: modifiedFields[fieldIndex],
              rule: 'special_characters',
              severity: 'warning',
              message: `Special characters detected in ${fieldName}`,
              suggestion: 'Review special character usage'
            });
          }
        }
        break;

      case ErrorPatternType.EXTREMELY_LONG_TEXT:
        for (const fieldName of pattern.affectedFields) {
          const fieldIndex = headers.indexOf(fieldName);
          if (fieldIndex !== -1) {
            const longText = 'A'.repeat(5000); // 5000 character text
            modifiedFields[fieldIndex] = longText;
            errors.push({
              recordIndex,
              field: fieldName,
              value: `[${longText.length} characters]`,
              rule: 'text_length',
              severity: 'warning',
              message: `Extremely long text in ${fieldName}`,
              suggestion: 'Consider truncating text'
            });
          }
        }
        break;

      default:
        // Handle other error patterns as needed
        break;
    }

    return { fields: modifiedFields, errors };
  }

  /**
   * Get error patterns for specific edge case types
   */
  private getErrorPatternsForType(type: EdgeCaseType, complexity: 'low' | 'medium' | 'high'): ErrorPattern[] {
    const basePatterns: Record<EdgeCaseType, ErrorPattern[]> = {
      [EdgeCaseType.VALIDATION_ERRORS]: [
        {
          type: ErrorPatternType.MISSING_REQUIRED_FIELDS,
          severity: 'high',
          affectedFields: ['name', 'sku'],
          injectionRate: 0.1,
          description: 'Missing required product name and SKU',
          autoFixable: false,
          businessImpact: 'high'
        },
        {
          type: ErrorPatternType.INVALID_DATA_TYPES,
          severity: 'medium',
          affectedFields: ['price', 'inventoryQuantity'],
          injectionRate: 0.15,
          description: 'Invalid data types in numeric fields',
          autoFixable: true,
          businessImpact: 'medium'
        }
      ],
      [EdgeCaseType.SPECIAL_CHARACTERS]: [
        {
          type: ErrorPatternType.SPECIAL_CHARACTERS,
          severity: 'low',
          affectedFields: ['name', 'description'],
          injectionRate: 0.2,
          description: 'Unicode and special characters in text fields',
          autoFixable: true,
          businessImpact: 'low'
        }
      ],
      [EdgeCaseType.DUPLICATE_DATA]: [
        {
          type: ErrorPatternType.DUPLICATE_SKUS,
          severity: 'high',
          affectedFields: ['sku'],
          injectionRate: 0.05,
          description: 'Duplicate SKU values',
          autoFixable: false,
          businessImpact: 'high'
        }
      ],
      [EdgeCaseType.PERFORMANCE_LIMITS]: [
        {
          type: ErrorPatternType.EXTREMELY_LONG_TEXT,
          severity: 'medium',
          affectedFields: ['longDescription', 'story'],
          injectionRate: 0.1,
          description: 'Extremely long text causing performance issues',
          autoFixable: true,
          businessImpact: 'low'
        }
      ],
      // Add default patterns for other types
      [EdgeCaseType.LARGE_DATASETS]: [],
      [EdgeCaseType.CORRUPTED_FILES]: [],
      [EdgeCaseType.NETWORK_ISSUES]: [],
      [EdgeCaseType.SECURITY_EDGE_CASES]: [],
      [EdgeCaseType.FIELD_MAPPING_COMPLEXITY]: [],
      [EdgeCaseType.MIXED_FORMATS]: []
    };

    let patterns = basePatterns[type] || [];

    // Adjust injection rates based on complexity
    const complexityMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 1.5
    };

    patterns = patterns.map(pattern => ({
      ...pattern,
      injectionRate: Math.min(0.5, pattern.injectionRate * complexityMultiplier[complexity])
    }));

    return patterns;
  }

  /**
   * Helper methods
   */
  private async ensureTestDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.testFileDirectory, { recursive: true });
    } catch (error) {
      console.warn('[TEST DATA GENERATOR] Could not create test directory:', error);
    }
  }

  private extractCSVFromResponse(content: string): string {
    // Remove any markdown formatting or extra text
    const lines = content.split('\n');
    const csvLines: string[] = [];
    let inCSV = false;

    for (const line of lines) {
      if (line.includes('name,slug,sku') || line.includes('name,') || inCSV) {
        inCSV = true;
        csvLines.push(line);
      }
    }

    if (csvLines.length === 0) {
      throw new Error('No CSV data found in LLM response');
    }

    return csvLines.join('\n');
  }

  private parseCSVLine(line: string): string[] {
    // Simple CSV parser - in production, use a proper CSV library
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    return fields;
  }

  private buildCSVLine(fields: string[]): string {
    return fields.map(field => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(',');
  }

  private async saveTestFile(content: string, scenario: TestScenario, format: string): Promise<string> {
    const fileName = `${scenario.testData.fileName}`;
    const filePath = path.join(this.testFileDirectory, fileName);
    
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return fileName;
    } catch (error) {
      console.warn('[TEST DATA GENERATOR] Could not save test file:', error);
      return fileName; // Return filename even if save failed
    }
  }

  private countRecords(csvData: string): number {
    return csvData.split('\n').filter(line => line.trim()).length - 1; // Subtract header
  }

  private countValidRecords(csvData: string, errors: ValidationError[]): number {
    const totalRecords = this.countRecords(csvData);
    const invalidRecordIndices = new Set(errors.map(e => e.recordIndex));
    return totalRecords - invalidRecordIndices.size;
  }

  private async validateGeneratedData(csvData: string, targetFields: string[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      errors.push({
        recordIndex: -1,
        field: 'data',
        value: null,
        rule: 'no_data',
        severity: 'error',
        message: 'No data records generated'
      });
      return errors;
    }

    const headers = this.parseCSVLine(lines[0]);
    
    // Check for required fields
    const requiredFields = ['name', 'sku'];
    for (const required of requiredFields) {
      if (!headers.includes(required)) {
        errors.push({
          recordIndex: -1,
          field: required,
          value: null,
          rule: 'missing_header',
          severity: 'error',
          message: `Required header '${required}' missing`
        });
      }
    }

    return errors;
  }

  private analyzeFieldMapping(csvData: string): Array<{ field: string; dataType: string; errorRate: number }> {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);

    return headers.map(field => ({
      field,
      dataType: this.inferDataType(field, dataLines),
      errorRate: this.calculateErrorRate(field, dataLines)
    }));
  }

  private inferDataType(field: string, dataLines: string[]): string {
    if (field.includes('price') || field.includes('quantity')) return 'number';
    if (field.includes('active') || field.includes('track')) return 'boolean';
    if (field.includes('date') || field.includes('time')) return 'date';
    return 'string';
  }

  private calculateErrorRate(field: string, dataLines: string[]): number {
    // Simple error rate calculation - could be enhanced
    return Math.random() * 0.1; // Placeholder
  }

  private generateScenarioDescription(request: TestDataGenerationRequest): string {
    const type = request.scenario.type || EdgeCaseType.VALIDATION_ERRORS;
    const count = request.dataParams.recordCount;
    const errorCount = request.dataParams.errorPatterns.length;
    
    return `${type.replace(/_/g, ' ')} test with ${count} records and ${errorCount} error patterns`;
  }

  private getPerformanceTargets(recordCount: number): any[] {
    return [
      {
        metric: 'execution_time',
        target: Math.max(5000, recordCount * 10), // 10ms per record
        unit: 'ms',
        tolerance: 0.2
      },
      {
        metric: 'memory_usage',
        target: Math.max(50, recordCount * 0.1), // 0.1MB per record
        unit: 'MB',
        tolerance: 0.3
      }
    ];
  }

  private calculatePriority(complexity: 'low' | 'medium' | 'high'): number {
    return { low: 3, medium: 2, high: 1 }[complexity];
  }

  private requiresApproval(errorPatterns: ErrorPattern[]): boolean {
    return errorPatterns.some(p => p.severity === 'high' || p.severity === 'critical');
  }

  private getApprovalType(errorPatterns: ErrorPattern[]): any {
    if (errorPatterns.some(p => p.businessImpact === 'high')) {
      return 'business_rule_exception';
    }
    if (errorPatterns.some(p => p.severity === 'critical')) {
      return 'data_integrity_risk';
    }
    return 'field_mapping_complexity';
  }

  private assessRiskLevel(errorPatterns: ErrorPattern[]): 'low' | 'medium' | 'high' | 'critical' {
    const maxSeverity = Math.max(...errorPatterns.map(p => 
      ({ low: 1, medium: 2, high: 3, critical: 4 })[p.severity]
    ));
    
    return (['low', 'medium', 'high', 'critical'] as const)[maxSeverity - 1];
  }

  private generateTags(request: TestDataGenerationRequest): string[] {
    const tags = [
      request.scenario.type || 'validation',
      request.outputFormat,
      `${request.dataParams.recordCount}_records`
    ];

    if (request.dataParams.businessContext) {
      tags.push(request.dataParams.businessContext);
    }

    return tags;
  }
}