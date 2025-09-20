/**
 * planID: PLAN-20250919-1526-001
 * Phase: 3 - Implementation - Workflow Automation System
 * Workflow Orchestrator Service - Central automation logic for seamless workflow progression
 * Created: 2025-01-19T16:45:00Z
 * Agent: developer
 */
import { EnhancedImportService } from "../enhanced-import-service";
import { webSocketService } from "../websocket-service";
// Workflow state definitions
export var WorkflowState;
(function (WorkflowState) {
    WorkflowState["INITIATED"] = "initiated";
    WorkflowState["ANALYZING"] = "analyzing";
    WorkflowState["MAPPING_COMPLETE"] = "mapping_complete";
    WorkflowState["GENERATING_PREVIEW"] = "generating_preview";
    WorkflowState["PREVIEW_READY"] = "preview_ready";
    WorkflowState["AWAITING_APPROVAL"] = "awaiting_approval";
    WorkflowState["EXECUTING"] = "executing";
    WorkflowState["COMPLETED"] = "completed";
    WorkflowState["FAILED"] = "failed";
})(WorkflowState || (WorkflowState = {}));
export class WorkflowOrchestrator {
    static instance;
    enhancedImportService;
    confidenceThreshold = 0.7; // 70% confidence for auto-advancement
    // Workflow state transitions
    transitions = [
        {
            from: WorkflowState.ANALYZING,
            to: WorkflowState.MAPPING_COMPLETE,
            trigger: "automatic",
            action: async (context) => await this.handleAnalysisComplete(context),
        },
        {
            from: WorkflowState.MAPPING_COMPLETE,
            to: WorkflowState.GENERATING_PREVIEW,
            trigger: "confidence_threshold",
            condition: async (context) => (context.confidence || 0) >= this.confidenceThreshold,
            action: async (context) => await this.autoGeneratePreview(context),
        },
        {
            from: WorkflowState.GENERATING_PREVIEW,
            to: WorkflowState.PREVIEW_READY,
            trigger: "automatic",
            action: async (context) => await this.handlePreviewGenerated(context),
        },
        {
            from: WorkflowState.PREVIEW_READY,
            to: WorkflowState.AWAITING_APPROVAL,
            trigger: "automatic",
            action: async (context) => await this.advanceToApproval(context),
        },
    ];
    constructor() {
        // Enhanced import service will be injected when first used
    }
    static getInstance() {
        if (!WorkflowOrchestrator.instance) {
            WorkflowOrchestrator.instance = new WorkflowOrchestrator();
        }
        return WorkflowOrchestrator.instance;
    }
    /**
     * Initialize with enhanced import service (call from routes after services are loaded)
     */
    initialize(enhancedImportService) {
        this.enhancedImportService = enhancedImportService;
    }
    /**
     * Get enhanced import service with lazy initialization
     */
    getEnhancedImportService() {
        if (!this.enhancedImportService) {
            this.enhancedImportService = EnhancedImportService.getInstance();
        }
        return this.enhancedImportService;
    }
    /**
     * Handle analysis completion and initiate workflow automation
     */
    async handleAnalysisComplete(context) {
        try {
            const { sessionId, fieldMappings } = context;
            // Calculate average confidence from field mappings
            const averageConfidence = this.calculateAverageConfidence(fieldMappings || []);
            console.log(`[WORKFLOW] Analysis complete for session ${sessionId}, confidence: ${averageConfidence}%`);
            // Update workflow state
            await this.updateWorkflowState(sessionId, WorkflowState.MAPPING_COMPLETE);
            // Emit analysis complete event
            await this.emitWorkflowEvent(sessionId, {
                type: "analysis_complete",
                payload: {
                    suggestedMappings: fieldMappings,
                    confidence: averageConfidence,
                    autoAdvanceReady: averageConfidence >= this.confidenceThreshold,
                },
                metadata: {
                    confidence: averageConfidence,
                    autoAdvance: averageConfidence >= this.confidenceThreshold,
                    expectedNextStep: 1, // Move to processing step
                },
            });
            // Auto-advance if confidence is sufficient
            if (averageConfidence >= this.confidenceThreshold) {
                console.log(`[WORKFLOW] Auto-advancing to preview generation (confidence: ${averageConfidence}%)`);
                await this.autoGeneratePreview({
                    ...context,
                    confidence: averageConfidence,
                });
            }
            else {
                console.log(`[WORKFLOW] Requesting user mapping intervention (confidence: ${averageConfidence}%)`);
                await this.requestUserMapping(sessionId, averageConfidence);
            }
        }
        catch (error) {
            console.error("[WORKFLOW] Error handling analysis completion:", error);
            await this.handleWorkflowError(context.sessionId, error, "analysis_complete");
        }
    }
    /**
     * Automatically generate preview when confidence is sufficient
     */
    async autoGeneratePreview(context) {
        try {
            const { sessionId } = context;
            console.log(`[WORKFLOW] Starting auto preview generation for session ${sessionId}`);
            // Update workflow state
            await this.updateWorkflowState(sessionId, WorkflowState.GENERATING_PREVIEW);
            // Emit preview generation start event
            await this.emitWorkflowEvent(sessionId, {
                type: "preview_generation_started",
                payload: {
                    message: "Generating preview automatically...",
                    status: "generating_preview",
                },
                metadata: {
                    autoAdvance: true,
                    expectedNextStep: 1, // Stay on processing step but show preview loading
                },
            });
            // Call enhanced import service to generate preview internally
            const previewResult = await this.getEnhancedImportService().generatePreviewInternal(sessionId);
            if (!previewResult.success) {
                throw new Error(previewResult.errors?.join(", ") || "Preview generation failed");
            }
            // Update state and emit preview ready
            await this.updateWorkflowState(sessionId, WorkflowState.PREVIEW_READY);
            await this.emitWorkflowEvent(sessionId, {
                type: "preview_ready",
                payload: {
                    ...previewResult,
                    message: "Preview generated successfully",
                },
                metadata: {
                    autoAdvance: true,
                    expectedNextStep: 2, // Move to approval step
                },
            });
            // Auto-advance to approval step after brief delay
            setTimeout(async () => {
                await this.advanceToApproval({ ...context, sessionId });
            }, 1500);
        }
        catch (error) {
            console.error("[WORKFLOW] Error in auto preview generation:", error);
            await this.handleWorkflowError(context.sessionId, error, "preview_generation");
        }
    }
    /**
     * Handle successful preview generation
     */
    async handlePreviewGenerated(context) {
        try {
            const { sessionId } = context;
            console.log(`[WORKFLOW] Preview generated successfully for session ${sessionId}`);
            // Update workflow state
            await this.updateWorkflowState(sessionId, WorkflowState.PREVIEW_READY);
            // Emit preview ready event
            await this.emitWorkflowEvent(sessionId, {
                type: "preview_ready",
                payload: {
                    message: "Preview is ready for review",
                    status: "preview_ready",
                },
                metadata: {
                    autoAdvance: true,
                    expectedNextStep: 2,
                },
            });
        }
        catch (error) {
            console.error("[WORKFLOW] Error handling preview generation:", error);
            await this.handleWorkflowError(context.sessionId, error, "preview_ready");
        }
    }
    /**
     * Advance workflow to approval step
     */
    async advanceToApproval(context) {
        try {
            const { sessionId } = context;
            console.log(`[WORKFLOW] Advancing to approval step for session ${sessionId}`);
            // Update workflow state
            await this.updateWorkflowState(sessionId, WorkflowState.AWAITING_APPROVAL);
            // Emit approval required event
            await this.emitWorkflowEvent(sessionId, {
                type: "approval_required",
                payload: {
                    message: "Ready for final approval",
                    status: "awaiting_approval",
                    requiresUserAction: true,
                },
                metadata: {
                    autoAdvance: true,
                    userAction: true,
                    expectedNextStep: 2, // Final approval step
                },
            });
        }
        catch (error) {
            console.error("[WORKFLOW] Error advancing to approval:", error);
            await this.handleWorkflowError(context.sessionId, error, "approval_advance");
        }
    }
    /**
     * Request user intervention for mapping
     */
    async requestUserMapping(sessionId, confidence) {
        try {
            await this.emitWorkflowEvent(sessionId, {
                type: "mapping_suggestions",
                payload: {
                    message: "Field mapping requires your review",
                    confidence,
                    requiresUserReview: true,
                },
                metadata: {
                    confidence,
                    autoAdvance: false,
                    userAction: true,
                },
            });
        }
        catch (error) {
            console.error("[WORKFLOW] Error requesting user mapping:", error);
            await this.handleWorkflowError(sessionId, error, "user_mapping_request");
        }
    }
    /**
     * Calculate average confidence from field mappings
     */
    calculateAverageConfidence(fieldMappings) {
        if (!fieldMappings || fieldMappings.length === 0)
            return 0;
        const totalConfidence = fieldMappings.reduce((sum, mapping) => sum + (mapping.confidence || 0), 0);
        const averageConfidence = totalConfidence / fieldMappings.length;
        return Math.round(averageConfidence * 100) / 100; // Round to 2 decimal places
    }
    /**
     * Emit workflow event via WebSocket
     */
    async emitWorkflowEvent(sessionId, event) {
        try {
            const workflowEvent = {
                ...event,
                sessionId,
                timestamp: new Date(),
            };
            // Emit via WebSocket service
            await webSocketService.emitWorkflowEvent(sessionId, workflowEvent);
            console.log(`[WORKFLOW] Event emitted: ${event.type} for session ${sessionId}`);
        }
        catch (error) {
            console.error("[WORKFLOW] Error emitting workflow event:", error);
        }
    }
    /**
     * Update workflow state in session
     */
    async updateWorkflowState(sessionId, state) {
        try {
            // Update the session with new workflow state
            await this.getEnhancedImportService().updateSession(sessionId, {
                status: state,
                workflowState: state,
            });
        }
        catch (error) {
            console.error("[WORKFLOW] Error updating workflow state:", error);
        }
    }
    /**
     * Handle workflow errors with fallback strategies
     */
    async handleWorkflowError(sessionId, error, context) {
        try {
            console.error(`[WORKFLOW] Error in ${context} for session ${sessionId}:`, error);
            // Update session state to indicate error
            await this.updateWorkflowState(sessionId, WorkflowState.FAILED);
            // Emit error event to frontend
            await this.emitWorkflowEvent(sessionId, {
                type: "workflow_error",
                payload: {
                    error: error.message || "Workflow automation error",
                    context,
                    fallbackAction: "manual_intervention_required",
                    recoverable: true,
                },
                metadata: {
                    autoAdvance: false,
                    userAction: true,
                },
            });
            // Implement fallback strategy
            await this.implementFallbackStrategy(sessionId, context, error);
        }
        catch (fallbackError) {
            console.error("[WORKFLOW] Critical error in error handling:", fallbackError);
        }
    }
    /**
     * Implement fallback strategies for different error types
     */
    async implementFallbackStrategy(sessionId, errorContext, error) {
        switch (errorContext) {
            case "preview_generation":
                // Fallback to manual preview generation
                await this.emitWorkflowEvent(sessionId, {
                    type: "workflow_error",
                    payload: {
                        message: "Automatic preview generation failed. Please generate preview manually.",
                        fallbackAction: "manual_preview_required",
                        instruction: 'Click the "Generate Preview" button to continue',
                    },
                });
                break;
            case "analysis_complete":
                // Fallback to manual field mapping
                await this.emitWorkflowEvent(sessionId, {
                    type: "workflow_error",
                    payload: {
                        message: "Automatic field mapping failed. Please review mappings manually.",
                        fallbackAction: "manual_mapping_required",
                        instruction: "Review and adjust field mappings in the processing step",
                    },
                });
                break;
            default:
                // Generic fallback - enable manual controls
                await this.emitWorkflowEvent(sessionId, {
                    type: "workflow_error",
                    payload: {
                        message: "Workflow automation encountered an issue. Manual controls are now enabled.",
                        fallbackAction: "enable_manual_controls",
                        instruction: "Continue using manual navigation buttons",
                    },
                });
        }
    }
    /**
     * Execute workflow step based on current state and context
     */
    async executeWorkflow(sessionId, currentState, context = {}) {
        try {
            const workflowContext = {
                sessionId,
                session: context.session ||
                    (await this.getEnhancedImportService().getSession(sessionId)),
                ...context,
            };
            // Find applicable transitions
            const applicableTransitions = this.transitions.filter((t) => t.from === currentState);
            for (const transition of applicableTransitions) {
                let canTransition = true;
                // Check conditions
                if (transition.condition) {
                    canTransition = await transition.condition(workflowContext);
                }
                if (canTransition) {
                    console.log(`[WORKFLOW] Executing transition: ${transition.from} -> ${transition.to}`);
                    // Execute transition action
                    if (transition.action) {
                        await transition.action(workflowContext);
                    }
                    // Only execute first applicable transition
                    break;
                }
            }
        }
        catch (error) {
            console.error("[WORKFLOW] Error executing workflow:", error);
            await this.handleWorkflowError(sessionId, error, "workflow_execution");
        }
    }
    /**
     * Get current workflow status for a session
     */
    async getWorkflowStatus(sessionId) {
        try {
            const session = await this.getEnhancedImportService().getSession(sessionId);
            if (!session) {
                return {
                    success: false,
                    state: WorkflowState.FAILED,
                    canAutoAdvance: false,
                    nextAction: "session_not_found",
                };
            }
            const currentState = session.workflowState || WorkflowState.INITIATED;
            const confidence = session.fieldMappings
                ? this.calculateAverageConfidence(session.fieldMappings)
                : 0;
            const canAutoAdvance = confidence >= this.confidenceThreshold;
            return {
                success: true,
                state: currentState,
                canAutoAdvance,
                confidence,
                nextAction: this.getNextAction(currentState, canAutoAdvance),
            };
        }
        catch (error) {
            console.error("[WORKFLOW] Error getting workflow status:", error);
            return {
                success: false,
                state: WorkflowState.FAILED,
                canAutoAdvance: false,
                nextAction: "error_occurred",
            };
        }
    }
    /**
     * Determine next action based on current state
     */
    getNextAction(state, canAutoAdvance) {
        switch (state) {
            case WorkflowState.INITIATED:
                return "upload_file";
            case WorkflowState.ANALYZING:
                return "wait_for_analysis";
            case WorkflowState.MAPPING_COMPLETE:
                return canAutoAdvance ? "auto_generate_preview" : "review_mappings";
            case WorkflowState.GENERATING_PREVIEW:
                return "wait_for_preview";
            case WorkflowState.PREVIEW_READY:
                return "advance_to_approval";
            case WorkflowState.AWAITING_APPROVAL:
                return "user_approval_required";
            case WorkflowState.EXECUTING:
                return "wait_for_import";
            case WorkflowState.COMPLETED:
                return "workflow_complete";
            case WorkflowState.FAILED:
                return "manual_recovery_required";
            default:
                return "unknown_state";
        }
    }
}
// Export class for manual instantiation in routes
//# sourceMappingURL=workflow-orchestrator.js.map