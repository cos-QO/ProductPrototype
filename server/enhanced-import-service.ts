import { Request, Response } from "express";
import { promises as fs } from "fs";
import { db } from "./db";
import {
  brands,
  products,
  productAttributes,
  importSessions,
  fieldMappingCache,
  importHistory,
  importBatches,
  type ImportSession,
  type InsertImportSession,
  type FieldMappingCache,
  type InsertFieldMappingCache,
  type ImportHistory,
  type InsertImportHistory,
  type ImportBatch,
  type InsertImportBatch,
} from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { eq, desc, and } from "drizzle-orm";

// Enhanced file upload configuration is now handled by secure middleware
// The secure upload is imported from middleware/security.ts

// Types for enhanced import system
interface FileAnalysisResult {
  success: boolean;
  sessionId: string;
  fileInfo: {
    name: string;
    size: number;
    type: string;
    totalRecords: number;
  };
  sourceFields: SourceField[];
  suggestedMappings: FieldMapping[];
  errors?: string[];
}

interface SourceField {
  name: string;
  dataType: "string" | "number" | "boolean" | "date" | "json";
  sampleValues: any[];
  nullPercentage: number;
  uniquePercentage: number;
  isRequired: boolean;
  metadata?: {
    abbreviationExpansion?: string;
    normalizedName?: string;
    inferredType?: string;
    patterns?: string[];
    statistics?: {
      min?: number;
      max?: number;
      avgLength?: number;
      commonValues?: Array<{ value: any; count: number }>;
    };
  };
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number; // 0-100
  strategy: "exact" | "fuzzy" | "llm" | "historical" | "statistical";
  metadata?: any;
}

interface ValidationResult {
  success: boolean;
  sessionId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  previewData: any[];
}

interface ValidationError {
  recordIndex: number;
  field: string;
  value: any;
  rule: string;
  severity: "error" | "warning";
  suggestion?: string;
  autoFix?: {
    action: string;
    newValue: any;
  };
}

interface ImportProgress {
  sessionId: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatch: number;
  totalBatches: number;
  processingRate: number; // records/second
  estimatedTimeRemaining: number; // seconds
  errors: ValidationError[];
}

interface BatchProcessorConfig {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  targetLatency: number; // ms per record
}

// Enhanced Import Service Class
export class EnhancedImportService {
  private static instance: EnhancedImportService;
  private activeUploads: Map<string, ImportSession> = new Map();
  private batchConfig: BatchProcessorConfig = {
    batchSize: 100,
    maxConcurrency: 5,
    retryAttempts: 3,
    targetLatency: 10,
  };

  static getInstance(): EnhancedImportService {
    if (!EnhancedImportService.instance) {
      EnhancedImportService.instance = new EnhancedImportService();
    }
    return EnhancedImportService.instance;
  }

