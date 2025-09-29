import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

// Import step components
import { FileUploadStep } from "./steps/FileUploadStep";
import { FieldMappingStep } from "./steps/FieldMappingStep";
import { DataPreviewStep } from "./steps/DataPreviewStep";
import { ImportExecutionStep } from "./steps/ImportExecutionStep";

// Import accessibility hooks
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";

// Import types
import type {
  BulkUploadWizardProps,
  WizardStep,
  UploadSession,
  FieldMapping,
  ValidationError,
  ImportProgress,
  ImportResults,
  WizardStepId,
} from "./types";

export const BulkUploadWizard: React.FC<BulkUploadWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { toast } = useToast();

  // Wizard state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionData, setSessionData] = useState<UploadSession | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null,
  );
  const [importResults, setImportResults] = useState<ImportResults | null>(
    null,
  );
  const [isSessionValid, setIsSessionValid] = useState(false);

  // WebSocket connection for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Enhanced status detection for workflow automation
  const getProcessingStatus = () => {
    if (!sessionData) return "idle";

    switch (sessionData.status) {
      case "analyzing":
        return "analyzing";
      case "mapping_complete":
        return "mapping_ready";
      case "generating_preview":
        return "generating_preview";
      case "preview_ready":
      case "previewing":
        return "preview_ready";
      case "awaiting_approval":
        return "awaiting_approval";
      default:
        return sessionData.status || "idle";
    }
  };

  // Define enhanced 3-step wizard flow with automatic progression states
  const wizardSteps: WizardStep[] = [
    {
      id: "upload",
      title: "Upload",
      description: "Select and upload your CSV file",
      component: FileUploadStep,
      isValid:
        !!sessionData &&
        [
          "analyzing",
          "mapping_complete",
          "generating_preview",
          "preview_ready",
          "previewing",
          "awaiting_approval",
        ].includes(sessionData.status || ""),
    },
    {
      id: "processing",
      title: "Processing",
      description: "Automatic field mapping and validation",
      component:
        currentStepIndex === 1 && fieldMappings.length === 0
          ? FieldMappingStep
          : DataPreviewStep,
      isValid:
        (fieldMappings.length > 0 ||
          sessionData?.status === "preview_ready" ||
          sessionData?.status === "awaiting_approval") &&
        validationErrors.filter((e) => e.severity === "error").length === 0,
    },
    {
      id: "approval",
      title: "Approval",
      description: "Review and approve your import",
      component: ImportExecutionStep,
      isValid: true,
    },
  ];

  const currentStep = wizardSteps[currentStepIndex];
  const canProceed = currentStep.isValid !== false;
  const canGoBack = currentStepIndex > 0 && !importProgress;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  // Enhanced navigation handlers with workflow automation awareness
  const handleNext = () => {
    if (!canProceed || isLastStep) return;

    console.log(
      "[WORKFLOW] Manual navigation requested:",
      currentStepIndex,
      "->",
      currentStepIndex + 1,
    );

    // Allow manual override of automatic progression
    if (currentStepIndex === 0 && sessionData) {
      // Move from Upload to Processing step
      setCurrentStepIndex(1);
      announceToScreenReader("Moving to processing step.");
    } else if (
      currentStepIndex === 1 &&
      (fieldMappings.length > 0 || sessionData?.status === "preview_ready") &&
      validationErrors.filter((e) => e.severity === "error").length === 0
    ) {
      // Move from Processing to Approval step
      setCurrentStepIndex(2);
      announceToScreenReader("Moving to approval step.");
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    if (importProgress) {
      // Show confirmation dialog for active import
      const confirmed = window.confirm(
        "Import is in progress. Are you sure you want to close? This will cancel the import.",
      );
      if (!confirmed) return;
    }

    // Clean up session if needed
    if (sessionData?.id && sessionData.status !== "completed") {
      // Optionally cancel the session
      cleanupSession();
    }

    // Reset all state
    setCurrentStepIndex(0);
    setSessionData(null);
    setFieldMappings([]);
    setValidationErrors([]);
    setImportProgress(null);
    setImportResults(null);
    setIsSessionValid(false);

    onClose();
  };

  // Accessibility and keyboard navigation
  const { announceToScreenReader } = useKeyboardNavigation({
    isOpen,
    currentStep: currentStepIndex,
    totalSteps: wizardSteps.length,
    canGoBack,
    canProceed,
    onNext: handleNext,
    onBack: handleBack,
    onClose: handleClose,
  });

  // WebSocket connection management
  useEffect(() => {
    if (!sessionData?.id || !isOpen) return;

    // Enhanced port detection with proper environment handling
    let wsHost = window.location.hostname;
    let wsPort = "5000"; // Default port for our application

    // In development, check if we're running on a different port
    if (window.location.port) {
      wsPort = window.location.port;
    } else if (window.location.protocol === "https:") {
      wsPort = "443";
    }

    // Use same protocol as current page for WebSocket
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws?sessionId=${sessionData.id}&userId=${sessionData.userId}`;

    console.log("[WebSocket] Connecting to:", wsUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket connected for session:", sessionData.id);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description:
          "Lost connection to the server. Some features may be limited.",
        variant: "destructive",
      });
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [sessionData?.id, isOpen]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    console.log(
      "[WORKFLOW] WebSocket message received:",
      message.type,
      message.metadata,
    );

    switch (message.type) {
      case "analysis_complete":
        // Analysis completed - update field mappings and trigger auto-advancement
        console.log(
          "[WORKFLOW] Analysis complete, confidence:",
          message.metadata?.confidence,
        );
        setSessionData((prev) =>
          prev ? { ...prev, status: "mapping_complete" } : null,
        );
        setFieldMappings(message.data.suggestedMappings || []);

        // Auto-advance to processing step if not already there
        if (currentStepIndex === 0 && message.metadata?.autoAdvance) {
          announceToScreenReader(
            "Analysis complete. Automatically advancing to processing step.",
          );
          setTimeout(() => {
            setCurrentStepIndex(1);
          }, 1500);
        }
        break;

      case "preview_generation_started":
        // Show preview generation loading state
        console.log("[WORKFLOW] Preview generation started");
        setSessionData((prev) =>
          prev ? { ...prev, status: "generating_preview" } : null,
        );
        announceToScreenReader("Generating preview automatically...");
        break;

      case "preview_ready":
        // Preview generated automatically - advance to final approval
        console.log("[WORKFLOW] Preview ready, auto-advancing to approval");
        setSessionData((prev) =>
          prev ? { ...prev, status: "preview_ready" } : null,
        );
        setValidationErrors(message.data.errors || []);

        // Auto-advance to final step if preview is clean
        const errorCount =
          message.data.errors?.filter((e: any) => e.severity === "error")
            .length || 0;
        if (
          errorCount === 0 &&
          currentStepIndex === 1 &&
          message.metadata?.autoAdvance
        ) {
          announceToScreenReader(
            "Preview ready. Automatically moving to final approval step.",
          );
          setTimeout(() => {
            setCurrentStepIndex(2);
          }, 1500);
        }
        break;

      case "approval_required":
        // Ensure UI is at approval step
        console.log(
          "[WORKFLOW] Approval required - final user decision needed",
        );
        setSessionData((prev) =>
          prev ? { ...prev, status: "awaiting_approval" } : null,
        );
        if (currentStepIndex !== 2) {
          setCurrentStepIndex(2);
        }
        announceToScreenReader(
          "Ready for final approval. Please review and approve the import.",
        );
        break;

      case "workflow_error":
        // Handle workflow automation errors with fallback
        console.log("[WORKFLOW] Workflow error occurred:", message.data.error);
        toast({
          title: "Workflow Automation Issue",
          description:
            message.data.error + " - Manual controls are now enabled.",
          variant: "destructive",
        });
        // Don't auto-advance on errors - let user take control
        break;

      // Legacy WebSocket events (keep for backward compatibility)
      case "progress":
        setImportProgress(message.data);
        break;
      case "completed":
        setImportResults(message.data);
        setImportProgress(null);
        handleImportComplete(message.data);
        break;
      case "error":
        handleImportError(message.data);
        break;
      case "mapping_suggestions":
        setFieldMappings(message.data.suggestions);
        break;
      case "validation_update":
        setValidationErrors(message.data.errors);
        break;
      default:
        console.log("[WORKFLOW] Unknown WebSocket message type:", message.type);
    }
  };

  // Handle import completion
  const handleImportComplete = (results: ImportResults) => {
    toast({
      title: "Import Complete",
      description: `Successfully imported ${results.successfulRecords} of ${results.totalRecords} products`,
    });
    onComplete(results);
  };

  // Handle import errors
  const handleImportError = (error: any) => {
    toast({
      title: "Import Failed",
      description: error.message || "An error occurred during import",
      variant: "destructive",
    });
    setImportProgress(null);
  };

  // Cleanup session
  const cleanupSession = async () => {
    if (!sessionData?.id) return;

    try {
      await apiRequest("DELETE", `/api/upload/${sessionData.id}`);
    } catch (error) {
      console.error("Failed to cleanup session:", error);
    }
  };

  // Enhanced step component props with workflow automation context
  const stepProps = {
    sessionData,
    setSessionData,
    fieldMappings,
    setFieldMappings,
    validationErrors,
    setValidationErrors,
    importProgress,
    setImportProgress,
    importResults,
    setImportResults,
    onNext: handleNext,
    onBack: handleBack,
    onClose: handleClose,
    ws,
    // New workflow automation props
    processingStatus: getProcessingStatus(),
    isAutomationActive: [
      "analyzing",
      "mapping_complete",
      "generating_preview",
    ].includes(sessionData?.status || ""),
    workflowMetadata: {
      autoAdvance: true,
      confidenceThreshold: 70,
      currentPhase: getProcessingStatus(),
    },
  };

  // Progress calculation
  const progressPercentage =
    ((currentStepIndex + (currentStep.isValid ? 1 : 0)) / wizardSteps.length) *
    100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="text-2xl font-bold">
            Bulk Upload Products
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Import multiple products using our guided wizard
          </DialogDescription>
          <div className="flex items-center justify-end space-x-2 mt-2">
            <Button variant="ghost" size="sm">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Enhanced 3-Step Progress Indicator */}
        <div className="flex-shrink-0 py-4">
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center space-x-6"
              role="navigation"
              aria-label="Wizard progress"
            >
              {wizardSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        index < currentStepIndex
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : index === currentStepIndex
                            ? "bg-primary/20 text-primary border-2 border-primary ring-2 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                      aria-label={`Step ${index + 1}: ${step.title}${index === currentStepIndex ? " (current)" : index < currentStepIndex ? " (completed)" : " (upcoming)"}`}
                    >
                      {index < currentStepIndex ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-sm font-medium transition-colors ${
                          index === currentStepIndex
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className="hidden sm:flex items-center mx-4">
                      <div
                        className={`w-16 h-0.5 transition-all duration-300 ${
                          index < currentStepIndex
                            ? "bg-primary shadow-sm"
                            : "bg-muted"
                        }`}
                      />
                      <div
                        className={`w-2 h-2 rounded-full ml-2 transition-all duration-300 ${
                          index < currentStepIndex ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  currentStepIndex === wizardSteps.length - 1
                    ? "default"
                    : "outline"
                }
                className="hidden sm:inline-flex"
              >
                Step {currentStepIndex + 1} of {wizardSteps.length}
              </Badge>
              {importProgress && (
                <Badge variant="secondary" className="animate-pulse">
                  {Math.round(
                    (importProgress.processedRecords /
                      importProgress.totalRecords) *
                      100,
                  )}
                  %
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={
                importProgress
                  ? (importProgress.processedRecords /
                      importProgress.totalRecords) *
                    100
                  : progressPercentage
              }
              className="h-2"
              aria-label={`Wizard progress: ${Math.round(importProgress ? (importProgress.processedRecords / importProgress.totalRecords) * 100 : progressPercentage)}% complete`}
            />

            {/* Mobile Step Labels */}
            <div className="flex sm:hidden justify-between text-xs text-muted-foreground">
              {wizardSteps.map((step, index) => (
                <span
                  key={step.id}
                  className={
                    index === currentStepIndex ? "text-primary font-medium" : ""
                  }
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Separator className="flex-shrink-0" />

        {/* Screen Reader Status Region */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="bulk-upload-status"
        >
          Step {currentStepIndex + 1} of {wizardSteps.length}:{" "}
          {currentStep.title}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto py-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2" aria-level={2}>
                {currentStep.title}
              </h3>
              <p className="text-muted-foreground">{currentStep.description}</p>
            </div>

            {/* Auto-progress indicator for workflow automation */}
            {["analyzing", "mapping_complete", "generating_preview"].includes(
              sessionData?.status || "",
            ) && (
              <div className="mb-6 p-4 bg-info/5 rounded-lg border border-info/20">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-info"></div>
                  <div>
                    <p className="text-sm font-medium text-info">
                      {sessionData?.status === "analyzing" &&
                        "Analyzing CSV structure and fields..."}
                      {sessionData?.status === "mapping_complete" &&
                        "Automatic field mapping completed"}
                      {sessionData?.status === "generating_preview" &&
                        "Generating preview automatically..."}
                    </p>
                    <p className="text-xs text-info/80">
                      This happens automatically - no action needed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Render current step component */}
            <currentStep.component {...stepProps} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack}
              className="flex items-center space-x-2"
              data-action="back"
              aria-label={`Go back to previous step${canGoBack ? "" : " (disabled)"}`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>

              {!isLastStep ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex items-center space-x-2"
                  data-action="next"
                  aria-label={`Proceed to next step${!canProceed ? " (disabled - please complete current step)" : ""}`}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || !!importProgress}
                  className="gradient-primary text-white"
                  data-action="import"
                  aria-label={`Start import process${!canProceed ? " (disabled - please complete data review)" : ""}`}
                >
                  {importProgress ? "Importing..." : "Start Import"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadWizard;
