import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileImage,
  FileVideo,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";

interface MediaUploadProps {
  brandId?: number;
  productId?: number;
  onUploadSuccess?: () => void;
  onCancel?: () => void;
}

interface UploadFile extends File {
  id: string;
  preview?: string;
  assetType: string;
  altText: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

const assetTypes = [
  { value: "hero", label: "Hero Image" },
  { value: "product", label: "Product Image" },
  { value: "lifestyle", label: "Lifestyle Image" },
  { value: "brand", label: "Brand Asset" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
];

export default function MediaUpload({
  brandId,
  productId,
  onUploadSuccess,
  onCancel,
}: MediaUploadProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => {
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : undefined;

      return {
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        preview,
        assetType: isImage
          ? "product"
          : file.type.startsWith("video/")
            ? "video"
            : "document",
        altText: "",
        progress: 0,
        status: "pending" as const,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".webm", ".ogg"],
      "application/pdf": [".pdf"],
      "text/*": [".txt", ".md"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const updateFile = (fileId: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    );
  };

  const uploadFile = async (file: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("media", file);
      formData.append("assetType", file.assetType);
      formData.append("altText", file.altText);

      if (brandId) {
        formData.append("brandId", brandId.toString());
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          updateFile(file.id, { progress });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 201) {
          updateFile(file.id, { status: "completed", progress: 100 });
          resolve();
        } else {
          const error = "Upload failed";
          updateFile(file.id, { status: "error", error });
          reject(new Error(error));
        }
      });

      xhr.addEventListener("error", () => {
        const error = "Network error occurred";
        updateFile(file.id, { status: "error", error });
        reject(new Error(error));
      });

      updateFile(file.id, { status: "uploading" });

      // Use the appropriate endpoint based on whether we have a productId
      const endpoint = productId
        ? `/api/products/${productId}/media`
        : "/api/media-assets";

      xhr.open("POST", endpoint);
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = files
      .filter((f) => f.status === "pending")
      .map((file) => uploadFile(file));

    try {
      await Promise.all(uploadPromises);

      const hasErrors = files.some((f) => f.status === "error");
      if (hasErrors) {
        toast({
          title: "Partial Upload Success",
          description: "Some files failed to upload. Please check the details.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Successful",
          description: `${files.length} file(s) uploaded successfully.`,
        });
        onUploadSuccess?.();
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: UploadFile) => {
    if (file.type.startsWith("image/")) return FileImage;
    if (file.type.startsWith("video/")) return FileVideo;
    return FileText;
  };

  const allFilesCompleted = files.every((f) => f.status === "completed");
  const hasFiles = files.length > 0;
  const canUpload = hasFiles && !isUploading && !allFilesCompleted;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground hover:border-primary",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              Support images, videos, and documents (max 10MB per file)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-4">
          <h3 className="font-medium">Files to Upload ({files.length})</h3>
          <div className="space-y-3">
            {files.map((file) => {
              const FileIcon = getFileIcon(file);
              return (
                <div key={file.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Preview/Icon */}
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm truncate">
                            {file.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {file.status === "completed" && (
                            <Check className="h-5 w-5 text-success" />
                          )}
                          {file.status === "error" && (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          )}
                          <Badge
                            variant={
                              file.status === "completed"
                                ? "default"
                                : file.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {file.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            disabled={file.status === "uploading"}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      {file.status === "uploading" && (
                        <Progress value={file.progress} className="h-2" />
                      )}

                      {/* Error Message */}
                      {file.status === "error" && file.error && (
                        <p className="text-xs text-destructive">{file.error}</p>
                      )}

                      {/* Configuration */}
                      {file.status === "pending" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`asset-type-${file.id}`}>
                              Asset Type
                            </Label>
                            <Select
                              value={file.assetType}
                              onValueChange={(value) =>
                                updateFile(file.id, { assetType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {assetTypes.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`alt-text-${file.id}`}>
                              Alt Text
                            </Label>
                            <Input
                              id={`alt-text-${file.id}`}
                              placeholder="Describe this media..."
                              value={file.altText}
                              onChange={(e) =>
                                updateFile(file.id, { altText: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!canUpload}
          className="min-w-[120px]"
        >
          {isUploading ? "Uploading..." : `Upload ${files.length} file(s)`}
        </Button>
      </div>
    </div>
  );
}
