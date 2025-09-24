import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
export class FieldExtractionService {
    static instance;
    DEFAULT_OPTIONS = {
        maxSampleSize: 100,
        includeStatistics: true,
        expandAbbreviations: true,
        inferTypes: true,
        analyzePatterns: true,
    };
    COMMON_ABBREVIATIONS = {
        qty: "quantity",
        desc: "description",
        amt: "amount",
        num: "number",
        id: "identifier",
        img: "image",
        url: "web_address",
        addr: "address",
        tel: "telephone",
        fax: "facsimile",
        prod: "product",
        mfg: "manufacturer",
        cat: "category",
        std: "standard",
        wt: "weight",
        ht: "height",
        wd: "width",
        len: "length",
        vol: "volume",
        temp: "temperature",
        min: "minimum",
        max: "maximum",
        avg: "average",
        pct: "percentage",
        req: "required",
        opt: "optional",
        def: "default",
    };
    static getInstance() {
        if (!FieldExtractionService.instance) {
            FieldExtractionService.instance = new FieldExtractionService();
        }
        return FieldExtractionService.instance;
    }
    /**
     * Extract and analyze fields from uploaded file
     */
    async extractFieldsFromFile(fileBuffer, fileName, fileType, options = {}) {
        const startTime = Date.now();
        const opts = { ...this.DEFAULT_OPTIONS, ...options };
        try {
            // Parse file and extract raw data
            const { data, hasHeaders, totalRecords } = await this.parseFileData(fileBuffer, fileType, fileName);
            if (!data || data.length === 0) {
                throw new Error("No data found in file");
            }
            // Analyze sample for field structure
            const sampleSize = Math.min(opts.maxSampleSize, data.length);
            const sampleData = data.slice(0, sampleSize);
            // Extract field definitions
            const fields = await this.analyzeFieldStructure(sampleData, hasHeaders, opts);
            // Calculate processing metadata
            const parseTime = Date.now() - startTime;
            const confidence = this.calculateExtractionConfidence(fields, sampleData);
            return {
                fields,
                sampleData: this.prepareSampleDataMatrix(sampleData, fields),
                fileType,
                metadata: {
                    totalRecords,
                    totalFields: fields.length,
                    fileSize: fileBuffer.length,
                    parseTime,
                    hasHeaders,
                    encoding: this.detectEncoding(fileBuffer),
                },
                confidence,
            };
        }
        catch (error) {
            throw new Error(`Field extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Parse file data based on type
     */
    async parseFileData(buffer, fileType, fileName) {
        switch (fileType) {
            case "csv":
                return this.parseCSVData(buffer);
            case "json":
                return this.parseJSONData(buffer);
            case "xlsx":
                return this.parseXLSXData(buffer);
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }
    /**
     * Parse CSV data with intelligent header detection
     */
    parseCSVData(buffer) {
        const content = buffer.toString("utf-8");
        // Parse CSV with flexible options including relax_column_count for safety
        const records = parse(content, {
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true,
            relax_column_count: true, // Safety net for varying column counts
            auto_parse: true,
            auto_parse_date: false, // We'll handle date parsing ourselves
        });
        if (records.length === 0) {
            throw new Error("CSV file is empty");
        }
        // Detect if first row contains headers
        const hasHeaders = this.detectCSVHeaders(records);
        let data;
        if (hasHeaders) {
            const headers = records[0];
            data = records.slice(1).map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
        }
        else {
            // Generate generic column names
            const columnCount = Math.max(...records.map((r) => r.length));
            const headers = Array.from({ length: columnCount }, (_, i) => `column_${i + 1}`);
            data = records.map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
        }
        return {
            data,
            hasHeaders,
            totalRecords: data.length,
        };
    }
    /**
     * Parse JSON data (array of objects or single object)
     */
    parseJSONData(buffer) {
        const content = buffer.toString("utf-8");
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    throw new Error("JSON array is empty");
                }
                // Ensure all items are objects
                const validData = parsed.filter((item) => typeof item === "object" && item !== null && !Array.isArray(item));
                if (validData.length === 0) {
                    throw new Error("JSON array contains no valid objects");
                }
                return {
                    data: validData,
                    hasHeaders: true, // JSON objects inherently have "headers" (keys)
                    totalRecords: validData.length,
                };
            }
            else if (typeof parsed === "object" && parsed !== null) {
                // Single object - wrap in array
                return {
                    data: [parsed],
                    hasHeaders: true,
                    totalRecords: 1,
                };
            }
            else {
                throw new Error("JSON must be an object or array of objects");
            }
        }
        catch (error) {
            throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : "Parse error"}`);
        }
    }
    /**
     * Parse XLSX data
     */
    parseXLSXData(buffer) {
        try {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            // Use first sheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error("No sheets found in Excel file");
            }
            const worksheet = workbook.Sheets[sheetName];
            // Convert to JSON with header detection
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1, // Return array of arrays first to detect headers
                raw: false,
                defval: null,
            });
            if (jsonData.length === 0) {
                throw new Error("Excel sheet is empty");
            }
            // Detect headers
            const hasHeaders = this.detectXLSXHeaders(jsonData);
            // Convert to object format
            let data;
            if (hasHeaders) {
                const headers = jsonData[0];
                data = jsonData.slice(1).map((row) => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header || `column_${index + 1}`] = row[index];
                    });
                    return obj;
                });
            }
            else {
                // Generate column names
                const maxCols = Math.max(...jsonData.map((row) => row.length));
                const headers = Array.from({ length: maxCols }, (_, i) => `column_${i + 1}`);
                data = jsonData.map((row) => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            }
            return {
                data,
                hasHeaders,
                totalRecords: data.length,
            };
        }
        catch (error) {
            throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    /**
     * Analyze field structure and generate enhanced metadata
     */
    async analyzeFieldStructure(sampleData, hasHeaders, options) {
        if (sampleData.length === 0) {
            return [];
        }
        const firstItem = sampleData[0];
        if (typeof firstItem !== "object" || firstItem === null) {
            throw new Error("Invalid data structure for field analysis");
        }
        const fieldNames = Object.keys(firstItem);
        const fields = [];
        for (const fieldName of fieldNames) {
            const field = await this.analyzeField(fieldName, sampleData, options);
            fields.push(field);
        }
        return fields;
    }
    /**
     * Analyze individual field with enhanced metadata
     */
    async analyzeField(fieldName, sampleData, options) {
        // Extract all values for this field
        const allValues = sampleData.map((item) => item[fieldName]);
        const nonNullValues = allValues.filter((v) => v !== null && v !== undefined && v !== "");
        // Basic statistics
        const nullCount = allValues.length - nonNullValues.length;
        const nullPercentage = (nullCount / allValues.length) * 100;
        const uniqueValues = new Set(nonNullValues);
        const uniquePercentage = nonNullValues.length > 0
            ? (uniqueValues.size / nonNullValues.length) * 100
            : 0;
        // Data type inference
        const dataType = this.inferDataType(nonNullValues);
        // Sample values (top 5 unique values)
        const sampleValues = Array.from(uniqueValues).slice(0, 5);
        // Enhanced metadata
        const metadata = {};
        if (options.expandAbbreviations) {
            metadata.abbreviationExpansion = this.expandAbbreviation(fieldName);
            metadata.normalizedName = this.normalizeFieldName(fieldName);
        }
        if (options.inferTypes) {
            metadata.inferredType = this.advancedTypeInference(nonNullValues, fieldName);
        }
        if (options.analyzePatterns) {
            metadata.patterns = this.detectPatterns(nonNullValues);
        }
        if (options.includeStatistics) {
            metadata.statistics = this.calculateStatistics(nonNullValues, dataType);
        }
        return {
            name: fieldName,
            dataType,
            sampleValues,
            nullPercentage,
            uniquePercentage,
            isRequired: nullPercentage < 10, // Field is required if <10% null values
            metadata,
        };
    }
    /**
     * Infer data type from values with enhanced logic
     */
    inferDataType(values) {
        if (values.length === 0)
            return "string";
        // Calculate type percentages
        let numberCount = 0;
        let booleanCount = 0;
        let dateCount = 0;
        let jsonCount = 0;
        for (const value of values) {
            if (value === null || value === undefined)
                continue;
            const stringValue = String(value);
            // Number check (including currency, percentages)
            if (this.isNumeric(stringValue)) {
                numberCount++;
                continue;
            }
            // Boolean check
            if (this.isBoolean(stringValue)) {
                booleanCount++;
                continue;
            }
            // Date check
            if (this.isDate(stringValue)) {
                dateCount++;
                continue;
            }
            // JSON check
            if (this.isJSON(stringValue)) {
                jsonCount++;
                continue;
            }
        }
        const total = values.length;
        const threshold = 0.8; // 80% threshold for type determination
        if (numberCount / total >= threshold)
            return "number";
        if (booleanCount / total >= threshold)
            return "boolean";
        if (dateCount / total >= threshold)
            return "date";
        if (jsonCount / total >= threshold)
            return "json";
        return "string"; // Default fallback
    }
    /**
     * Advanced type inference considering field names and patterns
     */
    advancedTypeInference(values, fieldName) {
        const normalizedName = fieldName.toLowerCase();
        // Field name hints
        if (normalizedName.includes("price") ||
            normalizedName.includes("cost") ||
            normalizedName.includes("amount")) {
            return "currency";
        }
        if (normalizedName.includes("percent") || normalizedName.includes("rate")) {
            return "percentage";
        }
        if (normalizedName.includes("weight") ||
            normalizedName.includes("height") ||
            normalizedName.includes("width")) {
            return "measurement";
        }
        if (normalizedName.includes("email") || normalizedName.includes("mail")) {
            return "email";
        }
        if (normalizedName.includes("phone") || normalizedName.includes("tel")) {
            return "phone";
        }
        if (normalizedName.includes("url") ||
            normalizedName.includes("link") ||
            normalizedName.includes("website")) {
            return "url";
        }
        if (normalizedName.includes("image") ||
            normalizedName.includes("img") ||
            normalizedName.includes("photo")) {
            return "image_url";
        }
        // Pattern-based inference
        if (values.length > 0) {
            const sampleValue = String(values[0]);
            if (/^\d{3}-\d{2}-\d{4}$/.test(sampleValue))
                return "ssn";
            if (/^[A-Z]{2}\d{4,10}$/.test(sampleValue))
                return "sku";
            if (/^\d{12,13}$/.test(sampleValue))
                return "barcode";
            if (/^#[0-9A-Fa-f]{6}$/.test(sampleValue))
                return "color_hex";
        }
        return this.inferDataType(values);
    }
    /**
     * Detect common patterns in field values
     */
    detectPatterns(values) {
        const patterns = [];
        if (values.length === 0)
            return patterns;
        const stringValues = values.map((v) => String(v));
        // Check for common patterns
        if (stringValues.every((v) => /^\d+$/.test(v))) {
            patterns.push("integer_only");
        }
        if (stringValues.every((v) => /^\d+\.\d{2}$/.test(v))) {
            patterns.push("decimal_two_places");
        }
        if (stringValues.every((v) => /^\$[\d,]+\.\d{2}$/.test(v))) {
            patterns.push("currency_usd");
        }
        if (stringValues.every((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))) {
            patterns.push("date_iso");
        }
        if (stringValues.every((v) => /^[A-Z0-9]{6,12}$/.test(v))) {
            patterns.push("code_alphanum");
        }
        if (stringValues.every((v) => v.length === stringValues[0].length)) {
            patterns.push("fixed_length");
        }
        return patterns;
    }
    /**
     * Calculate statistical information for field values
     */
    calculateStatistics(values, dataType) {
        const stats = {};
        if (values.length === 0)
            return stats;
        if (dataType === "number") {
            const numericValues = values
                .map((v) => Number(v))
                .filter((v) => !isNaN(v));
            if (numericValues.length > 0) {
                stats.min = Math.min(...numericValues);
                stats.max = Math.max(...numericValues);
                stats.average =
                    numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            }
        }
        if (dataType === "string") {
            const stringValues = values.map((v) => String(v));
            const lengths = stringValues.map((v) => v.length);
            stats.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            stats.minLength = Math.min(...lengths);
            stats.maxLength = Math.max(...lengths);
        }
        // Common values
        const valueCounts = new Map();
        values.forEach((value) => {
            const key = String(value);
            valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
        });
        stats.commonValues = Array.from(valueCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([value, count]) => ({ value, count }));
        return stats;
    }
    /**
     * Helper methods for type detection
     */
    isNumeric(value) {
        if (!value || value.trim() === "")
            return false;
        // Remove common currency symbols and formatting
        const cleaned = value.replace(/[$,€£¥%]/g, "").trim();
        return !isNaN(Number(cleaned)) && isFinite(Number(cleaned));
    }
    isBoolean(value) {
        const normalized = value.toLowerCase().trim();
        return [
            "true",
            "false",
            "yes",
            "no",
            "1",
            "0",
            "on",
            "off",
            "enabled",
            "disabled",
        ].includes(normalized);
    }
    isDate(value) {
        if (!value || value.trim() === "")
            return false;
        const date = new Date(value);
        return !isNaN(date.getTime()) && value.length >= 8; // Minimum reasonable date length
    }
    isJSON(value) {
        if (!value || typeof value !== "string")
            return false;
        try {
            JSON.parse(value);
            return value.startsWith("{") || value.startsWith("[");
        }
        catch {
            return false;
        }
    }
    /**
     * Expand abbreviations in field names
     */
    expandAbbreviation(fieldName) {
        const normalized = fieldName.toLowerCase();
        const words = normalized.split(/[_\-\s]+/);
        const expanded = words.map((word) => {
            return this.COMMON_ABBREVIATIONS[word] || word;
        });
        const result = expanded.join("_");
        return result !== normalized ? result : fieldName;
    }
    /**
     * Normalize field name for comparison
     */
    normalizeFieldName(fieldName) {
        return fieldName
            .toLowerCase()
            .replace(/[_\-\s]+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
            .replace(/^_+|_+$/g, "");
    }
    /**
     * Detect if CSV has headers by analyzing first row
     */
    detectCSVHeaders(records) {
        if (records.length < 2)
            return false;
        const firstRow = records[0];
        const secondRow = records[1];
        // Check if first row contains strings while second row contains numbers/mixed types
        const firstRowTypes = firstRow.map((cell) => typeof cell);
        const secondRowTypes = secondRow.map((cell) => typeof cell);
        const firstRowAllStrings = firstRowTypes.every((type) => type === "string");
        const secondRowMixed = new Set(secondRowTypes).size > 1;
        return firstRowAllStrings && secondRowMixed;
    }
    /**
     * Detect if XLSX has headers
     */
    detectXLSXHeaders(data) {
        if (data.length < 2)
            return false;
        const firstRow = data[0];
        const secondRow = data[1];
        // Similar logic to CSV header detection
        return (firstRow.every((cell) => typeof cell === "string") &&
            secondRow.some((cell) => typeof cell !== "string"));
    }
    /**
     * Prepare sample data matrix for analysis
     */
    prepareSampleDataMatrix(data, fields) {
        const maxSamples = Math.min(5, data.length); // Maximum 5 sample rows
        return data
            .slice(0, maxSamples)
            .map((item) => fields.map((field) => item[field.name]));
    }
    /**
     * Calculate confidence in field extraction quality
     */
    calculateExtractionConfidence(fields, sampleData) {
        if (fields.length === 0)
            return 0;
        let confidence = 0.5; // Base confidence
        // Boost confidence for well-structured data
        const hasGoodFieldNames = fields.filter((f) => f.name && f.name.length > 1 && !f.name.startsWith("column_")).length / fields.length;
        confidence += hasGoodFieldNames * 0.3;
        // Boost for variety in data types
        const uniqueTypes = new Set(fields.map((f) => f.dataType)).size;
        confidence += (uniqueTypes / Math.max(fields.length, 4)) * 0.2;
        // Penalty for high null percentages
        const avgNullPercentage = fields.reduce((sum, f) => sum + f.nullPercentage, 0) / fields.length;
        confidence -= (avgNullPercentage / 100) * 0.2;
        return Math.max(0, Math.min(1, confidence));
    }
    /**
     * Detect file encoding (basic implementation)
     */
    detectEncoding(buffer) {
        // Check for BOM
        if (buffer.length >= 3 &&
            buffer[0] === 0xef &&
            buffer[1] === 0xbb &&
            buffer[2] === 0xbf) {
            return "utf8-bom";
        }
        // Default to UTF-8
        return "utf8";
    }
}
export default FieldExtractionService;
//# sourceMappingURL=field-extraction-service.js.map