  // Step 1: Initialize upload session
  async initializeSession(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub || "local-dev-user";
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const sessionId = uuidv4();
      const sessionData: InsertImportSession = {
        sessionId,
        userId,
        status: "initiated",
        processingRate: 0,
        estimatedTimeRemaining: 0,
      };

      const [session] = await db
        .insert(importSessions)
        .values(sessionData)
        .returning();

      this.activeUploads.set(sessionId, session);

      res.json({
        success: true,
        sessionId,
        message: "Upload session initialized",
      });
    } catch (error: any) {
      console.error("Session initialization error:", error);
      res.status(500).json({
        error: "Failed to initialize session",
        message: error.message,
      });
    }
  }

  // Step 2: Enhanced file analysis with multi-strategy field mapping
  async analyzeFile(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Update session with file information
      await this.updateSession(sessionId, {
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        status: "analyzing",
      });

      // Enhanced field extraction using the advanced service
      const { FieldExtractionService } = await import(
        "./services/field-extraction-service"
      );
      const fieldExtractor = FieldExtractionService.getInstance();

      const fileType = this.getFileTypeFromExtension(file.originalname) as
        | "csv"
        | "json"
        | "xlsx";

      // Read file from disk since we're using diskStorage, not memoryStorage
      if (!file.path) {
        throw new Error(
          "File path is missing - multer might be using memory storage instead of disk storage",
        );
      }

      let fileBuffer;
      try {
        fileBuffer = await fs.readFile(file.path);
        if (!fileBuffer) {
          throw new Error("File buffer is null or undefined after reading");
        }
        if (fileBuffer.length === 0) {
          throw new Error("File buffer is empty");
        }
      } catch (fsError) {
        throw new Error(
          `Failed to read file from path ${file.path}: ${fsError.message}`,
        );
      }

      const extractedFields = await fieldExtractor.extractFieldsFromFile(
        fileBuffer,
        file.originalname,
        fileType,
        {
          maxSampleSize: 100,
          includeStatistics: true,
          expandAbbreviations: true,
          inferTypes: true,
          analyzePatterns: true,
        },
      );

      // Multi-strategy field mapping using the enhanced engine
      let suggestedMappings: FieldMapping[] = [];

      try {
        // First, try the multi-strategy mapping engine
        const { MultiStrategyFieldMapping } = await import(
          "./services/multi-strategy-field-mapping"
        );
        const multiStrategyMapper = MultiStrategyFieldMapping.getInstance();

        console.log("Using enhanced multi-strategy field mapping engine");

        const mappingResult =
          await multiStrategyMapper.generateMappings(extractedFields);

        if (mappingResult.success) {
          suggestedMappings = mappingResult.mappings;
          console.log(
            `Multi-strategy mapping completed: ${suggestedMappings.length} mappings, confidence: ${mappingResult.confidence}%, strategies: ${mappingResult.strategiesUsed.join(", ")}, cost: $${mappingResult.cost?.toFixed(6) || "0"}`,
          );
        } else {
          throw new Error(
            mappingResult.error || "Multi-strategy mapping failed",
          );
        }
      } catch (error) {
        console.log(
          "Multi-strategy mapping failed, falling back to simple system:",
          error.message,
        );

        // Fallback to simplified mapping
        try {
          const { SimpleFieldMappingService } = await import(
            "./services/simple-field-mapping"
          );
          const simpleMapping = SimpleFieldMappingService.getInstance();

          if (simpleMapping.isAvailable()) {
            console.log("Using simplified field mapping fallback");

            const simpleExtractedFields = {
              fields: extractedFields.fields.map((f) => f.name),
              sampleData: extractedFields.sampleData,
              fileType: extractedFields.fileType,
            };

            const result = await simpleMapping.processFileForMapping(
              simpleExtractedFields,
            );

            if (result.success) {
              suggestedMappings = result.mappings.map((m) => ({
                sourceField: m.sourceField,
                targetField: m.targetField,
                confidence: m.confidence,
                strategy: "llm" as const,
                metadata: {
                  reasoning: m.reasoning,
                  system: "simplified-fallback",
                },
              }));

              console.log(
                `Simplified fallback mapping completed: ${suggestedMappings.length} mappings, cost: $${result.usage?.cost.toFixed(6) || "0"}`,
              );
            } else {
              throw new Error(result.error || "Simplified mapping failed");
            }
          } else {
            throw new Error("OpenRouter not available");
          }
        } catch (fallbackError) {
          console.error("All mapping strategies failed:", fallbackError);
          // Provide empty mappings but continue processing
          suggestedMappings = [];
        }
      }

      // Update session with analysis results
      await this.updateSession(sessionId, {
        totalRecords: extractedFields.metadata.totalRecords,
        fieldMappings: suggestedMappings,
        status: "mapping",
      });

      const result: FileAnalysisResult = {
        success: true,
        sessionId,
        fileInfo: {
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          totalRecords: extractedFields.metadata.totalRecords,
        },
        sourceFields: extractedFields.fields,
        suggestedMappings,
      };

      res.json(result);
    } catch (error: any) {
      console.error("File analysis error:", error);
      await this.updateSession(req.params.sessionId, {
        status: "failed",
        errorLog: { error: error.message },
      });
      res.status(500).json({
        error: "File analysis failed",
        message: error.message,
      });
    }
  }

  // Step 3: Override field mappings manually
  async overrideFieldMappings(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { mappings } = req.body as { mappings: FieldMapping[] };

      if (!sessionId || !mappings) {
        return res
          .status(400)
          .json({ error: "Session ID and mappings required" });
      }

      // Update session with new mappings
      await this.updateSession(sessionId, {
        fieldMappings: mappings,
        status: "mapping",
      });

      // Cache successful mappings for future learning
      await this.cacheMappings(mappings);

      res.json({
        success: true,
        message: "Field mappings updated successfully",
        mappings,
      });
    } catch (error: any) {
      console.error("Mapping override error:", error);
      res.status(500).json({
        error: "Failed to update mappings",
        message: error.message,
      });
    }
  }

  // Step 4: Generate data preview with validation
  async generatePreview(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { limit = 20 } = req.query;

      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get the original file data (this would be cached in production)
      const fileData = await this.getCachedFileData(sessionId);
      if (!fileData) {
        return res
          .status(400)
          .json({ error: "File data not found. Please re-upload." });
      }

      // Apply field mappings
      const mappedData = await this.applyFieldMappings(
        fileData,
        session.fieldMappings as FieldMapping[],
      );

      // Validate data
      const validationResults = await this.validateData(mappedData);

      // Generate preview subset
      const previewData = mappedData.slice(0, Number(limit));

      // Update session status
      await this.updateSession(sessionId, {
        status: "previewing",
      });

      const result: ValidationResult = {
        success: true,
        sessionId,
        totalRecords: mappedData.length,
        validRecords: validationResults.validCount,
        invalidRecords: validationResults.invalidCount,
        errors: validationResults.errors,
        previewData,
      };

      res.json(result);
    } catch (error: any) {
      console.error("Preview generation error:", error);
      res.status(500).json({
        error: "Preview generation failed",
        message: error.message,
      });
    }
  }

  // Step 5: Execute bulk import with batch processing
  async executeImport(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { importConfig = {} } = req.body;

      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Update session to processing
      await this.updateSession(sessionId, {
        status: "processing",
        importConfig,
        startedAt: new Date(),
      });

      // Start background processing
      this.processBatchImport(sessionId, importConfig);

      res.json({
        success: true,
        message: "Import started",
        sessionId,
        status: "processing",
      });
    } catch (error: any) {
      console.error("Import execution error:", error);
      res.status(500).json({
        error: "Import execution failed",
        message: error.message,
      });
    }
  }

  // Get import progress
  async getImportProgress(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const progress: ImportProgress = {
        sessionId,
        status: session.status || "unknown",
        totalRecords: session.totalRecords || 0,
        processedRecords: session.processedRecords || 0,
        successfulRecords: session.successfulRecords || 0,
        failedRecords: session.failedRecords || 0,
        currentBatch: 0, // Calculate from batches
        totalBatches: Math.ceil(
          (session.totalRecords || 0) / this.batchConfig.batchSize,
        ),
        processingRate: session.processingRate || 0,
        estimatedTimeRemaining: session.estimatedTimeRemaining || 0,
        errors: [],
      };

      res.json(progress);
    } catch (error: any) {
      console.error("Progress retrieval error:", error);
      res.status(500).json({
        error: "Failed to get progress",
        message: error.message,
      });
    }
  }

  // Private helper methods
  private async parseFileData(
    file: Express.Multer.File,
  ): Promise<{ data: any[]; totalRecords: number }> {
    // Use the optimized file processor for better performance and streaming support
    const { fileProcessor } = await import("./file-processor");
    const result = await fileProcessor.processFile(file);

    if (!result.success) {
      throw new Error(result.error || "File processing failed");
    }

    // For small files processed in memory
    if (result.data) {
      return { data: result.data, totalRecords: result.data.length };
    }

    // For large files processed with streaming
    if (result.streamPath && result.metadata.recordCount) {
      // For the analysis phase, we can work with the metadata and sample data
      // The actual data processing will be handled by the batch processor
      return {
        data: result.metadata.sampleData || [],
        totalRecords: result.metadata.recordCount,
      };
    }

    throw new Error("No data returned from file processor");
  }

  private async analyzeFields(data: any[]): Promise<SourceField[]> {
    if (data.length === 0) return [];

    const sampleSize = Math.min(100, data.length);
    const sample = data.slice(0, sampleSize);
    const fieldNames = Object.keys(sample[0] || {});

    return fieldNames.map((fieldName) => {
      const values = sample
        .map((row) => row[fieldName])
        .filter((v) => v !== null && v !== undefined);
      const nullCount = sample.length - values.length;
      const uniqueValues = new Set(values);

      return {
        name: fieldName,
        dataType: this.inferDataType(values),
        sampleValues: Array.from(uniqueValues).slice(0, 5),
        nullPercentage: (nullCount / sample.length) * 100,
        uniquePercentage: (uniqueValues.size / values.length) * 100,
        isRequired: nullCount === 0,
      };
    });
  }

  private inferDataType(
    values: any[],
  ): "string" | "number" | "boolean" | "date" | "json" {
    if (values.length === 0) return "string";

    const numberCount = values.filter(
      (v) => typeof v === "number" || !isNaN(Number(v)),
    ).length;
    const booleanCount = values.filter(
      (v) => typeof v === "boolean" || v === "true" || v === "false",
    ).length;
    const dateCount = values.filter((v) => !isNaN(Date.parse(v))).length;

    const total = values.length;
    if (numberCount / total > 0.8) return "number";
    if (booleanCount / total > 0.8) return "boolean";
    if (dateCount / total > 0.8) return "date";

    return "string";
  }

  // Field mapping is now handled by the dedicated Field Mapping Engine

  private async applyFieldMappings(
    data: any[],
    mappings: FieldMapping[],
  ): Promise<any[]> {
    if (!mappings || mappings.length === 0) return data;

    return data.map((row) => {
      const mappedRow: any = {};

      for (const mapping of mappings) {
        if (row.hasOwnProperty(mapping.sourceField)) {
          mappedRow[mapping.targetField] = row[mapping.sourceField];
        }
      }

      return mappedRow;
    });
  }

  private async validateData(data: any[]): Promise<{
    validCount: number;
    invalidCount: number;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const recordErrors = await this.validateRecord(record, i);

      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
        invalidCount++;
      } else {
        validCount++;
      }
    }

    return { validCount, invalidCount, errors };
  }

  private async validateRecord(
    record: any,
    index: number,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Required field validation
    if (!record.name || record.name.trim() === "") {
      errors.push({
        recordIndex: index,
        field: "name",
        value: record.name,
        rule: "Required field missing",
        severity: "error",
        suggestion: "Product name is required",
      });
    }

    // Price validation
    if (record.price !== null && record.price !== undefined) {
      const price = Number(record.price);
      if (isNaN(price) || price < 0) {
        errors.push({
          recordIndex: index,
          field: "price",
          value: record.price,
          rule: "Invalid price format",
          severity: "error",
          suggestion: "Price must be a positive number",
          autoFix: {
            action: "Convert to number",
            newValue: Math.abs(price) || 0,
          },
        });
      }
    }

    // SKU validation
    if (record.sku && typeof record.sku !== "string") {
      errors.push({
        recordIndex: index,
        field: "sku",
        value: record.sku,
        rule: "Invalid SKU format",
        severity: "warning",
        suggestion: "SKU should be a string",
        autoFix: {
          action: "Convert to string",
          newValue: String(record.sku),
        },
      });
    }

    return errors;
  }

  private async updateSession(
    sessionId: string,
    updates: Partial<InsertImportSession>,
  ) {
    try {
      await db
        .update(importSessions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(importSessions.sessionId, sessionId));
    } catch (error) {
      console.error("Error updating session:", error);
    }
  }

  private async getSession(sessionId: string): Promise<ImportSession | null> {
    try {
      const sessions = await db
        .select()
        .from(importSessions)
        .where(eq(importSessions.sessionId, sessionId))
        .limit(1);

      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  private async getCachedFileData(sessionId: string): Promise<any[] | null> {
    // In a real implementation, this would retrieve cached file data
    // For now, return null to indicate the file needs to be re-uploaded
    return null;
  }

  private async processBatchImport(sessionId: string, importConfig: any) {
    try {
      // Get session data
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Get cached file data (in production, this would be retrieved from cache/storage)
      const fileData = await this.getCachedFileData(sessionId);
      if (!fileData) {
        throw new Error("File data not found. Please re-upload.");
      }

      // Apply field mappings
      const mappings = session.fieldMappings as FieldMapping[];
      const mappedData = await this.applyFieldMappings(fileData, mappings);

      // Import the batch processor
      const { batchProcessor } = await import("./batch-processor");

      // Start batch processing
      await batchProcessor.processBulkImport(
        sessionId,
        mappedData,
        mappings,
        importConfig.entityType || "product",
      );
    } catch (error) {
      console.error("Batch import error:", error);
      await this.updateSession(sessionId, {
        status: "failed",
        errorLog: { error: error.message },
      });
    }
  }

  /**
   * Convert source fields to sample data format for simplified mapping
   */
  private convertToSampleData(sourceFields: SourceField[]): any[][] {
    const maxSamples = Math.max(
      ...sourceFields.map((f) => f.sampleValues.length),
    );
    const sampleData: any[][] = [];

    for (let i = 0; i < Math.min(maxSamples, 3); i++) {
      const row = sourceFields.map((field) =>
        field.sampleValues[i] !== undefined ? field.sampleValues[i] : null,
      );
      sampleData.push(row);
    }

    return sampleData;
  }

  /**
   * Cache successful field mappings for future learning
   */
  private async cacheMappings(mappings: FieldMapping[]): Promise<void> {
    try {
      for (const mapping of mappings) {
        const cacheData: InsertFieldMappingCache = {
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          confidence: mapping.confidence,
          strategy: mapping.strategy,
          metadata: mapping.metadata,
          createdAt: new Date(),
        };

        // Insert or update cache entry
        await db
          .insert(fieldMappingCache)
          .values(cacheData)
          .onConflictDoUpdate({
            target: [
              fieldMappingCache.sourceField,
              fieldMappingCache.targetField,
            ],
            set: {
              confidence: cacheData.confidence,
              strategy: cacheData.strategy,
              metadata: cacheData.metadata,
              updatedAt: new Date(),
            },
          });
      }
    } catch (error) {
      console.error("Error caching field mappings:", error);
      // Don't throw error - this is non-critical
    }
  }

  /**
   * Get file type from file extension
   */
  private getFileTypeFromExtension(fileName: string): string {
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
        return "json"; // default fallback
    }
  }
}

// Export singleton instance
export const enhancedImportService = EnhancedImportService.getInstance();
