import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Zap,
  Download,
  ExternalLink,
  RotateCcw,
  Play,
  Pause,
  Square,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  UploadSession,
  ImportProgress,
  ImportResults,
  ValidationError,
} from "../types";
import { ErrorRecoveryDialog } from "../components/ErrorRecoveryDialog";

// Validation helpers to prevent NaN and undefined values
const validateSessionData = (
  sessionData: UploadSession | null,
): UploadSession | null => {
  if (!sessionData) return null;

  return {
    ...sessionData,
    recordCount: Math.max(0, sessionData.recordCount || 0),
    fileSize: Math.max(0, sessionData.fileSize || 0),
    fileFormat: sessionData.fileFormat || "csv",
  };
};

const validateProgressData = (
  progress: ImportProgress | null,
): ImportProgress | null => {
  if (!progress) return null;

  return {
    ...progress,
    totalRecords: Math.max(0, progress.totalRecords || 0),
    processedRecords: Math.max(0, progress.processedRecords || 0),
    successfulRecords: Math.max(0, progress.successfulRecords || 0),
    failedRecords: Math.max(0, progress.failedRecords || 0),
    processingRate: Math.max(0, progress.processingRate || 0),
    estimatedTimeRemaining: Math.max(0, progress.estimatedTimeRemaining || 0),
    errors: progress.errors || [],
  };
};

interface ImportExecutionStepProps {
  sessionData: UploadSession | null;
  importProgress: ImportProgress | null;
  setImportProgress: (progress: ImportProgress | null) => void;
  importResults: ImportResults | null;
  setImportResults: (results: ImportResults | null) => void;
  onComplete: (results: ImportResults) => void;
  ws: WebSocket | null;
}

// Metric card component
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}> = ({ icon, label, value, sublabel, className }) => (
  <div className={cn("text-center p-4 rounded-lg", className)}>
    <div className="flex items-center justify-center mb-2">{icon}</div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
    {sublabel && (
      <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
    )}
  </div>
);

// Progress tracker component
const ProgressTracker: React.FC<{
  progress: ImportProgress;
  showDetails?: boolean;
}> = ({ progress, showDetails = true }) => {
  // Safe calculation to prevent NaN
  const progressPercentage = (() => {
    const processed = progress?.processedRecords || 0;
    const total = progress?.totalRecords || 0;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  })();

  const formatDuration = (seconds: number) => {
    // Safety check for invalid numbers
    if (!seconds || isNaN(seconds) || seconds < 0) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getElapsedTime = () => {
    try {
      const start = new Date(progress?.startTime || Date.now());
      const now = new Date();
      const elapsed = (now.getTime() - start.getTime()) / 1000;
      return Math.max(0, elapsed); // Ensure non-negative
    } catch (error) {
      return 0; // Fallback for invalid dates
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Import Progress</h3>
        <span className="text-sm text-muted-foreground">
          {progress?.processedRecords || 0} / {progress?.totalRecords || 0}{" "}
          records
        </span>
      </div>

      <Progress value={progressPercentage} className="h-3" />

      {showDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Database className="h-4 w-4" />}
            label="Processed"
            value={progress?.processedRecords || 0}
            sublabel={`of ${progress?.totalRecords || 0}`}
            className="bg-blue-50 dark:bg-blue-900/20"
          />
          <MetricCard
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            label="Successful"
            value={progress?.successfulRecords || 0}
            sublabel="imports"
            className="bg-green-50 dark:bg-green-900/20"
          />
          <MetricCard
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            label="Failed"
            value={progress?.failedRecords || 0}
            sublabel="errors"
            className="bg-red-50 dark:bg-red-900/20"
          />
          <MetricCard
            icon={<Zap className="h-4 w-4 text-blue-500" />}
            label="Rate"
            value={`${progress?.processingRate || 0}/sec`}
            sublabel="processing"
            className="bg-yellow-50 dark:bg-yellow-900/20"
          />
        </div>
      )}

      {(progress?.estimatedTimeRemaining || 0) > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Elapsed: {formatDuration(getElapsedTime())}</span>
          <span>
            Estimated remaining:{" "}
            {formatDuration(progress?.estimatedTimeRemaining || 0)}
          </span>
        </div>
      )}
    </div>
  );
};

