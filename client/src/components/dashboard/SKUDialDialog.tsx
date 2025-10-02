/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 6.2 (SKU Dial Editing Interface)
 * SKU Dial Dialog Component for editing allocations
 * Created: 2025-10-02T17:30:00Z
 * Agent: developer
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Calculator,
} from "lucide-react";
import { CategorySlider } from "./CategorySlider";
import {
  useSkuDial,
  validateSkuDialAllocation,
  type SkuDialData,
} from "@/hooks/useSkuDial";
import {
  useSkuDialMutation,
  useResetSkuDialMutation,
} from "@/hooks/useSkuDialMutation";
import { cn } from "@/lib/utils";

interface SKUDialDialogProps {
  productId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AllocationState {
  performancePoints: number;
  inventoryPoints: number;
  profitabilityPoints: number;
  demandPoints: number;
  competitivePoints: number;
  trendPoints: number;
}

export function SKUDialDialog({
  productId,
  open,
  onOpenChange,
}: SKUDialDialogProps) {
  const { data: currentData, isLoading } = useSkuDial(productId);
  const updateMutation = useSkuDialMutation(productId, {
    onSuccess: () => {
      onOpenChange(false);
    },
  });
  const resetMutation = useResetSkuDialMutation(productId, {
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  // Local state for editing
  const [allocation, setAllocation] = useState<AllocationState>({
    performancePoints: 0,
    inventoryPoints: 0,
    profitabilityPoints: 0,
    demandPoints: 0,
    competitivePoints: 0,
    trendPoints: 0,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize allocation state when data loads
  useEffect(() => {
    if (currentData) {
      const initialState = {
        performancePoints: currentData.performancePoints || 0,
        inventoryPoints: currentData.inventoryPoints || 0,
        profitabilityPoints: currentData.profitabilityPoints || 0,
        demandPoints: currentData.demandPoints || 0,
        competitivePoints: currentData.competitivePoints || 0,
        trendPoints: currentData.trendPoints || 0,
      };
      setAllocation(initialState);
      setHasChanges(false);
    }
  }, [currentData]);

  // Calculate totals and validation
  const totalPoints = Object.values(allocation).reduce(
    (sum, points) => sum + points,
    0,
  );
  const remainingPoints = 888 - totalPoints;
  const validation = validateSkuDialAllocation(allocation);

  const handleCategoryChange = (
    category: keyof AllocationState,
    value: number,
  ) => {
    const newAllocation = { ...allocation, [category]: value };
    setAllocation(newAllocation);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!validation.isValid) return;

    try {
      await updateMutation.mutateAsync(allocation);
    } catch (error) {
      console.error("Failed to save SKU dial allocation:", error);
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to reset SKU dial allocation:", error);
    }
  };

  const handleCancel = () => {
    if (currentData) {
      setAllocation({
        performancePoints: currentData.performancePoints || 0,
        inventoryPoints: currentData.inventoryPoints || 0,
        profitabilityPoints: currentData.profitabilityPoints || 0,
        demandPoints: currentData.demandPoints || 0,
        competitivePoints: currentData.competitivePoints || 0,
        trendPoints: currentData.trendPoints || 0,
      });
    }
    setHasChanges(false);
    onOpenChange(false);
  };

  const isOverLimit = totalPoints > 888;
  const isOptimal = totalPoints >= 800 && totalPoints <= 888;
  const isSaving = updateMutation.isPending || resetMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Edit SKU Dial Allocation
          </DialogTitle>
          <DialogDescription>
            Allocate up to 888 points across 6 categories to optimize your
            product's performance insights.
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Summary header */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-3 gap-6 flex-1">
                <div className="text-center">
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      isOverLimit ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {totalPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Used Points
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      remainingPoints < 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {remainingPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">888</div>
                  <div className="text-sm text-muted-foreground">
                    Total Limit
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOptimal && (
                  <Badge
                    variant="default"
                    className="bg-success text-success-foreground"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Optimal
                  </Badge>
                )}
                {isOverLimit && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Over Limit
                  </Badge>
                )}
                {totalPoints < 400 && (
                  <Badge variant="secondary">Under Utilized</Badge>
                )}
              </div>
            </div>

            {/* Validation errors */}
            {!validation.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Category sliders */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Category Allocations</h3>

              <div className="grid gap-4">
                <CategorySlider
                  category="performance"
                  value={allocation.performancePoints}
                  max={200}
                  onChange={(value) =>
                    handleCategoryChange("performancePoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />

                <CategorySlider
                  category="inventory"
                  value={allocation.inventoryPoints}
                  max={150}
                  onChange={(value) =>
                    handleCategoryChange("inventoryPoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />

                <CategorySlider
                  category="profitability"
                  value={allocation.profitabilityPoints}
                  max={200}
                  onChange={(value) =>
                    handleCategoryChange("profitabilityPoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />

                <CategorySlider
                  category="demand"
                  value={allocation.demandPoints}
                  max={138}
                  onChange={(value) =>
                    handleCategoryChange("demandPoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />

                <CategorySlider
                  category="competitive"
                  value={allocation.competitivePoints}
                  max={100}
                  onChange={(value) =>
                    handleCategoryChange("competitivePoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />

                <CategorySlider
                  category="trend"
                  value={allocation.trendPoints}
                  max={100}
                  onChange={(value) =>
                    handleCategoryChange("trendPoints", value)
                  }
                  disabled={isSaving}
                  remainingPoints={remainingPoints}
                  totalUsed={totalPoints}
                />
              </div>
            </div>

            {/* Tips and guidance */}
            <div className="p-4 bg-info/5 border border-info/20 rounded-lg">
              <h4 className="text-sm font-medium text-info mb-2">
                Optimization Tips
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Aim for 800-888 total points for optimal allocation</li>
                <li>• Focus higher points on your product's key strengths</li>
                <li>
                  • Performance and Profitability have the highest maximums (200
                  each)
                </li>
                <li>
                  • Demand has a unique maximum of 138 based on market analysis
                </li>
                <li>• Leave some points unallocated for future adjustments</li>
              </ul>
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={!validation.isValid || !hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SKUDialDialog;
