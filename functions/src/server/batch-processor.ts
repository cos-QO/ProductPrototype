import { db } from './db';
import { 
  products, 
  brands,
  productAttributes,
  importSessions, 
  importBatches, 
  importHistory,
  type ImportSession,
  type ImportBatch,
  type InsertImportBatch,
  type InsertImportHistory,
  type InsertProduct,
  type InsertBrand,
  type InsertProductAttribute
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Types for batch processing
interface BatchProcessorConfig {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  targetLatency: number; // ms per record
  timeoutMs: number;
}

interface BatchJob {
  sessionId: string;
  batchNumber: number;
  startIndex: number;
  endIndex: number;
  data: any[];
  mappings: FieldMapping[];
  entityType: 'product' | 'brand' | 'attribute';
}

interface BatchResult {
  batchNumber: number;
  success: boolean;
  processedCount: number;
  successCount: number;
  failureCount: number;
  processingTime: number;
  errors: BatchError[];
}

interface BatchError {
  recordIndex: number;
  error: string;
  data: any;
  severity: 'error' | 'warning';
  autoFixable: boolean;
  suggestion?: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  strategy: string;
}

interface ProcessingMetrics {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  averageLatency: number; // ms per record
  throughput: number; // records per second
  startTime: Date;
  estimatedCompletion: Date | null;
}

export class BatchProcessor extends EventEmitter {
  private static instance: BatchProcessor;
  private config: BatchProcessorConfig;
  private activeJobs: Map<string, Promise<BatchResult>> = new Map();
  private processingMetrics: Map<string, ProcessingMetrics> = new Map();

  static getInstance(): BatchProcessor {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor();
    }
    return BatchProcessor.instance;
  }

  constructor() {
    super();
    this.config = {
      batchSize: 100,
      maxConcurrency: 5,
      retryAttempts: 3,
      targetLatency: 10, // 10ms per record target
      timeoutMs: 60000 // 60 second timeout per batch
    };
  }

  /**
   * Main entry point for processing bulk import
   */
  async processBulkImport(
    sessionId: string, 
    data: any[], 
    mappings: FieldMapping[],
    entityType: 'product' | 'brand' | 'attribute' = 'product'
  ): Promise<void> {
    try {
      // Initialize processing metrics
      this.initializeMetrics(sessionId, data.length);

      // Update session status
      await this.updateSessionStatus(sessionId, 'processing');

      // Create batches
      const batches = this.createBatches(sessionId, data, mappings, entityType);
      
      // Create batch records in database
      await this.createBatchRecords(sessionId, batches);

      // Process batches with concurrency control
      await this.processBatchesConcurrently(batches);

      // Finalize processing
      await this.finalizeProcessing(sessionId);

    } catch (error) {
      console.error('Bulk import processing failed:', error);
      await this.updateSessionStatus(sessionId, 'failed', error.message);
      this.emit('error', { sessionId, error });
    }
  }

  /**
   * Create batch jobs from data
   */
  private createBatches(
    sessionId: string, 
    data: any[], 
    mappings: FieldMapping[],
    entityType: 'product' | 'brand' | 'attribute'
  ): BatchJob[] {
    const batches: BatchJob[] = [];
    const totalRecords = data.length;
    const batchCount = Math.ceil(totalRecords / this.config.batchSize);

    for (let i = 0; i < batchCount; i++) {
      const startIndex = i * this.config.batchSize;
      const endIndex = Math.min(startIndex + this.config.batchSize, totalRecords);
      const batchData = data.slice(startIndex, endIndex);

      batches.push({
        sessionId,
        batchNumber: i + 1,
        startIndex,
        endIndex,
        data: batchData,
        mappings,
        entityType
      });
    }

    return batches;
  }

  /**
   * Create batch tracking records in database
   */
  private async createBatchRecords(sessionId: string, batches: BatchJob[]): Promise<void> {
    const batchRecords: InsertImportBatch[] = batches.map(batch => ({
      sessionId,
      batchNumber: batch.batchNumber,
      startIndex: batch.startIndex,
      endIndex: batch.endIndex,
      recordCount: batch.data.length,
      status: 'pending'
    }));

    await db.insert(importBatches).values(batchRecords);
  }

  /**
   * Process batches with concurrency control
   */
  private async processBatchesConcurrently(batches: BatchJob[]): Promise<void> {
    const semaphore = new Array(this.config.maxConcurrency).fill(null);
    const promises: Promise<BatchResult>[] = [];

    for (const batch of batches) {
      // Wait for an available slot
      await Promise.race(semaphore.filter(p => p !== null));

      // Process batch
      const batchPromise = this.processBatch(batch)
        .finally(() => {
          // Free up semaphore slot
          const index = semaphore.indexOf(batchPromise);
          if (index > -1) semaphore[index] = null;
        });

      // Add to semaphore
      const freeSlot = semaphore.indexOf(null);
      if (freeSlot > -1) {
        semaphore[freeSlot] = batchPromise;
      }

      promises.push(batchPromise);
    }

    // Wait for all batches to complete
    await Promise.allSettled(promises);
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: BatchJob): Promise<BatchResult> {
    const startTime = Date.now();
    const result: BatchResult = {
      batchNumber: batch.batchNumber,
      success: false,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      processingTime: 0,
      errors: []
    };

    try {
      // Update batch status to processing
      await this.updateBatchStatus(batch.sessionId, batch.batchNumber, 'processing');

      // Process each record in the batch
      for (let i = 0; i < batch.data.length; i++) {
        const recordIndex = batch.startIndex + i;
        const record = batch.data[i];

        try {
          // Apply field mappings
          const mappedRecord = this.applyFieldMappings(record, batch.mappings);
          
          // Validate record
          const validationResult = await this.validateRecord(mappedRecord, batch.entityType);
          
          if (validationResult.isValid) {
            // Insert record into database
            const entityId = await this.insertRecord(mappedRecord, batch.entityType);
            
            // Log success
            await this.logImportRecord(batch.sessionId, recordIndex, record, 'success', batch.entityType, entityId);
            result.successCount++;
          } else {
            // Log validation errors
            result.errors.push({
              recordIndex,
              error: validationResult.errors.join('; '),
              data: record,
              severity: 'error',
              autoFixable: validationResult.autoFixable,
              suggestion: validationResult.suggestion
            });
            
            await this.logImportRecord(batch.sessionId, recordIndex, record, 'failed', batch.entityType, null, validationResult.errors);
            result.failureCount++;
          }
        } catch (recordError) {
          result.errors.push({
            recordIndex,
            error: recordError.message,
            data: record,
            severity: 'error',
            autoFixable: false
          });
          
          await this.logImportRecord(batch.sessionId, recordIndex, record, 'failed', batch.entityType, null, [recordError.message]);
          result.failureCount++;
        }

        result.processedCount++;
        
        // Emit progress update
        this.updateProcessingMetrics(batch.sessionId, recordIndex + 1, result.successCount, result.failureCount);
      }

      result.success = result.failureCount === 0;
      result.processingTime = Date.now() - startTime;

      // Update batch status to completed
      await this.updateBatchStatus(
        batch.sessionId, 
        batch.batchNumber, 
        'completed',
        result.processingTime,
        result.successCount,
        result.failureCount
      );

      this.emit('batchCompleted', { sessionId: batch.sessionId, result });

    } catch (batchError) {
      result.processingTime = Date.now() - startTime;
      
      // Update batch status to failed
      await this.updateBatchStatus(
        batch.sessionId, 
        batch.batchNumber, 
        'failed',
        result.processingTime,
        result.successCount,
        result.failureCount,
        batchError.message
      );

      this.emit('batchFailed', { sessionId: batch.sessionId, batchNumber: batch.batchNumber, error: batchError });
    }

    return result;
  }

  /**
   * Apply field mappings to a record
   */
  private applyFieldMappings(record: any, mappings: FieldMapping[]): any {
    const mappedRecord: any = {};

    for (const mapping of mappings) {
      if (record.hasOwnProperty(mapping.sourceField)) {
        mappedRecord[mapping.targetField] = record[mapping.sourceField];
      }
    }

    return mappedRecord;
  }

  /**
   * Validate a mapped record
   */
  private async validateRecord(
    record: any, 
    entityType: 'product' | 'brand' | 'attribute'
  ): Promise<{ isValid: boolean, errors: string[], autoFixable: boolean, suggestion?: string }> {
    const errors: string[] = [];
    let autoFixable = true;

    switch (entityType) {
      case 'product':
        return this.validateProductRecord(record);
      case 'brand':
        return this.validateBrandRecord(record);
      case 'attribute':
        return this.validateAttributeRecord(record);
      default:
        return { isValid: false, errors: ['Unknown entity type'], autoFixable: false };
    }
  }

  private validateProductRecord(record: any): { isValid: boolean, errors: string[], autoFixable: boolean, suggestion?: string } {
    const errors: string[] = [];
    let autoFixable = true;

    // Required fields
    if (!record.name || record.name.trim() === '') {
      errors.push('Product name is required');
      autoFixable = false;
    }

    // Generate slug if missing
    if (!record.slug && record.name) {
      record.slug = this.generateSlug(record.name);
    }

    // Validate price
    if (record.price !== null && record.price !== undefined) {
      const price = Number(record.price);
      if (isNaN(price) || price < 0) {
        errors.push('Price must be a positive number');
        if (!isNaN(Math.abs(price))) {
          record.price = Math.abs(price);
        } else {
          autoFixable = false;
        }
      } else {
        // Convert to cents for database storage
        record.price = Math.round(price * 100);
      }
    }

    // Validate compareAtPrice
    if (record.compareAtPrice !== null && record.compareAtPrice !== undefined) {
      const comparePrice = Number(record.compareAtPrice);
      if (isNaN(comparePrice) || comparePrice < 0) {
        errors.push('Compare-at price must be a positive number');
        if (!isNaN(Math.abs(comparePrice))) {
          record.compareAtPrice = Math.round(Math.abs(comparePrice) * 100);
        } else {
          record.compareAtPrice = null;
        }
      } else {
        record.compareAtPrice = Math.round(comparePrice * 100);
      }
    }

    // Validate stock
    if (record.stock !== null && record.stock !== undefined) {
      const stock = Number(record.stock);
      if (isNaN(stock) || stock < 0) {
        errors.push('Stock must be a non-negative number');
        record.stock = Math.max(0, Math.floor(Math.abs(stock)) || 0);
      } else {
        record.stock = Math.floor(stock);
      }
    }

    // Validate status
    const validStatuses = ['draft', 'review', 'live', 'archived'];
    if (record.status && !validStatuses.includes(record.status)) {
      record.status = 'draft';
      errors.push('Invalid status, defaulted to draft');
    }

    return {
      isValid: errors.length === 0,
      errors,
      autoFixable,
      suggestion: errors.length > 0 ? 'Check required fields and data formats' : undefined
    };
  }

  private validateBrandRecord(record: any): { isValid: boolean, errors: string[], autoFixable: boolean, suggestion?: string } {
    const errors: string[] = [];

    if (!record.name || record.name.trim() === '') {
      errors.push('Brand name is required');
      return { isValid: false, errors, autoFixable: false };
    }

    if (!record.slug && record.name) {
      record.slug = this.generateSlug(record.name);
    }

    return { isValid: true, errors: [], autoFixable: true };
  }

  private validateAttributeRecord(record: any): { isValid: boolean, errors: string[], autoFixable: boolean, suggestion?: string } {
    const errors: string[] = [];

    if (!record.productId) {
      errors.push('Product ID is required');
      return { isValid: false, errors, autoFixable: false };
    }

    if (!record.attributeName || record.attributeName.trim() === '') {
      errors.push('Attribute name is required');
      return { isValid: false, errors, autoFixable: false };
    }

    return { isValid: true, errors: [], autoFixable: true };
  }

  /**
   * Insert a validated record into the database
   */
  private async insertRecord(record: any, entityType: 'product' | 'brand' | 'attribute'): Promise<number> {
    switch (entityType) {
      case 'product':
        const [product] = await db.insert(products).values(record as InsertProduct).returning({ id: products.id });
        return product.id;
      
      case 'brand':
        const [brand] = await db.insert(brands).values(record as InsertBrand).returning({ id: brands.id });
        return brand.id;
      
      case 'attribute':
        const [attribute] = await db.insert(productAttributes).values(record as InsertProductAttribute).returning({ id: productAttributes.id });
        return attribute.id;
      
      default:
        throw new Error('Unknown entity type');
    }
  }

  /**
   * Log import record to history
   */
  private async logImportRecord(
    sessionId: string,
    recordIndex: number,
    recordData: any,
    status: 'success' | 'failed' | 'skipped',
    entityType: string,
    entityId?: number | null,
    errors?: string[]
  ): Promise<void> {
    const historyRecord: InsertImportHistory = {
      sessionId,
      recordIndex,
      recordData,
      importStatus: status,
      entityType,
      entityId: entityId || null,
      validationErrors: errors || null
    };

    await db.insert(importHistory).values(historyRecord);
  }

  /**
   * Update batch status in database
   */
  private async updateBatchStatus(
    sessionId: string,
    batchNumber: number,
    status: string,
    processingTime?: number,
    successCount?: number,
    failureCount?: number,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
    
    if (processingTime) updates.processingTime = processingTime;
    if (successCount !== undefined) updates.successCount = successCount;
    if (failureCount !== undefined) updates.failureCount = failureCount;
    if (errorMessage) updates.errorMessage = errorMessage;
    if (status === 'processing') updates.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updates.completedAt = new Date();

    await db.update(importBatches)
      .set(updates)
      .where(
        and(
          eq(importBatches.sessionId, sessionId),
          eq(importBatches.batchNumber, batchNumber)
        )
      );
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: string, errorMessage?: string): Promise<void> {
    const updates: any = { status };
    
    if (errorMessage) {
      updates.errorLog = { error: errorMessage };
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    await db.update(importSessions)
      .set(updates)
      .where(eq(importSessions.sessionId, sessionId));
  }

  /**
   * Initialize processing metrics
   */
  private initializeMetrics(sessionId: string, totalRecords: number): void {
    this.processingMetrics.set(sessionId, {
      totalRecords,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      averageLatency: 0,
      throughput: 0,
      startTime: new Date(),
      estimatedCompletion: null
    });
  }

  /**
   * Update processing metrics and emit progress
   */
  private updateProcessingMetrics(sessionId: string, processedRecords: number, successfulRecords: number, failedRecords: number): void {
    const metrics = this.processingMetrics.get(sessionId);
    if (!metrics) return;

    metrics.processedRecords = processedRecords;
    metrics.successfulRecords = successfulRecords;
    metrics.failedRecords = failedRecords;

    // Calculate throughput and ETA
    const elapsedMs = Date.now() - metrics.startTime.getTime();
    metrics.throughput = (processedRecords / elapsedMs) * 1000; // records per second
    metrics.averageLatency = elapsedMs / processedRecords;

    if (metrics.throughput > 0) {
      const remainingRecords = metrics.totalRecords - processedRecords;
      const remainingSeconds = remainingRecords / metrics.throughput;
      metrics.estimatedCompletion = new Date(Date.now() + remainingSeconds * 1000);
    }

    // Update session with metrics
    this.updateSessionMetrics(sessionId, metrics);

    // Emit progress event
    this.emit('progress', { sessionId, metrics });
  }

  /**
   * Update session with current metrics
   */
  private async updateSessionMetrics(sessionId: string, metrics: ProcessingMetrics): Promise<void> {
    try {
      await db.update(importSessions)
        .set({
          processedRecords: metrics.processedRecords,
          successfulRecords: metrics.successfulRecords,
          failedRecords: metrics.failedRecords,
          processingRate: Math.round(metrics.throughput),
          estimatedTimeRemaining: metrics.estimatedCompletion 
            ? Math.round((metrics.estimatedCompletion.getTime() - Date.now()) / 1000)
            : null
        })
        .where(eq(importSessions.sessionId, sessionId));
    } catch (error) {
      console.error('Error updating session metrics:', error);
    }
  }

  /**
   * Finalize processing
   */
  private async finalizeProcessing(sessionId: string): Promise<void> {
    const metrics = this.processingMetrics.get(sessionId);
    if (!metrics) return;

    // Determine final status
    const status = metrics.failedRecords === 0 ? 'completed' : 'completed_with_errors';
    
    await this.updateSessionStatus(sessionId, status);
    
    // Clean up metrics
    this.processingMetrics.delete(sessionId);

    this.emit('completed', { sessionId, metrics });
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Get current processing status for a session
   */
  async getProcessingStatus(sessionId: string): Promise<ProcessingMetrics | null> {
    return this.processingMetrics.get(sessionId) || null;
  }

  /**
   * Cancel processing for a session
   */
  async cancelProcessing(sessionId: string): Promise<void> {
    // Update session status
    await this.updateSessionStatus(sessionId, 'cancelled');
    
    // Clean up metrics
    this.processingMetrics.delete(sessionId);
    
    // Emit cancellation event
    this.emit('cancelled', { sessionId });
  }

  /**
   * Retry failed records for a session
   */
  async retryFailedRecords(sessionId: string): Promise<void> {
    try {
      // Get failed records from history
      const failedRecords = await db.select()
        .from(importHistory)
        .where(
          and(
            eq(importHistory.sessionId, sessionId),
            eq(importHistory.importStatus, 'failed')
          )
        );

      if (failedRecords.length === 0) {
        return;
      }

      // Get session info
      const session = await db.select()
        .from(importSessions)
        .where(eq(importSessions.sessionId, sessionId))
        .limit(1);

      if (session.length === 0) {
        throw new Error('Session not found');
      }

      // Extract data and mappings
      const data = failedRecords.map(record => record.recordData);
      const mappings = session[0].fieldMappings as FieldMapping[] || [];

      // Reprocess failed records
      await this.processBulkImport(sessionId, data, mappings);

    } catch (error) {
      console.error('Error retrying failed records:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const batchProcessor = BatchProcessor.getInstance();