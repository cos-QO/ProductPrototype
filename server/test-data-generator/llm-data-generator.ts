/**
 * LLM-Powered Test Data Generator
 * 
 * Generates realistic e-commerce CSV data with specific error patterns
 * using OpenRouter GPT-4o for intelligent test scenario creation.
 */

import { z } from 'zod';

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Data generation schemas
const ProductDataSchema = z.object({
  name: z.string(),
  slug: z.string(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  story: z.string().optional(),
  brandId: z.number().optional(),
  sku: z.string().optional(),
  gtin: z.string().optional(),
  status: z.enum(['draft', 'review', 'live', 'archived']).optional(),
  isVariant: z.boolean().optional(),
  price: z.number().optional(), // in cents
  compareAtPrice: z.number().optional(),
  stock: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  // Attributes
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  tags: z.string().optional(),
  variants: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  warranty: z.string().optional(),
});

const BrandDataSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  story: z.string().optional(),
  category: z.string().optional(),
  logoUrl: z.string().optional(),
  ownerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export interface ErrorPattern {
  type: 'missing_field' | 'invalid_type' | 'constraint_violation' | 'business_rule' | 'format_error';
  field: string;
  description: string;
  examples: string[];
  severity: 'error' | 'warning';
  autoFixable: boolean;
  suggestion?: string;
}

export interface GenerationConfig {
  entityType: 'products' | 'brands' | 'attributes';
  recordCount: number;
  errorRate: number; // 0.0 to 1.0 (percentage of records with errors)
  errorPatterns: ErrorPattern[];
  realismLevel: 'basic' | 'realistic' | 'premium'; // Affects data quality and variety
  businessContext: string; // Industry or business type context
  includeEdgeCases: boolean;
}

export interface GeneratedRecord {
  data: Record<string, any>;
  errors: Array<{
    field: string;
    type: string;
    value: any;
    issue: string;
    severity: 'error' | 'warning';
    autoFix?: {
      action: string;
      newValue: any;
    };
  }>;
  isValid: boolean;
}

export class LLMDataGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || OPENROUTER_API_KEY || '';
    this.baseUrl = OPENROUTER_BASE_URL;
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
    }
  }

  /**
   * Generate test data with specified error patterns
   */
  async generateTestData(config: GenerationConfig): Promise<GeneratedRecord[]> {
    console.log(`Generating ${config.recordCount} ${config.entityType} records with ${(config.errorRate * 100).toFixed(1)}% error rate...`);
    
    const records: GeneratedRecord[] = [];
    const batchSize = Math.min(config.recordCount, 100); // Process in batches
    
    for (let i = 0; i < config.recordCount; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, config.recordCount - i);
      const batchRecords = await this.generateBatch(config, currentBatchSize, i);
      records.push(...batchRecords);
      
      // Add delay to respect rate limits
      if (i + batchSize < config.recordCount) {
        await this.delay(1000);
      }
    }
    
    return records;
  }

  /**
   * Generate a batch of records
   */
  private async generateBatch(
    config: GenerationConfig, 
    batchSize: number, 
    startIndex: number
  ): Promise<GeneratedRecord[]> {
    const prompt = this.buildGenerationPrompt(config, batchSize, startIndex);
    
    try {
      const response = await this.callLLM(prompt, config.entityType);
      return this.parseAndValidateResponse(response, config);
    } catch (error) {
      console.error('Error generating batch:', error);
      return this.generateFallbackData(config, batchSize);
    }
  }

  /**
   * Build detailed prompt for LLM data generation
   */
  private buildGenerationPrompt(config: GenerationConfig, batchSize: number, startIndex: number): string {
    const entitySchemas = {
      products: this.getProductSchema(),
      brands: this.getBrandSchema(),
      attributes: this.getAttributeSchema(),
    };

    const errorPatternDescription = config.errorPatterns
      .map(pattern => `- ${pattern.type}: ${pattern.description}`)
      .join('\n');

    return `
You are an expert e-commerce data generator. Generate ${batchSize} realistic ${config.entityType} records for CSV import testing.

BUSINESS CONTEXT: ${config.businessContext}

SCHEMA REQUIREMENTS:
${entitySchemas[config.entityType]}

ERROR INJECTION REQUIREMENTS:
- Error rate: ${(config.errorRate * 100).toFixed(1)}%
- Inject these error patterns:
${errorPatternDescription}

DATA REQUIREMENTS:
- Realism level: ${config.realismLevel}
- Include edge cases: ${config.includeEdgeCases}
- Ensure variety in data (different categories, price ranges, etc.)
- Use realistic product names, descriptions, and business data
- Make errors subtle and realistic (not obviously fake)

ERROR PATTERNS TO INJECT:
${config.errorPatterns.map(p => `
  ${p.type}:
  - Field: ${p.field}
  - Examples: ${p.examples.join(', ')}
  - Severity: ${p.severity}
  - Auto-fixable: ${p.autoFixable}
`).join('\n')}

OUTPUT FORMAT:
Return a JSON array of objects. Each object should have:
- data: The record data matching the schema
- hasErrors: boolean indicating if this record has intentional errors
- errorDetails: array of error objects if hasErrors is true

For error objects, include:
- field: the field with the error
- type: error type from the patterns above
- issue: description of what's wrong
- severity: "error" or "warning"
- autoFix: object with action and newValue if auto-fixable

IMPORTANT:
- Make ${Math.round(batchSize * config.errorRate)} records have errors
- Distribute errors across different patterns
- Keep valid records completely valid
- Use realistic e-commerce data (real brand styles, product categories, etc.)
- Ensure price values are in cents (multiply dollar amounts by 100)
- Make SKUs follow realistic patterns
- Use proper slug formatting (lowercase, hyphens)

Generate records ${startIndex + 1} through ${startIndex + batchSize}:
`;
  }

  /**
   * Call OpenRouter LLM API
   */
  private async callLLM(prompt: string, entityType: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://queenone.com',
        'X-Title': 'QueenOne Test Data Generator',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert e-commerce data generator that creates realistic test data with specific error patterns for validation testing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 8000,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from LLM');
    }

    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      throw new Error(`Failed to parse LLM response: ${parseError}`);
    }
  }

  /**
   * Parse and validate LLM response
   */
  private parseAndValidateResponse(response: any, config: GenerationConfig): GeneratedRecord[] {
    if (!Array.isArray(response)) {
      throw new Error('LLM response is not an array');
    }

    return response.map((item, index) => {
      try {
        const record: GeneratedRecord = {
          data: item.data || item,
          errors: [],
          isValid: true,
        };

        // Process errors if present
        if (item.hasErrors && item.errorDetails) {
          record.errors = item.errorDetails.map((error: any) => ({
            field: error.field,
            type: error.type,
            value: record.data[error.field],
            issue: error.issue,
            severity: error.severity,
            autoFix: error.autoFix || undefined,
          }));
          record.isValid = false;
        }

        // Validate against schema
        this.validateRecord(record, config.entityType);

        return record;
      } catch (error) {
        console.warn(`Invalid record at index ${index}:`, error);
        return this.generateFallbackRecord(config.entityType, index);
      }
    });
  }

  /**
   * Validate record against entity schema
   */
  private validateRecord(record: GeneratedRecord, entityType: string): void {
    const schemas = {
      products: ProductDataSchema,
      brands: BrandDataSchema,
      attributes: z.object({
        productId: z.number(),
        attributeName: z.string(),
        attributeValue: z.string().optional(),
        attributeType: z.string().optional(),
      }),
    };

    const schema = schemas[entityType as keyof typeof schemas];
    if (schema) {
      schema.parse(record.data);
    }
  }

  /**
   * Generate fallback data when LLM fails
   */
  private generateFallbackData(config: GenerationConfig, batchSize: number): GeneratedRecord[] {
    const records: GeneratedRecord[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      records.push(this.generateFallbackRecord(config.entityType, i));
    }
    
    return records;
  }

  /**
   * Generate a single fallback record
   */
  private generateFallbackRecord(entityType: string, index: number): GeneratedRecord {
    const fallbackData = {
      products: {
        name: `Fallback Product ${index + 1}`,
        slug: `fallback-product-${index + 1}`,
        shortDescription: 'Generated fallback product',
        sku: `FB-${String(index + 1).padStart(4, '0')}`,
        price: 1999,
        stock: 10,
        status: 'draft',
      },
      brands: {
        name: `Fallback Brand ${index + 1}`,
        slug: `fallback-brand-${index + 1}`,
        description: 'Generated fallback brand',
        isActive: true,
      },
      attributes: {
        productId: 1,
        attributeName: 'fallback',
        attributeValue: `Fallback value ${index + 1}`,
        attributeType: 'text',
      },
    };

    return {
      data: fallbackData[entityType as keyof typeof fallbackData],
      errors: [],
      isValid: true,
    };
  }

  /**
   * Get product schema documentation
   */
  private getProductSchema(): string {
    return `
Products Schema:
- name: string (required) - Product name
- slug: string (required) - URL-friendly identifier
- shortDescription: string - Brief product description  
- longDescription: string - Detailed product description
- story: string - Product story/narrative
- brandId: number - Reference to brand
- parentId: number - Reference to parent product (for variants)
- sku: string - Stock keeping unit
- gtin: string - Global trade item number
- status: string - draft|review|live|archived
- isVariant: boolean - Whether this is a product variant
- price: number - Price in cents (e.g., 2999 for $29.99)
- compareAtPrice: number - Compare-at price in cents
- stock: number - Available inventory
- lowStockThreshold: number - Alert threshold
- weight: number - Weight in grams
- dimensions: string - Dimensions in LxWxH format
- tags: string - Comma-separated tags
- variants: string - Available variants description
- category: string - Product category
- condition: string - Product condition
- warranty: string - Warranty information
`;
  }

  /**
   * Get brand schema documentation
   */
  private getBrandSchema(): string {
    return `
Brands Schema:
- name: string (required) - Brand name
- slug: string (required) - URL-friendly identifier
- description: string - Brand description
- story: string - Brand story/history
- category: string - Brand category
- logoUrl: string - Logo image URL
- ownerId: string - Brand owner user ID
- isActive: boolean - Whether brand is active
`;
  }

  /**
   * Get attribute schema documentation
   */
  private getAttributeSchema(): string {
    return `
Product Attributes Schema:
- productId: number (required) - Product reference
- attributeName: string (required) - Attribute name
- attributeValue: string - Attribute value
- attributeType: string - text|number|boolean|json
`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default LLMDataGenerator;