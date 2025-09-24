// Phase 3.5: Product Variants Tab Component
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Settings,
  Grid,
  List,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Eye,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  Upload,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { VariantOptionsManager } from "./VariantOptionsManager";
import { VariantGenerator } from "./VariantGenerator";
import { VariantsList } from "./VariantsList";
import { BulkVariantOperations } from "./BulkVariantOperations";

interface VariantsTabProps {
  productId: number;
  product: any;
}

export function VariantsTab({ productId, product }: VariantsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"grid" | "list">("grid");
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Fetch variant options for this product
  const { data: productOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ["/api/products", productId, "variants", "options"],
    queryFn: () => apiRequest("GET", `/api/products/${productId}/variants/options`),
    retry: false,
  });

  // Fetch variants for this product
  const { data: variants, isLoading: variantsLoading, refetch: refetchVariants } = useQuery({
    queryKey: ["/api/products", productId, "variants"],
    queryFn: () => apiRequest("GET", `/api/products/${productId}/variants`),
    retry: false,
  });

  // Fetch global variant options
  const { data: globalOptions } = useQuery({
    queryKey: ["/api/variants/options"],
    queryFn: () => apiRequest("GET", "/api/variants/options"),
    retry: false,
  });

  const hasVariantOptions = productOptions && productOptions.length > 0;
  const hasVariants = variants && variants.length > 0;
  const variantCount = variants?.length || 0;

  // Filter variants based on search and status
  const filteredVariants = React.useMemo(() => {
    if (!variants) return [];
    
    return variants.filter((variant: any) => {
      const matchesSearch = variant.variantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           variant.variantSku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           variant.variantProduct?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || 
                          (filterStatus === "active" && variant.isActive) ||
                          (filterStatus === "inactive" && !variant.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [variants, searchQuery, filterStatus]);

  // Calculate variant statistics
  const variantStats = React.useMemo(() => {
    if (!variants) return { total: 0, active: 0, inactive: 0, outOfStock: 0 };
    
    return variants.reduce((stats: any, variant: any) => {
      stats.total++;
      if (variant.isActive) stats.active++;
      else stats.inactive++;
      if (variant.variantProduct?.stock === 0) stats.outOfStock++;
      return stats;
    }, { total: 0, active: 0, inactive: 0, outOfStock: 0 });
  }, [variants]);

  const handleVariantSelect = (variantId: number, selected: boolean) => {
    setSelectedVariants(prev => 
      selected 
        ? [...prev, variantId]
        : prev.filter(id => id !== variantId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedVariants(filteredVariants.map((v: any) => v.id));
    } else {
      setSelectedVariants([]);
    }
  };

  if (optionsLoading || variantsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Product Variants</h3>
            <p className="text-sm text-muted-foreground">
              Manage size, color, style, and other variations of {product.name}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {hasVariants && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView(activeView === "grid" ? "list" : "grid")}
              >
                {activeView === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Options
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Variant Options Configuration</DialogTitle>
                </DialogHeader>
                <VariantOptionsManager
                  productId={productId}
                  productOptions={productOptions || []}
                  globalOptions={globalOptions || []}
                  onSave={() => {
                    queryClient.invalidateQueries({ 
                      queryKey: ["/api/products", productId, "variants", "options"] 
                    });
                    toast({
                      title: "Success",
                      description: "Variant options updated successfully",
                    });
                  }}
                />
              </DialogContent>
            </Dialog>

            {hasVariantOptions && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Variants
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Generate Product Variants</DialogTitle>
                  </DialogHeader>
                  <VariantGenerator
                    productId={productId}
                    product={product}
                    productOptions={productOptions || []}
                    onGenerate={(count) => {
                      refetchVariants();
                      toast({
                        title: "Success",
                        description: `Generated ${count} variants successfully`,
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {hasVariants && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Variants</p>
                    <p className="text-lg font-semibold">{variantStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-lg font-semibold text-green-600">{variantStats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                    <p className="text-lg font-semibold text-orange-600">{variantStats.inactive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                    <p className="text-lg font-semibold text-red-600">{variantStats.outOfStock}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content */}
      {!hasVariantOptions ? (
        // No variant options configured
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Variant Options Configured</h3>
            <p className="text-muted-foreground mb-6">
              Configure variant options like size, color, or material to start creating product variations.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Variant Options
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Variant Options Configuration</DialogTitle>
                </DialogHeader>
                <VariantOptionsManager
                  productId={productId}
                  productOptions={[]}
                  globalOptions={globalOptions || []}
                  onSave={() => {
                    queryClient.invalidateQueries({ 
                      queryKey: ["/api/products", productId, "variants", "options"] 
                    });
                    toast({
                      title: "Success",
                      description: "Variant options configured successfully",
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : !hasVariants ? (
        // No variants generated yet
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Variants Generated</h3>
            <p className="text-muted-foreground mb-6">
              You have configured variant options. Generate variants to create all possible combinations.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Variants
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Generate Product Variants</DialogTitle>
                </DialogHeader>
                <VariantGenerator
                  productId={productId}
                  product={product}
                  productOptions={productOptions}
                  onGenerate={(count) => {
                    refetchVariants();
                    toast({
                      title: "Success",
                      description: `Generated ${count} variants successfully`,
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        // Show variants management interface
        <div className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <BulkVariantOperations
                selectedVariants={selectedVariants}
                onOperationComplete={() => {
                  refetchVariants();
                  setSelectedVariants([]);
                }}
              />
            </div>
          </div>

          {/* Bulk Selection */}
          {filteredVariants.length > 0 && (
            <div className="flex items-center justify-between py-2 px-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedVariants.length === filteredVariants.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedVariants.length > 0 
                    ? `${selectedVariants.length} of ${filteredVariants.length} variants selected`
                    : `Select all ${filteredVariants.length} variants`
                  }
                </span>
              </div>

              {selectedVariants.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVariants([])}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          )}

          {/* Variants List */}
          <VariantsList
            variants={filteredVariants}
            viewMode={activeView}
            selectedVariants={selectedVariants}
            onVariantSelect={handleVariantSelect}
            onVariantUpdate={() => refetchVariants()}
            onVariantDelete={() => refetchVariants()}
          />
        </div>
      )}
    </div>
  );
}