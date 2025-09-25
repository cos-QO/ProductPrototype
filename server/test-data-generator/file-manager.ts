/**
 * Test File Management System
 * Handles creation, storage, cleanup, and metadata tracking of test files
 */

import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { TestScenario, GeneratedTestData } from "./types";

export interface TestFile {
  id: string;
  fileName: string;
  filePath: string;
  scenario: TestScenario;
  size: number;
  checksum: string;
  createdAt: Date;
  expiresAt: Date;
  metadata: {
    recordCount: number;
    errorCount: number;
    format: string;
    generationTime: number;
    llmCost: number;
  };
}

export interface FileCleanupConfig {
  maxAge: number; // hours
  maxFiles: number;
  preserveOnError: boolean;
  checkInterval: number; // hours
}

export class TestFileManager {
  private static instance: TestFileManager;
  private testDirectory: string;
  private generatedDirectory: string;
  private metadataFile: string;
  private fileRegistry: Map<string, TestFile> = new Map();
  private cleanupConfig: FileCleanupConfig;
  private cleanupInterval?: NodeJS.Timer;

  private constructor(config: Partial<FileCleanupConfig> = {}) {
    this.testDirectory = path.join(process.cwd(), 'tests', 'fixtures');
    this.generatedDirectory = path.join(this.testDirectory, 'generated');
    this.metadataFile = path.join(this.generatedDirectory, '.file-registry.json');
    
    this.cleanupConfig = {
      maxAge: 24, // 24 hours
      maxFiles: 100,
      preserveOnError: true,
      checkInterval: 6, // 6 hours
      ...config
    };

    this.initializeDirectories();
    this.loadFileRegistry();
    this.startCleanupScheduler();
  }

  public static getInstance(config?: Partial<FileCleanupConfig>): TestFileManager {
    if (!TestFileManager.instance) {
      TestFileManager.instance = new TestFileManager(config);
    }
    return TestFileManager.instance;
  }

