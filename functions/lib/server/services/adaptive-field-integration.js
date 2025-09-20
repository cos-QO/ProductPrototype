/**
 * Adaptive Field Integration Service
 *
 * Bridges the AdaptiveCSVExtractor with the existing FieldExtractionService
 * Provides seamless integration for enhanced CSV processing
 */
import { FieldExtractionService, } from "./field-extraction-service";
import { AdaptiveCSVExtractor } from "./adaptive-csv-extractor";
export class AdaptiveFieldIntegration {
    static instance;
    fieldExtractor;
    csvExtractor;
    static getInstance() {
        if (!AdaptiveFieldIntegration.instance) {
            AdaptiveFieldIntegration.instance = new AdaptiveFieldIntegration();
        }
        return AdaptiveFieldIntegration.instance;
    }
    constructor() {
        this.fieldExtractor = FieldExtractionService.getInstance();
        this.csvExtractor = AdaptiveCSVExtractor.getInstance();
    }
    /**
     * Enhanced field extraction with adaptive CSV parsing
     */
    async extractFieldsWithAdaptiveParsing(fileBuffer, fileName, options = {}) {
        const startTime = Date.now();
        try {
            // First, try adaptive CSV extraction if it's a CSV file
            if (this.isCSVFile(fileName)) {
                return await this.processWithAdaptiveCSV(fileBuffer, fileName, options, startTime);
            }
            else {
                // For non-CSV files, use standard field extraction
                return await this.processWithStandardExtraction(fileBuffer, fileName, options, startTime);
            }
        }
        catch (error) {
            return {
                success: false,
                extractedFields: this.createEmptyExtractionResult(),
                parseResult: this.createFailureParseResult(),
                integrationMetadata: {
                    adaptiveParsingUsed: false,
                    fallbackToBasic: false,
                    confidenceImprovement: 0,
                    totalProcessingTime: Date.now() - startTime,
                },
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Process CSV files with adaptive parsing
     */
    async processWithAdaptiveCSV(fileBuffer, fileName, options, startTime) {
        try {
            // Use adaptive CSV extraction
            const csvResult = await this.csvExtractor.extractCSV(fileBuffer, fileName);
            if (csvResult.success && csvResult.confidence >= 70) {
                // High confidence adaptive parsing - use it
                const extractedFields = await this.convertCSVResultToFieldExtraction(csvResult, fileName, options);
                return {
                    success: true,
                    extractedFields,
                    parseResult: csvResult,
                    integrationMetadata: {
                        adaptiveParsingUsed: true,
                        fallbackToBasic: false,
                        confidenceImprovement: csvResult.confidence - 70, // Improvement over baseline
                        totalProcessingTime: Date.now() - startTime,
                    },
                };
            }
            else {
                // Low confidence or failure - fallback to standard extraction
                return await this.fallbackToStandardExtraction(fileBuffer, fileName, options, startTime, csvResult);
            }
        }
        catch (error) {
            // Error in adaptive parsing - fallback to standard
            return await this.fallbackToStandardExtraction(fileBuffer, fileName, options, startTime);
        }
    }
    /**
     * Process non-CSV files with standard extraction
     */
    async processWithStandardExtraction(fileBuffer, fileName, options, startTime) {
        const fileType = this.getFileTypeFromExtension(fileName);
        const extractedFields = await this.fieldExtractor.extractFieldsFromFile(fileBuffer, fileName, fileType, options);
        return {
            success: true,
            extractedFields,
            parseResult: this.createParseResultFromExtraction(extractedFields),
            integrationMetadata: {
                adaptiveParsingUsed: false,
                fallbackToBasic: false,
                confidenceImprovement: 0,
                totalProcessingTime: Date.now() - startTime,
            },
        };
    }
    /**
     * Fallback to standard extraction when adaptive parsing fails
     */
    async fallbackToStandardExtraction(fileBuffer, fileName, options, startTime, failedCsvResult) {
        try {
            const extractedFields = await this.fieldExtractor.extractFieldsFromFile(fileBuffer, fileName, "csv", options);
            const basicConfidence = extractedFields.confidence * 100;
            const adaptiveConfidence = failedCsvResult?.confidence || 0;
            return {
                success: true,
                extractedFields,
                parseResult: this.createParseResultFromExtraction(extractedFields),
                integrationMetadata: {
                    adaptiveParsingUsed: false,
                    fallbackToBasic: true,
                    confidenceImprovement: basicConfidence - adaptiveConfidence,
                    totalProcessingTime: Date.now() - startTime,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                extractedFields: this.createEmptyExtractionResult(),
                parseResult: failedCsvResult || this.createFailureParseResult(),
                integrationMetadata: {
                    adaptiveParsingUsed: failedCsvResult ? true : false,
                    fallbackToBasic: true,
                    confidenceImprovement: 0,
                    totalProcessingTime: Date.now() - startTime,
                },
                error: error instanceof Error
                    ? error.message
                    : "Both adaptive and standard extraction failed",
            };
        }
    }
    /**
     * Convert adaptive CSV result to FieldExtraction format
     */
    async convertCSVResultToFieldExtraction(csvResult, fileName, options) {
        const data = csvResult.data;
        if (data.length === 0) {
            return this.createEmptyExtractionResult();
        }
        // Analyze fields from the parsed data
        const fieldNames = Object.keys(data[0] || {});
        const fields = [];
        for (const fieldName of fieldNames) {
            const field = await this.analyzeField(fieldName, data, options);
            fields.push(field);
        }
        // Prepare sample data matrix
        const sampleData = this.prepareSampleDataMatrix(data, fields);
        return {
            fields,
            sampleData,
            fileType: "csv",
            metadata: {
                totalRecords: data.length,
                totalFields: fields.length,
                fileSize: 0, // Not available from CSV result
                parseTime: csvResult.metadata.parseTime,
                hasHeaders: csvResult.metadata.hasHeaders,
                encoding: csvResult.metadata.encoding,
            },
            confidence: csvResult.confidence / 100, // Convert to 0-1 scale
        };
    }
    /**
     * Analyze individual field for SourceField creation
     */
    async analyzeField(fieldName, data, options) {
        const values = data
            .map((row) => row[fieldName])
            .filter((v) => v !== null && v !== undefined && v !== "");
        const allValues = data.map((row) => row[fieldName]);
        const nullCount = allValues.length - values.length;
        const nullPercentage = (nullCount / allValues.length) * 100;
        const uniqueValues = new Set(values);
        const uniquePercentage = values.length > 0 ? (uniqueValues.size / values.length) * 100 : 0;
        return {
            name: fieldName,
            dataType: this.inferDataType(values),
            sampleValues: Array.from(uniqueValues).slice(0, 5),
            nullPercentage,
            uniquePercentage,
            isRequired: nullPercentage < 10,
            metadata: {
                abbreviationExpansion: options.expandAbbreviations
                    ? this.expandAbbreviation(fieldName)
                    : undefined,
                normalizedName: this.normalizeFieldName(fieldName),
                inferredType: options.inferTypes
                    ? this.advancedTypeInference(values, fieldName)
                    : undefined,
                patterns: options.analyzePatterns
                    ? this.detectPatterns(values)
                    : undefined,
                statistics: options.includeStatistics
                    ? this.calculateStatistics(values)
                    : undefined,
            },
        };
    }
    /**
     * Utility methods
     */
    isCSVFile(fileName) {
        return fileName.toLowerCase().endsWith(".csv");
    }
    getFileTypeFromExtension(fileName) {
        const ext = fileName.toLowerCase().split(".").pop();
        switch (ext) {
            case "csv":
                return "csv";
            case "json":
                return "json";
            case "xlsx":
            case "xls":
                return "xlsx";
            default:
                return "json";
        }
    }
    createEmptyExtractionResult() {
        return {
            fields: [],
            sampleData: [],
            fileType: "csv",
            metadata: {
                totalRecords: 0,
                totalFields: 0,
                fileSize: 0,
                parseTime: 0,
                hasHeaders: false,
            },
            confidence: 0,
        };
    }
    createFailureParseResult() {
        return {
            success: false,
            data: [],
            confidence: 0,
            strategy: "none",
            metadata: {
                delimiter: "",
                hasHeaders: false,
                totalRecords: 0,
                encoding: "utf8",
                parseTime: 0,
                qualityScore: 0,
                issues: ["Parsing failed"],
            },
            error: "Parsing failed",
        };
    }
    createParseResultFromExtraction(extraction) {
        return {
            success: true,
            data: [], // Data not available in this format
            confidence: extraction.confidence * 100,
            strategy: "standard-extraction",
            metadata: {
                delimiter: ",",
                hasHeaders: extraction.metadata.hasHeaders,
                totalRecords: extraction.metadata.totalRecords,
                encoding: extraction.metadata.encoding || "utf8",
                parseTime: extraction.metadata.parseTime,
                qualityScore: extraction.confidence * 100,
                issues: [],
            },
        };
    }
    prepareSampleDataMatrix(data, fields) {
        const maxSamples = Math.min(5, data.length);
        return data
            .slice(0, maxSamples)
            .map((item) => fields.map((field) => item[field.name]));
    }
    // Field analysis methods (simplified versions from FieldExtractionService)
    inferDataType(values) {
        if (values.length === 0)
            return "string";
        let numberCount = 0;
        let booleanCount = 0;
        let dateCount = 0;
        for (const value of values) {
            const stringValue = String(value);
            if (!isNaN(Number(stringValue)) && isFinite(Number(stringValue))) {
                numberCount++;
            }
            else if (["true", "false", "yes", "no", "1", "0"].includes(stringValue.toLowerCase())) {
                booleanCount++;
            }
            else if (!isNaN(Date.parse(stringValue))) {
                dateCount++;
            }
        }
        const total = values.length;
        const threshold = 0.8;
        if (numberCount / total >= threshold)
            return "number";
        if (booleanCount / total >= threshold)
            return "boolean";
        if (dateCount / total >= threshold)
            return "date";
        return "string";
    }
    expandAbbreviation(fieldName) {
        const abbreviations = {
            qty: "quantity",
            desc: "description",
            amt: "amount",
            num: "number",
            img: "image",
            prod: "product",
        };
        const normalized = fieldName.toLowerCase();
        return abbreviations[normalized] || fieldName;
    }
    normalizeFieldName(fieldName) {
        return fieldName
            .toLowerCase()
            .replace(/[_\-\s]+/g, "_")
            .replace(/[^a-z0-9_]/g, "");
    }
    advancedTypeInference(values, fieldName) {
        const normalizedName = fieldName.toLowerCase();
        if (normalizedName.includes("price") || normalizedName.includes("cost"))
            return "currency";
        if (normalizedName.includes("email"))
            return "email";
        if (normalizedName.includes("phone"))
            return "phone";
        if (normalizedName.includes("url"))
            return "url";
        return this.inferDataType(values);
    }
    detectPatterns(values) {
        const patterns = [];
        const stringValues = values.map((v) => String(v));
        if (stringValues.every((v) => /^\d+$/.test(v))) {
            patterns.push("integer_only");
        }
        if (stringValues.every((v) => /^\d+\.\d{2}$/.test(v))) {
            patterns.push("decimal_two_places");
        }
        return patterns;
    }
    calculateStatistics(values) {
        if (values.length === 0)
            return {};
        const stats = {};
        const numericValues = values.map((v) => Number(v)).filter((v) => !isNaN(v));
        if (numericValues.length > 0) {
            stats.min = Math.min(...numericValues);
            stats.max = Math.max(...numericValues);
            stats.average =
                numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        }
        return stats;
    }
}
export default AdaptiveFieldIntegration;
//# sourceMappingURL=adaptive-field-integration.js.map