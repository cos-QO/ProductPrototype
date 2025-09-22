import React, { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TemplateDownloadSection from "../components/TemplateDownloadSection";
import type { UploadSession, SourceField } from "../types";

interface FileUploadStepProps {
  sessionData: UploadSession | null;
  setSessionData: (session: UploadSession | null) => void;
  onNext: () => void;
  isMobile?: boolean;
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  sessionData,
  setSessionData,
  onNext,
  isMobile = false,
}) => {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisData, setAnalysisData] = useState<{
    sourceFields: SourceField[];
    recordCount: number;
    warnings: string[];
  } | null>(null);

  // Enhanced file upload mutation with multi-strategy analysis
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Initialize session
      const sessionResponse = await apiRequest(
        "POST",
        "/api/enhanced-import/initialize",
      );
      const { sessionId } = sessionResponse;

      // Simulate initial progress
      setUploadProgress(20);

      // Step 2: Upload and analyze file with enhanced services
      const formData = new FormData();
      formData.append("file", file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 85));
      }, 300);

      try {
        const response = await apiRequest(
          "POST",
          `/api/enhanced-import/analyze/${sessionId}`,
          formData,
        );

        clearInterval(progressInterval);
        setUploadProgress(100);

        return {
          ...response,
          sessionId,
          session: {
            id: sessionId,
            fileName: file.name,
            fileSize: file.size,
            fileFormat: file.name.split(".").pop(),
            status: "analyzed",
            userId: "current-user", // This would come from auth context
            recordCount: response.fileInfo?.totalRecords || 0, // Extract record count from API response
          },
        };
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      setSessionData(data.session);
      setAnalysisData({
        sourceFields: data.sourceFields || [],
        recordCount: data.fileInfo?.totalRecords || 0,
        warnings: data.warnings || [],
      });

      const mappingCount = data.suggestedMappings?.length || 0;
      const confidence =
        data.suggestedMappings?.length > 0
          ? Math.round(
              data.suggestedMappings.reduce(
                (sum: number, m: any) => sum + m.confidence,
                0,
              ) / mappingCount,
            )
          : 0;

      toast({
        title: "File Analyzed Successfully",
        description: `Processed ${data.fileInfo?.totalRecords || 0} records with ${data.sourceFields?.length || 0} fields. Found ${mappingCount} field mappings (${confidence}% avg confidence)`,
      });

      // Auto-advance to processing step after successful upload
      setTimeout(() => {
        onNext();
      }, 1500);
    },
    onError: (error: any) => {
      console.error("Upload error details:", error);

      // Extract meaningful error message
      let errorMessage = "Failed to upload file";
      let errorDetails = "";

      if (error.message) {
        if (error.message.includes("field_mapping_cache")) {
          errorMessage = "Database configuration issue";
          errorDetails =
            "The field mapping system needs to be updated. Please contact support.";
        } else if (error.message.includes("CSV")) {
          errorMessage = "CSV parsing failed";
          errorDetails =
            "Your CSV file may have formatting issues. Try saving it as a simpler CSV format or use our template.";
        } else if (error.message.includes("File data not found")) {
          errorMessage = "File processing interrupted";
          errorDetails =
            "Please try uploading your file again. The upload session may have expired.";
        } else if (error.message.includes("column count")) {
          errorMessage = "Inconsistent column structure";
          errorDetails =
            "Your CSV has rows with different numbers of columns. Please ensure all rows have the same structure.";
        } else if (error.message.includes("Security")) {
          errorMessage = "Security validation failed";
          errorDetails =
            "Your file was rejected for security reasons. Please ensure it's a clean CSV/Excel file.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Upload Failed",
        description: errorDetails || errorMessage,
        variant: "destructive",
      });

      // Reset session data on critical errors
      if (
        errorMessage.includes("Database") ||
        errorMessage.includes("field_mapping_cache")
      ) {
        setSessionData(null);
      }

      setUploadProgress(0);
    },
  });

  // Template download mutation
  const downloadTemplateMutation = useMutation({
    mutationFn: async (format: "csv" | "json" | "xlsx") => {
      const response = await fetch(`/api/import/template/products/${format}`);
      if (!response.ok) throw new Error("Failed to download template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-template.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Template Downloaded",
        description: "Template file has been downloaded to your computer",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Failed to download template file",
        variant: "destructive",
      });
    },
  });

  // Dropzone configuration
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
    onDrop: useCallback(
      (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
          uploadMutation.mutate(acceptedFiles[0]);
        }
      },
      [uploadMutation],
    ),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const clearUpload = () => {
    setSessionData(null);
    setAnalysisData(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Template Download Section - Positioned Above Upload Zone */}
      {!sessionData && (
        <TemplateDownloadSection
          isMobile={isMobile}
          isCompact={false}
          onDownload={(format, filename) => {
            downloadTemplateMutation.mutate(format);
          }}
          isLoading={downloadTemplateMutation.isPending}
        />
      )}

      {/* Upload Zone */}
      {!sessionData && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer",
                isMobile ? "p-6" : "p-12",
                isDragActive && !isDragReject && "border-primary bg-primary/10",
                isDragReject && "border-red-500 bg-red-50 dark:bg-red-900/20",
                !isDragActive && "border-border hover:border-primary/50",
                uploadMutation.isPending && "pointer-events-none opacity-50",
              )}
            >
              <input {...getInputProps()} />

              {uploadMutation.isPending ? (
                <div className="space-y-4">
                  <Loader2
                    className={cn(
                      "mx-auto animate-spin text-primary",
                      isMobile ? "h-12 w-12" : "h-16 w-16",
                    )}
                  />
                  <div>
                    <h3
                      className={cn(
                        "font-semibold mb-2",
                        isMobile ? "text-lg" : "text-xl",
                      )}
                    >
                      Uploading and Analyzing
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Processing your file...
                    </p>
                    <Progress
                      value={uploadProgress}
                      className={cn(
                        "mx-auto",
                        isMobile ? "max-w-xs" : "max-w-md",
                      )}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {uploadProgress}% complete
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload
                    className={cn(
                      "mx-auto text-primary",
                      isMobile ? "h-12 w-12" : "h-16 w-16",
                    )}
                  />
                  <div>
                    <h3
                      className={cn(
                        "font-semibold mb-2",
                        isMobile ? "text-lg" : "text-xl",
                      )}
                    >
                      {isDragActive
                        ? isDragReject
                          ? "File type not supported"
                          : "Drop files here"
                        : isMobile
                          ? "Upload File"
                          : "Upload Your Product Data"}
                    </h3>
                    <p
                      className={cn(
                        "text-muted-foreground mb-4",
                        isMobile ? "text-sm" : "",
                      )}
                    >
                      {isMobile
                        ? "Tap to select your product file"
                        : "Drag and drop your file here, or click to browse"}
                    </p>
                    <Button className={isMobile ? "w-full" : ""}>
                      {isMobile ? "Select File" : "Browse Files"}
                    </Button>
                    <p
                      className={cn(
                        "text-muted-foreground mt-4",
                        isMobile ? "text-xs" : "text-sm",
                      )}
                    >
                      {isMobile
                        ? "CSV, JSON, XLSX • Max 100MB"
                        : "Supports CSV, JSON, XLSX • Max 100MB • Up to 10,000 records"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* File rejection errors */}
            {fileRejections.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {fileRejections[0].errors[0].message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Information (after upload) */}
      {sessionData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                File Uploaded Successfully
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  File Name
                </label>
                <p className="text-sm font-medium">{sessionData.fileName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  File Size
                </label>
                <p className="text-sm font-medium">
                  {formatFileSize(sessionData.fileSize)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Records Detected
                </label>
                <p className="text-sm font-medium">
                  {analysisData?.recordCount || 0}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Format
                </label>
                <Badge variant="outline" className="text-xs">
                  {sessionData.fileFormat?.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Field Analysis */}
            {analysisData && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">
                  Detected Fields ({analysisData.sourceFields.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {analysisData.sourceFields.slice(0, 12).map((field) => (
                    <Badge
                      key={field.name}
                      variant="secondary"
                      className="text-xs"
                    >
                      {field.name}
                    </Badge>
                  ))}
                  {analysisData.sourceFields.length > 12 && (
                    <Badge variant="outline" className="text-xs">
                      +{analysisData.sourceFields.length - 12} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {analysisData?.warnings && analysisData.warnings.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Warnings detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisData.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploadStep;