  /**
   * Save generated test data to file
   */
  public async saveTestFile(generatedData: GeneratedTestData): Promise<TestFile> {
    const fileId = uuidv4();
    const fileName = generatedData.data.fileName || `test-${fileId}.csv`;
    const filePath = path.join(this.generatedDirectory, fileName);
    
    try {
      // Save file content
      await fs.writeFile(filePath, generatedData.data.content, 'utf-8');
      
      // Calculate file size and checksum
      const stats = await fs.stat(filePath);
      const checksum = await this.calculateChecksum(generatedData.data.content);
      
      // Create test file record
      const testFile: TestFile = {
        id: fileId,
        fileName,
        filePath,
        scenario: generatedData.scenario,
        size: stats.size,
        checksum,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.cleanupConfig.maxAge * 60 * 60 * 1000),
        metadata: {
          recordCount: generatedData.data.recordCount,
          errorCount: generatedData.data.errorCount,
          format: generatedData.scenario.testData.format,
          generationTime: generatedData.metadata.generationTime,
          llmCost: generatedData.metadata.llmCost
        }
      };

      // Register the file
      this.fileRegistry.set(fileId, testFile);
      await this.saveFileRegistry();

      console.log(`[FILE MANAGER] Saved test file: ${fileName} (${stats.size} bytes)`);
      return testFile;

    } catch (error) {
      console.error('[FILE MANAGER] Failed to save test file:', error);
      throw new Error(`Failed to save test file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get test file by ID
   */
  public async getTestFile(fileId: string): Promise<TestFile | null> {
    const testFile = this.fileRegistry.get(fileId);
    if (!testFile) {
      return null;
    }

    // Check if file still exists
    try {
      await fs.access(testFile.filePath);
      return testFile;
    } catch (error) {
      // File was deleted, remove from registry
      this.fileRegistry.delete(fileId);
      await this.saveFileRegistry();
      return null;
    }
  }

  /**
   * Read test file content
   */
  public async readTestFile(fileId: string): Promise<string | null> {
    const testFile = await this.getTestFile(fileId);
    if (!testFile) {
      return null;
    }

    try {
      return await fs.readFile(testFile.filePath, 'utf-8');
    } catch (error) {
      console.error('[FILE MANAGER] Failed to read test file:', error);
      return null;
    }
  }

  /**
   * Delete test file
   */
  public async deleteTestFile(fileId: string): Promise<boolean> {
    const testFile = this.fileRegistry.get(fileId);
    if (!testFile) {
      return false;
    }

    try {
      await fs.unlink(testFile.filePath);
      this.fileRegistry.delete(fileId);
      await this.saveFileRegistry();
      
      console.log(`[FILE MANAGER] Deleted test file: ${testFile.fileName}`);
      return true;
    } catch (error) {
      console.error('[FILE MANAGER] Failed to delete test file:', error);
      return false;
    }
  }

  /**
   * List all test files
   */
  public async listTestFiles(filters?: {
    scenarioType?: string;
    format?: string;
    maxAge?: number; // hours
    minSize?: number;
    maxSize?: number;
  }): Promise<TestFile[]> {
    let files = Array.from(this.fileRegistry.values());

    if (filters) {
      if (filters.scenarioType) {
        files = files.filter(f => f.scenario.type === filters.scenarioType);
      }
      
      if (filters.format) {
        files = files.filter(f => f.metadata.format === filters.format);
      }
      
      if (filters.maxAge) {
        const cutoff = new Date(Date.now() - filters.maxAge * 60 * 60 * 1000);
        files = files.filter(f => f.createdAt > cutoff);
      }
      
      if (filters.minSize) {
        files = files.filter(f => f.size >= filters.minSize);
      }
      
      if (filters.maxSize) {
        files = files.filter(f => f.size <= filters.maxSize);
      }
    }

    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get file statistics
   */
  public async getFileStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    formatBreakdown: Record<string, number>;
    scenarioTypeBreakdown: Record<string, number>;
    totalLLMCost: number;
  }> {
    const files = Array.from(this.fileRegistry.values());
    
    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        oldestFile: null,
        newestFile: null,
        formatBreakdown: {},
        scenarioTypeBreakdown: {},
        totalLLMCost: 0
      };
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalLLMCost = files.reduce((sum, f) => sum + f.metadata.llmCost, 0);
    
    const dates = files.map(f => f.createdAt);
    const oldestFile = new Date(Math.min(...dates.map(d => d.getTime())));
    const newestFile = new Date(Math.max(...dates.map(d => d.getTime())));

    const formatBreakdown: Record<string, number> = {};
    const scenarioTypeBreakdown: Record<string, number> = {};

    files.forEach(file => {
      formatBreakdown[file.metadata.format] = (formatBreakdown[file.metadata.format] || 0) + 1;
      scenarioTypeBreakdown[file.scenario.type] = (scenarioTypeBreakdown[file.scenario.type] || 0) + 1;
    });

    return {
      totalFiles: files.length,
      totalSize,
      averageSize: totalSize / files.length,
      oldestFile,
      newestFile,
      formatBreakdown,
      scenarioTypeBreakdown,
      totalLLMCost
    };
  }

  /**
   * Cleanup expired files
   */
  public async cleanupExpiredFiles(): Promise<{
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
  }> {
    const now = new Date();
    const expiredFiles = Array.from(this.fileRegistry.values())
      .filter(file => file.expiresAt < now);

    let deletedFiles = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const file of expiredFiles) {
      try {
        const shouldPreserve = this.cleanupConfig.preserveOnError && 
                              file.metadata.errorCount > 0;
        
        if (!shouldPreserve) {
          await fs.unlink(file.filePath);
          this.fileRegistry.delete(file.id);
          deletedFiles++;
          freedSpace += file.size;
          
          console.log(`[FILE MANAGER] Cleaned up expired file: ${file.fileName}`);
        }
      } catch (error) {
        const errorMsg = `Failed to delete ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('[FILE MANAGER]', errorMsg);
      }
    }

    await this.saveFileRegistry();

    console.log(`[FILE MANAGER] Cleanup completed: ${deletedFiles} files deleted, ${this.formatBytes(freedSpace)} freed`);
    
