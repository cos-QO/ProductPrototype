/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 5.1 (API Hooks Creation)
 * SKU Dial Hook for Performance Insights
 * Created: 2025-10-02T16:35:00Z
 * Agent: developer
 */

import { useQuery } from "@tanstack/react-query";
import type { SkuDialAllocation } from "@shared/schema";

interface SkuDialData {
  id: string;
  productId: number;

  // 888-point allocation system
  performancePoints: number; // 0-200
  inventoryPoints: number; // 0-150
  profitabilityPoints: number; // 0-200
  demandPoints: number; // 0-138
  competitivePoints: number; // 0-100
  trendPoints: number; // 0-100

  // Calculated values
  totalPoints: number; // Sum of all categories (max 888)
  remainingPoints: number; // 888 - totalPoints
  efficiencyRating: number; // Calculated by backend

  // Metadata
  lastUpdated: string;
  updatedBy: string;
}

interface CategoryConstraints {
  performance: { min: 0; max: 200; current: number };
  inventory: { min: 0; max: 150; current: number };
  profitability: { min: 0; max: 200; current: number };
  demand: { min: 0; max: 138; current: number };
  competitive: { min: 0; max: 100; current: number };
  trend: { min: 0; max: 100; current: number };
}

export function useSkuDial(productId: number) {
  return useQuery({
    queryKey: ["/api/products", productId, "sku-dial"],
    queryFn: async (): Promise<SkuDialData> => {
      const response = await fetch(`/api/products/${productId}/sku-dial`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SKU dial: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch SKU dial");
      }

      // Transform API response to match our interface
      const allocation = data.data;
      return {
        id: allocation.id,
        productId: allocation.productId,
        performancePoints: allocation.performancePoints || 0,
        inventoryPoints: allocation.inventoryPoints || 0,
        profitabilityPoints: allocation.profitabilityPoints || 0,
        demandPoints: allocation.demandPoints || 0,
        competitivePoints: allocation.competitivePoints || 0,
        trendPoints: allocation.trendPoints || 0,
        totalPoints: allocation.totalPoints || 0,
        remainingPoints: 888 - (allocation.totalPoints || 0),
        efficiencyRating: allocation.efficiencyRating || 0,
        lastUpdated: allocation.updatedAt || allocation.createdAt,
        updatedBy: allocation.updatedBy || "system",
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes (less frequent than analytics)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!productId && productId > 0,
  });
}

/**
 * Hook to get category constraints for validation
 */
export function useSkuDialConstraints(
  allocation?: SkuDialData,
): CategoryConstraints {
  if (!allocation) {
    return {
      performance: { min: 0, max: 200, current: 0 },
      inventory: { min: 0, max: 150, current: 0 },
      profitability: { min: 0, max: 200, current: 0 },
      demand: { min: 0, max: 138, current: 0 },
      competitive: { min: 0, max: 100, current: 0 },
      trend: { min: 0, max: 100, current: 0 },
    };
  }

  return {
    performance: { min: 0, max: 200, current: allocation.performancePoints },
    inventory: { min: 0, max: 150, current: allocation.inventoryPoints },
    profitability: {
      min: 0,
      max: 200,
      current: allocation.profitabilityPoints,
    },
    demand: { min: 0, max: 138, current: allocation.demandPoints },
    competitive: { min: 0, max: 100, current: allocation.competitivePoints },
    trend: { min: 0, max: 100, current: allocation.trendPoints },
  };
}

/**
 * Utility function to validate SKU dial allocation
 */
export function validateSkuDialAllocation(allocation: Partial<SkuDialData>): {
  isValid: boolean;
  errors: string[];
  totalPoints: number;
} {
  const errors: string[] = [];

  const performancePoints = allocation.performancePoints || 0;
  const inventoryPoints = allocation.inventoryPoints || 0;
  const profitabilityPoints = allocation.profitabilityPoints || 0;
  const demandPoints = allocation.demandPoints || 0;
  const competitivePoints = allocation.competitivePoints || 0;
  const trendPoints = allocation.trendPoints || 0;

  const totalPoints =
    performancePoints +
    inventoryPoints +
    profitabilityPoints +
    demandPoints +
    competitivePoints +
    trendPoints;

  // Check individual category limits
  if (performancePoints < 0 || performancePoints > 200) {
    errors.push("Performance points must be between 0 and 200");
  }
  if (inventoryPoints < 0 || inventoryPoints > 150) {
    errors.push("Inventory points must be between 0 and 150");
  }
  if (profitabilityPoints < 0 || profitabilityPoints > 200) {
    errors.push("Profitability points must be between 0 and 200");
  }
  if (demandPoints < 0 || demandPoints > 138) {
    errors.push("Demand points must be between 0 and 138");
  }
  if (competitivePoints < 0 || competitivePoints > 100) {
    errors.push("Competitive points must be between 0 and 100");
  }
  if (trendPoints < 0 || trendPoints > 100) {
    errors.push("Trend points must be between 0 and 100");
  }

  // Check total limit
  if (totalPoints > 888) {
    errors.push(`Total points (${totalPoints}) exceeds maximum of 888`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalPoints,
  };
}
