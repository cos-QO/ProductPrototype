/**
 * Base CSV Parsing Strategy
 *
 * Abstract base class for all CSV parsing strategies
 * Provides common functionality and enforces strategy interface
 */
export class BaseCSVStrategy {
    /**
     * Calculate confidence bonus based on data quality
     */
    getConfidenceBonus(data) {
        if (data.length === 0)
            return -50;
        let bonus = 0;
        // Consistent column count across rows
        const firstRowKeys = Object.keys(data[0] || {});
        const consistentColumns = data.every((row) => Object.keys(row).length === firstRowKeys.length);
        if (consistentColumns)
            bonus += 20;
        // Reasonable data variety
        const hasVariety = firstRowKeys.some((key) => {
            const values = data.slice(0, 10).map((row) => row[key]);
            const uniqueValues = new Set(values.filter((v) => v != null && v !== ""));
            return uniqueValues.size > 1;
        });
        if (hasVariety)
            bonus += 15;
        // Low null/empty percentage
        const totalCells = data.length * firstRowKeys.length;
        const emptyCells = data.reduce((count, row) => {
            return (count +
                firstRowKeys.filter((key) => row[key] == null || row[key] === "").length);
        }, 0);
        const emptyPercentage = (emptyCells / totalCells) * 100;
        if (emptyPercentage < 10)
            bonus += 15;
        else if (emptyPercentage < 25)
            bonus += 10;
        else if (emptyPercentage < 50)
            bonus += 5;
        return Math.max(-30, Math.min(50, bonus));
    }
    /**
     * Common utility methods for all strategies
     */
    detectDelimiter(sample, candidates = [",", ";", "\t", "|"]) {
        const counts = candidates.map((delim) => ({
            delimiter: delim,
            count: (sample.match(new RegExp(delim, "g")) || []).length,
        }));
        const sorted = counts.sort((a, b) => b.count - a.count);
        return sorted.length > 0 && sorted[0].count > 0 ? sorted[0].delimiter : ",";
    }
    detectEncoding(buffer) {
        // Check for BOM
        if (buffer.length >= 3 &&
            buffer[0] === 0xef &&
            buffer[1] === 0xbb &&
            buffer[2] === 0xbf) {
            return "utf8-bom";
        }
        if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
            return "utf16le";
        }
        if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
            return "utf16be";
        }
        return "utf8";
    }
    hasHeaders(lines, delimiter) {
        if (lines.length < 2)
            return false;
        const firstRow = lines[0].split(delimiter);
        const secondRow = lines[1].split(delimiter);
        // Headers are likely if first row is all strings and second row has numbers/mixed types
        const firstRowAllText = firstRow.every((cell) => isNaN(Number(cell.trim())) && cell.trim() !== "");
        const secondRowHasNumbers = secondRow.some((cell) => !isNaN(Number(cell.trim())) && cell.trim() !== "");
        return firstRowAllText && secondRowHasNumbers;
    }
    cleanCellValue(value) {
        if (!value || typeof value !== "string")
            return value;
        // Remove quotes
        let cleaned = value.replace(/^["']|["']$/g, "");
        // Try to parse as number
        const num = Number(cleaned);
        if (!isNaN(num) && isFinite(num) && cleaned.trim() !== "") {
            return num;
        }
        // Try to parse as boolean
        const lower = cleaned.toLowerCase();
        if (["true", "yes", "1"].includes(lower))
            return true;
        if (["false", "no", "0"].includes(lower))
            return false;
        // Return as string
        return cleaned;
    }
    calculateDataQuality(data) {
        if (data.length === 0)
            return 0;
        const firstRowKeys = Object.keys(data[0] || {});
        if (firstRowKeys.length === 0)
            return 0;
        let qualityScore = 50; // Base score
        // Consistent structure
        const structureConsistency = data.filter((row) => Object.keys(row).length === firstRowKeys.length)
            .length / data.length;
        qualityScore += structureConsistency * 25;
        // Data completeness
        const totalCells = data.length * firstRowKeys.length;
        const filledCells = data.reduce((count, row) => {
            return (count +
                firstRowKeys.filter((key) => row[key] != null && row[key] !== "").length);
        }, 0);
        const completeness = filledCells / totalCells;
        qualityScore += completeness * 25;
        return Math.max(0, Math.min(100, qualityScore));
    }
    generateColumnNames(columnCount) {
        return Array.from({ length: columnCount }, (_, i) => `column_${i + 1}`);
    }
    sanitizeFieldName(name) {
        return name
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "_")
            .toLowerCase();
    }
}
export default BaseCSVStrategy;
//# sourceMappingURL=base-strategy.js.map