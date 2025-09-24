import { db } from "../db";
import { fieldMappingCache } from "@shared/schema";
import { eq, desc, and, sql, gt } from "drizzle-orm";
export class LearningSystem {
    static instance;
    // Configuration
    MIN_USAGE_FOR_PATTERN = 3; // Minimum usage to consider pattern reliable
    MIN_SUCCESS_RATE = 70; // Minimum success rate to suggest pattern
    CACHE_WARM_THRESHOLD = 10; // Minimum usages to warm cache
    static getInstance() {
        if (!LearningSystem.instance) {
            LearningSystem.instance = new LearningSystem();
        }
        return LearningSystem.instance;
    }
    /**
     * Learn from successful field mapping
     */
    async learnFromMapping(sourceField, targetField, confidence, strategy, metadata = {}) {
        try {
            const normalizedSource = this.normalizeFieldName(sourceField);
            // Check if pattern already exists
            const existing = await db
                .select()
                .from(fieldMappingCache)
                .where(eq(fieldMappingCache.sourceFieldPattern, normalizedSource))
                .limit(1);
            if (existing.length > 0) {
                // Update existing pattern
                const current = existing[0];
                const newUsageCount = current.usageCount + 1;
                const newSuccessRate = this.calculateUpdatedSuccessRate(current.successRate, current.usageCount, confidence);
                await db
                    .update(fieldMappingCache)
                    .set({
                    usageCount: newUsageCount,
                    successRate: newSuccessRate,
                    confidence: Math.max(current.confidence, confidence), // Keep highest confidence seen
                    lastUsedAt: new Date(),
                    metadata: {
                        ...current.metadata,
                        ...metadata,
                        strategies: [
                            ...(current.metadata.strategies || []),
                            strategy,
                        ].slice(-10), // Keep last 10 strategies
                    },
                })
                    .where(eq(fieldMappingCache.sourceFieldPattern, normalizedSource));
                console.log(`Updated learning pattern: ${normalizedSource} → ${targetField} (usage: ${newUsageCount}, success: ${newSuccessRate.toFixed(1)}%)`);
            }
            else {
                // Create new pattern
                await db.insert(fieldMappingCache).values({
                    sourceFieldPattern: normalizedSource,
                    targetField,
                    confidence,
                    strategy,
                    usageCount: 1,
                    successRate: confidence,
                    metadata: {
                        ...metadata,
                        strategies: [strategy],
                        firstSeenAt: new Date().toISOString(),
                    },
                    lastUsedAt: new Date(),
                });
                console.log(`Learned new pattern: ${normalizedSource} → ${targetField} (confidence: ${confidence}%)`);
            }
            // Update pattern variations for fuzzy matching
            await this.updatePatternVariations(sourceField, targetField, confidence, strategy);
        }
        catch (error) {
            console.error("Failed to learn from mapping:", error);
        }
    }
    /**
     * Get learning-based suggestions for field mapping
     */
    async getSuggestions(sourceFields) {
        try {
            const suggestions = [];
            for (const sourceField of sourceFields) {
                const fieldSuggestions = await this.getSuggestionsForField(sourceField);
                if (fieldSuggestions.suggestions.length > 0) {
                    suggestions.push(fieldSuggestions);
                }
            }
            return suggestions;
        }
        catch (error) {
            console.error("Failed to get learning suggestions:", error);
            return [];
        }
    }
    /**
     * Get suggestions for a single field
     */
    async getSuggestionsForField(sourceField) {
        const normalizedField = this.normalizeFieldName(sourceField);
        const suggestions = [];
        // 1. Exact pattern match
        const exactMatches = await db
            .select()
            .from(fieldMappingCache)
            .where(and(eq(fieldMappingCache.sourceFieldPattern, normalizedField), gt(fieldMappingCache.usageCount, this.MIN_USAGE_FOR_PATTERN), gt(fieldMappingCache.successRate, this.MIN_SUCCESS_RATE)))
            .orderBy(desc(fieldMappingCache.usageCount));
        for (const match of exactMatches) {
            suggestions.push({
                pattern: match.sourceFieldPattern,
                targetField: match.targetField,
                predictedConfidence: Math.min(95, match.successRate), // Cap at 95% for historical
                reasoning: `Exact pattern match (used ${match.usageCount} times)`,
                historicalData: {
                    totalUsage: match.usageCount,
                    successRate: match.successRate,
                    avgConfidence: match.confidence,
                    mostCommonStrategy: this.getMostCommonStrategy(match.metadata.strategies || []),
                },
            });
        }
        // 2. Fuzzy pattern matching
        if (suggestions.length === 0) {
            const fuzzyMatches = await this.getFuzzyMatches(normalizedField);
            suggestions.push(...fuzzyMatches);
        }
        // 3. Partial pattern matching
        if (suggestions.length === 0) {
            const partialMatches = await this.getPartialMatches(normalizedField);
            suggestions.push(...partialMatches);
        }
        // Calculate overall confidence
        const confidence = suggestions.length > 0
            ? Math.max(...suggestions.map((s) => s.predictedConfidence))
            : 0;
        return {
            sourceField,
            suggestions: suggestions.slice(0, 3), // Top 3 suggestions
            confidence,
        };
    }
    /**
     * Get fuzzy pattern matches
     */
    async getFuzzyMatches(normalizedField) {
        const allPatterns = await db
            .select()
            .from(fieldMappingCache)
            .where(and(gt(fieldMappingCache.usageCount, this.MIN_USAGE_FOR_PATTERN), gt(fieldMappingCache.successRate, this.MIN_SUCCESS_RATE)))
            .orderBy(desc(fieldMappingCache.usageCount));
        const fuzzyMatches = [];
        for (const pattern of allPatterns) {
            const similarity = this.calculateSimilarity(normalizedField, pattern.sourceFieldPattern);
            if (similarity > 0.7) {
                // 70% similarity threshold
                const adjustedConfidence = Math.round(pattern.successRate * similarity * 0.8); // Reduce confidence for fuzzy
                if (adjustedConfidence > this.MIN_SUCCESS_RATE) {
                    fuzzyMatches.push({
                        pattern: pattern.sourceFieldPattern,
                        targetField: pattern.targetField,
                        predictedConfidence: adjustedConfidence,
                        reasoning: `Fuzzy pattern match (${Math.round(similarity * 100)}% similar to "${pattern.sourceFieldPattern}")`,
                        historicalData: {
                            totalUsage: pattern.usageCount,
                            successRate: pattern.successRate,
                            avgConfidence: pattern.confidence,
                            mostCommonStrategy: this.getMostCommonStrategy(pattern.metadata.strategies || []),
                        },
                    });
                }
            }
        }
        return fuzzyMatches
            .sort((a, b) => b.predictedConfidence - a.predictedConfidence)
            .slice(0, 2);
    }
    /**
     * Get partial pattern matches (for compound field names)
     */
    async getPartialMatches(normalizedField) {
        const words = normalizedField.split("_").filter((w) => w.length > 2);
        const partialMatches = [];
        for (const word of words) {
            const patterns = await db
                .select()
                .from(fieldMappingCache)
                .where(and(sql `${fieldMappingCache.sourceFieldPattern} LIKE '%${word}%'`, gt(fieldMappingCache.usageCount, this.MIN_USAGE_FOR_PATTERN), gt(fieldMappingCache.successRate, this.MIN_SUCCESS_RATE)))
                .orderBy(desc(fieldMappingCache.usageCount))
                .limit(3);
            for (const pattern of patterns) {
                const confidence = Math.round(pattern.successRate * 0.6); // Lower confidence for partial matches
                if (confidence > 50) {
                    partialMatches.push({
                        pattern: pattern.sourceFieldPattern,
                        targetField: pattern.targetField,
                        predictedConfidence: confidence,
                        reasoning: `Partial word match ("${word}" found in "${pattern.sourceFieldPattern}")`,
                        historicalData: {
                            totalUsage: pattern.usageCount,
                            successRate: pattern.successRate,
                            avgConfidence: pattern.confidence,
                            mostCommonStrategy: this.getMostCommonStrategy(pattern.metadata.strategies || []),
                        },
                    });
                }
            }
        }
        return partialMatches
            .sort((a, b) => b.predictedConfidence - a.predictedConfidence)
            .slice(0, 2);
    }
    /**
     * Update pattern variations for better fuzzy matching
     */
    async updatePatternVariations(sourceField, targetField, confidence, strategy) {
        const variations = this.generateFieldVariations(sourceField);
        for (const variation of variations) {
            if (variation !== this.normalizeFieldName(sourceField)) {
                // Check if variation exists
                const existing = await db
                    .select()
                    .from(fieldMappingCache)
                    .where(eq(fieldMappingCache.sourceFieldPattern, variation))
                    .limit(1);
                if (existing.length === 0) {
                    // Create variation with lower confidence
                    await db.insert(fieldMappingCache).values({
                        sourceFieldPattern: variation,
                        targetField,
                        confidence: Math.round(confidence * 0.8), // 80% of original confidence
                        strategy: `${strategy}_variation`,
                        usageCount: 1,
                        successRate: confidence * 0.8,
                        metadata: {
                            isVariation: true,
                            originalPattern: this.normalizeFieldName(sourceField),
                            generatedAt: new Date().toISOString(),
                        },
                        lastUsedAt: new Date(),
                    });
                }
            }
        }
    }
    /**
     * Generate field name variations for better matching
     */
    generateFieldVariations(fieldName) {
        const normalized = this.normalizeFieldName(fieldName);
        const variations = new Set();
        // Add original normalized
        variations.add(normalized);
        // Remove common prefixes/suffixes
        const prefixesToRemove = ["product_", "item_", "sku_", "field_"];
        const suffixesToRemove = ["_name", "_id", "_value", "_field"];
        let cleaned = normalized;
        for (const prefix of prefixesToRemove) {
            if (cleaned.startsWith(prefix)) {
                variations.add(cleaned.substring(prefix.length));
            }
        }
        for (const suffix of suffixesToRemove) {
            if (cleaned.endsWith(suffix)) {
                variations.add(cleaned.substring(0, cleaned.length - suffix.length));
            }
        }
        // Add common abbreviation expansions
        const abbreviations = {
            desc: "description",
            qty: "quantity",
            amt: "amount",
            num: "number",
            img: "image",
            url: "link",
            wt: "weight",
            ht: "height",
            wd: "width",
        };
        const words = cleaned.split("_");
        const expandedWords = words.map((word) => abbreviations[word] || word);
        if (expandedWords.join("_") !== cleaned) {
            variations.add(expandedWords.join("_"));
        }
        return Array.from(variations);
    }
    /**
     * Normalize field name for consistent comparison
     */
    normalizeFieldName(fieldName) {
        return fieldName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
    }
    /**
     * Calculate string similarity using Jaccard similarity
     */
    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1.split(""));
        const set2 = new Set(str2.split(""));
        const intersection = new Set([...set1].filter((x) => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    /**
     * Calculate updated success rate
     */
    calculateUpdatedSuccessRate(currentRate, currentCount, newConfidence) {
        const totalSuccessScore = currentRate * currentCount + newConfidence;
        return totalSuccessScore / (currentCount + 1);
    }
    /**
     * Get most common strategy from array
     */
    getMostCommonStrategy(strategies) {
        if (strategies.length === 0)
            return "unknown";
        const counts = strategies.reduce((acc, strategy) => {
            acc[strategy] = (acc[strategy] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    /**
     * Get learning statistics
     */
    async getStatistics() {
        try {
            const stats = await db
                .select({
                totalPatterns: sql `count(*)`,
                avgUsage: sql `avg(${fieldMappingCache.usageCount})`,
                avgSuccessRate: sql `avg(${fieldMappingCache.successRate})`,
                highConfidencePatterns: sql `count(*) filter (where ${fieldMappingCache.successRate} > 80)`,
                recentlyUsed: sql `count(*) filter (where ${fieldMappingCache.lastUsedAt} > datetime('now', '-7 days'))`,
            })
                .from(fieldMappingCache);
            const strategyCounts = await db
                .select({
                strategy: fieldMappingCache.strategy,
                count: sql `count(*)`,
            })
                .from(fieldMappingCache)
                .groupBy(fieldMappingCache.strategy);
            return {
                patterns: stats[0],
                strategies: strategyCounts.reduce((acc, item) => {
                    acc[item.strategy] = item.count;
                    return acc;
                }, {}),
            };
        }
        catch (error) {
            console.error("Failed to get learning statistics:", error);
            return null;
        }
    }
    /**
     * Warm cache with common patterns
     */
    async warmCache() {
        try {
            // Get frequently used patterns that might need warming
            const patterns = await db
                .select()
                .from(fieldMappingCache)
                .where(gt(fieldMappingCache.usageCount, this.CACHE_WARM_THRESHOLD))
                .orderBy(desc(fieldMappingCache.usageCount))
                .limit(50);
            console.log(`Warmed cache with ${patterns.length} high-usage patterns`);
        }
        catch (error) {
            console.error("Failed to warm cache:", error);
        }
    }
    /**
     * Clean old patterns
     */
    async cleanOldPatterns(daysOld = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const result = await db.delete(fieldMappingCache).where(and(sql `${fieldMappingCache.lastUsedAt} < ${cutoffDate.toISOString()}`, sql `${fieldMappingCache.usageCount} < 3`));
            console.log(`Cleaned old patterns: ${result.rowsAffected} patterns removed`);
        }
        catch (error) {
            console.error("Failed to clean old patterns:", error);
        }
    }
}
export default LearningSystem;
//# sourceMappingURL=learning-system.js.map