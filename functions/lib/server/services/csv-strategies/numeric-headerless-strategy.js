/**
 * Numeric/Headerless Strategy
 *
 * Handles CSV files with pure data and no headers
 * Specialized for numeric datasets and data dumps
 * Confidence: 75-85% when numeric patterns detected
 */
import { parse } from "csv-parse/sync";
import { BaseCSVStrategy } from "./base-strategy";
export class NumericHeaderlessStrategy extends BaseCSVStrategy {
    name = "numeric-headerless";
    priority = 70; // Medium priority
    /**
     * Execute numeric/headerless parsing
     */
    async execute(buffer, fileName) {
        const startTime = Date.now();
        try {
            const encoding = this.detectEncoding(buffer);
            const content = buffer.toString(encoding.replace("-bom", ""));
            // Detect the best delimiter for numeric data
            const delimiter = this.detectBestDelimiter(content);
            // Parse with detected delimiter
            const records = parse(content, {
                columns: false,
                skip_empty_lines: true,
                trim: true,
                quote: '"',
                delimiter,
                escape: '"',
                relax_quotes: true,
                auto_parse: true, // Enable auto-parsing for numeric data
                bom: true,
            });
            if (records.length === 0) {
                return this.createFailureResult("No records found", startTime);
            }
            // Validate that this appears to be numeric/headerless data
            const validationResult = this.validateNumericHeaderless(records);
            if (!validationResult.isValid) {
                return this.createFailureResult(validationResult.reason, startTime);
            }
            // Generate meaningful column names based on data patterns
            const headers = this.generateSmartColumnNames(records);
            // Convert to object format
            const data = records.map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = this.cleanNumericValue(row[index]);
                });
                return obj;
            });
            const parseTime = Date.now() - startTime;
            const qualityScore = this.calculateDataQuality(data);
            const confidence = this.calculateConfidence(data, validationResult.numericRatio, qualityScore, parseTime);
            return {
                success: true,
                data,
                confidence,
                strategy: this.name,
                metadata: {
                    delimiter,
                    hasHeaders: false,
                    totalRecords: data.length,
                    encoding,
                    parseTime,
                    qualityScore,
                    issues: this.identifyIssues(data, records, validationResult.numericRatio),
                },
            };
        }
        catch (error) {
            return this.createFailureResult(error instanceof Error
                ? error.message
                : "Numeric headerless parsing failed", startTime);
        }
    }
    /**
     * Check if this strategy can handle the buffer
     */
    canHandle(buffer) {
        try {
            const sample = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
            const lines = sample.split("\n").slice(0, 5); // Check first 5 lines
            if (lines.length < 2)
                return false;
            // Check if first few lines look like numeric data without headers
            let numericLines = 0;
            for (const line of lines) {
                if (line.trim() === "")
                    continue;
                const fields = line.split(/[,;\t|]/);
                const numericFields = fields.filter((field) => {
                    const cleaned = field.trim().replace(/["']/g, "");
                    return !isNaN(Number(cleaned)) && cleaned !== "";
                });
                // Line should be mostly numeric
                if (numericFields.length / fields.length >= 0.6) {
                    numericLines++;
                }
            }
            return numericLines >= Math.min(2, lines.length);
        }
        catch {
            return false;
        }
    }
    /**
     * Detect the best delimiter for numeric data
     */
    detectBestDelimiter(content) {
        const delimiters = [",", ";", "\t", "|"];
        const sample = content.split("\n").slice(0, 10).join("\n");
        let bestDelimiter = ",";
        let bestScore = 0;
        for (const delimiter of delimiters) {
            const lines = sample.split("\n").filter((line) => line.trim() !== "");
            let score = 0;
            for (const line of lines) {
                const fields = line.split(delimiter);
                if (fields.length > 1) {
                    // Count numeric fields
                    const numericFields = fields.filter((field) => {
                        const cleaned = field.trim().replace(/["']/g, "");
                        return !isNaN(Number(cleaned)) && cleaned !== "";
                    });
                    score += (numericFields.length / fields.length) * fields.length;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestDelimiter = delimiter;
            }
        }
        return bestDelimiter;
    }
    /**
     * Validate that this is truly numeric/headerless data
     */
    validateNumericHeaderless(records) {
        if (records.length < 2) {
            return {
                isValid: false,
                reason: "Insufficient data rows",
                numericRatio: 0,
            };
        }
        const firstRow = records[0];
        // Check if first row looks like headers (contains text that's not numeric)
        const firstRowNumeric = firstRow.filter((cell) => {
            const str = String(cell).trim();
            return !isNaN(Number(str)) && str !== "";
        });
        if (firstRowNumeric.length / firstRow.length < 0.5) {
            // First row is mostly non-numeric, likely headers
            return {
                isValid: false,
                reason: "First row appears to contain headers",
                numericRatio: 0,
            };
        }
        // Calculate overall numeric ratio across all data
        let totalCells = 0;
        let numericCells = 0;
        for (const row of records) {
            for (const cell of row) {
                totalCells++;
                const str = String(cell).trim();
                if (!isNaN(Number(str)) && str !== "") {
                    numericCells++;
                }
            }
        }
        const numericRatio = numericCells / totalCells;
        if (numericRatio < 0.6) {
            return {
                isValid: false,
                reason: `Low numeric content ratio: ${Math.round(numericRatio * 100)}%`,
                numericRatio,
            };
        }
        // Check for consistent column count (important for numeric data)
        const lengths = records.map((row) => row.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const consistentRows = lengths.filter((len) => Math.abs(len - avgLength) <= 1).length;
        const consistencyRatio = consistentRows / records.length;
        if (consistencyRatio < 0.8) {
            return {
                isValid: false,
                reason: "Inconsistent column count across rows",
                numericRatio,
            };
        }
        return { isValid: true, reason: "", numericRatio };
    }
    /**
     * Generate smart column names based on data patterns
     */
    generateSmartColumnNames(records) {
        if (records.length === 0)
            return [];
        const columnCount = records[0].length;
        const headers = [];
        for (let i = 0; i < columnCount; i++) {
            // Analyze the column data to generate meaningful names
            const columnData = records
                .map((row) => row[i])
                .filter((cell) => cell != null);
            const columnType = this.analyzeColumnType(columnData);
            headers.push(`${columnType}_${i + 1}`);
        }
        return headers;
    }
    /**
     * Analyze column data to determine type
     */
    analyzeColumnType(columnData) {
        if (columnData.length === 0)
            return "column";
        let integerCount = 0;
        let decimalCount = 0;
        let dateCount = 0;
        for (const value of columnData.slice(0, 20)) {
            // Sample first 20 values
            const str = String(value).trim();
            if (/^\d+$/.test(str)) {
                integerCount++;
            }
            else if (/^\d+\.\d+$/.test(str)) {
                decimalCount++;
            }
            else if (!isNaN(Date.parse(str))) {
                dateCount++;
            }
        }
        const total = Math.min(20, columnData.length);
        if (integerCount / total > 0.8)
            return "integer";
        if (decimalCount / total > 0.8)
            return "decimal";
        if ((integerCount + decimalCount) / total > 0.8)
            return "numeric";
        if (dateCount / total > 0.8)
            return "date";
        return "value";
    }
    /**
     * Clean numeric values with proper type conversion
     */
    cleanNumericValue(value) {
        if (value == null || value === "")
            return null;
        const str = String(value).trim();
        // Try to parse as number
        const num = Number(str);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }
        // Return as string if not numeric
        return str;
    }
    /**
     * Calculate confidence for numeric/headerless parsing
     */
    calculateConfidence(data, numericRatio, qualityScore, parseTime) {
        let confidence = 75; // Base confidence for numeric headerless
        // Numeric ratio bonus (higher numeric content = higher confidence)
        confidence += (numericRatio - 0.6) * 50; // Scale from 60% baseline
        // Quality bonus
        confidence += (qualityScore - 50) * 0.1;
        // Data structure bonus
        confidence += this.getConfidenceBonus(data) * 0.5; // Reduced weight for numeric data
        // Performance bonus for fast parsing (numeric data should parse quickly)
        if (parseTime < 500)
            confidence += 3;
        return Math.max(60, Math.min(85, confidence));
    }
    /**
     * Identify issues specific to numeric/headerless parsing
     */
    identifyIssues(data, rawRecords, numericRatio) {
        const issues = [];
        // Check numeric ratio
        if (numericRatio < 0.8) {
            issues.push(`Mixed data types detected (${Math.round(numericRatio * 100)}% numeric)`);
        }
        // Check for potential precision issues
        const hasHighPrecisionDecimals = rawRecords.some((row) => row.some((cell) => {
            const str = String(cell);
            return /^\d+\.\d{6,}$/.test(str); // 6+ decimal places
        }));
        if (hasHighPrecisionDecimals) {
            issues.push("High precision decimal values detected - verify numeric accuracy");
        }
        // Check for scientific notation
        const hasScientificNotation = rawRecords.some((row) => row.some((cell) => {
            const str = String(cell);
            return /^\d+\.?\d*[eE][+-]?\d+$/.test(str);
        }));
        if (hasScientificNotation) {
            issues.push("Scientific notation detected - verify parsing accuracy");
        }
        // Check for missing values
        if (data.length > 0) {
            const firstRowKeys = Object.keys(data[0]);
            const nullCells = data.reduce((count, row) => {
                return count + firstRowKeys.filter((key) => row[key] == null).length;
            }, 0);
            const nullPercentage = (nullCells / (data.length * firstRowKeys.length)) * 100;
            if (nullPercentage > 15) {
                issues.push(`High percentage of missing values (${Math.round(nullPercentage)}%)`);
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
                delimiter: ",",
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
export default NumericHeaderlessStrategy;
//# sourceMappingURL=numeric-headerless-strategy.js.map