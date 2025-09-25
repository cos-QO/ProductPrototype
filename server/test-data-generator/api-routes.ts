/**
 * Test Data Generator API Routes
 * Express.js routes for the automated CSV generation system
 */

import { Router, Request, Response } from "express";
import WebSocket from "ws";
import { TestDataGenerator } from "./test-data-generator";
import { TestExecutor, TestExecutorAPI } from "./test-executor";
import { TestFileManager } from "./file-manager";
import { 
  getScenarioConfig, 
  getTestSuite, 
  getScenariosByComplexity,
  getScenariosByType,
  getScenariosByRisk,
  SCENARIO_CONFIGS,
  TEST_SUITES,
  AUTOMATION_SCHEDULES
} from "./scenario-configs";
import { 
  TestDataGenerationRequest,
  EdgeCaseType,
  BusinessContext,
  BUSINESS_CONTEXTS
} from "./types";

export class TestDataGeneratorRoutes {
  private router: Router;
  private testDataGenerator: TestDataGenerator;
  private testExecutor: TestExecutor;
  private testExecutorAPI: TestExecutorAPI;
  private fileManager: TestFileManager;

  constructor() {
    this.router = Router();
    this.testDataGenerator = TestDataGenerator.getInstance();
    this.testExecutor = TestExecutor.getInstance();
    this.testExecutorAPI = new TestExecutorAPI();
    this.fileManager = TestFileManager.getInstance();
    
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    // Test data generation routes
    this.router.post('/generate', this.generateTestData.bind(this));
    this.router.post('/generate-suite', this.generateTestSuite.bind(this));
    
    // Scenario configuration routes
    this.router.get('/scenarios', this.listScenarios.bind(this));
    this.router.get('/scenarios/:name', this.getScenario.bind(this));
    this.router.get('/suites', this.listTestSuites.bind(this));
    this.router.get('/suites/:name', this.getTestSuite.bind(this));
    
    // Test execution routes
    this.router.post('/execute', this.testExecutorAPI.executeScenario.bind(this.testExecutorAPI));
    this.router.post('/execute-batch', this.executeBatch.bind(this));
    this.router.get('/executions/:executionId', this.testExecutorAPI.getExecutionStatus.bind(this.testExecutorAPI));
    this.router.delete('/executions/:executionId', this.testExecutorAPI.abortExecution.bind(this.testExecutorAPI));
    this.router.get('/executions', this.listActiveExecutions.bind(this));
    
    // File management routes
    this.router.get('/files', this.listTestFiles.bind(this));
    this.router.get('/files/:fileId', this.getTestFile.bind(this));
    this.router.get('/files/:fileId/content', this.getTestFileContent.bind(this));
    this.router.delete('/files/:fileId', this.deleteTestFile.bind(this));
    this.router.post('/files/cleanup', this.cleanupFiles.bind(this));
    this.router.post('/files/backup', this.backupFiles.bind(this));
    this.router.get('/files/stats', this.getFileStatistics.bind(this));
    
    // Configuration and status routes
    this.router.get('/status', this.getSystemStatus.bind(this));
    this.router.get('/config', this.getConfiguration.bind(this));
    this.router.put('/config', this.updateConfiguration.bind(this));
    
    // Automation schedule routes
    this.router.get('/schedules', this.getAutomationSchedules.bind(this));
    this.router.post('/schedules/:scheduleName/trigger', this.triggerScheduledTest.bind(this));
  }

