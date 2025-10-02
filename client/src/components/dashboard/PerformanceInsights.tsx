/**
 * planID: PLAN-20251002-PHASES-5-6-FRONTEND
 * Phase: 5.2 (Performance Insights Section)
 * Performance Insights Component with Enhanced Metrics
 * Created: 2025-10-02T16:45:00Z
 * Agent: developer
 */

import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RotateCcw,
  Target,
  Clock,
} from "lucide-react";
import {
  useEnhancedAnalytics,
  useAnalyticsSummary,
} from "@/hooks/useEnhancedAnalytics";
import { cn } from "@/lib/utils";

interface PerformanceInsightsProps {
  productId?: number;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  error?: boolean;
  formatAsPercentage?: boolean;
  invertTrend?: boolean; // For metrics where lower is better (like return rate)
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  loading = false,
  error = false,
  formatAsPercentage = false,
  invertTrend = false,
}: MetricCardProps) {
  const hasPositiveTrend = change
    ? invertTrend
      ? change < 0
      : change > 0
    : null;

  const formattedValue = loading
    ? "..."
    : error
      ? "Error"
      : formatAsPercentage && typeof value === "number"
        ? `${value.toFixed(1)}%`
        : value;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="text-primary h-5 w-5" />
          </div>
          {change !== undefined && !loading && !error && (
            <div className="flex items-center space-x-1">
              {hasPositiveTrend ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={cn(
                  "text-sm",
                  hasPositiveTrend ? "text-success" : "text-destructive",
                )}
              >
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <h3
          className="text-2xl font-bold text-foreground mb-1"
          data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {loading ? (
            <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
          ) : error ? (
            <span className="text-destructive text-sm">Error</span>
          ) : (
            formattedValue
          )}
        </h3>
        <p className="text-muted-foreground text-sm">{title}</p>
      </CardContent>
    </Card>
  );
}

export function PerformanceInsights({
  productId,
  className,
}: PerformanceInsightsProps) {
  // Use mock data for demonstration since we need a product ID for real data
  const demoProductId = productId || 1;

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAnalyticsSummary(demoProductId, { timeframe: "30d" });

  const {
    data: enhancedData,
    isLoading: enhancedLoading,
    error: enhancedError,
  } = useEnhancedAnalytics(demoProductId, { timeframe: "30d" });

  // Calculate metrics from data or use mock data for demonstration
  const contributionMargin = enhancedData?.contributionMargin ?? 32.5;
  const returnRate = enhancedData?.returnRate ?? 2.8;
  const rebuyRate = enhancedData?.rebuyRate ?? 76;
  const processingTime = analyticsData?.avgProcessingTime ?? 4.2; // Hours

  // Calculate trend changes (mock data for now)
  const contributionMarginChange = 8.3; // +8.3% from last period
  const returnRateChange = -12.5; // -12.5% from last period (improvement)
  const rebuyRateChange = 15.2; // +15.2% from last period
  const processingTimeChange = -23.1; // -23.1% from last period (improvement)

  const isLoading = analyticsLoading || enhancedLoading;
  const hasError = !!analyticsError || !!enhancedError;

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",
        className,
      )}
      data-testid="performance-insights-grid"
    >
      <MetricCard
        title="Contribution Margin"
        value={contributionMargin}
        change={contributionMarginChange}
        icon={DollarSign}
        loading={isLoading}
        error={hasError}
        formatAsPercentage={true}
      />

      <MetricCard
        title="Return Rate"
        value={returnRate}
        change={returnRateChange}
        icon={RotateCcw}
        loading={isLoading}
        error={hasError}
        formatAsPercentage={true}
        invertTrend={true} // Lower return rate is better
      />

      <MetricCard
        title="Rebuy Rate"
        value={rebuyRate}
        change={rebuyRateChange}
        icon={Target}
        loading={isLoading}
        error={hasError}
        formatAsPercentage={false} // Score system (0-100)
      />

      <MetricCard
        title="Processing Time"
        value={`${processingTime}h`}
        change={processingTimeChange}
        icon={Clock}
        loading={isLoading}
        error={hasError}
        formatAsPercentage={false}
        invertTrend={true} // Lower processing time is better
      />
    </div>
  );
}

export default PerformanceInsights;
