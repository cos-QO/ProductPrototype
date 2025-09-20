import { PromptTemplateEngine } from "./prompt-template-engine.js";
import { OpenRouterClient } from "./openrouter-client.js";
import { FieldExtractionService, } from "./field-extraction-service.js";
import { db } from "../db";
import { fieldMappingCache } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
// SKU Database Fields Configuration
const SKU_FIELDS = {
    // Core identification
    id: {
        type: "string",
        required: false,
        description: "Auto-generated unique identifier",
    },
    name: {
        type: "string",
        required: true,
        description: "Product name/title (required)",
    },
    slug: {
        type: "string",
        required: true,
        description: "URL-friendly identifier",
    },
    sku: {
        type: "string",
        required: false,
        description: "Stock keeping unit identifier",
    },
    gtin: {
        type: "string",
        required: false,
        description: "Global trade item number (barcode)",
    },
    // Descriptions
    shortDescription: {
        type: "string",
        required: false,
        description: "Brief product description",
    },
    longDescription: {
        type: "string",
        required: false,
        description: "Detailed product description",
    },
    story: {
        type: "string",
        required: false,
        description: "Product or brand story",
    },
    // Pricing (stored in cents)
    price: {
        type: "number",
        required: false,
        description: "Product selling price in cents",
    },
    compareAtPrice: {
        type: "number",
        required: false,
        description: "Original/MSRP price in cents",
    },
    // Inventory
    stock: {
        type: "number",
        required: false,
        description: "Available stock quantity",
    },
    lowStockThreshold: {
        type: "number",
        required: false,
        description: "Low stock alert threshold",
    },
    // Product attributes
    brandId: {
        type: "string",
        required: false,
        description: "Brand identifier (foreign key)",
    },
    parentId: {
        type: "string",
        required: false,
        description: "Parent product ID for variants",
    },
    status: {
        type: "string",
        required: false,
        description: "Product status (draft, review, live, archived)",
    },
    isVariant: {
        type: "boolean",
        required: false,
        description: "Whether this is a product variant",
    },
    // Timestamps (auto-generated)
    createdAt: {
        type: "date",
        required: false,
        description: "Creation timestamp (auto-generated)",
    },
    updatedAt: {
        type: "date",
        required: false,
        description: "Last update timestamp (auto-generated)",
    },
};
export class MultiStrategyFieldMapping {
    static instance;
    promptEngine;
    openRouterClient;
    fieldExtraction;
    // Strategy configuration
    MIN_CONFIDENCE = 60;
    PARALLEL_EXECUTION = true;
    EARLY_TERMINATION = true;
    MAX_COST_PER_SESSION = 0.005; // $0.005 - increased for realistic LLM usage
    static getInstance() {
        if (!MultiStrategyFieldMapping.instance) {
            MultiStrategyFieldMapping.instance = new MultiStrategyFieldMapping();
        }
        return MultiStrategyFieldMapping.instance;
    }
    constructor() {
        this.promptEngine = PromptTemplateEngine.getInstance();
        this.openRouterClient = OpenRouterClient.getInstance();
        this.fieldExtraction = FieldExtractionService.getInstance();
        this.initializePromptVariables();
    }
    /**
     * Main entry point: Multi-strategy field mapping with parallel execution
     */
    async generateMappings(extractedFields) {
        const startTime = Date.now();
        try {
            // Initialize mapping context
            const context = {
                sourceFields: extractedFields.fields,
                targetFields: Object.keys(SKU_FIELDS),
                extractedData: extractedFields,
                processingTime: 0,
                totalCost: 0,
            };
            // Execute strategies in parallel with early termination
            const strategyResults = await this.executeStrategiesParallel(context);
            // Aggregate and rank results
            const finalMappings = await this.aggregateResults(strategyResults, context);
            // Learn from successful mappings
            await this.updateLearningCache(finalMappings.mappings);
            const processingTime = Date.now() - startTime;
            return {
                success: true,
                mappings: finalMappings.mappings,
                unmappedFields: finalMappings.unmappedFields,
                confidence: finalMappings.confidence,
                processingTime,
                strategiesUsed: strategyResults.map((r) => r.strategy),
                cost: context.totalCost,
            };
        }
        catch (error) {
            return {
                success: false,
                mappings: [],
                unmappedFields: extractedFields.fields.map((f) => f.name),
                confidence: 0,
                processingTime: Date.now() - startTime,
                strategiesUsed: [],
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Execute all strategies in parallel with early termination
     */
    async executeStrategiesParallel(context) {
        const strategies = [
            () => this.strategy1ExactMatching(context),
            () => this.strategy2FuzzyMatching(context),
            () => this.strategy3SemanticAnalysis(context),
            () => this.strategy4HistoricalLearning(context),
            () => this.strategy5LLMPowered(context),
        ];
        const results = [];
        const promises = strategies.map(async (strategy, index) => {
            try {
                const result = await strategy();
                return { index, result };
            }
            catch (error) {
                console.warn(`Strategy ${index + 1} failed:`, error);
                return { index, result: null };
            }
        });
        // Wait for all strategies to complete or timeout
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 10000)); // 10s timeout
        const completedResults = await Promise.race([
            Promise.allSettled(promises),
            timeoutPromise,
        ]);
        if (Array.isArray(completedResults)) {
            completedResults.forEach((result, index) => {
                if (result.status === "fulfilled" && result.value.result) {
                    results.push(result.value.result);
                }
            });
        }
        return results;
    }
    /**
     * Strategy 1: Exact Field Name Matching (90-100% confidence)
     */
    async strategy1ExactMatching(context) {
        const startTime = Date.now();
        const mappings = [];
        for (const sourceField of context.sourceFields) {
            const fieldName = sourceField.name.toLowerCase();
            const targetField = Object.keys(SKU_FIELDS).find((target) => target.toLowerCase() === fieldName);
            if (targetField) {
                mappings.push({
                    sourceField: sourceField.name,
                    targetField,
                    confidence: 95,
                    strategy: "exact",
                    reasoning: "Exact field name match",
                    metadata: {
                        score: 95,
                        dataTypeMatch: this.checkDataTypeMatch(sourceField, targetField),
                    },
                });
            }
        }
        return {
            strategy: "exact",
            mappings,
            confidence: mappings.length > 0 ? 95 : 0,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Strategy 2: Fuzzy String Matching (70-89% confidence)
     */
    async strategy2FuzzyMatching(context) {
        const startTime = Date.now();
        const mappings = [];
        for (const sourceField of context.sourceFields) {
            let bestMatch = null;
            for (const targetField of context.targetFields) {
                const similarity = this.calculateStringSimilarity(sourceField.name.toLowerCase(), targetField.toLowerCase());
                if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.score)) {
                    bestMatch = { target: targetField, score: similarity };
                }
            }
            if (bestMatch && bestMatch.score > 0.7) {
                const confidence = Math.round(bestMatch.score * 85); // Max 85% for fuzzy
                mappings.push({
                    sourceField: sourceField.name,
                    targetField: bestMatch.target,
                    confidence,
                    strategy: "fuzzy",
                    reasoning: `Fuzzy string match (${Math.round(bestMatch.score * 100)}% similarity)`,
                    metadata: {
                        score: confidence,
                        similarityScore: bestMatch.score,
                        dataTypeMatch: this.checkDataTypeMatch(sourceField, bestMatch.target),
                    },
                });
            }
        }
        return {
            strategy: "fuzzy",
            mappings,
            confidence: mappings.length > 0
                ? Math.round(mappings.reduce((sum, m) => sum + m.confidence, 0) /
                    mappings.length)
                : 0,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Strategy 3: Semantic Analysis (60-79% confidence)
     */
    async strategy3SemanticAnalysis(context) {
        const startTime = Date.now();
        const mappings = [];
        // Semantic mapping rules based on field patterns and content
        const semanticRules = this.getSemanticMappingRules();
        for (const sourceField of context.sourceFields) {
            const fieldName = sourceField.name.toLowerCase();
            const sampleValues = sourceField.sampleValues || [];
            for (const rule of semanticRules) {
                if (rule.pattern.test(fieldName) || rule.contentMatcher(sampleValues)) {
                    const confidence = this.calculateSemanticConfidence(sourceField, rule);
                    if (confidence >= this.MIN_CONFIDENCE) {
                        mappings.push({
                            sourceField: sourceField.name,
                            targetField: rule.targetField,
                            confidence,
                            strategy: "semantic",
                            reasoning: rule.reasoning,
                            metadata: {
                                score: confidence,
                                patternMatch: rule.pattern.test(fieldName),
                                dataTypeMatch: this.checkDataTypeMatch(sourceField, rule.targetField),
                            },
                        });
                        break; // Take first matching rule
                    }
                }
            }
        }
        return {
            strategy: "semantic",
            mappings,
            confidence: mappings.length > 0
                ? Math.round(mappings.reduce((sum, m) => sum + m.confidence, 0) /
                    mappings.length)
                : 0,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Strategy 4: Historical Learning (50-69% confidence)
     */
    async strategy4HistoricalLearning(context) {
        const startTime = Date.now();
        const mappings = [];
        try {
            // Query fieldMappingCache for similar field patterns
            const historicalMappings = await db
                .select()
                .from(fieldMappingCache)
                .orderBy(desc(fieldMappingCache.usageCount))
                .limit(100);
            for (const sourceField of context.sourceFields) {
                const fieldName = sourceField.name.toLowerCase();
                // Find best historical match
                let bestMatch = null;
                for (const historical of historicalMappings) {
                    const similarity = this.calculateStringSimilarity(fieldName, historical.sourceField.toLowerCase());
                    if (similarity > 0.6 &&
                        (!bestMatch || similarity > bestMatch.score)) {
                        bestMatch = { mapping: historical, score: similarity };
                    }
                }
                if (bestMatch) {
                    const confidence = Math.round(bestMatch.score * 65); // Max 65% for historical
                    mappings.push({
                        sourceField: sourceField.name,
                        targetField: bestMatch.mapping.targetField,
                        confidence,
                        strategy: "historical",
                        reasoning: `Historical pattern match (used ${bestMatch.mapping.usageCount} times)`,
                        metadata: {
                            score: confidence,
                            historicalUsage: bestMatch.mapping.usageCount,
                            similarityScore: bestMatch.score,
                            dataTypeMatch: this.checkDataTypeMatch(sourceField, bestMatch.mapping.targetField),
                        },
                    });
                }
            }
        }
        catch (error) {
            console.warn("Historical learning strategy failed:", error);
        }
        return {
            strategy: "historical",
            mappings,
            confidence: mappings.length > 0
                ? Math.round(mappings.reduce((sum, m) => sum + m.confidence, 0) /
                    mappings.length)
                : 0,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Strategy 5: LLM-Powered Mapping (40-89% confidence)
     */
    async strategy5LLMPowered(context) {
        const startTime = Date.now();
        if (!this.openRouterClient.isAvailable() ||
            context.totalCost >= this.MAX_COST_PER_SESSION) {
            return {
                strategy: "llm",
                mappings: [],
                confidence: 0,
                processingTime: Date.now() - startTime,
            };
        }
        try {
            // Prepare template variables
            const templateVariables = {
                SKU_FIELDS: this.formatSkuFieldsForLLM(),
                uploadedFields: {
                    fields: context.sourceFields,
                    sampleData: context.extractedData.sampleData,
                    fileType: context.extractedData.fileType,
                },
                PREVIOUS_MAPPINGS: await this.getHistoricalMappingsForContext(),
            };
            // Compile prompt using template engine
            const prompt = await this.promptEngine.compile("field-mapping-v1", templateVariables);
            // Query LLM
            const result = await this.openRouterClient.createCompletion({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
                temperature: 0.1,
            }, {
                costLimit: this.MAX_COST_PER_SESSION - context.totalCost,
            });
            if (!result.success) {
                throw new Error(result.error || "LLM request failed");
            }
            context.totalCost += result.usage?.cost || 0;
            // Parse LLM response
            const llmMappings = this.parseLLMResponse(result.data.choices[0].message.content);
            return {
                strategy: "llm",
                mappings: llmMappings,
                confidence: llmMappings.length > 0
                    ? Math.round(llmMappings.reduce((sum, m) => sum + m.confidence, 0) /
                        llmMappings.length)
                    : 0,
                processingTime: Date.now() - startTime,
                cost: result.usage?.cost,
            };
        }
        catch (error) {
            console.warn("LLM strategy failed:", error);
            return {
                strategy: "llm",
                mappings: [],
                confidence: 0,
                processingTime: Date.now() - startTime,
            };
        }
    }
    /**
     * Aggregate results from all strategies and select best mappings
     */
    async aggregateResults(strategyResults, context) {
        // Collect all mappings by source field
        const mappingsBySource = new Map();
        strategyResults.forEach((result) => {
            result.mappings.forEach((mapping) => {
                if (!mappingsBySource.has(mapping.sourceField)) {
                    mappingsBySource.set(mapping.sourceField, []);
                }
                mappingsBySource.get(mapping.sourceField).push(mapping);
            });
        });
        // Select best mapping for each source field
        const finalMappings = [];
        const mappedSources = new Set();
        mappingsBySource.forEach((mappings, sourceField) => {
            // Sort by confidence and strategy priority
            mappings.sort((a, b) => {
                if (a.confidence !== b.confidence) {
                    return b.confidence - a.confidence;
                }
                // Strategy priority: exact > fuzzy > semantic > historical > llm
                const strategyPriority = {
                    exact: 5,
                    fuzzy: 4,
                    semantic: 3,
                    historical: 2,
                    llm: 1,
                };
                return strategyPriority[b.strategy] - strategyPriority[a.strategy];
            });
            const bestMapping = mappings[0];
            if (bestMapping.confidence >= this.MIN_CONFIDENCE) {
                finalMappings.push(bestMapping);
                mappedSources.add(sourceField);
            }
        });
        // Identify unmapped fields
        const unmappedFields = context.sourceFields
            .map((f) => f.name)
            .filter((name) => !mappedSources.has(name));
        // Calculate overall confidence
        const overallConfidence = finalMappings.length > 0
            ? Math.round(finalMappings.reduce((sum, m) => sum + m.confidence, 0) /
                finalMappings.length)
            : 0;
        return {
            mappings: finalMappings,
            unmappedFields,
            confidence: overallConfidence,
        };
    }
    /**
     * Helper methods
     */
    calculateStringSimilarity(str1, str2) {
        // Levenshtein distance-based similarity
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0)
            return 1;
        const distance = this.levenshteinDistance(str1, str2);
        return (maxLength - distance) / maxLength;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    checkDataTypeMatch(sourceField, targetFieldName) {
        const targetField = SKU_FIELDS[targetFieldName];
        if (!targetField)
            return false;
        // Type compatibility matrix
        const typeCompatibility = {
            string: ["string", "text"],
            number: ["number", "integer", "float", "decimal"],
            boolean: ["boolean", "bool"],
            date: ["date", "datetime", "timestamp"],
        };
        const sourceType = sourceField.dataType;
        const targetType = targetField.type;
        return typeCompatibility[targetType]?.includes(sourceType) || false;
    }
    getSemanticMappingRules() {
        return [
            {
                pattern: /^(product_name|productname|title|product_title|item_name)$/i,
                targetField: "name",
                reasoning: "Product name pattern match",
                contentMatcher: (values) => values.some((v) => typeof v === "string" && v.length > 3),
            },
            {
                pattern: /^(sku|product_code|item_code|part_number|model)$/i,
                targetField: "sku",
                reasoning: "SKU/product code pattern match",
                contentMatcher: (values) => values.some((v) => /^[A-Z0-9\-_]+$/i.test(String(v))),
            },
            {
                pattern: /^(price|cost|amount|selling_price|unit_price)$/i,
                targetField: "price",
                reasoning: "Price field pattern match",
                contentMatcher: (values) => values.some((v) => !isNaN(parseFloat(String(v)))),
            },
            {
                pattern: /^(description|desc|product_description|details)$/i,
                targetField: "shortDescription",
                reasoning: "Description field pattern match",
                contentMatcher: (values) => values.some((v) => typeof v === "string" && v.length > 10),
            },
            {
                pattern: /^(stock|inventory|quantity|qty|available)$/i,
                targetField: "stock",
                reasoning: "Stock/inventory pattern match",
                contentMatcher: (values) => values.some((v) => Number.isInteger(Number(v))),
            },
            {
                pattern: /^(barcode|upc|ean|gtin)$/i,
                targetField: "gtin",
                reasoning: "Barcode/GTIN pattern match",
                contentMatcher: (values) => values.some((v) => /^\d{8,14}$/.test(String(v))),
            },
        ];
    }
    calculateSemanticConfidence(sourceField, rule) {
        let confidence = 65; // Base semantic confidence
        // Boost for pattern match
        if (rule.pattern.test(sourceField.name.toLowerCase())) {
            confidence += 10;
        }
        // Boost for content match
        if (rule.contentMatcher(sourceField.sampleValues || [])) {
            confidence += 5;
        }
        // Adjust based on data quality
        if (sourceField.nullPercentage < 10) {
            confidence += 5;
        }
        return Math.min(79, Math.max(this.MIN_CONFIDENCE, confidence));
    }
    formatSkuFieldsForLLM() {
        const formatted = {};
        Object.entries(SKU_FIELDS).forEach(([field, config]) => {
            formatted[field] = config.description;
        });
        return formatted;
    }
    parseLLMResponse(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                return [];
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
                return [];
            }
            return parsed.mappings
                .filter((mapping) => mapping.confidence >= this.MIN_CONFIDENCE)
                .map((mapping) => ({
                sourceField: mapping.sourceField,
                targetField: mapping.targetField,
                confidence: Math.min(89, Math.max(40, mapping.confidence)), // LLM confidence range
                strategy: "llm",
                reasoning: mapping.reasoning || "LLM-powered mapping",
                metadata: {
                    score: mapping.confidence,
                    dataTypeMatch: mapping.dataTypeMatch,
                    transformationRequired: mapping.transformationRequired,
                },
            }));
        }
        catch (error) {
            console.error("Failed to parse LLM response:", error);
            return [];
        }
    }
    async updateLearningCache(mappings) {
        try {
            for (const mapping of mappings) {
                if (mapping.confidence >= 70) {
                    // Only cache high-confidence mappings
                    // Check if mapping already exists
                    const existing = await db
                        .select()
                        .from(fieldMappingCache)
                        .where(eq(fieldMappingCache.sourceField, mapping.sourceField.toLowerCase()))
                        .limit(1);
                    if (existing.length > 0) {
                        // Update usage count
                        await db
                            .update(fieldMappingCache)
                            .set({
                            usageCount: existing[0].usageCount + 1,
                            lastUsedAt: new Date(),
                        })
                            .where(eq(fieldMappingCache.sourceField, mapping.sourceField.toLowerCase()));
                    }
                    else {
                        // Insert new mapping
                        await db.insert(fieldMappingCache).values({
                            sourceField: mapping.sourceField.toLowerCase(),
                            targetField: mapping.targetField,
                            confidence: mapping.confidence,
                            strategy: mapping.strategy,
                            dataType: "string", // Default data type
                            usageCount: 1,
                            metadata: mapping.metadata || {},
                            lastUsedAt: new Date(),
                        });
                    }
                }
            }
        }
        catch (error) {
            console.warn("Failed to update learning cache:", error);
        }
    }
    initializePromptVariables() {
        this.promptEngine.addVariable("SKU_FIELDS", this.formatSkuFieldsForLLM());
    }
    /**
     * Get historical mappings for LLM context
     */
    async getHistoricalMappingsForContext() {
        try {
            const recentMappings = await db
                .select()
                .from(fieldMappingCache)
                .orderBy(desc(fieldMappingCache.lastUsedAt))
                .limit(10); // Last 10 successful mappings
            if (recentMappings.length === 0) {
                return null;
            }
            return recentMappings
                .map((mapping) => `${mapping.sourceField} → ${mapping.targetField} (${mapping.confidence}% via ${mapping.strategy}, used ${mapping.usageCount} times)`)
                .join("\n");
        }
        catch (error) {
            console.warn("Failed to fetch historical mappings for context:", error);
            return null;
        }
    }
    /**
     * Get strategy statistics
     */
    async getStrategyStatistics() {
        try {
            const stats = await db
                .select()
                .from(fieldMappingCache)
                .orderBy(desc(fieldMappingCache.lastUsedAt))
                .limit(100);
            const strategyStats = stats.reduce((acc, mapping) => {
                if (!acc[mapping.strategy]) {
                    acc[mapping.strategy] = { count: 0, avgConfidence: 0, totalUsage: 0 };
                }
                acc[mapping.strategy].count++;
                acc[mapping.strategy].avgConfidence += mapping.confidence;
                acc[mapping.strategy].totalUsage += mapping.usageCount;
                return acc;
            }, {});
            // Calculate averages
            Object.keys(strategyStats).forEach((strategy) => {
                strategyStats[strategy].avgConfidence /= strategyStats[strategy].count;
            });
            return strategyStats;
        }
        catch (error) {
            return {};
        }
    }
}
export default MultiStrategyFieldMapping;
//# sourceMappingURL=multi-strategy-field-mapping.js.map