// Real-time error feed component
const ErrorFeed: React.FC<{
  errors: ValidationError[];
  sessionId?: string;
  onExportReport?: () => void;
  onErrorsResolved?: (resolvedErrors: ValidationError[]) => void;
}> = ({ errors, sessionId, onExportReport, onErrorsResolved }) => {
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);

  if (errors.length === 0) return null;

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
              Import Errors ({errors.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
              {sessionId && onErrorsResolved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowErrorRecovery(true)}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Fix Errors
                </Button>
              )}
              {onExportReport && (
                <Button variant="outline" size="sm" onClick={onExportReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            {errors.slice(0, 20).map((error, index) => (
              <div
                key={index}
                className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <p className="text-sm font-medium">
                  Row {error.recordIndex + 1}
                </p>
                <p className="text-sm text-muted-foreground">{error.message}</p>
                {error.suggestion && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Suggestion: {error.suggestion}
                  </p>
                )}
              </div>
            ))}
            {errors.length > 20 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                And {errors.length - 20} more errors...
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error Recovery Dialog */}
      {sessionId && onErrorsResolved && (
        <ErrorRecoveryDialog
          isOpen={showErrorRecovery}
          onClose={() => setShowErrorRecovery(false)}
          errors={errors}
          sessionId={sessionId}
          onErrorsResolved={(resolvedErrors) => {
            onErrorsResolved(resolvedErrors);
            setShowErrorRecovery(false);
          }}
        />
      )}
    </>
  );
};

