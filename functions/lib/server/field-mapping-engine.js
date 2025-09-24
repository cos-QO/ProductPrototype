import { db } from './db';
import { fieldMappingCache } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { OpenRouterClient } from './services/openrouter-client';
// Product field definitions with variations and metadata
const PRODUCT_FIELD_DEFINITIONS = {
    // Core identification fields
    name: {
        variations: ['product_name', 'title', 'item_name', 'product_title', 'item_title'],
        required: true,
        dataType: 'string',
        description: 'Product name or title'
    },
    slug: {
        variations: ['product_slug', 'url_slug', 'permalink', 'handle'],
        required: false,
        dataType: 'string',
        description: 'URL-friendly product identifier'
    },
    sku: {
        variations: ['product_code', 'item_code', 'part_number', 'product_id', 'item_number'],
        required: false,
        dataType: 'string',
        description: 'Stock Keeping Unit identifier'
    },
    gtin: {
        variations: ['barcode', 'ean', 'upc', 'isbn', 'product_barcode'],
        required: false,
        dataType: 'string',
        description: 'Global Trade Item Number (barcode)'
    },
    // Description fields
    shortDescription: {
        variations: ['short_desc', 'brief_description', 'summary', 'excerpt', 'tagline'],
        required: false,
        dataType: 'string',
        description: 'Brief product description'
    },
    longDescription: {
        variations: ['description', 'long_desc', 'detailed_description', 'full_description', 'details', 'product_description'],
        required: false,
        dataType: 'string',
        description: 'Detailed product description'
    },
    story: {
        variations: ['product_story', 'brand_story', 'narrative', 'background'],
        required: false,
        dataType: 'string',
        description: 'Product or brand story'
    },
    // Pricing fields
    price: {
        variations: ['cost', 'retail_price', 'unit_price', 'selling_price', 'current_price', 'list_price'],
        required: false,
        dataType: 'number',
        description: 'Product selling price'
    },
    compareAtPrice: {
        variations: ['compare_at_price', 'original_price', 'msrp', 'rrp', 'was_price', 'crossed_price'],
        required: false,
        dataType: 'number',
        description: 'Original or compare-at price'
    },
    // Inventory fields
    stock: {
        variations: ['inventory', 'quantity', 'qty', 'stock_level', 'available', 'in_stock'],
        required: false,
        dataType: 'number',
        description: 'Available stock quantity'
    },
    lowStockThreshold: {
        variations: ['low_stock_threshold', 'min_stock', 'reorder_level', 'low_stock_alert'],
        required: false,
        dataType: 'number',
        description: 'Low stock alert threshold'
    },
    // Categorization fields
    brandId: {
        variations: ['brand_id', 'brand', 'manufacturer', 'brand_name', 'vendor'],
        required: false,
        dataType: 'number',
        description: 'Brand identifier or name'
    },
    status: {
        variations: ['product_status', 'state', 'active', 'published', 'visibility'],
        required: false,
        dataType: 'string',
        description: 'Product status (active, draft, archived)'
    },
    isVariant: {
        variations: ['is_variant', 'has_variants', 'variant', 'is_child'],
        required: false,
        dataType: 'boolean',
        description: 'Whether this is a product variant'
    },
    parentId: {
        variations: ['parent_id', 'parent_sku', 'master_product', 'variant_parent'],
        required: false,
        dataType: 'number',
        description: 'Parent product ID for variants'
    }
};
export class FieldMappingEngine {
    static instance;
    openRouterClient;
    targetFields = Object.keys(PRODUCT_FIELD_DEFINITIONS);
    static getInstance() {
        if (!FieldMappingEngine.instance) {
            FieldMappingEngine.instance = new FieldMappingEngine();
        }
        return FieldMappingEngine.instance;
    }
    constructor() {
        this.openRouterClient = OpenRouterClient.getInstance();
    }
    /**
     * Main entry point for generating field mappings using all 5 strategies
     */
    async generateMappings(sourceFields) {
        const mappings = [];
        const unmappedFields = [];
        // Strategy 1: Exact Match
        for (const sourceField of sourceFields) {
            const exactMapping = this.getExactMatch(sourceField);
            if (exactMapping) {
                mappings.push(exactMapping);
            }
            else {
                unmappedFields.push(sourceField);
            }
        }
        // Strategy 2: Fuzzy Match
        const remainingFields = [...unmappedFields];
        unmappedFields.length = 0;
        for (const sourceField of remainingFields) {
            const fuzzyMapping = this.getFuzzyMatch(sourceField);
            if (fuzzyMapping && fuzzyMapping.confidence > 70) {
                mappings.push(fuzzyMapping);
            }
            else {
                unmappedFields.push(sourceField);
            }
        }
        // Strategy 3: Historical Learning
        const historicalMappings = await this.getHistoricalMappings(unmappedFields);
        for (const mapping of historicalMappings) {
            if (mapping.confidence > 60) {
                mappings.push(mapping);
                const index = unmappedFields.findIndex(f => f.name === mapping.sourceField);
                if (index > -1)
                    unmappedFields.splice(index, 1);
            }
        }
        // Strategy 4: Statistical Inference
        const remainingFields2 = [...unmappedFields];
        unmappedFields.length = 0;
        for (const sourceField of remainingFields2) {
            const statisticalMapping = this.getStatisticalMapping(sourceField);
            if (statisticalMapping && statisticalMapping.confidence > 50) {
                mappings.push(statisticalMapping);
            }
            else {
                unmappedFields.push(sourceField);
            }
        }
        // Strategy 5: LLM Analysis (for remaining unmapped fields)
        if (unmappedFields.length > 0 && this.openRouterClient.isAvailable()) {
            try {
                const llmMappings = await this.getLLMMappings(unmappedFields);
                mappings.push(...llmMappings);
            }
            catch (error) {
                console.error('LLM mapping failed, continuing without it:', error);
            }
        }
        // Cache successful mappings for future learning
        await this.cacheMappings(mappings, sourceFields);
        return mappings;
    }
    /**
     * Strategy 1: Exact Match
     */
    getExactMatch(sourceField) {
        const sourceName = sourceField.name.toLowerCase().trim();
        // Direct exact match
        if (this.targetFields.includes(sourceName)) {
            return {
                sourceField: sourceField.name,
                targetField: sourceName,
                confidence: 100,
                strategy: 'exact'
            };
        }
        // Check variations
        for (const [targetField, definition] of Object.entries(PRODUCT_FIELD_DEFINITIONS)) {
            if (definition.variations.includes(sourceName)) {
                return {
                    sourceField: sourceField.name,
                    targetField,
                    confidence: 95,
                    strategy: 'exact'
                };
            }
        }
        return null;
    }
    /**
     * Strategy 2: Fuzzy Match
     */
    getFuzzyMatch(sourceField) {
        const sourceName = sourceField.name.toLowerCase().replace(/[_\s-]/g, '');
        let bestMatch = { target: '', confidence: 0 };
        // Check against target fields
        for (const targetField of this.targetFields) {
            const targetClean = targetField.toLowerCase().replace(/[_\s-]/g, '');
            const similarity = this.calculateSimilarity(sourceName, targetClean);
            if (similarity > bestMatch.confidence) {
                bestMatch = { target: targetField, confidence: similarity };
            }
        }
        // Check against variations
        for (const [targetField, definition] of Object.entries(PRODUCT_FIELD_DEFINITIONS)) {
            for (const variation of definition.variations) {
                const variationClean = variation.toLowerCase().replace(/[_\s-]/g, '');
                const similarity = this.calculateSimilarity(sourceName, variationClean);
                if (similarity > bestMatch.confidence) {
                    bestMatch = { target: targetField, confidence: similarity };
                }
            }
        }
        if (bestMatch.confidence > 60) {
            return {
                sourceField: sourceField.name,
                targetField: bestMatch.target,
                confidence: bestMatch.confidence,
                strategy: 'fuzzy'
            };
        }
        return null;
    }
    /**
     * Strategy 3: Historical Learning
     */
    async getHistoricalMappings(sourceFields) {
        const mappings = [];
        try {
            for (const sourceField of sourceFields) {
                const cached = await db.select()
                    .from(fieldMappingCache)
                    .where(eq(fieldMappingCache.sourceField, sourceField.name))
                    .orderBy(desc(fieldMappingCache.usageCount))
                    .limit(1);
                if (cached.length > 0) {
                    const mapping = cached[0];
                    // Update usage statistics
                    await db.update(fieldMappingCache)
                        .set({
                        usageCount: mapping.usageCount + 1,
                        lastUsedAt: new Date()
                    })
                        .where(eq(fieldMappingCache.id, mapping.id));
                    mappings.push({
                        sourceField: sourceField.name,
                        targetField: mapping.targetField,
                        confidence: mapping.confidence,
                        strategy: 'historical',
                        metadata: {
                            usageCount: mapping.usageCount + 1,
                            lastStrategy: mapping.strategy
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error('Error retrieving historical mappings:', error);
        }
        return mappings;
    }
    /**
     * Strategy 4: Statistical Inference
     */
    getStatisticalMapping(sourceField) {
        const fieldName = sourceField.name.toLowerCase();
        const dataType = sourceField.dataType;
        const sampleValues = sourceField.sampleValues;
        // Price-related patterns
        if (this.containsPatterns(fieldName, ['price', 'cost', 'amount', 'money', 'dollar'])) {
            if (this.containsPatterns(fieldName, ['compare', 'original', 'msrp', 'rrp', 'was', 'crossed'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'compareAtPrice',
                    confidence: 85,
                    strategy: 'statistical',
                    metadata: { pattern: 'compare_price', dataType }
                };
            }
            return {
                sourceField: sourceField.name,
                targetField: 'price',
                confidence: 80,
                strategy: 'statistical',
                metadata: { pattern: 'price', dataType }
            };
        }
        // Stock/Inventory patterns
        if (this.containsPatterns(fieldName, ['stock', 'inventory', 'quantity', 'qty', 'available', 'count'])) {
            if (this.containsPatterns(fieldName, ['low', 'min', 'threshold', 'alert', 'reorder'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'lowStockThreshold',
                    confidence: 80,
                    strategy: 'statistical',
                    metadata: { pattern: 'low_stock', dataType }
                };
            }
            return {
                sourceField: sourceField.name,
                targetField: 'stock',
                confidence: 75,
                strategy: 'statistical',
                metadata: { pattern: 'inventory', dataType }
            };
        }
        // Description patterns
        if (this.containsPatterns(fieldName, ['description', 'desc', 'details', 'info'])) {
            if (this.containsPatterns(fieldName, ['short', 'brief', 'summary', 'excerpt'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'shortDescription',
                    confidence: 80,
                    strategy: 'statistical',
                    metadata: { pattern: 'short_description', dataType }
                };
            }
            if (this.containsPatterns(fieldName, ['long', 'detailed', 'full', 'complete'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'longDescription',
                    confidence: 80,
                    strategy: 'statistical',
                    metadata: { pattern: 'long_description', dataType }
                };
            }
            return {
                sourceField: sourceField.name,
                targetField: 'shortDescription',
                confidence: 70,
                strategy: 'statistical',
                metadata: { pattern: 'description', dataType }
            };
        }
        // Identifier patterns
        if (this.containsPatterns(fieldName, ['sku', 'code', 'id', 'number', 'identifier'])) {
            if (this.containsPatterns(fieldName, ['product', 'item', 'part'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'sku',
                    confidence: 80,
                    strategy: 'statistical',
                    metadata: { pattern: 'identifier', dataType }
                };
            }
        }
        // Barcode patterns
        if (this.containsPatterns(fieldName, ['barcode', 'gtin', 'ean', 'upc', 'isbn'])) {
            return {
                sourceField: sourceField.name,
                targetField: 'gtin',
                confidence: 85,
                strategy: 'statistical',
                metadata: { pattern: 'barcode', dataType }
            };
        }
        // Brand patterns
        if (this.containsPatterns(fieldName, ['brand', 'manufacturer', 'vendor', 'company'])) {
            return {
                sourceField: sourceField.name,
                targetField: 'brandId',
                confidence: 75,
                strategy: 'statistical',
                metadata: { pattern: 'brand', dataType }
            };
        }
        // Status patterns
        if (this.containsPatterns(fieldName, ['status', 'state', 'active', 'published', 'enabled'])) {
            return {
                sourceField: sourceField.name,
                targetField: 'status',
                confidence: 75,
                strategy: 'statistical',
                metadata: { pattern: 'status', dataType }
            };
        }
        // Variant patterns
        if (this.containsPatterns(fieldName, ['variant', 'child', 'variation', 'option'])) {
            if (dataType === 'boolean' || this.isBooleanLike(sampleValues)) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'isVariant',
                    confidence: 80,
                    strategy: 'statistical',
                    metadata: { pattern: 'variant_boolean', dataType }
                };
            }
            if (this.containsPatterns(fieldName, ['parent', 'master', 'main'])) {
                return {
                    sourceField: sourceField.name,
                    targetField: 'parentId',
                    confidence: 75,
                    strategy: 'statistical',
                    metadata: { pattern: 'parent_id', dataType }
                };
            }
        }
        return null;
    }
    /**
     * Strategy 5: LLM Analysis
     */
    async getLLMMappings(sourceFields) {
        if (!this.openRouterClient.isAvailable() || sourceFields.length === 0) {
            return [];
        }
        try {
            const headers = sourceFields.map(f => f.name);
            const sampleData = sourceFields.map(f => f.sampleValues.slice(0, 3));
            // Transpose sample data for OpenRouter format
            const transposedData = [];
            for (let i = 0; i < Math.max(...sampleData.map(arr => arr.length)); i++) {
                transposedData.push(sampleData.map(arr => arr[i] || null));
            }
            const result = await this.openRouterClient.analyzeFieldMapping(headers, transposedData, this.targetFields, 'Product data import field mapping');
            if (!result.success) {
                console.error('OpenRouter field mapping failed:', result.error);
                return [];
            }
            return this.convertLLMResponseToMappings(result.mappings || [], sourceFields);
        }
        catch (error) {
            console.error('LLM mapping error:', error);
            return [];
        }
    }
    convertLLMResponseToMappings(llmMappings, sourceFields) {
        const mappings = [];
        for (const llmMapping of llmMappings) {
            // Skip unmapped fields or fields with very low confidence
            if (llmMapping.targetField === 'unmapped' || llmMapping.confidence < 60) {
                continue;
            }
            // Verify the source field exists
            const sourceField = sourceFields.find(f => f.name === llmMapping.sourceField);
            if (sourceField && this.targetFields.includes(llmMapping.targetField)) {
                mappings.push({
                    sourceField: llmMapping.sourceField,
                    targetField: llmMapping.targetField,
                    confidence: Math.min(95, llmMapping.confidence), // Cap LLM confidence at 95%
                    strategy: 'llm',
                    metadata: {
                        reasoning: llmMapping.reasoning,
                        llmModel: 'gpt-4o-mini',
                        llmConfidence: llmMapping.confidence
                    }
                });
            }
        }
        return mappings;
    }
    // Helper methods
    calculateSimilarity(str1, str2) {
        if (str1 === str2)
            return 100;
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 100;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return ((longer.length - editDistance) / longer.length) * 100;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    containsPatterns(text, patterns) {
        return patterns.some(pattern => text.includes(pattern));
    }
    isBooleanLike(values) {
        if (values.length === 0)
            return false;
        const booleanLike = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'];
        return values.every(val => typeof val === 'boolean' ||
            booleanLike.includes(String(val).toLowerCase()));
    }
    async cacheMappings(mappings, sourceFields) {
        try {
            for (const mapping of mappings) {
                const sourceField = sourceFields.find(f => f.name === mapping.sourceField);
                if (!sourceField)
                    continue;
                const cacheData = {
                    sourceField: mapping.sourceField,
                    targetField: mapping.targetField,
                    confidence: mapping.confidence,
                    strategy: mapping.strategy,
                    dataType: sourceField.dataType,
                    sampleValues: sourceField.sampleValues,
                    metadata: {
                        ...mapping.metadata,
                        nullPercentage: sourceField.nullPercentage,
                        uniquePercentage: sourceField.uniquePercentage,
                        isRequired: sourceField.isRequired
                    }
                };
                // Check if mapping already exists
                const existing = await db.select()
                    .from(fieldMappingCache)
                    .where(and(eq(fieldMappingCache.sourceField, mapping.sourceField), eq(fieldMappingCache.targetField, mapping.targetField)))
                    .limit(1);
                if (existing.length > 0) {
                    // Update existing mapping
                    await db.update(fieldMappingCache)
                        .set({
                        usageCount: existing[0].usageCount + 1,
                        confidence: Math.max(existing[0].confidence, mapping.confidence),
                        lastUsedAt: new Date(),
                        strategy: mapping.strategy // Update to latest strategy
                    })
                        .where(eq(fieldMappingCache.id, existing[0].id));
                }
                else {
                    // Insert new mapping
                    await db.insert(fieldMappingCache).values(cacheData);
                }
            }
        }
        catch (error) {
            console.error('Error caching mappings:', error);
        }
    }
    /**
     * Get mapping suggestions for a specific source field
     */
    async getSuggestionsForField(sourceField) {
        const suggestions = [];
        // Try all strategies for this field
        const exactMatch = this.getExactMatch(sourceField);
        if (exactMatch)
            suggestions.push(exactMatch);
        const fuzzyMatch = this.getFuzzyMatch(sourceField);
        if (fuzzyMatch)
            suggestions.push(fuzzyMatch);
        const historicalMappings = await this.getHistoricalMappings([sourceField]);
        suggestions.push(...historicalMappings);
        const statisticalMapping = this.getStatisticalMapping(sourceField);
        if (statisticalMapping)
            suggestions.push(statisticalMapping);
        if (this.openRouterClient.isAvailable()) {
            try {
                const llmMappings = await this.getLLMMappings([sourceField]);
                suggestions.push(...llmMappings);
            }
            catch (error) {
                console.error('LLM suggestion failed:', error);
            }
        }
        // Sort by confidence and remove duplicates
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .filter((mapping, index, self) => self.findIndex(m => m.targetField === mapping.targetField) === index);
    }
    /**
     * Validate a set of field mappings
     */
    validateMappings(mappings) {
        const errors = [];
        const warnings = [];
        const targetFieldsUsed = new Set();
        for (const mapping of mappings) {
            // Check for duplicate target fields
            if (targetFieldsUsed.has(mapping.targetField)) {
                errors.push(`Target field '${mapping.targetField}' is mapped multiple times`);
            }
            targetFieldsUsed.add(mapping.targetField);
            // Check if target field exists
            if (!this.targetFields.includes(mapping.targetField)) {
                errors.push(`Unknown target field: ${mapping.targetField}`);
            }
            // Low confidence warnings
            if (mapping.confidence < 70) {
                warnings.push(`Low confidence mapping: ${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}%)`);
            }
        }
        // Check for required fields
        const requiredFields = Object.entries(PRODUCT_FIELD_DEFINITIONS)
            .filter(([_, def]) => def.required)
            .map(([field, _]) => field);
        for (const requiredField of requiredFields) {
            if (!targetFieldsUsed.has(requiredField)) {
                warnings.push(`Required field '${requiredField}' is not mapped`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}
// Export singleton instance
export const fieldMappingEngine = FieldMappingEngine.getInstance();
//# sourceMappingURL=field-mapping-engine.js.map