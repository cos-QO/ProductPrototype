import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PerformanceBadge,
  usePerformanceStatus,
} from "@/components/ui/performance-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { GaugeChart } from "./GaugeChart";
import { MetricCard } from "./MetricCard";
import { TrafficChart } from "./TrafficChart";
import { format } from "date-fns";
import { getMetricColor } from "@/lib/chart-colors";
import {
  calculatePerformanceScores,
  formatScore,
} from "@/lib/performance-scores";

interface DimensionsTabProps {
  productId: number | null;
}

interface ProductAnalytics {
  buyRate: number;
  expectedBuyRate: number;
  returnRate: number;
  rebuyRate: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  reorderRate: number;
  reviewRate: number;
  revenue: number;
  marginPercent: number;
  volume: number;
  trafficSessions: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  periodStart: string;
  periodEnd: string;
  calculatedAt: string;
}

interface AnalyticsSummary {
  totalRevenue: number;
  avgBuyRate: number;
  avgMarginPercent: number;
  totalVolume: number;
  totalSessions: number;
  trendsAnalysis: {
    revenueGrowth: number;
    buyRateChange: number;
    marginChange: number;
    trafficChange: number;
  };
}

export function DimensionsTab({ productId }: DimensionsTabProps) {
  const [timeframe, setTimeframe] = useState("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch product analytics data with timeframe
  const {
    data: analyticsResponse,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery<{
    data: ProductAnalytics[];
    success: boolean;
    meta?: { calculatedAt?: string };
  }>({
    queryKey: ["/api/products", productId, "analytics", timeframe],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/analytics?period=monthly&limit=12&timeframe=${timeframe}`,
      ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract the data array from the response
  const analytics = analyticsResponse?.data || [];

  // Fetch analytics summary
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/products", productId, "analytics", "summary"],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/analytics/summary?timeframe=${timeframe}`,
      ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get latest analytics data for current period - always use data even if zero
  // Convert string values to numbers where needed
  const rawData = analytics?.[0];
  const latestData = rawData
    ? {
        ...rawData,
        buyRate: parseFloat(String(rawData.buyRate)) || 0,
        expectedBuyRate: parseFloat(String(rawData.expectedBuyRate)) || 0.05,
        returnRate: parseFloat(String(rawData.returnRate)) || 0,
        rebuyRate: parseFloat(String(rawData.rebuyRate)) || 0,
        conversionRate: parseFloat(String(rawData.conversionRate)) || 0,
        cartAbandonmentRate:
          parseFloat(String(rawData.cartAbandonmentRate)) || 0,
        reorderRate: parseFloat(String(rawData.reorderRate)) || 0,
        reviewRate: parseFloat(String(rawData.reviewRate)) || 0,
        revenue: parseInt(String(rawData.revenue)) || 0,
        marginPercent: parseFloat(String((rawData as any).margin)) || 0, // margin is stored as decimal
        margin: parseFloat(String((rawData as any).margin)) || 0,
        volume: parseInt(String(rawData.volume)) || 0,
        trafficSessions: parseInt(String(rawData.trafficSessions)) || 0,
        pageViews: parseInt(String(rawData.pageViews)) || 0,
        uniqueVisitors: parseInt(String(rawData.uniqueVisitors)) || 0,
        bounceRate: parseFloat(String(rawData.bounceRate)) || 0,
        avgSessionDuration: parseInt(String(rawData.avgSessionDuration)) || 0,
        trafficAds: parseInt(String((rawData as any).trafficAds)) || 0,
        trafficEmails: parseInt(String((rawData as any).trafficEmails)) || 0,
        trafficText: parseInt(String((rawData as any).trafficText)) || 0,
        trafficStore: parseInt(String((rawData as any).trafficStore)) || 0,
        trafficOrganic: parseInt(String((rawData as any).trafficOrganic)) || 0,
        trafficSocial: parseInt(String((rawData as any).trafficSocial)) || 0,
        trafficDirect: parseInt(String((rawData as any).trafficDirect)) || 0,
        trafficReferral:
          parseInt(String((rawData as any).trafficReferral)) || 0,
      }
    : {
        buyRate: 0,
        expectedBuyRate: 0.05,
        returnRate: 0,
        rebuyRate: 0,
        conversionRate: 0,
        cartAbandonmentRate: 0,
        reorderRate: 0,
        reviewRate: 0,
        revenue: 0,
        marginPercent: 0,
        margin: 0,
        volume: 0,
        trafficSessions: 0,
        pageViews: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        trafficAds: 0,
        trafficEmails: 0,
        trafficText: 0,
        trafficStore: 0,
        trafficOrganic: 0,
        trafficSocial: 0,
        trafficDirect: 0,
        trafficReferral: 0,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        calculatedAt: new Date().toISOString(),
      };
  const isLoading = analyticsLoading || summaryLoading;

  // CRITICAL: All usePerformanceStatus hooks MUST be called before any conditional returns
  // Performance status calculations using the new hook - MOVED TO TOP LEVEL
  const buyRateStatus = usePerformanceStatus(
    "buyRate",
    latestData.buyRate,
    false,
    latestData.buyRate * 100,
    100,
  );
  const returnRateStatus = usePerformanceStatus(
    "returnRate",
    latestData.returnRate,
    true,
    (1 - latestData.returnRate) * 100,
    100,
  );
  const rebuyRateStatus = usePerformanceStatus(
    "rebuyRate",
    latestData.rebuyRate,
    false,
    latestData.rebuyRate * 100,
    100,
  );
  const conversionRateStatus = usePerformanceStatus(
    "conversionRate",
    latestData.conversionRate,
    false,
    latestData.conversionRate * 100,
    20,
  );
  const marginStatus = usePerformanceStatus(
    "marginPercent",
    latestData.marginPercent,
    false,
    latestData.marginPercent,
    100,
  );
  const reorderRateStatus = usePerformanceStatus(
    "reorderRate",
    latestData.reorderRate,
    false,
    latestData.volume,
    Math.max(latestData.volume * 1.5, 100),
  );
  const cartAbandonmentStatus = usePerformanceStatus(
    "cartAbandonmentRate",
    latestData.cartAbandonmentRate,
    true,
  );
  const reviewRateStatus = usePerformanceStatus(
    "reviewRate",
    latestData.reviewRate,
  );

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchAnalytics(), refetchSummary()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    // Summary query will automatically refetch due to dependency on timeframe
  };

  if (!productId) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">Analytics Unavailable</p>
          <p className="text-sm">
            Analytics are only available for existing products.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // All usePerformanceStatus hooks have been moved to the top level to fix hooks ordering issue

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">
            Data from {format(new Date(latestData.periodStart), "MMM d")} -{" "}
            {format(new Date(latestData.periodEnd), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Insights - Moved to TOP */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // Calculate performance scores using the utility function
            const scores = calculatePerformanceScores({
              rebuyRate: latestData.rebuyRate,
              avgSessionDuration: latestData.avgSessionDuration,
              bounceRate: latestData.bounceRate,
              pageViews: latestData.pageViews,
              trafficSessions: latestData.trafficSessions,
            });

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: getMetricColor("rebuy-rate") }}
                  >
                    {formatScore(scores.rebuyRate.score)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Rebuy Rate
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: 1-88,888 ({scores.rebuyRate.originalValue})
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: getMetricColor("satisfaction") }}
                  >
                    {formatScore(scores.avgSession.score)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Session
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: 1-88,888 ({scores.avgSession.originalValue})
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: getMetricColor("bounce-rate") }}
                  >
                    {formatScore(scores.bounceRate.score)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Bounce Rate
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: 1-88,888 ({scores.bounceRate.originalValue})
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: getMetricColor("engagement") }}
                  >
                    {formatScore(scores.pagesPerSession.score)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pages/Session
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: 1-88,888 ({scores.pagesPerSession.originalValue})
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      {summary && summary.trendsAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`$${((summary.totalRevenue || 0) / 100).toLocaleString()}`}
            change={summary.trendsAnalysis?.revenueGrowth || 0}
            trend={
              (summary.trendsAnalysis?.revenueGrowth || 0) >= 0 ? "up" : "down"
            }
          />
          <MetricCard
            title="Avg Buy Rate"
            value={`${((summary.avgBuyRate || 0) * 100).toFixed(1)}%`}
            change={summary.trendsAnalysis?.buyRateChange || 0}
            trend={
              (summary.trendsAnalysis?.buyRateChange || 0) >= 0 ? "up" : "down"
            }
          />
          <MetricCard
            title="Avg Margin"
            value={`${(summary.avgMarginPercent || 0).toFixed(1)}%`}
            change={summary.trendsAnalysis?.marginChange || 0}
            trend={
              (summary.trendsAnalysis?.marginChange || 0) >= 0 ? "up" : "down"
            }
          />
          <MetricCard
            title="Total Sessions"
            value={(summary.totalSessions || 0).toLocaleString()}
            change={summary.trendsAnalysis?.trafficChange || 0}
            trend={
              (summary.trendsAnalysis?.trafficChange || 0) >= 0 ? "up" : "down"
            }
          />
        </div>
      )}

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Buy Rate Performance */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Buy Rate Performance</CardTitle>
              {buyRateStatus && (
                <PerformanceBadge level={buyRateStatus.level}>
                  {buyRateStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.buyRate * 100}
              max={100}
              title="Current Buy Rate"
              subtitle={`Target: ${(latestData.expectedBuyRate * 100).toFixed(1)}%`}
              color={getMetricColor("buy-rate")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Rate:</span>
                <span className="font-medium">
                  {(latestData.buyRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Rate:</span>
                <span className="font-medium">
                  {(latestData.expectedBuyRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Margin */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Revenue & Margin</CardTitle>
              {marginStatus && (
                <PerformanceBadge level={marginStatus.level}>
                  {marginStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.marginPercent}
              max={100}
              title="Profit Margin"
              subtitle={`Revenue: $${(latestData.revenue / 100).toLocaleString()}`}
              color={getMetricColor("revenue-margin")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue:</span>
                <span className="font-medium">
                  ${(latestData.revenue / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin:</span>
                <span className="font-medium">
                  {latestData.marginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volume & Movement */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Volume & Movement</CardTitle>
              {reorderRateStatus && (
                <PerformanceBadge level={reorderRateStatus.level}>
                  {reorderRateStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.volume}
              max={Math.max(latestData.volume * 1.5, 100)}
              title="Units Sold"
              subtitle={`Reorder Rate: ${(latestData.reorderRate * 100).toFixed(1)}%`}
              color={getMetricColor("volume")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Units Sold:</span>
                <span className="font-medium">
                  {latestData.volume.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reorder Rate:</span>
                <span className="font-medium">
                  {(latestData.reorderRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return & Rebuy Rates */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Return & Rebuy Rates</CardTitle>
              {rebuyRateStatus && (
                <PerformanceBadge level={rebuyRateStatus.level}>
                  {rebuyRateStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.rebuyRate * 100}
              max={100}
              title="Rebuy Rate"
              subtitle={`Return Rate: ${(latestData.returnRate * 100).toFixed(1)}%`}
              color={getMetricColor("rebuy-rate")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Rate:</span>
                <span className="font-medium">
                  {(latestData.returnRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rebuy Rate:</span>
                <span className="font-medium">
                  {(latestData.rebuyRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Metrics */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversion Metrics</CardTitle>
              {conversionRateStatus && (
                <PerformanceBadge level={conversionRateStatus.level}>
                  {conversionRateStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.conversionRate * 100}
              max={20}
              title="Conversion Rate"
              subtitle={`Cart Abandonment: ${(latestData.cartAbandonmentRate * 100).toFixed(1)}%`}
              color={getMetricColor("conversion")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversion:</span>
                <span className="font-medium">
                  {(latestData.conversionRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cart Abandonment:</span>
                <span className="font-medium">
                  {(latestData.cartAbandonmentRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Customer Satisfaction</CardTitle>
              {returnRateStatus && (
                <PerformanceBadge level={returnRateStatus.level}>
                  {returnRateStatus.status}
                </PerformanceBadge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={(1 - latestData.returnRate) * 100}
              max={100}
              title="Satisfaction Score"
              subtitle={`Return Rate: ${(latestData.returnRate * 100).toFixed(1)}%`}
              color={getMetricColor("satisfaction")}
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Rate:</span>
                <span className="font-medium">
                  {(latestData.returnRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Review Rate:</span>
                <span className="font-medium">
                  {(latestData.reviewRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Traffic Sources Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Where are your visitors coming from?
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <TrafficChart
                trafficAds={latestData.trafficAds || 0}
                trafficEmails={latestData.trafficEmails || 0}
                trafficText={latestData.trafficText || 0}
                trafficStore={latestData.trafficStore || 0}
                trafficOrganic={latestData.trafficOrganic || 0}
                trafficSocial={latestData.trafficSocial || 0}
                trafficDirect={latestData.trafficDirect || 0}
                trafficReferral={latestData.trafficReferral || 0}
                variant="doughnut"
                showLegend={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expected Buy Rate Comparison */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Expected vs Actual Buy Rate</CardTitle>
            <p className="text-sm text-muted-foreground">
              Performance against expectations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Actual Buy Rate</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getMetricColor("buy-rate") }}
                  >
                    {(latestData.buyRate * 100).toFixed(1)}%
                  </span>
                </div>
                <GaugeChart
                  value={latestData.buyRate * 100}
                  max={Math.max(latestData.expectedBuyRate * 200, 10)}
                  title=""
                  color={getMetricColor("buy-rate")}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Expected Buy Rate</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getMetricColor("volume") }}
                  >
                    {(latestData.expectedBuyRate * 100).toFixed(1)}%
                  </span>
                </div>
                <GaugeChart
                  value={latestData.expectedBuyRate * 100}
                  max={Math.max(latestData.expectedBuyRate * 200, 10)}
                  title=""
                  color={getMetricColor("volume")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated:{" "}
        {(() => {
          try {
            const calculatedAt =
              analyticsResponse?.meta?.calculatedAt || latestData.calculatedAt;
            if (!calculatedAt) {
              return "Never";
            }
            const date = new Date(calculatedAt);
            if (isNaN(date.getTime())) {
              return "Invalid date";
            }
            return format(date, "MMM d, yyyy 'at' h:mm a");
          } catch (error) {
            console.error("Error formatting date:", error);
            return "Unknown";
          }
        })()}
      </div>
    </div>
  );
}
