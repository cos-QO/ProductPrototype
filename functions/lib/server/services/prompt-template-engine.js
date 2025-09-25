import * as fs from 'fs/promises';
import * as path from 'path';
import { watch } from 'fs';
export class PromptTemplateEngine {
    static instance;
    templates = new Map();
    watchers = new Map();
    templatesPath;
    globalVariables = new Map();
    isHotReloadEnabled = process.env.NODE_ENV === 'development';
    static getInstance() {
        if (!PromptTemplateEngine.instance) {
            PromptTemplateEngine.instance = new PromptTemplateEngine();
        }
        return PromptTemplateEngine.instance;
    }
    constructor() {
        this.templatesPath = path.join(process.cwd(), 'server', 'prompts');
        this.initializeTemplatesDirectory();
        if (this.isHotReloadEnabled) {
            this.setupHotReload();
        }
    }
    /**
     * Main compilation method with [UPLOADED_FIELDS] support
     */
    async compile(templateId, variables = {}) {
        try {
            const template = await this.loadTemplate(templateId);
            // Merge template variables with provided variables
            const compilationContext = {
                variables: { ...this.getGlobalVariables(), ...variables },
                formatters: this.getDefaultFormatters(),
                metadata: {
                    templateId,
                    version: template.version,
                    compiledAt: new Date().toISOString()
                }
            };
            // Special handling for [UPLOADED_FIELDS] variable
            if (variables.uploadedFields) {
                compilationContext.variables.UPLOADED_FIELDS = this.formatUploadedFields(variables.uploadedFields);
            }
            const compiledContent = this.render(template.content, compilationContext);
            // Update template usage statistics
            await this.updateTemplateUsage(templateId);
            return compiledContent;
        }
        catch (error) {
            throw new Error(`Template compilation failed for '${templateId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Advanced template rendering with variable substitution
     */
    render(template, context) {
        let rendered = template;
        // Replace variables with [VARIABLE_NAME] syntax
        rendered = rendered.replace(/\[([A-Z_]+)\]/g, (match, variableName) => {
            const value = context.variables[variableName];
            const formatter = context.formatters[variableName];
            if (value === undefined) {
                console.warn(`Variable ${variableName} not found in context`);
                return match; // Keep original if not found
            }
            if (formatter) {
                return formatter(value);
            }
            return this.defaultVariableFormatter(value);
        });
        // Replace conditional blocks [IF:VARIABLE]...[/IF:VARIABLE]
        rendered = this.processConditionalBlocks(rendered, context);
        // Replace loops [FOREACH:ARRAY]...[/FOREACH:ARRAY]
        rendered = this.processLoopBlocks(rendered, context);
        return rendered;
    }
    /**
     * Add global variable available to all templates
     */
    addVariable(name, value, formatter) {
        this.globalVariables.set(name, {
            name,
            value,
            formatter,
            required: false
        });
    }
    /**
     * Load template from file system
     */
    async loadTemplate(templateId) {
        if (this.templates.has(templateId)) {
            return this.templates.get(templateId);
        }
        try {
            const templatePath = path.join(this.templatesPath, `${templateId}.json`);
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const template = JSON.parse(templateContent);
            // Convert date strings back to Date objects
            template.metadata.createdAt = new Date(template.metadata.createdAt);
            template.metadata.updatedAt = new Date(template.metadata.updatedAt);
            this.templates.set(templateId, template);
            return template;
        }
        catch (error) {
            throw new Error(`Failed to load template '${templateId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Reload all templates from disk
     */
    async reloadTemplates() {
        try {
            this.templates.clear();
            const files = await fs.readdir(this.templatesPath);
            const templateFiles = files.filter(file => file.endsWith('.json'));
            for (const file of templateFiles) {
                const templateId = path.basename(file, '.json');
                await this.loadTemplate(templateId);
            }
            console.log(`Reloaded ${templateFiles.length} prompt templates`);
        }
        catch (error) {
            console.error('Failed to reload templates:', error);
        }
    }
    /**
     * Format uploaded fields for [UPLOADED_FIELDS] variable
     */
    formatUploadedFields(uploadedFields) {
        if (Array.isArray(uploadedFields)) {
            // Simple array of field names
            return uploadedFields.map((field, index) => `${index + 1}. "${field}"`).join('\n');
        }
        if (uploadedFields.fields && uploadedFields.sampleData) {
            // Enhanced field structure with sample data
            let formatted = 'UPLOADED FIELDS:\n';
            uploadedFields.fields.forEach((field, index) => {
                if (typeof field === 'string') {
                    formatted += `${index + 1}. "${field}"\n`;
                }
                else {
                    // Enhanced field with metadata
                    formatted += `${index + 1}. "${field.name}" (${field.dataType})`;
                    if (field.sampleValues && field.sampleValues.length > 0) {
                        formatted += ` - samples: ${field.sampleValues.slice(0, 3).join(', ')}`;
                    }
                    formatted += '\n';
                }
            });
            if (uploadedFields.sampleData && uploadedFields.sampleData.length > 0) {
                formatted += '\nSAMPLE DATA (first 3 rows):\n';
                uploadedFields.sampleData.slice(0, 3).forEach((row, rowIndex) => {
                    formatted += `Row ${rowIndex + 1}: `;
                    row.forEach((value, fieldIndex) => {
                        const fieldName = typeof uploadedFields.fields[fieldIndex] === 'string'
                            ? uploadedFields.fields[fieldIndex]
                            : uploadedFields.fields[fieldIndex]?.name || `field_${fieldIndex}`;
                        formatted += `${fieldName}="${value}" `;
                    });
                    formatted += '\n';
                });
            }
            return formatted;
        }
        // Fallback to string representation
        return String(uploadedFields);
    }
    /**
     * Process conditional blocks in templates
     */
    processConditionalBlocks(template, context) {
        return template.replace(/\[IF:([A-Z_]+)\](.*?)\[\/IF:\1\]/gs, (match, variableName, content) => {
            const value = context.variables[variableName];
            const isTrue = value && (value !== false) && (value !== 0) && (value !== '');
            return isTrue ? content : '';
        });
    }
    /**
     * Process loop blocks in templates
     */
    processLoopBlocks(template, context) {
        return template.replace(/\[FOREACH:([A-Z_]+)\](.*?)\[\/FOREACH:\1\]/gs, (match, variableName, content) => {
            const array = context.variables[variableName];
            if (!Array.isArray(array)) {
                return '';
            }
            return array.map((item, index) => {
                return content
                    .replace(/\[ITEM\]/g, String(item))
                    .replace(/\[INDEX\]/g, String(index))
                    .replace(/\[ITEM\.([A-Z_]+)\]/g, (itemMatch, prop) => {
                    return typeof item === 'object' && item[prop] !== undefined ? String(item[prop]) : itemMatch;
                });
            }).join('');
        });
    }
    /**
     * Get global variables as plain object
     */
    getGlobalVariables() {
        const vars = {};
        this.globalVariables.forEach((variable, name) => {
            vars[name] = variable.value;
        });
        return vars;
    }
    /**
     * Get default formatters for common variable types
     */
    getDefaultFormatters() {
        return {
            UPLOADED_FIELDS: (value) => this.formatUploadedFields(value),
            SKU_FIELDS: (value) => this.formatSkuFields(value),
            FIELD_MAPPINGS: (value) => this.formatFieldMappings(value),
            JSON: (value) => JSON.stringify(value, null, 2),
            LIST: (value) => Array.isArray(value) ? value.join(', ') : String(value),
            NUMBERED_LIST: (value) => Array.isArray(value)
                ? value.map((item, index) => `${index + 1}. ${item}`).join('\n')
                : String(value)
        };
    }
    /**
     * Format SKU fields for templates
     */
    formatSkuFields(skuFields) {
        return Object.entries(skuFields)
            .map(([field, description]) => `- ${field}: ${description}`)
            .join('\n');
    }
    /**
     * Format field mappings for templates
     */
    formatFieldMappings(mappings) {
        if (!Array.isArray(mappings))
            return '';
        return mappings.map(mapping => `${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}%)`).join('\n');
    }
    /**
     * Default variable formatter
     */
    defaultVariableFormatter(value) {
        if (value === null || value === undefined)
            return '';
        if (typeof value === 'object')
            return JSON.stringify(value);
        return String(value);
    }
    /**
     * Initialize templates directory
     */
    async initializeTemplatesDirectory() {
        try {
            await fs.access(this.templatesPath);
        }
        catch {
            await fs.mkdir(this.templatesPath, { recursive: true });
            await this.createDefaultTemplates();
        }
    }
    /**
     * Setup hot reload for development
     */
    setupHotReload() {
        if (this.watchers.size > 0)
            return; // Already setup
        try {
            const watcher = watch(this.templatesPath, { recursive: true }, (eventType, filename) => {
                if (filename && filename.endsWith('.json')) {
                    console.log(`Template file changed: ${filename}, reloading...`);
                    const templateId = path.basename(filename, '.json');
                    this.templates.delete(templateId);
                }
            });
            this.watchers.set('main', watcher);
            console.log('Hot reload enabled for prompt templates');
        }
        catch (error) {
            console.warn('Failed to setup hot reload:', error);
        }
    }
    /**
     * Update template usage statistics
     */
    async updateTemplateUsage(templateId) {
        try {
            const template = this.templates.get(templateId);
            if (template) {
                template.metadata.usage.totalUsage++;
                template.metadata.updatedAt = new Date();
                // Optionally persist usage stats to file
                // await this.saveTemplate(template);
            }
        }
        catch (error) {
            console.warn(`Failed to update usage stats for template ${templateId}:`, error);
        }
    }
    /**
     * Create default templates for field mapping
     */
    async createDefaultTemplates() {
        const fieldMappingTemplate = {
            id: 'field-mapping-v1',
            version: '1.0.0',
            name: 'Enhanced Field Mapping Template',
            description: 'Maps uploaded file fields to SKU database fields with confidence scoring',
            content: `You are a field mapping specialist for QueenOne ProductPrototype SKU management system.

TASK: Map uploaded file fields to our SKU database fields using intelligent analysis.

OUR SKU DATABASE FIELDS:
[SKU_FIELDS]

UPLOADED FILE ANALYSIS:
[UPLOADED_FIELDS]

MAPPING STRATEGY:
1. Exact name matching (confidence: 90-100)
2. Fuzzy string matching (confidence: 70-89)  
3. Semantic analysis of field names (confidence: 60-79)
4. Data pattern analysis (confidence: 50-69)
5. Only map fields with confidence > 60

SPECIAL HANDLING:
- Price fields (price, compareAtPrice) are stored in CENTS
- Boolean fields should map to true/false values
- Required fields: name, slug (if not provided, can be generated)

[IF:PREVIOUS_MAPPINGS]
HISTORICAL MAPPINGS (for reference):
[PREVIOUS_MAPPINGS]
[/IF:PREVIOUS_MAPPINGS]

RESPONSE FORMAT (JSON only):
{
  "mappings": [
    {
      "sourceField": "source_field_name",
      "targetField": "sku_field_name", 
      "confidence": 85,
      "strategy": "exact|fuzzy|semantic|pattern|historical",
      "reasoning": "Brief explanation of mapping decision",
      "dataTypeMatch": true|false,
      "transformationRequired": "none|format|convert|calculate"
    }
  ],
  "unmappedFields": ["field1", "field2"],
  "suggestions": [
    {
      "field": "unmapped_field",
      "reason": "Why this field couldn't be mapped",
      "suggestion": "Possible manual mapping suggestion"
    }
  ],
  "confidence": 85,
  "processingTime": "estimated_ms"
}`,
            variables: {
                SKU_FIELDS: {
                    name: 'SKU_FIELDS',
                    value: {},
                    required: true
                },
                UPLOADED_FIELDS: {
                    name: 'UPLOADED_FIELDS',
                    value: {},
                    required: true
                },
                PREVIOUS_MAPPINGS: {
                    name: 'PREVIOUS_MAPPINGS',
                    value: null,
                    required: false
                }
            },
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                author: 'QueenOne System',
                tags: ['field-mapping', 'ai', 'import'],
                usage: {
                    totalUsage: 0,
                    successRate: 0,
                    avgTokens: 0,
                    avgCost: 0
                }
            }
        };
        const templatePath = path.join(this.templatesPath, 'field-mapping-v1.json');
        await fs.writeFile(templatePath, JSON.stringify(fieldMappingTemplate, null, 2));
        console.log('Created default field mapping template');
    }
    /**
     * Get available templates
     */
    async getAvailableTemplates() {
        try {
            const files = await fs.readdir(this.templatesPath);
            return files.filter(file => file.endsWith('.json')).map(file => path.basename(file, '.json'));
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Create new template
     */
    async createTemplate(template) {
        const templatePath = path.join(this.templatesPath, `${template.id}.json`);
        await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
        this.templates.set(template.id, template);
    }
    /**
     * Get template metadata
     */
    getTemplateMetadata(templateId) {
        const template = this.templates.get(templateId);
        return template ? template.metadata : null;
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.watchers.forEach(watcher => watcher.close());
        this.watchers.clear();
        this.templates.clear();
        this.globalVariables.clear();
    }
}
export default PromptTemplateEngine;
//# sourceMappingURL=prompt-template-engine.js.map