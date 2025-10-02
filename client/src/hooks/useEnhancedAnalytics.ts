/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 5.1 (API Hooks Creation)
 * Enhanced Analytics Hook for Performance Insights
 * Created: 2025-10-02T16:30:00Z
 * Agent: developer
 */

import { useQuery } from "@tanstack/react-query";
import type { ProductAnalytics } from "@shared/schema";

interface EnhancedAnalyticsData {
  // Core metrics
  contributionMargin: number; // Percentage (0-100)
  returnRate: number; // Percentage (0-100)
  rebuyRate: number; // Score (0-100)

  // Raw analytics data
  analytics: ProductAnalytics[];

  // Calculated values
  totalRevenue: number; // In cents
  totalUnits: number;
  averageMargin: number; // Percentage

  // Metadata
  lastUpdated: string;
  dataQuality: "high" | "medium" | "low";
}

interface UseEnhancedAnalyticsOptions {
  timeframe?: "7d" | "30d" | "90d";
  refetchInterval?: number;
}

export function useEnhancedAnalytics(
  productId: number,
  options: UseEnhancedAnalyticsOptions = {},
) {
  const { timeframe = "30d", refetchInterval = 60 * 1000 } = options;

  return useQuery({
    queryKey: ["/api/products", productId, "analytics/enhanced", timeframe],
    queryFn: async (): Promise<EnhancedAnalyticsData> => {
      const response = await fetch(
        `/api/products/${productId}/analytics/enhanced?timeframe=${timeframe}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch enhanced analytics: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch enhanced analytics");
      }

      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refetchInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!productId && productId > 0,
  });
}

/**
 * Hook for quick metrics summary (for dashboard widgets)
 */
export function useAnalyticsSummary(
  productId: number,
  options: UseEnhancedAnalyticsOptions = {},
) {
  const { timeframe = "30d" } = options;

  return useQuery({
    queryKey: ["/api/products", productId, "analytics/summary", timeframe],
    queryFn: async () => {
      const response = await fetch(
        `/api/products/${productId}/analytics/summary?timeframe=${timeframe}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics summary: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch analytics summary");
      }

      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    enabled: !!productId && productId > 0,
  });
}
