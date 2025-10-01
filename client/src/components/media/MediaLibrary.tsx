import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MediaAsset } from "@/shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import MediaUpload from "./MediaUpload";
import MediaGrid from "./MediaGrid";
import MediaSearch from "./MediaSearch";
import MediaSelector from "./MediaSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Images,
  Video,
  FileText,
  Upload,
  Folder,
  Search,
  Filter,
  Grid,
  List,
} from "lucide-react";

interface MediaLibraryProps {
  mode?: "browse" | "select" | "manage";
  onSelect?: (assets: MediaAsset[]) => void;
  selectedAssets?: MediaAsset[];
  multiSelect?: boolean;
  allowedTypes?: string[];
  brandId?: number;
  productId?: number;
}

export default function MediaLibrary({
  mode = "browse",
  onSelect,
  selectedAssets = [],
  multiSelect = false,
  allowedTypes,
  brandId,
  productId,
}: MediaLibraryProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>(
    selectedAssets.map((asset) => asset.id),
  );

  // Fetch media assets
  const {
    data: mediaAssets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/media-assets", { brandId, productId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brandId", brandId.toString());
      if (productId) params.append("productId", productId.toString());

      const response = await fetch(`/api/media-assets?${params}`);
      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          window.location.href = "/api/login";
          return [];
        }
        throw new Error("Failed to fetch media assets");
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Delete media asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      const response = await fetch(`/api/media-assets/${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          window.location.href = "/api/login";
          return;
        }
        throw new Error("Failed to delete media asset");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-assets"] });
      toast({
        title: "Success",
        description: "Media asset deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete media asset.",
        variant: "destructive",
      });
    },
  });

  // Filter assets based on search and type
  const filteredAssets = mediaAssets.filter((asset: MediaAsset) => {
    const matchesSearch =
      searchQuery === "" ||
      asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.altText?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !assetTypeFilter || asset.assetType === assetTypeFilter;

    const matchesAllowedTypes =
      !allowedTypes ||
      allowedTypes.some((type) => asset.mimeType?.startsWith(type));

    return matchesSearch && matchesType && matchesAllowedTypes;
  });

  // Get asset type statistics
  const getAssetStats = () => {
    const stats = mediaAssets.reduce(
      (acc: Record<string, number>, asset: MediaAsset) => {
        const type = asset.assetType || "other";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      total: mediaAssets.length,
      images: stats.hero + stats.product + stats.lifestyle || 0,
      videos: stats.video || 0,
      documents: stats.document || 0,
    };
  };

  const stats = getAssetStats();

  const handleAssetSelect = useCallback(
    (asset: MediaAsset) => {
      if (mode !== "select") return;

      if (multiSelect) {
        const newSelectedIds = selectedAssetIds.includes(asset.id)
          ? selectedAssetIds.filter((id) => id !== asset.id)
          : [...selectedAssetIds, asset.id];

        setSelectedAssetIds(newSelectedIds);
        const newSelectedAssets = mediaAssets.filter((a: MediaAsset) =>
          newSelectedIds.includes(a.id),
        );
        onSelect?.(newSelectedAssets);
      } else {
        setSelectedAssetIds([asset.id]);
        onSelect?.([asset]);
      }
    },
    [mode, multiSelect, selectedAssetIds, mediaAssets, onSelect],
  );

  const handleUploadSuccess = () => {
    refetch();
    setIsUploadDialogOpen(false);
    toast({
      title: "Success",
      description: "Media uploaded successfully.",
    });
  };

  const handleDelete = (assetId: number) => {
    deleteAssetMutation.mutate(assetId);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {mode !== "select" && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Media Library</h2>
            <p className="text-muted-foreground">
              Manage your images, videos, and documents
            </p>
          </div>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Media
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      {mode !== "select" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Images className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">Images</p>
                  <p className="text-2xl font-bold">{stats.images}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-info" />
                <div>
                  <p className="text-sm font-medium">Videos</p>
                  <p className="text-2xl font-bold">{stats.videos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Documents</p>
                  <p className="text-2xl font-bold">{stats.documents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <MediaSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                assetTypeFilter={assetTypeFilter}
                onAssetTypeChange={setAssetTypeFilter}
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredAssets.length}{" "}
                {filteredAssets.length === 1 ? "asset" : "assets"}
              </Badge>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid/List */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load media assets</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <Images className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || assetTypeFilter
                  ? "No matching assets"
                  : "No media assets"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || assetTypeFilter
                  ? "Try adjusting your search or filters"
                  : "Upload your first media asset to get started"}
              </p>
              {!searchQuery && !assetTypeFilter && (
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Media
                </Button>
              )}
            </div>
          ) : (
            <MediaGrid
              assets={filteredAssets}
              viewMode={viewMode}
              selectionMode={mode === "select"}
              selectedAssetIds={selectedAssetIds}
              onAssetSelect={handleAssetSelect}
              onAssetDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Upload images, videos, and documents to your media library.
            </DialogDescription>
          </DialogHeader>
          <MediaUpload
            brandId={brandId}
            productId={productId}
            onUploadSuccess={handleUploadSuccess}
            onCancel={() => setIsUploadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
