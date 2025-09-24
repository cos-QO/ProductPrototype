/**
 * Alternative Delimiters Strategy
 *
 * Handles CSV files with semicolon, tab, pipe, and other delimiters
 * Confidence: 80-90% when correct delimiter is detected
 */
import { parse } from "csv-parse/sync";
import { BaseCSVStrategy } from "./base-strategy";
export class AlternativeDelimitersStrategy extends BaseCSVStrategy {
    name = "alternative-delimiters";
    priority = 90; // High priority
    DELIMITERS = [";", "\t", "|", ":", "~", "#"];
    /**
     * Execute alternative delimiter parsing
     */
    async execute(buffer, fileName) {
        const startTime = Date.now();
        try {
            const encoding = this.detectEncoding(buffer);
            const content = buffer.toString(encoding.replace("-bom", ""));
            // Test each delimiter and find the best one
            const delimiterResults = await this.testDelimiters(content);
            if (delimiterResults.length === 0) {
                return this.createFailureResult("No suitable delimiter found", startTime);
            }
            // Use the best delimiter result
            const bestResult = delimiterResults[0];
            const parseTime = Date.now() - startTime;
            // Calculate confidence based on delimiter reliability and data quality
            const confidence = this.calculateConfidence(bestResult.data, bestResult.delimiter, bestResult.qualityScore, parseTime);
            return {
                success: true,
                data: bestResult.data,
                confidence,
                strategy: this.name,
                metadata: {
                    delimiter: bestResult.delimiter,
                    hasHeaders: bestResult.hasHeaders,
                    totalRecords: bestResult.data.length,
                    encoding,
                    parseTime,
                    qualityScore: bestResult.qualityScore,
                    issues: bestResult.issues,
                },
            };
        }
        catch (error) {
            return this.createFailureResult(error instanceof Error
                ? error.message
                : "Alternative delimiter parsing failed", startTime);
        }
    }
    /**
     * Check if this strategy can handle the buffer
     */
    canHandle(buffer) {
        try {
            const sample = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
            // Check if any alternative delimiters are present
            return this.DELIMITERS.some((delim) => sample.includes(delim));
        }
        catch {
            return false;
        }
    }
    /**
     * Test multiple delimiters and rank results
     */
    async testDelimiters(content) {
        const results = [];
        for (const delimiter of this.DELIMITERS) {
            try {
                const result = await this.parseWithDelimiter(content, delimiter);
                if (result.success) {
                    results.push(result);
                }
            }
            catch (error) {
                // Skip this delimiter if parsing fails
                continue;
            }
        }
        // Sort by quality score descending
        return results.sort((a, b) => b.qualityScore - a.qualityScore);
    }
    /**
     * Parse content with specific delimiter
     */
    async parseWithDelimiter(content, delimiter) {
        // Handle special delimiters
        const actualDelimiter = delimiter === "\t" ? "\t" : delimiter;
        const records = parse(content, {
            columns: false,
            skip_empty_lines: true,
            trim: true,
            quote: '"',
            delimiter: actualDelimiter,
            escape: '"',
            relax_quotes: true, // More lenient for alternative formats
            auto_parse: false,
            bom: true,
        });
        if (records.length === 0) {
            return { success: false };
        }
        // Validate delimiter choice by checking consistency
        const isConsistent = this.validateDelimiterConsistency(records, delimiter);
        if (!isConsistent) {
            return { success: false };
        }
        // Detect headers
        const hasHeaders = this.hasHeaders(records.map((row) => row.join(delimiter)), delimiter);
        // Convert to object format
        let data;
        if (hasHeaders) {
            const headers = records[0].map((header) => this.sanitizeFieldName(header));
            data = records.slice(1).map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = this.cleanCellValue(row[index]);
                });
                return obj;
            });
        }
        else {
            const columnCount = Math.max(...records.map((row) => row.length));
            const headers = this.generateColumnNames(columnCount);
            data = records.map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = this.cleanCellValue(row[index]);
                });
                return obj;
            });
        }
        const qualityScore = this.calculateDataQuality(data);
        const issues = this.identifyIssues(data, records, delimiter);
        return {
            success: true,
            data,
            delimiter,
            hasHeaders,
            qualityScore,
            issues,
        };
    }
    /**
     * Validate that the delimiter choice is consistent across the file
     */
    validateDelimiterConsistency(records, delimiter) {
        if (records.length < 2)
            return true;
        // Check if most rows have the same number of fields
        const lengths = records.map((row) => row.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        // Allow 10% variance in field count
        const tolerableVariance = Math.max(1, Math.round(avgLength * 0.1));
        const consistentRows = lengths.filter((len) => Math.abs(len - avgLength) <= tolerableVariance).length;
        const consistencyRatio = consistentRows / records.length;
        return consistencyRatio >= 0.8; // 80% of rows should be consistent
    }
    /**
     * Calculate confidence for alternative delimiter parsing
     */
    calculateConfidence(data, delimiter, qualityScore, parseTime) {
        let confidence = 80; // Base confidence for alternative delimiters
        // Delimiter-specific bonuses
        const delimiterBonus = this.getDelimiterBonus(delimiter);
        confidence += delimiterBonus;
        // Quality bonus
        confidence += (qualityScore - 50) * 0.15;
        // Data bonus from base class
        confidence += this.getConfidenceBonus(data);
        // Performance penalty
        if (parseTime > 1000)
            confidence -= 3;
        if (parseTime > 5000)
            confidence -= 7;
        return Math.max(65, Math.min(90, confidence));
    }
    /**
     * Get bonus points for specific delimiters
     */
    getDelimiterBonus(delimiter) {
        const bonuses = {
            ";": 8, // Very common in European datasets
            "\t": 7, // Tab-separated values are reliable
            "|": 6, // Pipe separation is common in data exports
            ":": 4, // Less common but valid
            "~": 2, // Rare but possible
            "#": 1, // Very rare
        };
        return bonuses[delimiter] || 0;
    }
    /**
     * Identify issues specific to alternative delimiter parsing
     */
    identifyIssues(data, rawRecords, delimiter) {
        const issues = [];
        // Check for delimiter confusion
        if (delimiter === ";") {
            const hasCommas = rawRecords.some((row) => row.some((cell) => typeof cell === "string" && cell.includes(",")));
            if (hasCommas) {
                issues.push("Contains commas in data - verify semicolon is correct delimiter");
            }
        }
        if (delimiter === "\t") {
            const hasSpaces = rawRecords.some((row) => row.some((cell) => typeof cell === "string" && cell.includes("  ")));
            if (hasSpaces) {
                issues.push("Contains multiple spaces - verify tab is correct delimiter");
            }
        }
        // Check for inconsistent field counts
        const lengths = rawRecords.map((row) => row.length);
        const uniqueLengths = new Set(lengths);
        if (uniqueLengths.size > 3) {
            issues.push("Highly variable column count - delimiter may be incorrect");
        }
        // Check for empty fields that might indicate wrong delimiter
        if (data.length > 0) {
            const firstRowKeys = Object.keys(data[0]);
            const emptyFieldsPerRow = data.map((row) => firstRowKeys.filter((key) => row[key] === "" || row[key] == null)
                .length);
            const avgEmptyFields = emptyFieldsPerRow.reduce((a, b) => a + b, 0) / data.length;
            if (avgEmptyFields > firstRowKeys.length * 0.3) {
                issues.push("High number of empty fields - consider different delimiter");
            }
        }
        return issues;
    }
    /**
     * Create failure result
     */
    createFailureResult(error, startTime) {
        return {
            success: false,
            data: [],
            confidence: 0,
            strategy: this.name,
            metadata: {
                delimiter: "",
                hasHeaders: false,
                totalRecords: 0,
                encoding: "utf8",
                parseTime: Date.now() - startTime,
                qualityScore: 0,
                issues: [error],
            },
            error,
        };
    }
}
export default AlternativeDelimitersStrategy;
//# sourceMappingURL=alternative-delimiters-strategy.js.map