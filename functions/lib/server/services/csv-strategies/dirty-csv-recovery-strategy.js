/**
 * Dirty CSV Recovery Strategy
 *
 * Last resort parsing for malformed, corrupted, or non-standard CSV files
 * Attempts data rescue and cleanup for files that fail all other strategies
 * Confidence: 40-70% - saves data that would otherwise be lost
 */
import { BaseCSVStrategy } from "./base-strategy";
export class DirtyCSVRecoveryStrategy extends BaseCSVStrategy {
    name = "dirty-recovery";
    priority = 10; // Lowest priority - last resort
    /**
     * Execute dirty CSV recovery parsing
     */
    async execute(buffer, fileName) {
        const startTime = Date.now();
        try {
            const encoding = this.detectEncoding(buffer);
            const content = buffer.toString(encoding.replace("-bom", ""));
            // Analyze the mess we're dealing with
            const damage = this.analyzeDamage(content);
            // Attempt progressive cleanup and parsing
            const recoveryResults = await this.attemptRecovery(content, damage);
            if (!recoveryResults.success) {
                return this.createFailureResult("Unable to recover any data from file", startTime);
            }
            const parseTime = Date.now() - startTime;
            const confidence = this.calculateConfidence(recoveryResults.data, damage, recoveryResults.recoveryScore, parseTime);
            return {
                success: true,
                data: recoveryResults.data,
                confidence,
                strategy: this.name,
                metadata: {
                    delimiter: recoveryResults.delimiter,
                    hasHeaders: recoveryResults.hasHeaders,
                    totalRecords: recoveryResults.data.length,
                    encoding,
                    parseTime,
                    qualityScore: recoveryResults.recoveryScore,
                    issues: recoveryResults.issues,
                },
            };
        }
        catch (error) {
            return this.createFailureResult(error instanceof Error ? error.message : "Dirty CSV recovery failed", startTime);
        }
    }
    /**
     * Check if this strategy can handle the buffer
     */
    canHandle(buffer) {
        // This strategy can handle any buffer as last resort
        try {
            const content = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
            // Must have some recognizable content
            return content.trim().length > 0;
        }
        catch {
            return false;
        }
    }
    /**
     * Analyze the damage/corruption in the CSV
     */
    analyzeDamage(content) {
        const damage = {
            encoding: "utf8",
            hasNullBytes: false,
            hasBinaryData: false,
            hasInconsistentLineEndings: false,
            hasTrailingSpaces: false,
            hasMissingDelimiters: false,
            hasExtraDelimiters: false,
            hasTruncatedLines: false,
            hasGarbageCharacters: false,
            estimatedDelimiter: ",",
            damageScore: 0,
            issues: [],
        };
        // Check for null bytes
        if (content.includes("\0")) {
            damage.hasNullBytes = true;
            damage.damageScore += 3;
            damage.issues.push("Contains null bytes");
        }
        // Check for binary data
        const binaryRegex = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/;
        if (binaryRegex.test(content)) {
            damage.hasBinaryData = true;
            damage.damageScore += 2;
            damage.issues.push("Contains binary data");
        }
        // Check line ending consistency
        const hasLF = content.includes("\n");
        const hasCRLF = content.includes("\r\n");
        const hasCR = content.includes("\r") && !hasCRLF;
        if ([hasLF, hasCRLF, hasCR].filter(Boolean).length > 1) {
            damage.hasInconsistentLineEndings = true;
            damage.damageScore += 1;
            damage.issues.push("Inconsistent line endings");
        }
        // Detect best delimiter from the mess
        damage.estimatedDelimiter = this.detectDelimiterFromMess(content);
        // Check for missing delimiters
        const lines = content.split(/\r?\n/).slice(0, 10);
        const linesWithoutDelimiters = lines.filter((line) => !line.includes(damage.estimatedDelimiter) && line.trim() !== "").length;
        if (linesWithoutDelimiters > lines.length * 0.3) {
            damage.hasMissingDelimiters = true;
            damage.damageScore += 2;
            damage.issues.push("Many lines missing delimiters");
        }
        // Check for trailing spaces/tabs
        const linesWithTrailing = lines.filter((line) => line !== line.trimEnd()).length;
        if (linesWithTrailing > lines.length * 0.5) {
            damage.hasTrailingSpaces = true;
            damage.damageScore += 1;
            damage.issues.push("Excessive trailing whitespace");
        }
        // Check for garbage characters
        const garbagePatterns = [
            /\uFFFD/g, // Replacement character
            /[^\x20-\x7E\t\n\r]/g, // Non-printable ASCII
            /[\x80-\xFF]/g, // High ASCII
        ];
        for (const pattern of garbagePatterns) {
            if (pattern.test(content)) {
                damage.hasGarbageCharacters = true;
                damage.damageScore += 2;
                damage.issues.push("Contains garbage characters");
                break;
            }
        }
        return damage;
    }
    /**
     * Detect delimiter from messy content
     */
    detectDelimiterFromMess(content) {
        const delimiters = [",", ";", "\t", "|", ":", " "];
        const sample = content.split("\n").slice(0, 20).join("\n");
        let bestDelimiter = ",";
        let bestScore = 0;
        for (const delimiter of delimiters) {
            let score = 0;
            const lines = sample.split("\n").filter((line) => line.trim() !== "");
            // Count delimiter occurrences and consistency
            const counts = lines.map((line) => (line.match(new RegExp(delimiter === " " ? "\\s+" : `\\${delimiter}`, "g")) || []).length);
            if (counts.length > 0) {
                const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
                const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
                // Higher average count and lower variance = better delimiter
                score = avgCount * 10 - variance;
                if (score > bestScore) {
                    bestScore = score;
                    bestDelimiter = delimiter;
                }
            }
        }
        return bestDelimiter;
    }
    /**
     * Attempt progressive recovery
     */
    async attemptRecovery(content, damage) {
        const recoverySteps = [
            () => this.basicCleanupRecovery(content, damage),
            () => this.aggressiveCleanupRecovery(content, damage),
            () => this.lineByLineRecovery(content, damage),
            () => this.desperateRecovery(content, damage),
        ];
        for (const step of recoverySteps) {
            try {
                const result = await step();
                if (result.success && result.data.length > 0) {
                    return result;
                }
            }
            catch (error) {
                // Try next recovery method
                continue;
            }
        }
        return { success: false };
    }
    /**
     * Basic cleanup recovery
     */
    async basicCleanupRecovery(content, damage) {
        let cleaned = content;
        // Remove null bytes
        if (damage.hasNullBytes) {
            cleaned = cleaned.replace(/\0/g, "");
        }
        // Normalize line endings
        if (damage.hasInconsistentLineEndings) {
            cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        }
        // Remove trailing spaces
        if (damage.hasTrailingSpaces) {
            cleaned = cleaned
                .split("\n")
                .map((line) => line.trimEnd())
                .join("\n");
        }
        return this.parseCleanedContent(cleaned, damage.estimatedDelimiter, "basic-cleanup");
    }
    /**
     * Aggressive cleanup recovery
     */
    async aggressiveCleanupRecovery(content, damage) {
        let cleaned = content;
        // Remove all non-printable characters except tabs and newlines
        cleaned = cleaned.replace(/[^\x20-\x7E\t\n\r]/g, "");
        // Remove multiple consecutive delimiters
        const delimiter = damage.estimatedDelimiter;
        if (delimiter !== " ") {
            const multiDelimPattern = new RegExp(`\\${delimiter}{2,}`, "g");
            cleaned = cleaned.replace(multiDelimPattern, delimiter);
        }
        // Remove empty lines
        cleaned = cleaned
            .split("\n")
            .filter((line) => line.trim() !== "")
            .join("\n");
        return this.parseCleanedContent(cleaned, delimiter, "aggressive-cleanup");
    }
    /**
     * Line by line recovery
     */
    async lineByLineRecovery(content, damage) {
        const lines = content.split(/\r?\n/);
        const recoveredLines = [];
        const delimiter = damage.estimatedDelimiter;
        for (const line of lines) {
            const cleaned = this.recoverLine(line, delimiter);
            if (cleaned) {
                recoveredLines.push(cleaned);
            }
        }
        if (recoveredLines.length === 0) {
            return { success: false };
        }
        const recovered = recoveredLines.join("\n");
        return this.parseCleanedContent(recovered, delimiter, "line-by-line");
    }
    /**
     * Desperate recovery - extract anything that looks like data
     */
    async desperateRecovery(content, damage) {
        // Split on any reasonable delimiter and try to extract fields
        const fields = content
            .split(/[,;\t|]/)
            .map((field) => field.trim())
            .filter((field) => field !== "");
        if (fields.length === 0) {
            return { success: false };
        }
        // Group fields into rows (guess row size)
        const estimatedFieldsPerRow = this.estimateFieldsPerRow(fields);
        const rows = [];
        for (let i = 0; i < fields.length; i += estimatedFieldsPerRow) {
            const row = fields.slice(i, i + estimatedFieldsPerRow);
            if (row.length > 0) {
                rows.push(row);
            }
        }
        return this.createRecoveryResult(rows, ",", false, "desperate", damage);
    }
    /**
     * Recover individual line
     */
    recoverLine(line, delimiter) {
        if (!line || line.trim() === "")
            return null;
        let cleaned = line;
        // Remove obvious garbage
        cleaned = cleaned.replace(/[^\x20-\x7E\t]/g, " ");
        // Normalize spaces
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        // If no delimiters found, try to insert them
        if (!cleaned.includes(delimiter)) {
            // Try to split on spaces if delimiter is not space
            if (delimiter !== " ") {
                cleaned = cleaned.replace(/\s+/g, delimiter);
            }
        }
        return cleaned;
    }
    /**
     * Estimate fields per row for desperate recovery
     */
    estimateFieldsPerRow(fields) {
        // Look for patterns in field types to guess row boundaries
        const possibleRowSizes = [3, 4, 5, 6, 8, 10, 12];
        let bestSize = 4; // Default guess
        let bestScore = 0;
        for (const size of possibleRowSizes) {
            if (fields.length < size * 2)
                continue; // Need at least 2 complete rows
            let score = 0;
            // Check type consistency across columns
            for (let col = 0; col < size; col++) {
                const columnValues = [];
                for (let row = 0; row * size + col < fields.length; row++) {
                    const fieldIndex = row * size + col;
                    if (fieldIndex < fields.length) {
                        columnValues.push(fields[fieldIndex]);
                    }
                }
                // Score based on type consistency
                const types = columnValues.map((v) => this.guessFieldType(v));
                const uniqueTypes = new Set(types);
                if (uniqueTypes.size === 1)
                    score += 3; // All same type
                else if (uniqueTypes.size <= 2)
                    score += 1; // Mostly same type
            }
            if (score > bestScore) {
                bestScore = score;
                bestSize = size;
            }
        }
        return bestSize;
    }
    /**
     * Guess field type for recovery
     */
    guessFieldType(value) {
        if (!value || value.trim() === "")
            return "empty";
        if (/^\d+$/.test(value.trim()))
            return "integer";
        if (/^\d+\.\d+$/.test(value.trim()))
            return "decimal";
        if (/^\d{4}-\d{2}-\d{2}/.test(value.trim()))
            return "date";
        if (value.trim().length < 3)
            return "short";
        return "text";
    }
    /**
     * Parse cleaned content
     */
    async parseCleanedContent(content, delimiter, method) {
        try {
            const lines = content.split("\n").filter((line) => line.trim() !== "");
            if (lines.length === 0) {
                return { success: false };
            }
            // Manual parsing for dirty data
            const rows = lines.map((line) => this.parseLineManually(line, delimiter));
            // Filter out obviously bad rows
            const validRows = rows.filter((row) => row.length > 0);
            if (validRows.length === 0) {
                return { success: false };
            }
            return this.createRecoveryResult(validRows, delimiter, true, method, null);
        }
        catch (error) {
            return { success: false };
        }
    }
    /**
     * Parse line manually for dirty data
     */
    parseLineManually(line, delimiter) {
        const fields = [];
        let currentField = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === delimiter && !inQuotes) {
                fields.push(currentField.trim());
                currentField = "";
            }
            else {
                currentField += char;
            }
        }
        // Add last field
        if (currentField.trim() !== "" || fields.length > 0) {
            fields.push(currentField.trim());
        }
        return fields;
    }
    /**
     * Create recovery result
     */
    createRecoveryResult(rows, delimiter, hasHeaders, method, damage) {
        if (rows.length === 0) {
            return { success: false };
        }
        // Generate column names
        const maxColumns = Math.max(...rows.map((row) => row.length));
        const headers = this.generateColumnNames(maxColumns);
        // Convert to object format
        const startRow = hasHeaders ? 1 : 0;
        const data = rows.slice(startRow).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] =
                    index < row.length ? this.cleanRecoveredValue(row[index]) : null;
            });
            return obj;
        });
        const recoveryScore = this.calculateRecoveryScore(data, method, damage);
        const issues = this.identifyRecoveryIssues(data, method, damage);
        return {
            success: true,
            data,
            delimiter,
            hasHeaders: false, // Assume no headers for dirty data
            recoveryScore,
            issues,
            method,
        };
    }
    /**
     * Clean recovered value
     */
    cleanRecoveredValue(value) {
        if (!value || value === "")
            return null;
        let cleaned = value.trim();
        // Remove quotes if present
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        // Try to parse as number
        const num = Number(cleaned);
        if (!isNaN(num) && isFinite(num) && cleaned !== "") {
            return num;
        }
        return cleaned;
    }
    /**
     * Calculate recovery score
     */
    calculateRecoveryScore(data, method, damage) {
        let score = 50; // Base recovery score
        // Method penalties
        const methodPenalties = {
            "basic-cleanup": 0,
            "aggressive-cleanup": -10,
            "line-by-line": -20,
            desperate: -30,
        };
        score += methodPenalties[method] || 0;
        // Data quality bonus
        if (data.length > 0) {
            const firstRowKeys = Object.keys(data[0]);
            // Consistent structure bonus
            const structureConsistency = data.filter((row) => Object.keys(row).length === firstRowKeys.length)
                .length / data.length;
            score += structureConsistency * 20;
            // Data completeness bonus
            const totalCells = data.length * firstRowKeys.length;
            const filledCells = data.reduce((count, row) => {
                return (count +
                    firstRowKeys.filter((key) => row[key] !== null && row[key] !== "")
                        .length);
            }, 0);
            const completeness = filledCells / totalCells;
            score += completeness * 15;
        }
        // Damage penalty
        if (damage) {
            score -= damage.damageScore * 5;
        }
        return Math.max(10, Math.min(70, score));
    }
    /**
     * Identify recovery issues
     */
    identifyRecoveryIssues(data, method, damage) {
        const issues = [];
        issues.push(`Data recovered using ${method} method`);
        if (damage && damage.issues.length > 0) {
            issues.push(...damage.issues.map((issue) => `Original issue: ${issue}`));
        }
        switch (method) {
            case "aggressive-cleanup":
                issues.push("Aggressive data cleaning applied - some information may be lost");
                break;
            case "line-by-line":
                issues.push("Line-by-line recovery used - data structure may be altered");
                break;
            case "desperate":
                issues.push("Desperate recovery mode - data accuracy cannot be guaranteed");
                break;
        }
        // Check data quality issues
        if (data.length > 0) {
            const firstRowKeys = Object.keys(data[0]);
            const nullPercentage = (data.reduce((count, row) => {
                return count + firstRowKeys.filter((key) => row[key] === null).length;
            }, 0) /
                (data.length * firstRowKeys.length)) *
                100;
            if (nullPercentage > 50) {
                issues.push(`High percentage of missing data (${Math.round(nullPercentage)}%)`);
            }
        }
        issues.push("Manual data verification strongly recommended");
        return issues;
    }
    /**
     * Calculate confidence for dirty recovery
     */
    calculateConfidence(data, damage, recoveryScore, parseTime) {
        let confidence = 40; // Base confidence for dirty recovery
        // Recovery score bonus
        confidence += (recoveryScore - 50) * 0.4;
        // Damage penalty
        confidence -= Math.min(20, damage.damageScore * 3);
        // Data structure bonus (reduced weight)
        confidence += this.getConfidenceBonus(data) * 0.3;
        // Small bonus for quick recovery
        if (parseTime < 1000)
            confidence += 2;
        return Math.max(20, Math.min(70, confidence));
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
export default DirtyCSVRecoveryStrategy;
//# sourceMappingURL=dirty-csv-recovery-strategy.js.map