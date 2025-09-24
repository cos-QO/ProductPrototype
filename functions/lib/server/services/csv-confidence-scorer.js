/**
 * CSV Confidence Scoring System
 *
 * Advanced scoring algorithm for CSV parsing results
 * Calculates confidence based on multiple quality factors
 */
export class CSVConfidenceScorer {
    static instance;
    static getInstance() {
        if (!CSVConfidenceScorer.instance) {
            CSVConfidenceScorer.instance = new CSVConfidenceScorer();
        }
        return CSVConfidenceScorer.instance;
    }
    /**
     * Calculate comprehensive confidence score for parsed CSV data
     */
    calculateConfidence(data, metadata, strategy, parseTime) {
        if (!data || data.length === 0) {
            return this.createFailureResult("No data parsed");
        }
        const metrics = this.calculateMetrics(data, metadata, strategy, parseTime);
        const score = this.aggregateScore(metrics);
        const factors = this.identifyPositiveFactors(metrics);
        const issues = this.identifyIssues(metrics);
        const recommendations = this.generateRecommendations(metrics, issues);
        return {
            score: Math.round(score),
            metrics,
            factors,
            issues,
            recommendations,
        };
    }
    /**
     * Calculate individual quality metrics
     */
    calculateMetrics(data, metadata, strategy, parseTime) {
        return {
            structuralConsistency: this.calculateStructuralConsistency(data),
            dataCompleteness: this.calculateDataCompleteness(data),
            typeConsistency: this.calculateTypeConsistency(data),
            delimiterReliability: this.calculateDelimiterReliability(metadata),
            headerQuality: this.calculateHeaderQuality(data, metadata),
            dataVariety: this.calculateDataVariety(data),
            parseEfficiency: this.calculateParseEfficiency(parseTime, data.length),
            errorRate: this.calculateErrorRate(metadata),
        };
    }
    /**
     * Structural Consistency: How uniform is the data structure
     */
    calculateStructuralConsistency(data) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        const expectedColumns = firstRowKeys.length;
        if (expectedColumns === 0)
            return 0;
        // Check column count consistency
        const consistentRows = data.filter((row) => Object.keys(row).length === expectedColumns).length;
        const columnConsistency = (consistentRows / data.length) * 100;
        // Check key name consistency
        const keyConsistency = (data.slice(1).reduce((acc, row) => {
            const rowKeys = Object.keys(row);
            const matchingKeys = firstRowKeys.filter((key) => rowKeys.includes(key)).length;
            return acc + matchingKeys / expectedColumns;
        }, 0) /
            Math.max(1, data.length - 1)) *
            100;
        return columnConsistency * 0.7 + keyConsistency * 0.3;
    }
    /**
     * Data Completeness: How much data is present vs missing
     */
    calculateDataCompleteness(data) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        const totalCells = data.length * firstRowKeys.length;
        if (totalCells === 0)
            return 0;
        const filledCells = data.reduce((count, row) => {
            return (count +
                firstRowKeys.filter((key) => {
                    const value = row[key];
                    return value !== null && value !== undefined && value !== "";
                }).length);
        }, 0);
        return (filledCells / totalCells) * 100;
    }
    /**
     * Type Consistency: How consistent are data types within columns
     */
    calculateTypeConsistency(data) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        if (firstRowKeys.length === 0)
            return 0;
        let totalConsistency = 0;
        firstRowKeys.forEach((key) => {
            const values = data
                .map((row) => row[key])
                .filter((v) => v !== null && v !== undefined && v !== "");
            if (values.length === 0)
                return;
            // Determine dominant type
            const types = values.map((v) => this.getValueType(v));
            const typeCount = types.reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const dominantType = Object.keys(typeCount).reduce((a, b) => typeCount[a] > typeCount[b] ? a : b);
            const consistency = (typeCount[dominantType] / values.length) * 100;
            totalConsistency += consistency;
        });
        return totalConsistency / firstRowKeys.length;
    }
    /**
     * Delimiter Reliability: How well the delimiter choice worked
     */
    calculateDelimiterReliability(metadata) {
        if (!metadata.delimiter)
            return 50; // Default if no delimiter info
        // Score based on delimiter choice and consistency
        const delimiter = metadata.delimiter;
        // Common delimiters get higher base scores
        const delimiterScores = {
            ",": 90, // Most reliable
            ";": 85, // Good for European data
            "\t": 80, // Tab-separated
            "|": 75, // Pipe-separated
            ":": 60, // Less common
        };
        const baseScore = delimiterScores[delimiter] || 50;
        // Boost if we have quality metrics
        if (metadata.qualityScore) {
            return Math.min(95, baseScore + (metadata.qualityScore - 50) * 0.1);
        }
        return baseScore;
    }
    /**
     * Header Quality: How good are the column headers
     */
    calculateHeaderQuality(data, metadata) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        if (firstRowKeys.length === 0)
            return 0;
        let score = 0;
        // Check if headers exist and aren't generic
        const hasHeaders = metadata.hasHeaders !== false;
        if (hasHeaders) {
            score += 30;
            // Quality of header names
            const genericHeaders = firstRowKeys.filter((key) => /^(column_\d+|field_\d+|col\d+)$/i.test(key)).length;
            const nonGenericRatio = (firstRowKeys.length - genericHeaders) / firstRowKeys.length;
            score += nonGenericRatio * 40;
            // Descriptive headers
            const descriptiveHeaders = firstRowKeys.filter((key) => key.length > 3 && /[a-zA-Z]/.test(key)).length;
            const descriptiveRatio = descriptiveHeaders / firstRowKeys.length;
            score += descriptiveRatio * 30;
        }
        else {
            // No headers detected - lower but not zero score
            score = 25;
        }
        return Math.min(100, score);
    }
    /**
     * Data Variety: How diverse is the data content
     */
    calculateDataVariety(data) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        if (firstRowKeys.length === 0)
            return 0;
        let varietyScore = 0;
        firstRowKeys.forEach((key) => {
            const values = data.slice(0, 20).map((row) => row[key]); // Sample first 20 rows
            const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== "");
            if (nonEmptyValues.length === 0)
                return;
            const uniqueValues = new Set(nonEmptyValues);
            const uniqueRatio = uniqueValues.size / nonEmptyValues.length;
            // Ideal variety is between 20-80% unique values
            if (uniqueRatio >= 0.2 && uniqueRatio <= 0.8) {
                varietyScore += 100;
            }
            else if (uniqueRatio < 0.2) {
                varietyScore += uniqueRatio * 500; // Scale up low variety
            }
            else {
                varietyScore += 100 - (uniqueRatio - 0.8) * 500; // Scale down high variety
            }
        });
        return Math.max(0, Math.min(100, varietyScore / firstRowKeys.length));
    }
    /**
     * Parse Efficiency: How quickly was the data parsed
     */
    calculateParseEfficiency(parseTime, recordCount) {
        if (recordCount === 0)
            return 0;
        const timePerRecord = parseTime / recordCount; // ms per record
        // Excellent: < 1ms per record
        // Good: 1-5ms per record
        // Fair: 5-20ms per record
        // Poor: > 20ms per record
        if (timePerRecord < 1)
            return 95;
        if (timePerRecord < 5)
            return 85;
        if (timePerRecord < 20)
            return 70;
        if (timePerRecord < 50)
            return 50;
        return 30;
    }
    /**
     * Error Rate: How many parsing issues occurred
     */
    calculateErrorRate(metadata) {
        if (!metadata.issues || !Array.isArray(metadata.issues))
            return 100;
        const issueCount = metadata.issues.length;
        // No issues = 100% score
        if (issueCount === 0)
            return 100;
        // Each issue reduces score
        const reductionPerIssue = 100 / Math.max(10, issueCount * 2); // Cap at 10 major issues
        return Math.max(0, 100 - issueCount * reductionPerIssue);
    }
    /**
     * Aggregate all metrics into final score
     */
    aggregateScore(metrics) {
        const weights = {
            structuralConsistency: 0.25, // Most important
            dataCompleteness: 0.2, // Very important
            typeConsistency: 0.15, // Important
            delimiterReliability: 0.15, // Important
            headerQuality: 0.1, // Moderate
            dataVariety: 0.05, // Helpful
            parseEfficiency: 0.05, // Helpful
            errorRate: 0.05, // Penalty factor
        };
        const weightedScore = Object.entries(weights).reduce((score, [metric, weight]) => {
            return score + metrics[metric] * weight;
        }, 0);
        return Math.max(0, Math.min(100, weightedScore));
    }
    /**
     * Identify positive factors contributing to confidence
     */
    identifyPositiveFactors(metrics) {
        const factors = [];
        if (metrics.structuralConsistency > 90)
            factors.push("Excellent structural consistency");
        if (metrics.dataCompleteness > 85)
            factors.push("High data completeness");
        if (metrics.typeConsistency > 80)
            factors.push("Strong type consistency");
        if (metrics.delimiterReliability > 85)
            factors.push("Reliable delimiter detection");
        if (metrics.headerQuality > 75)
            factors.push("Quality column headers");
        if (metrics.dataVariety > 60)
            factors.push("Good data variety");
        if (metrics.parseEfficiency > 80)
            factors.push("Fast parsing performance");
        if (metrics.errorRate > 95)
            factors.push("Error-free parsing");
        return factors;
    }
    /**
     * Identify issues affecting confidence
     */
    identifyIssues(metrics) {
        const issues = [];
        if (metrics.structuralConsistency < 70)
            issues.push("Inconsistent data structure");
        if (metrics.dataCompleteness < 60)
            issues.push("High percentage of missing data");
        if (metrics.typeConsistency < 60)
            issues.push("Mixed data types in columns");
        if (metrics.delimiterReliability < 60)
            issues.push("Uncertain delimiter choice");
        if (metrics.headerQuality < 50)
            issues.push("Poor or missing column headers");
        if (metrics.dataVariety < 30)
            issues.push("Limited data variety detected");
        if (metrics.parseEfficiency < 50)
            issues.push("Slow parsing performance");
        if (metrics.errorRate < 80)
            issues.push("Multiple parsing errors detected");
        return issues;
    }
    /**
     * Generate recommendations based on metrics
     */
    generateRecommendations(metrics, issues) {
        const recommendations = [];
        if (metrics.structuralConsistency < 70) {
            recommendations.push("Consider data cleaning to standardize structure");
        }
        if (metrics.dataCompleteness < 60) {
            recommendations.push("Review data source for completeness issues");
        }
        if (metrics.headerQuality < 50) {
            recommendations.push("Verify column headers or enable header detection");
        }
        if (metrics.delimiterReliability < 60) {
            recommendations.push("Try alternative delimiter detection strategies");
        }
        if (recommendations.length === 0) {
            recommendations.push("Data quality is good - no specific recommendations");
        }
        return recommendations;
    }
    /**
     * Create failure result for unparseable data
     */
    createFailureResult(reason) {
        return {
            score: 0,
            metrics: {
                structuralConsistency: 0,
                dataCompleteness: 0,
                typeConsistency: 0,
                delimiterReliability: 0,
                headerQuality: 0,
                dataVariety: 0,
                parseEfficiency: 0,
                errorRate: 0,
            },
            factors: [],
            issues: [reason],
            recommendations: [
                "Try alternative parsing strategies",
                "Verify file format and encoding",
            ],
        };
    }
    /**
     * Determine value type for type consistency calculation
     */
    getValueType(value) {
        if (value === null || value === undefined)
            return "null";
        if (typeof value === "number")
            return "number";
        if (typeof value === "boolean")
            return "boolean";
        if (typeof value === "string") {
            if (value === "")
                return "empty";
            if (/^\d+$/.test(value))
                return "integer_string";
            if (/^\d+\.\d+$/.test(value))
                return "decimal_string";
            if (/^\d{4}-\d{2}-\d{2}/.test(value))
                return "date_string";
            return "string";
        }
        return typeof value;
    }
}
export default CSVConfidenceScorer;
//# sourceMappingURL=csv-confidence-scorer.js.map