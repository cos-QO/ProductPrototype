/**
 * Test Data Generator Module
 * Entry point for the automated CSV generation system
 */

// Core components
export { TestDataGenerator } from './test-data-generator';
export { TestExecutor, TestExecutorAPI } from './test-executor';
export { TestFileManager } from './file-manager';
export { TestDataGeneratorRoutes } from './api-routes';

// Configuration and types
export * from './types';
export * from './scenario-configs';

// Utility functions for easy integration
import { TestDataGenerator } from './test-data-generator';
import { TestExecutor } from './test-executor';
import { TestFileManager } from './file-manager';
import { TestDataGeneratorRoutes } from './api-routes';

/**
 * Initialize the test data generator system
 */
export function initializeTestDataGenerator(config?: {
  preserveTestFiles?: boolean;
  maxConcurrentTests?: number;
  enableWebSocketProgress?: boolean;
  fileCleanupConfig?: {
    maxAge?: number;
    maxFiles?: number;
    preserveOnError?: boolean;
    checkInterval?: number;
  };
}) {
  console.log('[TEST DATA GENERATOR] Initializing system...');

  // Initialize core components
  const testDataGenerator = TestDataGenerator.getInstance();
  const testExecutor = TestExecutor.getInstance({
    preserveTestFiles: config?.preserveTestFiles || false,
    maxConcurrentTests: config?.maxConcurrentTests || 3,
    enableWebSocketProgress: config?.enableWebSocketProgress !== false
  });
  const fileManager = TestFileManager.getInstance(config?.fileCleanupConfig);
  const apiRoutes = new TestDataGeneratorRoutes();

  console.log('[TEST DATA GENERATOR] System initialized successfully');

  return {
    testDataGenerator,
    testExecutor,
    fileManager,
    apiRoutes
  };
}

/**
 * Quick test data generation utility
 */
export async function generateQuickTestData(params: {
  scenarioType: string;
  recordCount?: number;
  businessContext?: string;
  errorRate?: number;
}) {
  const testDataGenerator = TestDataGenerator.getInstance();
  
  const result = await testDataGenerator.generateTestData({
    scenario: {
      type: params.scenarioType as any,
      complexity: 'medium',
      description: `Quick test data for ${params.scenarioType}`
    },
    dataParams: {
      recordCount: params.recordCount || 100,
      errorPatterns: [],
      includeValidData: true,
      targetFields: ['name', 'slug', 'sku', 'price', 'inventoryQuantity'],
      businessContext: params.businessContext || 'ELECTRONICS'
    },
    outputFormat: 'csv'
  });

  return result;
}

/**
 * Execute a predefined test scenario
 */
export async function executeTestScenario(scenarioName: string, userId?: string) {
  const testExecutor = TestExecutor.getInstance();
  
  // Get scenario config and convert to scenario
  // This is a simplified implementation
  const scenario = {
    id: `quick-${scenarioName}-${Date.now()}`,
    type: 'validation_errors' as any,
    complexity: 'medium' as const,
    description: `Quick execution of ${scenarioName}`,
    testData: {
      recordCount: 100,
      fileName: `quick-${scenarioName}.csv`,
      format: 'csv' as const,
      content: '',
      errorPatterns: []
    },
    expectations: {
      shouldSucceed: true,
      expectedErrors: [],
      performanceTargets: [],
      userInteractionRequired: false
    },
    execution: {
      priority: 2,
      timeout: 300000,
      retryAttempts: 2,
      requiresApproval: false
    },
    metadata: {
      generatedBy: 'llm' as const,
      confidence: 0.85,
      riskLevel: 'medium' as const,
      tags: ['quick', scenarioName],
      businessContext: ['ELECTRONICS']
    }
  };

  return await testExecutor.executeScenario(scenario, userId || 'system');
}

/**
 * Get system health status
 */
export async function getSystemHealth() {
  try {
    const testDataGenerator = TestDataGenerator.getInstance();
    const testExecutor = TestExecutor.getInstance();
    const fileManager = TestFileManager.getInstance();
    
    const openRouterClient = (testDataGenerator as any).openRouterClient;
    const activeExecutions = testExecutor.getActiveExecutions();
    const fileStats = await fileManager.getFileStatistics();

    return {
      healthy: true,
      components: {
        openRouter: {
          available: openRouterClient.isAvailable(),
          stats: openRouterClient.getStats()
        },
        testExecutor: {
          activeExecutions: activeExecutions.length,
          executionIds: activeExecutions.map(e => e.id)
        },
        fileManager: {
          totalFiles: fileStats.totalFiles,
          totalSize: fileStats.totalSize,
          totalCost: fileStats.totalLLMCost
        }
      },
      timestamp: new Date()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

/**
 * Cleanup system resources
 */
export function shutdownTestDataGenerator() {
  console.log('[TEST DATA GENERATOR] Shutting down system...');
  
  try {
    const fileManager = TestFileManager.getInstance();
    fileManager.shutdown();
    
    console.log('[TEST DATA GENERATOR] System shutdown completed');
  } catch (error) {
    console.error('[TEST DATA GENERATOR] Error during shutdown:', error);
  }
}

// Default export for easy imports
export default {
  initializeTestDataGenerator,
  generateQuickTestData,
  executeTestScenario,
  getSystemHealth,
  shutdownTestDataGenerator
};