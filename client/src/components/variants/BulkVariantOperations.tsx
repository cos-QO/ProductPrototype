// Phase 3.5: Bulk Variant Operations Component
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  Package,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";

interface BulkVariantOperationsProps {
  selectedVariants: number[];
  onOperationComplete: () => void;
}

interface BulkOperation {
  action: "update" | "delete" | "activate" | "deactivate";
  data?: {
    priceAdjustment?: number;
    stock?: number;
    isActive?: boolean;
  };
}

export function BulkVariantOperations({
  selectedVariants,
  onOperationComplete,
}: BulkVariantOperationsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [priceAdjustment, setPriceAdjustment] = useState<string>("");
  const [stockLevel, setStockLevel] = useState<string>("");

  const bulkOperationMutation = useMutation({
    mutationFn: async (operation: BulkOperation) => {
      const response = await apiRequest("/api/variants/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: operation.action,
          variants: selectedVariants,
          data: operation.data,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Operation Successful",
        description: `Successfully updated ${selectedVariants.length} variant(s).`,
      });
      onOperationComplete();
      setIsDialogOpen(false);
      setIsDeleteDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Bulk operation error:", error);
      toast({
        title: "Bulk Operation Failed",
        description: error.message || "Failed to perform bulk operation.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedOperation("");
    setPriceAdjustment("");
    setStockLevel("");
  };

  const handleBulkOperation = () => {
    if (!selectedOperation) {
      toast({
        title: "No Operation Selected",
        description: "Please select an operation to perform.",
        variant: "destructive",
      });
      return;
    }

    const operation: BulkOperation = {
      action: selectedOperation as BulkOperation["action"],
    };

    // Add data for update operations
    if (selectedOperation === "update") {
      operation.data = {};

      if (priceAdjustment !== "") {
        const price = parseFloat(priceAdjustment);
        if (isNaN(price)) {
          toast({
            title: "Invalid Price",
            description: "Please enter a valid price adjustment.",
            variant: "destructive",
          });
          return;
        }
        operation.data.priceAdjustment = Math.round(price * 100); // Convert to cents
      }

      if (stockLevel !== "") {
        const stock = parseInt(stockLevel);
        if (isNaN(stock) || stock < 0) {
          toast({
            title: "Invalid Stock",
            description: "Please enter a valid stock level (0 or greater).",
            variant: "destructive",
          });
          return;
        }
        operation.data.stock = stock;
      }

      if (Object.keys(operation.data).length === 0) {
        toast({
          title: "No Updates Specified",
          description: "Please specify at least one field to update.",
          variant: "destructive",
        });
        return;
      }
    } else if (selectedOperation === "activate") {
      operation.data = { isActive: true };
    } else if (selectedOperation === "deactivate") {
      operation.data = { isActive: false };
    }

    bulkOperationMutation.mutate(operation);
  };

  if (selectedVariants.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Bulk Operations
            </CardTitle>
            <CardDescription>
              {selectedVariants.length} variant(s) selected
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOperationComplete}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {/* Update Operations */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedOperation("update")}
              >
                <Settings className="h-4 w-4 mr-1" />
                Update
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Bulk Update Variants</DialogTitle>
                <DialogDescription>
                  Update {selectedVariants.length} selected variant(s). Leave
                  fields empty to keep current values.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priceAdjustment" className="text-right">
                    Price Adjustment
                  </Label>
                  <div className="col-span-3 relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="priceAdjustment"
                      placeholder="0.00"
                      value={priceAdjustment}
                      onChange={(e) => setPriceAdjustment(e.target.value)}
                      className="pl-8"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stockLevel" className="text-right">
                    Stock Level
                  </Label>
                  <div className="col-span-3 relative">
                    <Package className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="stockLevel"
                      placeholder="Stock quantity"
                      value={stockLevel}
                      onChange={(e) => setStockLevel(e.target.value)}
                      className="pl-8"
                      type="number"
                      min="0"
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-500 mt-2">
                  <strong>Note:</strong> Only fields with values will be
                  updated. Empty fields will preserve existing values.
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkOperation}
                  disabled={bulkOperationMutation.isPending}
                >
                  {bulkOperationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Variants
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="h-8" />

          {/* Activation Operations */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setSelectedOperation("activate");
              handleBulkOperation();
            }}
            disabled={bulkOperationMutation.isPending}
          >
            <Eye className="h-4 w-4 mr-1" />
            Activate
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setSelectedOperation("deactivate");
              handleBulkOperation();
            }}
            disabled={bulkOperationMutation.isPending}
          >
            <EyeOff className="h-4 w-4 mr-1" />
            Deactivate
          </Button>

          <Separator orientation="vertical" className="h-8" />

          {/* Delete Operations */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Variants</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedVariants.length}{" "}
                  variant(s)? This action cannot be undone and will permanently
                  remove the variants and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setSelectedOperation("delete");
                    handleBulkOperation();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={bulkOperationMutation.isPending}
                >
                  {bulkOperationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete Variants
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {bulkOperationMutation.isPending && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing bulk operation...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
