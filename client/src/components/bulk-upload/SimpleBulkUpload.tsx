import React, { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified types
interface SimpleFieldMapping {
  yourField: string;
  ourField: string;
  confidence: "high" | "medium" | "low";
}

interface SimpleBulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (results: any) => void;
}

interface UploadState {
  step: "upload" | "mapping" | "importing";
  file: File | null;
  mappings: SimpleFieldMapping[];
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export const SimpleBulkUpload: React.FC<SimpleBulkUploadProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { toast } = useToast();
  const [state, setState] = useState<UploadState>({
    step: "upload",
    file: null,
    mappings: [],
    isProcessing: false,
    progress: 0,
    error: null,
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest(
        "POST",
        "/api/upload/analyze",
        formData,
      );
      return response;
    },
    onSuccess: (data) => {
      // Auto-generate simple mappings from AI suggestions
      const simpleMappings: SimpleFieldMapping[] = data.suggestions.map(
        (suggestion: any) => ({
          yourField: suggestion.sourceField,
          ourField: suggestion.targetField,
          confidence:
            suggestion.confidence >= 0.9
              ? "high"
              : suggestion.confidence >= 0.7
                ? "medium"
                : "low",
        }),
      );

      setState((prev) => ({
        ...prev,
        step: "mapping",
        mappings: simpleMappings,
        isProcessing: false,
      }));
    },
    onError: (error: any) => {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to process file",
        isProcessing: false,
      }));
    },
  });

  // Import execution mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/import/execute", {
        sessionId: uploadMutation.data?.sessionId,
        mappings: state.mappings,
      });
      return response;
    },
    onSuccess: (results) => {
      setState((prev) => ({ ...prev, step: "importing", progress: 100 }));
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.successfulRecords} products`,
      });
      onComplete(results);
    },
    onError: (error: any) => {
      setState((prev) => ({
        ...prev,
        error: error.message || "Import failed",
        isProcessing: false,
      }));
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        setState((prev) => ({
          ...prev,
          error: "File size must be less than 10MB",
        }));
        return;
      }

      const supportedTypes = [".csv", ".json", ".xlsx"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (!supportedTypes.includes(fileExtension)) {
        setState((prev) => ({
          ...prev,
          error: "Supported formats: CSV, JSON, XLSX",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        file,
        error: null,
        isProcessing: true,
      }));

      uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        setState((prev) => ({
          ...prev,
          file,
          error: null,
          isProcessing: true,
        }));
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Start import
  const handleImport = () => {
    setState((prev) => ({
      ...prev,
      isProcessing: true,
      step: "importing",
      progress: 0,
    }));

    // Simulate progress
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 200);

    importMutation.mutate();
  };

  // Reset state
  const handleClose = () => {
    setState({
      step: "upload",
      file: null,
      mappings: [],
      isProcessing: false,
      progress: 0,
      error: null,
    });
    onClose();
  };

  // Check if ready to import
  const requiredMappings = ["name", "sku", "price"];
  const mappedRequired = requiredMappings.filter((req) =>
    state.mappings.some((m) => m.ourField === req),
  );
  const canImport = mappedRequired.length === requiredMappings.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Bulk Upload Products
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                state.step === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              1
            </div>
            <div className="flex-1 h-px bg-muted" />
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                state.step === "mapping"
                  ? "bg-primary text-primary-foreground"
                  : state.step === "importing"
                    ? "bg-success text-success-foreground"
                    : "bg-muted",
              )}
            >
              2
            </div>
          </div>

          {/* File Upload Step */}
          {state.step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".csv,.json,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={state.isProcessing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {state.isProcessing ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Analyzing file...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-lg font-medium">
                        Drop file or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports: CSV, JSON, XLSX (max 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {state.file && !state.isProcessing && (
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{state.file.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {(state.file.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Field Mapping Step */}
          {state.step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-medium">
                  Auto-mapping detected {state.mappings.length} fields
                </span>
              </div>

              <div className="space-y-3">
                {state.mappings.map((mapping, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-muted-foreground">
                        {mapping.yourField}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{mapping.ourField}</span>
                    </div>
                    <Badge
                      variant={
                        mapping.confidence === "high"
                          ? "default"
                          : mapping.confidence === "medium"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {mapping.confidence} confidence
                    </Badge>
                  </div>
                ))}
              </div>

              {!canImport && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Missing required fields:{" "}
                    {requiredMappings
                      .filter(
                        (req) =>
                          !state.mappings.some((m) => m.ourField === req),
                      )
                      .join(", ")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleImport}
                  disabled={!canImport || state.isProcessing}
                  className="flex items-center space-x-2"
                >
                  {state.isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Import Products</span>
                </Button>
              </div>
            </div>
          )}

          {/* Import Progress Step */}
          {state.step === "importing" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">Importing products...</span>
                </div>
                <Progress value={state.progress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {state.progress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Footer */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <div className="text-sm text-muted-foreground">
              Step {state.step === "upload" ? 1 : 2} of 2
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleBulkUpload;
