import React, { useState } from "react";
import { MediaAsset } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Check,
  Eye,
  Download,
  Edit,
  Trash2,
  FileImage,
  FileVideo,
  FileText,
  Copy,
} from "lucide-react";

interface MediaGridProps {
  assets: MediaAsset[];
  viewMode: "grid" | "list";
  selectionMode?: boolean;
  selectedAssetIds?: number[];
  onAssetSelect?: (asset: MediaAsset) => void;
  onAssetDelete?: (assetId: number) => void;
  onAssetEdit?: (asset: MediaAsset) => void;
}

interface MediaItemProps {
  asset: MediaAsset;
  viewMode: "grid" | "list";
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

function MediaItem({
  asset,
  viewMode,
  isSelected = false,
  selectionMode = false,
  onSelect,
  onDelete,
  onEdit,
}: MediaItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isImage = asset.mimeType?.startsWith("image/");
  const isVideo = asset.mimeType?.startsWith("video/");
  const isDocument =
    asset.mimeType?.startsWith("application/") ||
    asset.mimeType?.startsWith("text/");

  const getFileIcon = () => {
    if (isImage) return FileImage;
    if (isVideo) return FileVideo;
    return FileText;
  };

  const FileIcon = getFileIcon();

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.originalName || asset.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.url);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  };

  if (viewMode === "list") {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectionMode && "hover:bg-muted/50",
              isSelected && "ring-2 ring-primary bg-primary/5",
            )}
            onClick={selectionMode ? onSelect : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isImage ? (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">
                      {asset.originalName || asset.fileName}
                    </h3>
                    {selectionMode && isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {asset.assetType || "unknown"}
                    </Badge>
                    <span>{formatFileSize(asset.fileSize)}</span>
                    <span>•</span>
                    <span>{asset.mimeType}</span>
                  </div>

                  {asset.altText && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {asset.altText}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!selectionMode && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(asset.url, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {onEdit && (
                      <Button variant="ghost" size="sm" onClick={onEdit}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => window.open(asset.url, "_blank")}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </ContextMenuItem>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Grid view
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            className={cn(
              "group cursor-pointer transition-all hover:shadow-md",
              selectionMode && "hover:bg-muted/50",
              isSelected && "ring-2 ring-primary bg-primary/5",
            )}
            onClick={selectionMode ? onSelect : undefined}
          >
            <CardContent className="p-0">
              {/* Thumbnail */}
              <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center overflow-hidden relative">
                {isImage ? (
                  <img
                    src={asset.url}
                    alt={asset.altText || asset.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileIcon className="h-12 w-12 text-muted-foreground" />
                )}

                {/* Selection indicator */}
                {selectionMode && (
                  <div className="absolute top-2 right-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted-foreground",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                )}

                {/* Hover actions */}
                {!selectionMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(asset.url, "_blank");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-sm truncate flex-1">
                    {asset.originalName || asset.fileName}
                  </h3>
                  {selectionMode && isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {asset.assetType || "unknown"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(asset.fileSize)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => window.open(asset.url, "_blank")}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </ContextMenuItem>
          {onEdit && (
            <ContextMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {asset.originalName || asset.fileName}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setIsDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MediaGrid({
  assets,
  viewMode,
  selectionMode = false,
  selectedAssetIds = [],
  onAssetSelect,
  onAssetDelete,
  onAssetEdit,
}: MediaGridProps) {
  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
          : "space-y-2",
      )}
    >
      {assets.map((asset) => (
        <MediaItem
          key={asset.id}
          asset={asset}
          viewMode={viewMode}
          isSelected={selectedAssetIds.includes(asset.id)}
          selectionMode={selectionMode}
          onSelect={() => onAssetSelect?.(asset)}
          onDelete={() => onAssetDelete?.(asset.id)}
          onEdit={() => onAssetEdit?.(asset)}
        />
      ))}
    </div>
  );
}