    return {
      deletedFiles,
      freedSpace,
      errors
    };
  }

  /**
   * Cleanup files by count limit
   */
  public async cleanupByCount(): Promise<{
    deletedFiles: number;
    freedSpace: number;
    errors: string[];
  }> {
    const files = Array.from(this.fileRegistry.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Oldest first

    const excessCount = files.length - this.cleanupConfig.maxFiles;
    
    if (excessCount <= 0) {
      return { deletedFiles: 0, freedSpace: 0, errors: [] };
    }

    const filesToDelete = files.slice(0, excessCount);
    let deletedFiles = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.filePath);
        this.fileRegistry.delete(file.id);
        deletedFiles++;
        freedSpace += file.size;
      } catch (error) {
        const errorMsg = `Failed to delete ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('[FILE MANAGER]', errorMsg);
      }
    }

    await this.saveFileRegistry();

    console.log(`[FILE MANAGER] Count-based cleanup: ${deletedFiles} files deleted`);
    
    return {
      deletedFiles,
      freedSpace,
      errors
    };
  }

  /**
   * Backup test files to archive
   */
  public async createBackup(fileIds?: string[]): Promise<{
    success: boolean;
    backupPath: string;
    fileCount: number;
    size: number;
  }> {
    const archiveDir = path.join(this.testDirectory, 'archives');
    await fs.mkdir(archiveDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(archiveDir, `test-files-backup-${timestamp}.tar.gz`);

    try {
      // For now, just copy files to archive directory
      // In production, you might want to use a proper archive library
      const filesToBackup = fileIds 
        ? fileIds.map(id => this.fileRegistry.get(id)).filter(f => f) as TestFile[]
        : Array.from(this.fileRegistry.values());

      const backupDir = path.join(archiveDir, `backup-${timestamp}`);
      await fs.mkdir(backupDir, { recursive: true });

      let totalSize = 0;
      for (const file of filesToBackup) {
        const destPath = path.join(backupDir, file.fileName);
        await fs.copyFile(file.filePath, destPath);
        totalSize += file.size;
      }

      // Save metadata
      const metadataPath = path.join(backupDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify({
        backupDate: new Date(),
        files: filesToBackup.map(f => ({
          id: f.id,
          fileName: f.fileName,
          scenario: f.scenario,
          metadata: f.metadata
        }))
      }, null, 2));

      console.log(`[FILE MANAGER] Backup created: ${filesToBackup.length} files, ${this.formatBytes(totalSize)}`);

      return {
        success: true,
        backupPath: backupDir,
        fileCount: filesToBackup.length,
        size: totalSize
      };

    } catch (error) {
      console.error('[FILE MANAGER] Backup failed:', error);
      return {
        success: false,
        backupPath: '',
        fileCount: 0,
        size: 0
      };
    }
  }

  /**
   * Update cleanup configuration
   */
  public updateCleanupConfig(config: Partial<FileCleanupConfig>): void {
    this.cleanupConfig = { ...this.cleanupConfig, ...config };
    
    // Restart scheduler with new interval if needed
    if (config.checkInterval && this.cleanupInterval) {
      this.stopCleanupScheduler();
      this.startCleanupScheduler();
    }
  }

  /**
   * Stop the file manager and cleanup scheduler
   */
  public shutdown(): void {
    this.stopCleanupScheduler();
    console.log('[FILE MANAGER] Shutdown completed');
  }

  /**
   * Private methods
   */
  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.testDirectory, { recursive: true });
      await fs.mkdir(this.generatedDirectory, { recursive: true });
      console.log('[FILE MANAGER] Directories initialized');
    } catch (error) {
      console.error('[FILE MANAGER] Failed to initialize directories:', error);
      throw error;
    }
  }

  private async loadFileRegistry(): Promise<void> {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert dates back from JSON
      for (const [id, file] of Object.entries(data)) {
        const typedFile = file as any;
        typedFile.createdAt = new Date(typedFile.createdAt);
        typedFile.expiresAt = new Date(typedFile.expiresAt);
        this.fileRegistry.set(id, typedFile);
      }
      
      console.log(`[FILE MANAGER] Loaded ${this.fileRegistry.size} files from registry`);
    } catch (error) {
      // Registry file doesn't exist or is corrupted - start fresh
      console.log('[FILE MANAGER] Starting with empty file registry');
    }
  }

  private async saveFileRegistry(): Promise<void> {
    try {
      const data = Object.fromEntries(this.fileRegistry);
      await fs.writeFile(this.metadataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[FILE MANAGER] Failed to save file registry:', error);
    }
  }

  private async calculateChecksum(content: string): Promise<string> {
    // Simple checksum - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private startCleanupScheduler(): void {
    const intervalMs = this.cleanupConfig.checkInterval * 60 * 60 * 1000;
    
    this.cleanupInterval = setInterval(async () => {
      console.log('[FILE MANAGER] Running scheduled cleanup');
      
      try {
        await this.cleanupExpiredFiles();
        await this.cleanupByCount();
      } catch (error) {
        console.error('[FILE MANAGER] Scheduled cleanup failed:', error);
      }
    }, intervalMs);

    console.log(`[FILE MANAGER] Cleanup scheduler started (every ${this.cleanupConfig.checkInterval} hours)`);
  }

  private stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      console.log('[FILE MANAGER] Cleanup scheduler stopped');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}