export const ImportExecutionStep: React.FC<ImportExecutionStepProps> = ({
  sessionData,
  importProgress,
  setImportProgress,
  importResults,
  setImportResults,
  onComplete,
  ws,
}) => {
  const { toast } = useToast();
  const [hasStarted, setHasStarted] = useState(false);

  // Validate incoming data to prevent NaN calculations
  const validatedSessionData = validateSessionData(sessionData);
  const validatedProgress = validateProgressData(importProgress);

  // Execute import mutation
  const executeImportMutation = useMutation({
    mutationFn: async () => {
      if (!validatedSessionData?.id) throw new Error("No session");

      const response = await apiRequest(
        "POST",
        `/api/import/${validatedSessionData.id}/execute`,
      );
      return response;
    },
    onSuccess: (data) => {
      setHasStarted(true);
      toast({
        title: "Import Started",
        description: "Your bulk import is now in progress",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed to Start",
        description: error.message || "Failed to start import process",
        variant: "destructive",
      });
    },
  });

  // Cancel import mutation
  const cancelImportMutation = useMutation({
    mutationFn: async () => {
      if (!validatedSessionData?.id) throw new Error("No session");

      const response = await apiRequest(
        "POST",
        `/api/import/${validatedSessionData.id}/cancel`,
      );
      return response;
    },
    onSuccess: () => {
      setImportProgress(null);
      setHasStarted(false);
      toast({
        title: "Import Cancelled",
        description: "The import process has been cancelled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel import",
        variant: "destructive",
      });
    },
  });

  // Retry failed records mutation
  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      if (!validatedSessionData?.id) throw new Error("No session");

      const response = await apiRequest(
        "POST",
        `/api/import/${validatedSessionData.id}/retry`,
      );
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Retry Started",
        description: "Retrying failed records",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry import",
        variant: "destructive",
      });
    },
  });

  // Export error report
  const exportErrorReport = async () => {
    if (!validatedSessionData?.id) return;

    try {
      const response = await fetch(
        `/api/import/${validatedSessionData.id}/errors/export`,
      );
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-errors-${validatedSessionData.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Error report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to download error report",
        variant: "destructive",
      });
    }
  };

  // Handle import completion (from WebSocket or direct call)
  useEffect(() => {
    if (importResults) {
      onComplete(importResults);
    }
  }, [importResults, onComplete]);

  const startImport = () => {
    executeImportMutation.mutate();
  };

  const cancelImport = () => {
    cancelImportMutation.mutate();
  };

  const retryFailed = () => {
    retryFailedMutation.mutate();
  };

  // Render different states
  if (importResults) {
    // Import completed
    const hasErrors = importResults.failedRecords > 0;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.successfulRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Products Added
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(importResults.processingTime)}s
                </div>
                <div className="text-sm text-muted-foreground">
                  Processing Time
                </div>
              </div>
            </div>

            {hasErrors && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Partial Import</AlertTitle>
                <AlertDescription>
                  {importResults.failedRecords} records failed to import.
                  Download the error report to review and fix these records.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              <Button className="gradient-primary text-white">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Products
              </Button>
              <Button variant="outline" onClick={exportErrorReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              {hasErrors && (
                <Button variant="outline" onClick={retryFailed}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry Failed
                </Button>
              )}
            </div>

            {/* Detailed Summary */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3">Import Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Records:</span>
                  <div className="font-medium">
                    {importResults.totalRecords}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="font-medium text-green-600">
                    {importResults.summary.created}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <div className="font-medium text-blue-600">
                    {importResults.summary.updated}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed:</span>
                  <div className="font-medium text-red-600">
                    {importResults.summary.failed}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error details if any */}
        {hasErrors && (
          <ErrorFeed
            errors={importResults.errors}
            sessionId={validatedSessionData?.id}
            onExportReport={exportErrorReport}
            onErrorsResolved={(resolvedErrors) => {
              // Update import results by removing resolved errors
              const resolvedErrorsSet = new Set(
                resolvedErrors.map((e) => `${e.recordIndex}-${e.field}`),
              );

              const updatedResults = {
                ...importResults,
                errors: importResults.errors.filter(
                  (error) =>
                    !resolvedErrorsSet.has(
                      `${error.recordIndex}-${error.field}`,
                    ),
                ),
              };

              setImportResults(updatedResults);
            }}
          />
        )}
      </div>
    );
  }

  if (validatedProgress) {
    // Import in progress
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Importing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressTracker progress={validatedProgress} />

            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={cancelImport}
                disabled={cancelImportMutation.isPending}
              >
                <Square className="mr-2 h-4 w-4" />
                Cancel Import
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Real-time error feed */}
        <ErrorFeed
          errors={validatedProgress.errors}
          sessionId={validatedSessionData.id}
          onExportReport={exportErrorReport}
          onErrorsResolved={(resolvedErrors) => {
            // Update progress errors by removing resolved ones
            const resolvedErrorsSet = new Set(
              resolvedErrors.map((e) => `${e.recordIndex}-${e.field}`),
            );

            const updatedProgress = {
              ...validatedProgress,
              errors: validatedProgress.errors.filter(
                (error) =>
                  !resolvedErrorsSet.has(`${error.recordIndex}-${error.field}`),
              ),
            };

            setImportProgress(updatedProgress);
          }}
        />
      </div>
    );
  }

  // Ready to start import
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ready to Import</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your data has been validated and is ready for import. Click the
            button below to start the bulk import process.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pre-import summary */}
          {validatedSessionData &&
            (() => {
              // Safe calculation with fallbacks to prevent NaN
              const recordCount = validatedSessionData.recordCount;
              const batchCount =
                recordCount > 0 ? Math.ceil(recordCount / 100) : 0;

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{recordCount}</div>
                    <div className="text-sm text-muted-foreground">
                      Records to Import
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {validatedSessionData.fileFormat.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      File Format
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">~{batchCount}</div>
                    <div className="text-sm text-muted-foreground">Batches</div>
                  </div>
                </div>
              );
            })()}

          {/* Import process info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Import Process Information</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                The import will process your data in batches of 100 records for
                optimal performance.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>Real-time progress tracking will be displayed</li>
                <li>You can cancel the import at any time</li>
                <li>Failed records can be retried after completion</li>
                <li>A detailed report will be generated</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* WebSocket status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">Real-time Progress:</span>
            <Badge variant={ws ? "default" : "destructive"}>
              {ws ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {/* Start import button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={startImport}
              disabled={
                executeImportMutation.isPending || !validatedSessionData
              }
              className="gradient-primary text-white px-8"
            >
              {executeImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Starting Import...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start Import
                </>
              )}
            </Button>
          </div>

          {/* Estimated time */}
          {validatedSessionData &&
            (() => {
              // Safe calculation with fallbacks to prevent NaN
              const recordCount = validatedSessionData.recordCount;
              const estimatedTime =
                recordCount > 0 ? Math.ceil((recordCount / 100) * 2) : 0;

              return (
                <p className="text-center text-sm text-muted-foreground">
                  Estimated completion time: ~{estimatedTime} seconds
                </p>
              );
            })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportExecutionStep;
