import { OpenRouterClient } from './openrouter-client';
/**
 * Simplified Field Mapping Service
 *
 * User Requirements:
 * - Get fields from uploaded CSV/JSON/XLSX file
 * - Compare with SKU fields using centralized system prompt
 * - Simple field extraction → system prompt → field comparison
 * - Ignore unmatched fields (don't fail)
 */
// SKU Database Fields from shared/schema.ts
const SKU_FIELDS = {
    // Core identification
    id: 'Auto-generated unique identifier',
    name: 'Product name/title (required)',
    slug: 'URL-friendly identifier',
    sku: 'Stock keeping unit identifier',
    gtin: 'Global trade item number (barcode)',
    // Descriptions
    shortDescription: 'Brief product description',
    longDescription: 'Detailed product description',
    story: 'Product or brand story',
    // Pricing (stored in cents)
    price: 'Product selling price in cents',
    compareAtPrice: 'Original/MSRP price in cents',
    // Inventory
    stock: 'Available stock quantity',
    lowStockThreshold: 'Low stock alert threshold',
    // Product attributes
    brandId: 'Brand identifier (foreign key)',
    parentId: 'Parent product ID for variants',
    status: 'Product status (draft, review, live, archived)',
    isVariant: 'Whether this is a product variant (boolean)',
    // Timestamps
    createdAt: 'Creation timestamp (auto-generated)',
    updatedAt: 'Last update timestamp (auto-generated)'
};
export class SimpleFieldMappingService {
    static instance;
    openRouterClient;
    static getInstance() {
        if (!SimpleFieldMappingService.instance) {
            SimpleFieldMappingService.instance = new SimpleFieldMappingService();
        }
        return SimpleFieldMappingService.instance;
    }
    constructor() {
        this.openRouterClient = OpenRouterClient.getInstance();
    }
    /**
     * Main entry point: Extract fields → System prompt → Field comparison
     */
    async processFileForMapping(fileData) {
        if (!this.openRouterClient.isAvailable()) {
            return {
                success: false,
                mappings: [],
                unmappedFields: fileData.fields,
                error: 'OpenRouter API not configured'
            };
        }
        try {
            // Build centralized system prompt with SKU field reference
            const systemPrompt = this.buildCentralizedSystemPrompt();
            // Build user prompt with extracted fields
            const userPrompt = this.buildUserPrompt(fileData);
            // Query LLM for field comparison
            const result = await this.openRouterClient.createCompletion({
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 1000,
                temperature: 0.1, // Low temperature for consistency
                top_p: 0.9
            }, {
                costLimit: 0.001 // $0.001 limit per session as per requirements
            });
            if (!result.success) {
                return {
                    success: false,
                    mappings: [],
                    unmappedFields: fileData.fields,
                    error: result.error,
                    usage: result.usage
                };
            }
            // Parse LLM response
            const mappings = this.parseLLMResponse(result.data.choices[0].message.content);
            const unmappedFields = this.getUnmappedFields(fileData.fields, mappings);
            return {
                success: true,
                mappings,
                unmappedFields,
                usage: result.usage
            };
        }
        catch (error) {
            return {
                success: false,
                mappings: [],
                unmappedFields: fileData.fields,
                error: `Field mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Extract fields from file data
     * This is the "scripting" part to get fields from CSV/JSON/XLSX
     */
    extractFieldsFromFile(fileContent, fileType) {
        let fields = [];
        let sampleData = [];
        try {
            switch (fileType) {
                case 'json':
                    fields = this.extractFieldsFromJSON(fileContent);
                    sampleData = this.extractSampleDataFromJSON(fileContent, fields);
                    break;
                case 'csv':
                    fields = this.extractFieldsFromCSV(fileContent);
                    sampleData = this.extractSampleDataFromCSV(fileContent, fields);
                    break;
                case 'xlsx':
                    fields = this.extractFieldsFromXLSX(fileContent);
                    sampleData = this.extractSampleDataFromXLSX(fileContent, fields);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
            return {
                fields,
                sampleData,
                fileType
            };
        }
        catch (error) {
            throw new Error(`Field extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Build centralized system prompt with all SKU fields
     * This is the "well organized system prompt" requirement
     */
    buildCentralizedSystemPrompt() {
        const skuFieldsList = Object.entries(SKU_FIELDS)
            .map(([field, description]) => `- ${field}: ${description}`)
            .join('\n');
        return `You are a field mapping specialist for QueenOne ProductPrototype SKU management system.

TASK: Map uploaded file fields to our SKU database fields using direct comparison.

OUR SKU DATABASE FIELDS:
${skuFieldsList}

MAPPING RULES:
1. Map each uploaded field to the most appropriate SKU field
2. If no good match exists, ignore the field (don't force mappings)
3. Consider field names, sample data, and context
4. Confidence score 0-100 based on field similarity and data content
5. Only map fields with confidence > 60
6. Return JSON format only

PRICE FIELDS SPECIAL NOTE:
- Our price fields (price, compareAtPrice) are stored in CENTS
- If source data appears to be in dollars, note this in reasoning

RESPONSE FORMAT (JSON only, no other text):
{
  "mappings": [
    {
      "sourceField": "source_field_name",
      "targetField": "sku_field_name",
      "confidence": 85,
      "reasoning": "Brief explanation"
    }
  ]
}

IGNORE UNMATCHED: If a field doesn't match well, simply don't include it in mappings.`;
    }
    /**
     * Build user prompt with extracted fields and sample data
     */
    buildUserPrompt(fileData) {
        let prompt = `Analyze and map these ${fileData.fileType.toUpperCase()} file fields to SKU database fields:\n\n`;
        prompt += `UPLOADED FIELDS:\n`;
        fileData.fields.forEach((field, index) => {
            prompt += `${index + 1}. "${field}"\n`;
        });
        if (fileData.sampleData.length > 0) {
            prompt += `\nSAMPLE DATA (first 3 rows):\n`;
            fileData.sampleData.slice(0, 3).forEach((row, rowIndex) => {
                prompt += `Row ${rowIndex + 1}: `;
                fileData.fields.forEach((field, fieldIndex) => {
                    const value = row[fieldIndex] !== undefined ? row[fieldIndex] : 'null';
                    prompt += `${field}="${value}" `;
                });
                prompt += `\n`;
            });
        }
        prompt += `\nReturn field mappings as JSON. Only map fields that have good matches (confidence > 60).`;
        return prompt;
    }
    /**
     * Parse LLM response to extract field mappings
     */
    parseLLMResponse(content) {
        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
                throw new Error('Invalid response format: missing mappings array');
            }
            return parsed.mappings
                .filter((mapping) => {
                // Only include mappings with valid target fields and confidence > 60
                return mapping.targetField &&
                    Object.keys(SKU_FIELDS).includes(mapping.targetField) &&
                    (mapping.confidence || 0) > 60;
            })
                .map((mapping) => ({
                sourceField: String(mapping.sourceField || ''),
                targetField: String(mapping.targetField || ''),
                confidence: Math.max(0, Math.min(100, Number(mapping.confidence || 0))),
                reasoning: String(mapping.reasoning || 'Direct field mapping')
            }));
        }
        catch (error) {
            console.error('Failed to parse LLM response:', error);
            return [];
        }
    }
    /**
     * Get fields that weren't mapped (these will be ignored)
     */
    getUnmappedFields(sourceFields, mappings) {
        const mappedFields = new Set(mappings.map(m => m.sourceField));
        return sourceFields.filter(field => !mappedFields.has(field));
    }
    // Field extraction methods for different file types
    extractFieldsFromJSON(jsonContent) {
        if (Array.isArray(jsonContent) && jsonContent.length > 0) {
            // Array of objects - get keys from first object
            const firstItem = jsonContent[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                return Object.keys(firstItem);
            }
        }
        else if (typeof jsonContent === 'object' && jsonContent !== null) {
            // Single object - get its keys
            return Object.keys(jsonContent);
        }
        throw new Error('Invalid JSON structure for field extraction');
    }
    extractSampleDataFromJSON(jsonContent, fields) {
        if (Array.isArray(jsonContent)) {
            return jsonContent.slice(0, 3).map(item => fields.map(field => item[field]));
        }
        else {
            // Single object
            return [fields.map(field => jsonContent[field])];
        }
    }
    extractFieldsFromCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length === 0) {
            throw new Error('Empty CSV file');
        }
        // Parse header row (first line)
        const headers = this.parseCSVRow(lines[0]);
        return headers;
    }
    extractSampleDataFromCSV(csvContent, fields) {
        const lines = csvContent.trim().split('\n');
        const sampleData = [];
        // Skip header row, take next 3 rows
        for (let i = 1; i < Math.min(4, lines.length); i++) {
            const values = this.parseCSVRow(lines[i]);
            sampleData.push(values);
        }
        return sampleData;
    }
    extractFieldsFromXLSX(xlsxContent) {
        // Assuming xlsxContent is parsed XLSX data
        // This would typically use a library like xlsx
        if (xlsxContent && xlsxContent.headers) {
            return xlsxContent.headers;
        }
        throw new Error('Invalid XLSX structure for field extraction');
    }
    extractSampleDataFromXLSX(xlsxContent, fields) {
        if (xlsxContent && xlsxContent.data) {
            return xlsxContent.data.slice(0, 3);
        }
        return [];
    }
    /**
     * Simple CSV row parser (handles basic CSV format)
     */
    parseCSVRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(field => field.replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
    }
    /**
     * Validate if OpenRouter is available
     */
    isAvailable() {
        return this.openRouterClient.isAvailable();
    }
    /**
     * Get token usage statistics
     */
    getUsageStats() {
        return this.openRouterClient.getStats();
    }
}
export default SimpleFieldMappingService;
//# sourceMappingURL=simple-field-mapping.js.map