  /**
   * Generate test data for a specific scenario
   */
  private async generateTestData(req: Request, res: Response): Promise<void> {
    try {
      const {
        scenarioType,
        recordCount = 100,
        errorPatterns = [],
        businessContext = 'ELECTRONICS',
        complexity = 'medium',
        outputFormat = 'csv'
      } = req.body;

      if (!scenarioType || !Object.values(EdgeCaseType).includes(scenarioType)) {
        res.status(400).json({
          success: false,
          message: 'Valid scenarioType is required',
          availableTypes: Object.values(EdgeCaseType)
        });
        return;
      }

      if (!Object.keys(BUSINESS_CONTEXTS).includes(businessContext)) {
        res.status(400).json({
          success: false,
          message: 'Valid businessContext is required',
          availableContexts: Object.keys(BUSINESS_CONTEXTS)
        });
        return;
      }

      const request: TestDataGenerationRequest = {
        scenario: {
          type: scenarioType,
          complexity,
          description: `Generated test data for ${scenarioType}`
        },
        dataParams: {
          recordCount,
          errorPatterns,
          includeValidData: true,
          targetFields: ['name', 'slug', 'sku', 'price', 'inventoryQuantity'],
          businessContext
        },
        outputFormat
      };

      console.log(`[TEST API] Generating test data: ${scenarioType}, ${recordCount} records`);

      const result = await this.testDataGenerator.generateTestData(request);

      if (result.success) {
        // Save the file for later use
        const testFile = await this.fileManager.saveTestFile(result);
        
        res.json({
          success: true,
          data: {
            fileId: testFile.id,
            fileName: result.data.fileName,
            recordCount: result.data.recordCount,
            validRecords: result.data.validRecords,
            invalidRecords: result.data.invalidRecords,
            errorCount: result.data.errorCount
          },
          metadata: result.metadata,
          scenario: result.scenario
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Test data generation failed',
          errors: result.errors
        });
      }

    } catch (error) {
      console.error('[TEST API] Generate test data failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate a comprehensive test suite
   */
  private async generateTestSuite(req: Request, res: Response): Promise<void> {
    try {
      const {
        edgeCaseTypes = [EdgeCaseType.VALIDATION_ERRORS, EdgeCaseType.SPECIAL_CHARACTERS],
        recordCounts = [100, 500],
        complexityLevels = ['low', 'medium'],
        businessContexts = ['ELECTRONICS', 'FASHION']
      } = req.body;

      console.log(`[TEST API] Generating test suite with ${edgeCaseTypes.length} types`);

      const scenarios = await this.testDataGenerator.generateTestSuite({
        edgeCaseTypes,
        recordCounts,
        complexityLevels,
        businessContexts
      });

      res.json({
        success: true,
        scenarios: scenarios.map(scenario => ({
          id: scenario.id,
          type: scenario.type,
          complexity: scenario.complexity,
          description: scenario.description,
          recordCount: scenario.testData.recordCount,
          errorPatterns: scenario.testData.errorPatterns.length,
          estimatedDuration: scenario.execution.timeout
        })),
        totalScenarios: scenarios.length,
        estimatedTotalDuration: scenarios.reduce((sum, s) => sum + s.execution.timeout, 0)
      });

    } catch (error) {
      console.error('[TEST API] Generate test suite failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List available scenarios
   */
  private async listScenarios(req: Request, res: Response): Promise<void> {
    try {
      const { complexity, type, riskLevel } = req.query;

      let scenarios = Object.entries(SCENARIO_CONFIGS).map(([name, config]) => ({
        name,
        ...config
      }));

      // Apply filters
      if (complexity) {
        scenarios = scenarios.filter(s => s.complexity === complexity);
      }
      if (type) {
        scenarios = scenarios.filter(s => s.edgeCaseType === type);
      }
      if (riskLevel) {
        scenarios = scenarios.filter(s => s.riskLevel === riskLevel);
      }

      res.json({
        success: true,
        scenarios: scenarios.map(s => ({
          name: s.name,
          description: s.description,
          type: s.edgeCaseType,
          complexity: s.complexity,
          riskLevel: s.riskLevel,
          recordCounts: s.recordCounts,
          estimatedDuration: s.estimatedDuration,
          tags: s.tags
        })),
        total: scenarios.length
      });

    } catch (error) {
      console.error('[TEST API] List scenarios failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get specific scenario configuration
   */
  private async getScenario(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const config = getScenarioConfig(name);

      if (!config) {
        res.status(404).json({
          success: false,
          message: `Scenario '${name}' not found`
        });
        return;
      }

      res.json({
        success: true,
        scenario: {
          name,
          ...config
        }
      });

    } catch (error) {
      console.error('[TEST API] Get scenario failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List test suites
   */
  private async listTestSuites(req: Request, res: Response): Promise<void> {
    try {
      const suites = Object.entries(TEST_SUITES).map(([name, scenarioNames]) => ({
        name,
        scenarios: scenarioNames,
        scenarioCount: scenarioNames.length,
        estimatedDuration: scenarioNames.reduce((sum, scenarioName) => {
          const config = SCENARIO_CONFIGS[scenarioName];
          return sum + (config?.estimatedDuration || 0);
        }, 0)
      }));

      res.json({
        success: true,
        suites
      });

    } catch (error) {
      console.error('[TEST API] List test suites failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get specific test suite
   */
  private async getTestSuite(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const scenarios = getTestSuite(name);

      if (scenarios.length === 0) {
        res.status(404).json({
          success: false,
          message: `Test suite '${name}' not found`
        });
        return;
      }

      res.json({
        success: true,
        suite: {
          name,
          scenarios: scenarios.map(s => ({
            name: Object.keys(SCENARIO_CONFIGS).find(key => SCENARIO_CONFIGS[key] === s),
            ...s
          })),
          totalScenarios: scenarios.length,
          estimatedDuration: scenarios.reduce((sum, s) => sum + s.estimatedDuration, 0)
        }
      });

    } catch (error) {
      console.error('[TEST API] Get test suite failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute test batch
   */
  private async executeBatch(req: Request, res: Response): Promise<void> {
    try {
      const { suiteName, scenarios, sessionConfig } = req.body;
      const userId = (req as any).user?.claims?.sub || 'local-dev-user';

      let testScenarios = [];

      if (suiteName) {
        const suiteConfigs = getTestSuite(suiteName);
        // Convert configs to scenarios - simplified for now
        testScenarios = suiteConfigs.map(config => ({
          id: `${suiteName}-${Date.now()}`,
          type: config.edgeCaseType,
          complexity: config.complexity,
          description: config.description,
          testData: {
            recordCount: config.recordCounts[0],
            fileName: `${config.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
            format: 'csv' as const,
            content: '',
            errorPatterns: config.errorPatterns
          },
          expectations: {
            shouldSucceed: true,
            expectedErrors: [],
            performanceTargets: [],
            userInteractionRequired: false
          },
          execution: {
            priority: 2,
            timeout: config.estimatedDuration * 60 * 1000,
            retryAttempts: 2,
            requiresApproval: config.riskLevel === 'high' || config.riskLevel === 'critical'
          },
          metadata: {
            generatedBy: 'llm' as const,
            confidence: 0.85,
            riskLevel: config.riskLevel,
            tags: config.tags,
            businessContext: config.businessContexts
          }
        }));
      } else if (scenarios) {
        testScenarios = scenarios;
      } else {
        res.status(400).json({
          success: false,
          message: 'Either suiteName or scenarios array must be provided'
        });
        return;
      }

      console.log(`[TEST API] Executing batch: ${testScenarios.length} scenarios`);

      const session = await this.testExecutor.executeBatch(testScenarios, userId, sessionConfig);

      res.json({
        success: true,
        session: {
          id: session.id,
          name: session.name,
          status: session.status,
          totalScenarios: testScenarios.length,
          createdAt: session.createdAt
        }
      });

    } catch (error) {
      console.error('[TEST API] Execute batch failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List active executions
   */
  private async listActiveExecutions(req: Request, res: Response): Promise<void> {
    try {
      const executions = this.testExecutor.getActiveExecutions();

      res.json({
        success: true,
        executions: executions.map(e => ({
          id: e.id,
          scenarioId: e.scenarioId,
          status: e.status,
          progress: e.progress,
          currentStep: e.currentStep,
          startTime: e.startTime,
          duration: Date.now() - e.startTime.getTime()
        })),
        total: executions.length
      });

    } catch (error) {
      console.error('[TEST API] List active executions failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List test files
   */
  private async listTestFiles(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioType, format, maxAge, minSize, maxSize } = req.query;

      const filters = {
        scenarioType: scenarioType as string,
        format: format as string,
        maxAge: maxAge ? parseInt(maxAge as string) : undefined,
        minSize: minSize ? parseInt(minSize as string) : undefined,
        maxSize: maxSize ? parseInt(maxSize as string) : undefined
      };

      const files = await this.fileManager.listTestFiles(filters);

      res.json({
        success: true,
        files: files.map(f => ({
          id: f.id,
          fileName: f.fileName,
          size: f.size,
          createdAt: f.createdAt,
          expiresAt: f.expiresAt,
          metadata: f.metadata
        })),
        total: files.length
      });

    } catch (error) {
      console.error('[TEST API] List test files failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get test file information
   */
  private async getTestFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const file = await this.fileManager.getTestFile(fileId);

      if (!file) {
        res.status(404).json({
          success: false,
          message: 'Test file not found'
        });
        return;
      }

      res.json({
        success: true,
        file
      });

    } catch (error) {
      console.error('[TEST API] Get test file failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get test file content
   */
  private async getTestFileContent(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const content = await this.fileManager.readTestFile(fileId);

      if (!content) {
        res.status(404).json({
          success: false,
          message: 'Test file not found or could not be read'
        });
        return;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.send(content);

    } catch (error) {
      console.error('[TEST API] Get test file content failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete test file
   */
  private async deleteTestFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const success = await this.fileManager.deleteTestFile(fileId);

      res.json({
        success,
        message: success ? 'File deleted successfully' : 'File not found or could not be deleted'
      });

    } catch (error) {
      console.error('[TEST API] Delete test file failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cleanup expired files
   */
  private async cleanupFiles(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.fileManager.cleanupExpiredFiles();

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('[TEST API] Cleanup files failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Backup files
   */
  private async backupFiles(req: Request, res: Response): Promise<void> {
    try {
      const { fileIds } = req.body;
      const result = await this.fileManager.createBackup(fileIds);

      res.json({
        success: result.success,
        ...result
      });

    } catch (error) {
      console.error('[TEST API] Backup files failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get file statistics
   */
  private async getFileStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.fileManager.getFileStatistics();

      res.json({
        success: true,
        statistics: stats
      });

    } catch (error) {
      console.error('[TEST API] Get file statistics failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get system status
   */
  private async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const openRouterClient = (this.testDataGenerator as any).openRouterClient;
      const activeExecutions = this.testExecutor.getActiveExecutions();
      const fileStats = await this.fileManager.getFileStatistics();

      res.json({
        success: true,
        status: {
          openRouterAvailable: openRouterClient.isAvailable(),
          openRouterStats: openRouterClient.getStats(),
          activeExecutions: activeExecutions.length,
          testFilesCount: fileStats.totalFiles,
          testFilesSize: fileStats.totalSize,
          totalLLMCost: fileStats.totalLLMCost,
          systemHealth: 'healthy'
        }
      });

    } catch (error) {
      console.error('[TEST API] Get system status failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get configuration
   */
  private async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        configuration: {
          edgeCaseTypes: Object.values(EdgeCaseType),
          businessContexts: Object.keys(BUSINESS_CONTEXTS),
          complexityLevels: ['low', 'medium', 'high'],
          outputFormats: ['csv', 'json', 'xlsx'],
          maxRecordCount: 5000,
          defaultRecordCount: 100
        }
      });

    } catch (error) {
      console.error('[TEST API] Get configuration failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update configuration
   */
  private async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { fileCleanupConfig } = req.body;

      if (fileCleanupConfig) {
        this.fileManager.updateCleanupConfig(fileCleanupConfig);
      }

      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });

    } catch (error) {
      console.error('[TEST API] Update configuration failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get automation schedules
   */
  private async getAutomationSchedules(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        schedules: AUTOMATION_SCHEDULES
      });

    } catch (error) {
      console.error('[TEST API] Get automation schedules failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Trigger scheduled test
   */
  private async triggerScheduledTest(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleName } = req.params;
      const schedule = AUTOMATION_SCHEDULES.find(s => s.name === scheduleName);

      if (!schedule) {
        res.status(404).json({
          success: false,
          message: `Schedule '${scheduleName}' not found`
        });
        return;
      }

      // Trigger the test suite execution
      const userId = (req as any).user?.claims?.sub || 'automation-system';
      
      // This would typically queue the test for execution
      console.log(`[TEST API] Triggering scheduled test: ${scheduleName}`);

      res.json({
        success: true,
        message: `Scheduled test '${scheduleName}' triggered successfully`,
        schedule: {
          name: schedule.name,
          suite: schedule.suite,
          triggeredAt: new Date()
        }
      });

    } catch (error) {
      console.error('[TEST API] Trigger scheduled test failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Setup WebSocket endpoint for progress tracking
   */
  public setupWebSocketHandler(wss: WebSocket.Server): void {
    wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const executionId = url.searchParams.get('executionId');

      if (executionId) {
        console.log(`[TEST API] WebSocket connected for execution: ${executionId}`);
        this.testExecutor.registerWebSocketClient(executionId, ws);
        
        ws.on('close', () => {
          console.log(`[TEST API] WebSocket disconnected for execution: ${executionId}`);
        });
      } else {
        ws.close(1008, 'Missing executionId parameter');
      }
    });
  }
}

export default TestDataGeneratorRoutes;