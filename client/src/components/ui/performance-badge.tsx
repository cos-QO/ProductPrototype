import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PerformanceLevel =
  | "excellent"
  | "very-good"
  | "good"
  | "fair"
  | "needs-attention";

interface PerformanceBadgeProps {
  level: PerformanceLevel;
  children: React.ReactNode;
  className?: string;
}

/**
 * Performance badge component that uses design system tokens
 * Maps performance levels to consistent colors and styling
 */
export function PerformanceBadge({
  level,
  children,
  className,
}: PerformanceBadgeProps) {
  const getPerformanceStyles = (level: PerformanceLevel) => {
    const styles = {
      excellent: {
        color: "hsl(var(--performance-excellent-foreground))",
        backgroundColor: "hsl(var(--performance-excellent-bg))",
        borderColor: "hsl(var(--performance-excellent))",
      },
      "very-good": {
        color: "hsl(var(--performance-very-good-foreground))",
        backgroundColor: "hsl(var(--performance-very-good-bg))",
        borderColor: "hsl(var(--performance-very-good))",
      },
      good: {
        color: "hsl(var(--performance-good-foreground))",
        backgroundColor: "hsl(var(--performance-good-bg))",
        borderColor: "hsl(var(--performance-good))",
      },
      fair: {
        color: "hsl(var(--performance-fair-foreground))",
        backgroundColor: "hsl(var(--performance-fair-bg))",
        borderColor: "hsl(var(--performance-fair))",
      },
      "needs-attention": {
        color: "hsl(var(--performance-needs-attention-foreground))",
        backgroundColor: "hsl(var(--performance-needs-attention-bg))",
        borderColor: "hsl(var(--performance-needs-attention))",
      },
    };

    return styles[level];
  };

  const performanceStyles = getPerformanceStyles(level);

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium text-xs px-2 py-1", className)}
      style={performanceStyles}
    >
      {children}
    </Badge>
  );
}

/**
 * Hook to calculate performance level and status from metric values
 * Used by analytics components to determine appropriate badge level
 */
export function usePerformanceStatus(
  metric: string,
  value: number,
  isInverse: boolean = false,
  gaugeValue?: number,
  gaugeMax?: number,
) {
  // Performance thresholds for different metrics
  const PERFORMANCE_THRESHOLDS = {
    buyRate: { excellent: 0.1, good: 0.07, fair: 0.04, poor: 0 },
    returnRate: { excellent: 0.02, good: 0.05, fair: 0.1, poor: 0.15 },
    rebuyRate: { excellent: 0.3, good: 0.2, fair: 0.1, poor: 0 },
    conversionRate: { excellent: 0.05, good: 0.03, fair: 0.02, poor: 0 },
    marginPercent: { excellent: 40, good: 30, fair: 20, poor: 10 },
    reviewRate: { excellent: 0.2, good: 0.1, fair: 0.05, poor: 0 },
    reorderRate: { excellent: 0.25, good: 0.15, fair: 0.08, poor: 0 },
    cartAbandonmentRate: { excellent: 0.2, good: 0.3, fair: 0.4, poor: 0.5 },
  } as const;

  return React.useMemo(() => {
    // Calculate percentage for performance evaluation
    let percentage: number;

    if (gaugeValue !== undefined && gaugeMax !== undefined) {
      // Use actual gauge position percentage
      percentage = Math.max(0, Math.min(100, (gaugeValue / gaugeMax) * 100));
    } else {
      // Fallback to threshold-based calculation
      const thresholds =
        PERFORMANCE_THRESHOLDS[metric as keyof typeof PERFORMANCE_THRESHOLDS];
      if (!thresholds) {
        // Return default values instead of null to maintain hook call order
        return {
          level: "fair" as PerformanceLevel,
          status: "Fair",
          percentage: 50,
        };
      }

      if (isInverse) {
        // For inverse metrics (lower is better)
        const range = thresholds.poor - thresholds.excellent;
        percentage =
          range > 0
            ? Math.max(
                0,
                Math.min(100, ((thresholds.poor - value) / range) * 100),
              )
            : 0;
      } else {
        // For normal metrics (higher is better)
        percentage =
          thresholds.excellent > 0
            ? Math.max(0, Math.min(100, (value / thresholds.excellent) * 100))
            : 0;
      }
    }

    // Map percentage to performance levels (5-tier system)
    let level: PerformanceLevel;
    let status: string;

    if (percentage >= 80) {
      level = "excellent";
      status = "Excellent";
    } else if (percentage >= 60) {
      level = "very-good";
      status = "Very Good";
    } else if (percentage >= 40) {
      level = "good";
      status = "Good";
    } else if (percentage >= 20) {
      level = "fair";
      status = "Fair";
    } else {
      level = "needs-attention";
      status = "Needs Attention";
    }

    return {
      level,
      status,
      percentage: Math.round(percentage),
    };
  }, [metric, value, isInverse, gaugeValue, gaugeMax]);
}
