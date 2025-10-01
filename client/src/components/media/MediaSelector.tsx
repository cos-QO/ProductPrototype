import React, { useState } from "react";
import { MediaAsset } from "@/shared/schema";
import MediaLibrary from "./MediaLibrary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Images, Plus, X } from "lucide-react";

interface MediaSelectorProps {
  selectedAssets?: MediaAsset[];
  onSelectionChange: (assets: MediaAsset[]) => void;
  multiSelect?: boolean;
  allowedTypes?: string[];
  brandId?: number;
  productId?: number;
  placeholder?: string;
  className?: string;
}

export default function MediaSelector({
  selectedAssets = [],
  onSelectionChange,
  multiSelect = false,
  allowedTypes,
  brandId,
  productId,
  placeholder = "Select media...",
  className,
}: MediaSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleMediaSelect = (assets: MediaAsset[]) => {
    onSelectionChange(assets);
    if (!multiSelect) {
      setIsDialogOpen(false);
    }
  };

  const removeAsset = (assetId: number) => {
    const newAssets = selectedAssets.filter((asset) => asset.id !== assetId);
    onSelectionChange(newAssets);
  };

  const hasSelectedAssets = selectedAssets.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Assets Display */}
      {hasSelectedAssets && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {selectedAssets.map((asset) => (
            <div
              key={asset.id}
              className="relative group border rounded-lg overflow-hidden"
            >
              <div className="aspect-square bg-muted flex items-center justify-center">
                {asset.mimeType?.startsWith("image/") ? (
                  <img
                    src={asset.url}
                    alt={asset.altText || asset.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Images className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Remove button */}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAsset(asset.id)}
              >
                <X className="h-3 w-3" />
              </Button>

              {/* Asset info */}
              <div className="p-2">
                <p className="text-xs truncate">
                  {asset.originalName || asset.fileName}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {asset.assetType}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          className="flex-1 justify-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          {hasSelectedAssets
            ? `${selectedAssets.length} selected`
            : placeholder}
        </Button>

        {hasSelectedAssets && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Selection Summary */}
      {hasSelectedAssets && (
        <div className="flex flex-wrap gap-1">
          {selectedAssets.map((asset) => (
            <Badge key={asset.id} variant="secondary" className="text-xs">
              {asset.originalName || asset.fileName}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeAsset(asset.id)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Media Library Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Media</DialogTitle>
            <DialogDescription>
              Choose {multiSelect ? "one or more" : "a"} media asset
              {multiSelect ? "s" : ""} from your library.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto max-h-[70vh]">
            <MediaLibrary
              mode="select"
              onSelect={handleMediaSelect}
              selectedAssets={selectedAssets}
              multiSelect={multiSelect}
              allowedTypes={allowedTypes}
              brandId={brandId}
              productId={productId}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            {multiSelect && (
              <Button onClick={() => setIsDialogOpen(false)}>
                Select {selectedAssets.length} Item
                {selectedAssets.length !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
