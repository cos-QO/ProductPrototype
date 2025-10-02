/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 5.1 (API Hooks Creation)
 * SKU Dial Mutation Hook for Performance Insights
 * Created: 2025-10-02T16:40:00Z
 * Agent: developer
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { validateSkuDialAllocation } from "./useSkuDial";
import type { SkuDialData } from "./useSkuDial";

interface UpdateSkuDialData {
  performancePoints: number;
  inventoryPoints: number;
  profitabilityPoints: number;
  demandPoints: number;
  competitivePoints: number;
  trendPoints: number;
}

interface UseSkuDialMutationOptions {
  onSuccess?: (data: SkuDialData) => void;
  onError?: (error: Error) => void;
}

export function useSkuDialMutation(
  productId: number,
  options: UseSkuDialMutationOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updateData: UpdateSkuDialData): Promise<SkuDialData> => {
      // Validate before sending
      const validation = validateSkuDialAllocation(updateData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Get CSRF token for security
      const csrfResponse = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      const csrfData = await csrfResponse.json();

      const response = await fetch(`/api/products/${productId}/sku-dial`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Update failed: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to update SKU dial allocation");
      }

      return data.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch SKU dial data
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "sku-dial"],
      });

      // Also invalidate enhanced analytics as SKU dial affects metrics
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "analytics/enhanced"],
      });

      toast({
        title: "SKU Dial Updated",
        description: `Allocation updated successfully. Total points: ${data.totalPoints}/888`,
        variant: "default",
      });

      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error("SKU dial update error:", error);

      toast({
        title: "Update Failed",
        description: error.message || "Failed to update SKU dial allocation",
        variant: "destructive",
      });

      options.onError?.(error);
    },
  });
}

/**
 * Hook for creating initial SKU dial allocation
 */
export function useCreateSkuDialMutation(
  productId: number,
  options: UseSkuDialMutationOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (createData: UpdateSkuDialData): Promise<SkuDialData> => {
      // Validate before sending
      const validation = validateSkuDialAllocation(createData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Get CSRF token for security
      const csrfResponse = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      const csrfData = await csrfResponse.json();

      const response = await fetch(`/api/products/${productId}/sku-dial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          ...createData,
          productId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Creation failed: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to create SKU dial allocation");
      }

      return data.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch SKU dial data
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "sku-dial"],
      });

      toast({
        title: "SKU Dial Created",
        description: `Initial allocation created. Total points: ${data.totalPoints}/888`,
        variant: "default",
      });

      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error("SKU dial creation error:", error);

      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create SKU dial allocation",
        variant: "destructive",
      });

      options.onError?.(error);
    },
  });
}

/**
 * Hook for resetting SKU dial to default values
 */
export function useResetSkuDialMutation(
  productId: number,
  options: UseSkuDialMutationOptions = {},
) {
  const updateMutation = useSkuDialMutation(productId, options);

  return {
    ...updateMutation,
    mutateAsync: () => {
      // Default balanced allocation
      const defaultAllocation: UpdateSkuDialData = {
        performancePoints: 150, // 75% of max (200)
        inventoryPoints: 112, // 75% of max (150)
        profitabilityPoints: 150, // 75% of max (200)
        demandPoints: 103, // 75% of max (138)
        competitivePoints: 75, // 75% of max (100)
        trendPoints: 75, // 75% of max (100)
        // Total: 665 points (leaving 223 for adjustments)
      };

      return updateMutation.mutateAsync(defaultAllocation);
    },
  };
}
