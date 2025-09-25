// Phase 3.5: Variants List Component
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  DollarSign,
  Hash,
  Package2,
  Palette,
  Ruler,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface VariantsListProps {
  variants: any[];
  viewMode: "grid" | "list";
  selectedVariants: number[];
  onVariantSelect: (variantId: number, selected: boolean) => void;
  onVariantUpdate: () => void;
  onVariantDelete: () => void;
}

export function VariantsList({
  variants,
  viewMode,
  selectedVariants,
  onVariantSelect,
  onVariantUpdate,
  onVariantDelete,
}: VariantsListProps) {
  const { toast } = useToast();
  const [editingVariant, setEditingVariant] = useState<any>(null);

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: async ({
      variantId,
      updates,
    }: {
      variantId: number;
      updates: any;
    }) => {
      return apiRequest("PATCH", `/api/variants/${variantId}`, updates);
    },
    onSuccess: () => {
      onVariantUpdate();
      setEditingVariant(null);
      toast({
        title: "Success",
        description: "Variant updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update variant",
        variant: "destructive",
      });
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: number) => {
      return apiRequest("DELETE", `/api/variants/${variantId}`);
    },
    onSuccess: () => {
      onVariantDelete();
      toast({
        title: "Success",
        description: "Variant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete variant",
        variant: "destructive",
      });
    },
  });

  const handleUpdateVariant = (variantId: number, updates: any) => {
    updateVariantMutation.mutate({ variantId, updates });
  };

  const handleDeleteVariant = (variantId: number) => {
    deleteVariantMutation.mutate(variantId);
  };

  const formatPrice = (priceInCents: number | null) => {
    if (priceInCents === null) return "Not set";
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (variant: any) => {
    if (!variant.isActive) return "text-destructive";
    if (variant.variantProduct?.stock === 0) return "text-warning";
    return "text-success";
  };

  const getStatusIcon = (variant: any) => {
    if (!variant.isActive) return <XCircle className="h-4 w-4" />;
    if (variant.variantProduct?.stock === 0)
      return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getOptionIcon = (optionType: string) => {
    switch (optionType) {
      case "color":
        return <Palette className="h-3 w-3" />;
      case "size":
        return <Ruler className="h-3 w-3" />;
      case "image":
        return <ImageIcon className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const renderVariantCombinations = (combinations: any[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {combinations.map((combo, index) => (
          <Badge
            key={index}
            variant="outline"
            className="text-xs flex items-center gap-1"
          >
            {getOptionIcon(combo.option.optionType)}
            <span>
              {combo.option.displayName}: {combo.optionValue.displayValue}
            </span>
          </Badge>
        ))}
      </div>
    );
  };

  if (variants.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Variants Found</h3>
        <p className="text-muted-foreground">
          No variants match your current filters.
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Variants List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedVariants.length === variants.length}
                    onCheckedChange={(checked) => {
                      variants.forEach((variant) => {
                        onVariantSelect(variant.id, !!checked);
                      });
                    }}
                  />
                </TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Combinations</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVariants.includes(variant.id)}
                      onCheckedChange={(checked) =>
                        onVariantSelect(variant.id, !!checked)
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {variant.variantName ||
                          variant.variantProduct?.name ||
                          "Unnamed Variant"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {variant.id}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {renderVariantCombinations(variant.combinations || [])}
                  </TableCell>

                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {variant.variantSku ||
                        variant.variantProduct?.sku ||
                        "Not set"}
                    </code>
                  </TableCell>

                  <TableCell>
                    {formatPrice(variant.variantProduct?.price)}
                    {variant.priceAdjustment !== 0 && (
                      <div className="text-xs text-muted-foreground">
                        {variant.priceAdjustment > 0 ? "+" : ""}
                        {formatPrice(variant.priceAdjustment)} adj
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {variant.variantProduct?.stock !== null ? (
                      <Badge
                        variant={
                          variant.variantProduct.stock > 0
                            ? "default"
                            : "secondary"
                        }
                      >
                        {variant.variantProduct.stock}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unlimited</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div
                      className={`flex items-center gap-1 ${getStatusColor(variant)}`}
                    >
                      {getStatusIcon(variant)}
                      <span className="text-sm">
                        {variant.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setEditingVariant(variant)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Product
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Variant
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this variant?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteVariant(variant.id)}
                                variant="destructive"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {variants.map((variant) => (
        <Card key={variant.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selectedVariants.includes(variant.id)}
                  onCheckedChange={(checked) =>
                    onVariantSelect(variant.id, !!checked)
                  }
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {variant.variantName ||
                      variant.variantProduct?.name ||
                      "Unnamed Variant"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {variant.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className={`${getStatusColor(variant)}`}>
                  {getStatusIcon(variant)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => setEditingVariant(variant)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Product
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this variant? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteVariant(variant.id)}
                            variant="destructive"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Variant Combinations */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Combinations
              </Label>
              {renderVariantCombinations(variant.combinations || [])}
            </div>

            {/* SKU and Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  SKU
                </Label>
                <div className="text-sm font-mono">
                  {variant.variantSku ||
                    variant.variantProduct?.sku ||
                    "Not set"}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Price
                </Label>
                <div className="text-sm font-medium">
                  {formatPrice(variant.variantProduct?.price)}
                </div>
                {variant.priceAdjustment !== 0 && (
                  <div className="text-xs text-muted-foreground">
                    {variant.priceAdjustment > 0 ? "+" : ""}
                    {formatPrice(variant.priceAdjustment)} adj
                  </div>
                )}
              </div>
            </div>

            {/* Stock and Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">
                  Stock
                </Label>
                <div className="flex items-center gap-1">
                  {variant.variantProduct?.stock !== null ? (
                    <Badge
                      variant={
                        variant.variantProduct.stock > 0
                          ? "default"
                          : "secondary"
                      }
                    >
                      {variant.variantProduct.stock}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unlimited</Badge>
                  )}
                </div>
              </div>

              <div
                className={`flex items-center gap-1 text-sm ${getStatusColor(variant)}`}
              >
                {getStatusIcon(variant)}
                <span>{variant.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Variant Dialog */}
      {editingVariant && (
        <Dialog
          open={!!editingVariant}
          onOpenChange={() => setEditingVariant(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Variant</DialogTitle>
            </DialogHeader>
            <VariantEditForm
              variant={editingVariant}
              onSave={(updates) =>
                handleUpdateVariant(editingVariant.id, updates)
              }
              onCancel={() => setEditingVariant(null)}
              isLoading={updateVariantMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Variant Edit Form Component
function VariantEditForm({
  variant,
  onSave,
  onCancel,
  isLoading,
}: {
  variant: any;
  onSave: (updates: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    variantName: variant.variantName || "",
    sku: variant.variantProduct?.sku || "",
    price: variant.variantProduct?.price
      ? (variant.variantProduct.price / 100).toString()
      : "",
    stock: variant.variantProduct?.stock?.toString() || "",
    status: variant.variantProduct?.status || "draft",
    isActive: variant.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates = {
      variantName: formData.variantName,
      sku: formData.sku,
      price: formData.price
        ? Math.round(parseFloat(formData.price) * 100)
        : null,
      stock: formData.stock ? parseInt(formData.stock) : null,
      status: formData.status,
      isActive: formData.isActive,
    };

    onSave(updates);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="variantName">Variant Name</Label>
          <Input
            id="variantName"
            value={formData.variantName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, variantName: e.target.value }))
            }
            placeholder="Variant display name"
          />
        </div>

        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sku: e.target.value }))
            }
            placeholder="Product SKU"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price: e.target.value }))
            }
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, stock: e.target.value }))
            }
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-6">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: !!checked }))
            }
          />
          <Label htmlFor="isActive">Active Variant</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
