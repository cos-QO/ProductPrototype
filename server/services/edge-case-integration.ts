/**
 * Edge Case Integration Service
 * Orchestrates all LLM-powered edge case detection components
 * Provides main entry points and integration with existing systems
 */

import { Request, Response } from "express";
import { LLMEdgeCaseDetector } from "./llm-edge-case-detector";
import { ErrorPatternAnalyzer } from "./error-pattern-analyzer";
import { DynamicTestGenerator } from "./dynamic-test-generator";
import { MLFeedbackSystem } from "./ml-feedback-system";
import { ApprovalService } from "./approval-service";
import {
  ErrorRecoveryService,
  ValidationError,
} from "./error-recovery-service";
import { webSocketService } from "../websocket-service";
import { db } from "../db";
import {
  edgeCaseDetections,
  edgeCaseIntegrationSessions,
  type InsertEdgeCaseDetection,
  type InsertEdgeCaseIntegrationSession,
  type RiskLevel,
  type ApprovalType,
} from "@shared/schema";
import { eq, desc, and, or, sql, gte, lte, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";

// Integration workflow interfaces
interface EdgeCaseWorkflowRequest {
  sessionId: string;
  userId: string;
  errors: ValidationError[];
  dataContext: {
    recordCount: number;
    fieldTypes: Record<string, string>;
    sampleData: any[];
    fileType: string;
    importSessionId?: string;
  };
  options: {
    enableLLMAnalysis?: boolean;
    enableTestGeneration?: boolean;
    enableAutoRouting?: boolean;
    enableLearning?: boolean;
    costLimit?: number;
    timeLimit?: number;
  };
}

interface EdgeCaseWorkflowResult {
  workflowId: string;
  status: WorkflowStatus;
  detectionResult: any;
  patternAnalysis: any;
  testSuite?: any;
  approvalRouting?: any;
  recommendations: WorkflowRecommendation[];
  metrics: WorkflowMetrics;
  nextActions: NextAction[];
}

interface WorkflowRecommendation {
  type: "immediate" | "short_term" | "long_term";
  priority: "low" | "medium" | "high" | "critical";
  action: string;
  description: string;
  estimatedImpact: number;
  estimatedEffort: number;
  dependencies: string[];
}

interface WorkflowMetrics {
  processingTime: number;
  llmCost: number;
  confidenceScore: number;
  automationRate: number;
  userSatisfaction?: number;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  cpuTime: number;
  memoryPeak: number;
  networkCalls: number;
  diskOperations: number;
}

interface NextAction {
  id: string;
  type: "user_decision" | "automated_process" | "system_task";
  description: string;
  priority: number;
  deadline?: Date;
  assignee?: string;
  parameters?: Record<string, any>;
}

type WorkflowStatus =
  | "initializing"
  | "analyzing_patterns"
  | "detecting_edge_cases"
  | "generating_tests"
  | "routing_approval"
  | "completed"
  | "failed"
  | "cancelled";

// Real-time notification interfaces
interface EdgeCaseNotification {
  id: string;
  type: NotificationType;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  recipients: string[];
}

type NotificationType =
  | "edge_case_detected"
  | "approval_required"
  | "test_generated"
  | "pattern_learned"
  | "automation_improved"
  | "system_alert";

// WebSocket event types
interface WebSocketEvents {
  edge_case_detected: EdgeCaseNotification;
  workflow_status_changed: {
    workflowId: string;
    status: WorkflowStatus;
    progress: number;
  };
  approval_required: { approvalId: string; urgency: string; details: any };
  test_results_ready: { testSuiteId: string; results: any };
  learning_update: {
    patterns: number;
    confidence: number;
    improvements: string[];
  };
}

export class EdgeCaseIntegrationService extends EventEmitter {
  private static instance: EdgeCaseIntegrationService;

  // Core service instances
  private edgeCaseDetector: LLMEdgeCaseDetector;
  private patternAnalyzer: ErrorPatternAnalyzer;
  private testGenerator: DynamicTestGenerator;
  private feedbackSystem: MLFeedbackSystem;
  private approvalService: ApprovalService;
  private errorRecoveryService: ErrorRecoveryService;

  // Workflow management
  private activeWorkflows: Map<string, EdgeCaseWorkflow> = new Map();
  private notificationQueue: EdgeCaseNotification[] = [];

  // Performance monitoring
  private metrics = {
    totalWorkflows: 0,
    successfulDetections: 0,
    averageProcessingTime: 0,
    totalCostSaved: 0,
    automationImprovement: 0,
  };

  // Configuration
  private config = {
    maxConcurrentWorkflows: 10,
    defaultCostLimit: 0.05,
    defaultTimeLimit: 300000, // 5 minutes
    notificationBatchSize: 100,
    metricsRetentionDays: 30,
  };

  private constructor() {
    super();

    // Initialize service dependencies
    this.edgeCaseDetector = LLMEdgeCaseDetector.getInstance();
    this.patternAnalyzer = ErrorPatternAnalyzer.getInstance();
    this.testGenerator = DynamicTestGenerator.getInstance();
    this.feedbackSystem = MLFeedbackSystem.getInstance();
    this.approvalService = ApprovalService.getInstance();
    this.errorRecoveryService = ErrorRecoveryService.getInstance();

    // Start background processes
    this.startWorkflowMonitoring();
    this.startNotificationProcessing();
    this.startMetricsCollection();
  }

  static getInstance(): EdgeCaseIntegrationService {
    if (!EdgeCaseIntegrationService.instance) {
      EdgeCaseIntegrationService.instance = new EdgeCaseIntegrationService();
    }
    return EdgeCaseIntegrationService.instance;
  }

  /**
   * Main entry point - process errors through complete edge case workflow
   */
  async processEdgeCaseWorkflow(
    request: EdgeCaseWorkflowRequest,
  ): Promise<EdgeCaseWorkflowResult> {
    console.log(
      `[EDGE CASE INTEGRATION] Starting workflow for session: ${request.sessionId}`,
    );

    const workflowId = uuidv4();
    const startTime = Date.now();

    try {
      // Create and track workflow
      const workflow = await this.createWorkflow(workflowId, request);
      this.activeWorkflows.set(workflowId, workflow);

      // Emit workflow started event
      this.emitWorkflowStatusChange(workflowId, "initializing", 0);

      // Step 1: Analyze error patterns
      await this.updateWorkflowStatus(workflowId, "analyzing_patterns", 20);
      const patternAnalysis = await this.patternAnalyzer.analyzeErrorPattern(
        request.errors,
        {
          sessionId: request.sessionId,
          userId: request.userId,
          fileType: request.dataContext.fileType,
          recordCount: request.dataContext.recordCount,
        },
      );

      // Step 2: Detect edge cases using LLM
      if (request.options.enableLLMAnalysis !== false) {
        await this.updateWorkflowStatus(workflowId, "detecting_edge_cases", 40);

        const detectionResult = await this.edgeCaseDetector.analyzeForEdgeCases(
          {
            errors: request.errors,
            dataContext: request.dataContext,
            userContext: {
              userId: request.userId,
              experience: await this.getUserExperienceLevel(request.userId),
              previousPatterns: await this.getUserPreviousPatterns(
                request.userId,
              ),
            },
          },
        );

        workflow.detectionResult = detectionResult;

        // Emit edge case detected notification if significant
        if (detectionResult.isEdgeCase && detectionResult.confidence > 0.7) {
          await this.emitEdgeCaseDetected(workflowId, detectionResult, request);
        }
      }

      // Step 3: Generate test cases if edge case detected
      let testSuite = null;
      if (
        workflow.detectionResult?.isEdgeCase &&
        request.options.enableTestGeneration !== false
      ) {
        await this.updateWorkflowStatus(workflowId, "generating_tests", 60);

        testSuite = await this.testGenerator.generateTestSuite({
          edgeCasePattern: workflow.detectionResult.pattern,
          category: workflow.detectionResult.category,
          severity: workflow.detectionResult.severity,
          errorSamples: request.errors,
          dataContext: request.dataContext,
          targetCoverage: {
            errorScenarios: workflow.detectionResult.suggestedActions.map(
              (a) => a.description,
            ),
            edgeCases: [workflow.detectionResult.pattern],
            performanceTests: workflow.detectionResult.severity === "critical",
            integrationTests: true,
            boundaryTests: true,
          },
        });

        workflow.testSuite = testSuite;

        // Emit test generated notification
        await this.emitTestGenerated(workflowId, testSuite, request);
      }

      // Step 4: Route to approval if needed
      let approvalRouting = null;
      if (
        workflow.detectionResult?.isEdgeCase &&
        workflow.detectionResult.riskAssessment.level !== "low" &&
        request.options.enableAutoRouting !== false
      ) {
        await this.updateWorkflowStatus(workflowId, "routing_approval", 80);

        approvalRouting = await this.edgeCaseDetector.routeToApproval(
          workflow.detectionResult,
          {
            errors: request.errors,
            dataContext: request.dataContext,
            userContext: {
              userId: request.userId,
              experience: await this.getUserExperienceLevel(request.userId),
              previousPatterns: [],
            },
          },
        );

        workflow.approvalRouting = approvalRouting;

        // Emit approval required notification
        await this.emitApprovalRequired(workflowId, approvalRouting, request);
      }

      // Step 5: Generate recommendations and next actions
      const recommendations = await this.generateWorkflowRecommendations(
        workflow,
        patternAnalysis,
        request,
      );

      const nextActions = await this.generateNextActions(
        workflow,
        patternAnalysis,
        request,
      );

      // Step 6: Calculate metrics and finalize
      const processingTime = Date.now() - startTime;
      const metrics = await this.calculateWorkflowMetrics(
        workflow,
        processingTime,
        request,
      );

      // Complete workflow
      await this.updateWorkflowStatus(workflowId, "completed", 100);

      const result: EdgeCaseWorkflowResult = {
        workflowId,
        status: "completed",
        detectionResult: workflow.detectionResult,
        patternAnalysis,
        testSuite,
        approvalRouting,
        recommendations,
        metrics,
        nextActions,
      };

      // Store workflow result
      await this.storeWorkflowResult(result, request);

      // Update global metrics
      this.updateGlobalMetrics(result);

      // Learn from the workflow if enabled
      if (request.options.enableLearning !== false) {
        await this.triggerLearningUpdate(workflow, result, request);
      }

      // Clean up workflow
      this.activeWorkflows.delete(workflowId);

      console.log(
        `[EDGE CASE INTEGRATION] Workflow completed - ID: ${workflowId}, Processing time: ${processingTime}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        `[EDGE CASE INTEGRATION] Workflow failed - ID: ${workflowId}:`,
        error,
      );

      await this.updateWorkflowStatus(workflowId, "failed", 100);
      this.activeWorkflows.delete(workflowId);

      throw new Error(
        `Edge case workflow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get real-time workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    status: WorkflowStatus;
    progress: number;
    currentStep: string;
    estimatedTimeRemaining: number;
    results?: Partial<EdgeCaseWorkflowResult>;
  }> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      // Check if workflow is completed and stored
      const storedResult = await this.getStoredWorkflowResult(workflowId);
      if (storedResult) {
        return {
          status: "completed",
          progress: 100,
          currentStep: "Completed",
          estimatedTimeRemaining: 0,
          results: storedResult,
        };
      }

      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return {
      status: workflow.status,
      progress: workflow.progress,
      currentStep: workflow.currentStep,
      estimatedTimeRemaining: workflow.estimatedTimeRemaining,
      results: {
        detectionResult: workflow.detectionResult,
        testSuite: workflow.testSuite,
        approvalRouting: workflow.approvalRouting,
      },
    };
  }

  /**
   * Process approval decision feedback for learning
   */
  async processApprovalFeedback(
    approvalId: string,
    decision: "approve" | "reject" | "escalate",
    feedback: {
      reasoning?: string;
      correctness: "correct" | "incorrect" | "partially_correct";
      userExperience: "positive" | "neutral" | "negative";
      suggestionQuality: number;
    },
  ): Promise<{
    learningUpdates: string[];
    automationImprovements: string[];
    recommendations: string[];
  }> {
    console.log(
      `[EDGE CASE INTEGRATION] Processing approval feedback for: ${approvalId}`,
    );

    try {
      // Find the associated edge case detection
      const detection = await this.findDetectionByApprovalId(approvalId);
      if (!detection) {
        throw new Error(
          `No edge case detection found for approval: ${approvalId}`,
        );
      }

      // Update LLM edge case detector learning
      await this.edgeCaseDetector.learnFromDecision(
        detection.id,
        decision,
        feedback,
      );

      // Update ML feedback system
      const mlFeedback = await this.feedbackSystem.recordDecisionFeedback(
        approvalId,
        detection.userId,
        {
          approvalId,
          originalPrediction: {
            confidence: detection.confidence,
            recommendation: detection.automationRecommendation?.canAutomate
              ? "approve"
              : "manual_review",
            reasoning: detection.suggestedActions.map((a) => a.description),
            riskFactors: detection.riskAssessment.factors,
            similarCases: [],
          },
          actualDecision: decision,
          userReasoning: feedback.reasoning,
          outcomeQuality: this.mapFeedbackToOutcome(feedback.correctness),
          timeToDecision: 300, // Placeholder
          complexity: this.mapSeverityToComplexity(detection.severity),
          contextFactors: detection.riskAssessment.factors,
        },
      );

      // Generate learning insights
      const learningUpdates = [
        ...mlFeedback.learningUpdates,
        `Edge case pattern "${detection.pattern}" updated based on decision`,
      ];

      const automationImprovements = this.generateAutomationImprovements(
        detection,
        decision,
        feedback,
      );

      const recommendations = [
        ...mlFeedback.recommendations,
        ...this.generateFeedbackRecommendations(detection, decision, feedback),
      ];

      // Emit learning update notification
      await this.emitLearningUpdate(learningUpdates, automationImprovements);

      console.log(
        `[EDGE CASE INTEGRATION] Approval feedback processed - ${learningUpdates.length} updates`,
      );

      return {
        learningUpdates,
        automationImprovements,
        recommendations,
      };
    } catch (error) {
      console.error(
        "[EDGE CASE INTEGRATION] Failed to process approval feedback:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get system performance dashboard data
   */
  async getPerformanceDashboard(): Promise<{
    systemMetrics: any;
    realtimeStats: any;
    learningProgress: any;
    costAnalysis: any;
    recommendations: string[];
  }> {
    try {
      // Aggregate metrics from all components
      const edgeCaseStats = this.edgeCaseDetector.getStats();
      const patternStats = this.patternAnalyzer.getAnalytics();
      const testGenStats = this.testGenerator.getStats();
      const mlStats = this.feedbackSystem.getSystemMetrics();
      const realtimeStats = await this.patternAnalyzer.getRealtimeStats();

      // Calculate cost analysis
      const costAnalysis = this.calculateCostAnalysis(
        edgeCaseStats,
        testGenStats,
      );

      // Generate system recommendations
      const recommendations = await this.generateSystemRecommendations(
        edgeCaseStats,
        patternStats,
        testGenStats,
        mlStats,
      );

      return {
        systemMetrics: {
          ...this.metrics,
          edgeCase: edgeCaseStats,
          patterns: patternStats,
          testGeneration: testGenStats,
          machineLearning: mlStats,
        },
        realtimeStats,
        learningProgress: {
          automationRate: this.metrics.automationImprovement,
          costSavings: this.metrics.totalCostSaved,
          accuracy: edgeCaseStats.averageConfidence,
        },
        costAnalysis,
        recommendations,
      };
    } catch (error) {
      console.error(
        "[EDGE CASE INTEGRATION] Failed to get performance dashboard:",
        error,
      );
      throw error;
    }
  }

  // Express.js route handlers

  /**
   * POST /api/edge-cases/analyze
   * Main endpoint for edge case analysis
   */
  async analyzeEdgeCases(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, errors, dataContext, options = {} } = req.body;
      const userId = (req as any).user?.claims?.sub || "local-dev-user";

      if (!sessionId || !errors || !Array.isArray(errors)) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: sessionId, errors",
        });
        return;
      }

      const request: EdgeCaseWorkflowRequest = {
        sessionId,
        userId,
        errors,
        dataContext: dataContext || {
          recordCount: errors.length,
          fieldTypes: {},
          sampleData: [],
          fileType: "unknown",
        },
        options: {
          enableLLMAnalysis: true,
          enableTestGeneration: true,
          enableAutoRouting: true,
          enableLearning: true,
          costLimit: this.config.defaultCostLimit,
          timeLimit: this.config.defaultTimeLimit,
          ...options,
        },
      };

      const result = await this.processEdgeCaseWorkflow(request);

      res.json({
        success: true,
        data: result,
        message: "Edge case analysis completed",
      });
    } catch (error: any) {
      console.error("Edge case analysis failed:", error);
      res.status(500).json({
        success: false,
        message: "Edge case analysis failed",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/edge-cases/status/:workflowId
   * Get workflow status
   */
  async getWorkflowStatusHandler(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const status = await this.getWorkflowStatus(workflowId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error("Get workflow status failed:", error);
      res.status(404).json({
        success: false,
        message: "Workflow not found",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/edge-cases/feedback/:approvalId
   * Submit approval feedback
   */
  async submitApprovalFeedbackHandler(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { approvalId } = req.params;
      const { decision, feedback } = req.body;

      if (!decision || !feedback) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: decision, feedback",
        });
        return;
      }

      const result = await this.processApprovalFeedback(
        approvalId,
        decision,
        feedback,
      );

      res.json({
        success: true,
        data: result,
        message: "Approval feedback processed",
      });
    } catch (error: any) {
      console.error("Submit approval feedback failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process approval feedback",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/edge-cases/dashboard
   * Get performance dashboard
   */
  async getDashboardHandler(req: Request, res: Response): Promise<void> {
    try {
      const dashboard = await this.getPerformanceDashboard();

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      console.error("Get dashboard failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
        error: error.message,
      });
    }
  }

  // Private helper methods

  private async createWorkflow(
    workflowId: string,
    request: EdgeCaseWorkflowRequest,
  ): Promise<EdgeCaseWorkflow> {
    const workflow: EdgeCaseWorkflow = {
      id: workflowId,
      sessionId: request.sessionId,
      userId: request.userId,
      status: "initializing",
      progress: 0,
      currentStep: "Initializing workflow",
      estimatedTimeRemaining:
        request.options.timeLimit || this.config.defaultTimeLimit,
      startTime: new Date(),
      detectionResult: null,
      testSuite: null,
      approvalRouting: null,
      options: request.options,
    };

    // Store workflow in database
    await db.insert(edgeCaseIntegrationSessions).values({
      workflowId,
      sessionId: request.sessionId,
      userId: request.userId,
      status: "initializing",
      options: request.options as any,
      startTime: workflow.startTime,
    });

    return workflow;
  }

  private async updateWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus,
    progress: number,
  ): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = status;
      workflow.progress = progress;
      workflow.currentStep = this.getStepName(status);

      // Emit status change event
      this.emitWorkflowStatusChange(workflowId, status, progress);
    }
  }

  private getStepName(status: WorkflowStatus): string {
    const stepNames = {
      initializing: "Initializing workflow",
      analyzing_patterns: "Analyzing error patterns",
      detecting_edge_cases: "Detecting edge cases with LLM",
      generating_tests: "Generating test scenarios",
      routing_approval: "Routing for approval",
      completed: "Workflow completed",
      failed: "Workflow failed",
      cancelled: "Workflow cancelled",
    };
    return stepNames[status] || status;
  }

  private async emitWorkflowStatusChange(
    workflowId: string,
    status: WorkflowStatus,
    progress: number,
  ): Promise<void> {
    // Get workflow for session ID
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      // Calculate metrics for status update
      const totalEdgeCases = workflow.detectionResult?.isEdgeCase ? 1 : 0;
      const resolvedCases = status === "completed" ? totalEdgeCases : 0;
      const pendingCases = totalEdgeCases - resolvedCases;
      const failedCases = status === "failed" ? totalEdgeCases : 0;
      const processingTime = Date.now() - workflow.startTime.getTime();

      // Send WebSocket notification
      await webSocketService.emitEdgeCaseWorkflowStatus(
        workflow.sessionId,
        workflowId,
        status === "initializing"
          ? "initiated"
          : status === "analyzing_patterns" || status === "detecting_edge_cases"
            ? "analyzing"
            : status === "routing_approval"
              ? "awaiting_approval"
              : status === "generating_tests"
                ? "executing_fix"
                : status === "completed"
                  ? "completed"
                  : "failed",
        totalEdgeCases,
        resolvedCases,
        pendingCases,
        failedCases,
        0, // Total cost - to be calculated from actual LLM usage
        processingTime,
      );
    }

    // Also emit local event for backward compatibility
    this.emit("workflow_status_changed", { workflowId, status, progress });
  }

  // Additional helper methods (simplified implementations)
  private async getUserExperienceLevel(
    userId: string,
  ): Promise<"novice" | "intermediate" | "expert"> {
    // Determine user experience level
    return "intermediate"; // Placeholder
  }

  private async getUserPreviousPatterns(userId: string): Promise<string[]> {
    // Get user's previous edge case patterns
    return []; // Placeholder
  }

  private async emitEdgeCaseDetected(
    workflowId: string,
    detection: any,
    request: EdgeCaseWorkflowRequest,
  ): Promise<void> {
    // Send WebSocket notification
    await webSocketService.emitEdgeCaseDetected(
      request.sessionId,
      workflowId,
      {
        id: detection.id || uuidv4(),
        type: detection.pattern,
        description:
          detection.description || `Edge case pattern: ${detection.pattern}`,
        confidence: detection.confidence,
        severity: detection.severity,
      },
      detection.affectedRecords || request.errors.length,
      detection.suggestedActions?.map((a: any) => a.description) || [],
      detection.riskAssessment?.level !== "low",
      detection.automationRecommendation?.canAutomate || false,
    );

    // Also emit local event for backward compatibility
    const notification: EdgeCaseNotification = {
      id: uuidv4(),
      type: "edge_case_detected",
      severity: detection.severity === "critical" ? "critical" : "warning",
      title: `Edge Case Detected: ${detection.pattern}`,
      message: `Pattern: ${detection.pattern} (Confidence: ${detection.confidence}%)`,
      data: { workflowId, detection, sessionId: request.sessionId },
      timestamp: new Date(),
      recipients: [request.userId],
    };

    this.queueNotification(notification);
    this.emit("edge_case_detected", notification);
  }

  private async emitTestGenerated(
    workflowId: string,
    testSuite: any,
    request: EdgeCaseWorkflowRequest,
  ): Promise<void> {
    // Send WebSocket notification
    await webSocketService.emitEdgeCaseTestGenerated(
      request.sessionId,
      workflowId,
      {
        id: testSuite.suiteId,
        name: testSuite.name || "Edge Case Test Suite",
        testCases: testSuite.testCases?.length || 0,
        estimatedDuration: testSuite.estimatedDuration || 0,
      },
      {
        csvRows: testSuite.generatedData?.csvRows || 0,
        scenarios: testSuite.scenarios || [],
      },
      testSuite.autoExecute || false,
    );

    // Also emit local event for backward compatibility
    const notification: EdgeCaseNotification = {
      id: uuidv4(),
      type: "test_generated",
      severity: "info",
      title: "Test Suite Generated",
      message: `Generated ${testSuite.testCases?.length || 0} test cases for edge case pattern`,
      data: { workflowId, testSuiteId: testSuite.suiteId },
      timestamp: new Date(),
      recipients: [request.userId],
    };

    this.queueNotification(notification);
    this.emit("test_results_ready", {
      testSuiteId: testSuite.suiteId,
      results: testSuite,
    });
  }

  private async emitApprovalRequired(
    workflowId: string,
    approvalRouting: any,
    request: EdgeCaseWorkflowRequest,
  ): Promise<void> {
    const notification: EdgeCaseNotification = {
      id: uuidv4(),
      type: "approval_required",
      severity: "warning",
      title: "Approval Required",
      message: `Edge case requires approval - Estimated decision time: ${approvalRouting.estimatedDecisionTime} minutes`,
      data: { workflowId, approvalId: approvalRouting.approvalId },
      timestamp: new Date(),
      recipients: [request.userId],
    };

    this.queueNotification(notification);
    this.emit("approval_required", {
      approvalId: approvalRouting.approvalId,
      urgency: "medium",
      details: approvalRouting,
    });
  }

  private async emitLearningUpdate(
    learningUpdates: string[],
    automationImprovements: string[],
  ): Promise<void> {
    const notification: EdgeCaseNotification = {
      id: uuidv4(),
      type: "learning_update",
      severity: "info",
      title: "System Learning Update",
      message: `${learningUpdates.length} patterns updated, ${automationImprovements.length} improvements`,
      data: { learningUpdates, automationImprovements },
      timestamp: new Date(),
      recipients: ["system_admins"],
    };

    this.queueNotification(notification);
    this.emit("learning_update", {
      patterns: learningUpdates.length,
      confidence: 0.85,
      improvements: automationImprovements,
    });
  }

  private queueNotification(notification: EdgeCaseNotification): void {
    this.notificationQueue.push(notification);

    // Process immediately if queue is getting full
    if (this.notificationQueue.length >= this.config.notificationBatchSize) {
      this.processNotificationQueue();
    }
  }

  private startWorkflowMonitoring(): void {
    // Monitor workflow timeouts and resource usage
    setInterval(() => {
      const now = Date.now();
      for (const [workflowId, workflow] of this.activeWorkflows) {
        const elapsed = now - workflow.startTime.getTime();
        const timeLimit =
          workflow.options.timeLimit || this.config.defaultTimeLimit;

        if (elapsed > timeLimit) {
          console.warn(
            `[EDGE CASE INTEGRATION] Workflow timeout: ${workflowId}`,
          );
          this.updateWorkflowStatus(workflowId, "failed", 100);
          this.activeWorkflows.delete(workflowId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private startNotificationProcessing(): void {
    // Process notification queue every 5 seconds
    setInterval(() => {
      if (this.notificationQueue.length > 0) {
        this.processNotificationQueue();
      }
    }, 5000);
  }

  private startMetricsCollection(): void {
    // Collect and update metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
  }

  private processNotificationQueue(): void {
    // Process batch of notifications
    const batch = this.notificationQueue.splice(
      0,
      this.config.notificationBatchSize,
    );

    // Here you would integrate with your notification system
    // For now, just log the notifications
    batch.forEach((notification) => {
      console.log(`[NOTIFICATION] ${notification.type}: ${notification.title}`);
    });
  }

  private collectMetrics(): void {
    // Collect system metrics
    this.metrics.totalWorkflows = this.activeWorkflows.size;

    // Additional metrics collection would go here
  }

  // Placeholder implementations for complex methods
  private async generateWorkflowRecommendations(
    workflow: EdgeCaseWorkflow,
    patternAnalysis: any,
    request: EdgeCaseWorkflowRequest,
  ): Promise<WorkflowRecommendation[]> {
    return [];
  }
  private async generateNextActions(
    workflow: EdgeCaseWorkflow,
    patternAnalysis: any,
    request: EdgeCaseWorkflowRequest,
  ): Promise<NextAction[]> {
    return [];
  }
  private async calculateWorkflowMetrics(
    workflow: EdgeCaseWorkflow,
    processingTime: number,
    request: EdgeCaseWorkflowRequest,
  ): Promise<WorkflowMetrics> {
    return {} as any;
  }
  private async storeWorkflowResult(
    result: EdgeCaseWorkflowResult,
    request: EdgeCaseWorkflowRequest,
  ): Promise<void> {
    /* Implementation */
  }
  private updateGlobalMetrics(result: EdgeCaseWorkflowResult): void {
    /* Implementation */
  }
  private async triggerLearningUpdate(
    workflow: EdgeCaseWorkflow,
    result: EdgeCaseWorkflowResult,
    request: EdgeCaseWorkflowRequest,
  ): Promise<void> {
    /* Implementation */
  }
  private async getStoredWorkflowResult(
    workflowId: string,
  ): Promise<EdgeCaseWorkflowResult | null> {
    return null;
  }
  private async findDetectionByApprovalId(approvalId: string): Promise<any> {
    return null;
  }
  private mapFeedbackToOutcome(
    correctness: string,
  ): "excellent" | "good" | "acceptable" | "poor" {
    return "good";
  }
  private mapSeverityToComplexity(
    severity: string,
  ): "simple" | "moderate" | "complex" | "very_complex" {
    return "moderate";
  }
  private generateAutomationImprovements(
    detection: any,
    decision: string,
    feedback: any,
  ): string[] {
    return [];
  }
  private generateFeedbackRecommendations(
    detection: any,
    decision: string,
    feedback: any,
  ): string[] {
    return [];
  }
  private calculateCostAnalysis(edgeCaseStats: any, testGenStats: any): any {
    return {};
  }
  private async generateSystemRecommendations(
    edgeCaseStats: any,
    patternStats: any,
    testGenStats: any,
    mlStats: any,
  ): Promise<string[]> {
    return [];
  }

  /**
   * Get current system metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset system state (useful for testing)
   */
  resetSystem(): void {
    this.activeWorkflows.clear();
    this.notificationQueue.length = 0;
    this.metrics = {
      totalWorkflows: 0,
      successfulDetections: 0,
      averageProcessingTime: 0,
      totalCostSaved: 0,
      automationImprovement: 0,
    };
  }
}

// Supporting interfaces
interface EdgeCaseWorkflow {
  id: string;
  sessionId: string;
  userId: string;
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
  startTime: Date;
  detectionResult: any;
  testSuite: any;
  approvalRouting: any;
  options: any;
}

export default EdgeCaseIntegrationService;
