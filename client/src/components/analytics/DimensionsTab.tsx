import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";

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

  // Fetch product analytics data
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery<ProductAnalytics[]>({
    queryKey: ["/api/products", productId, "analytics"],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/analytics?period=monthly&limit=12`,
      ),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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

  // Get latest analytics data for current period
  const latestData = analytics?.[0] || null;
  const isLoading = analyticsLoading || summaryLoading;

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

  if (!latestData) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No Analytics Data</p>
          <p className="text-sm mb-4">
            No analytics data is available for this product yet.
          </p>
          <p className="text-xs">
            Data collection may take 24-48 hours after product publication.
          </p>
        </div>
      </div>
    );
  }

  // Calculate performance indicators
  const getBuyRateStatus = (current: number, expected: number) => {
    const ratio = current / Math.max(expected, 0.001);
    if (ratio >= 1.2)
      return {
        status: "excellent",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      };
    if (ratio >= 1.0)
      return { status: "good", color: "text-green-600", bg: "bg-green-50" };
    if (ratio >= 0.8)
      return { status: "fair", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { status: "poor", color: "text-red-600", bg: "bg-red-50" };
  };

  const buyRateStatus = getBuyRateStatus(
    latestData.buyRate,
    latestData.expectedBuyRate,
  );

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

      {/* Key Performance Indicators */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`$${(summary.totalRevenue / 100).toLocaleString()}`}
            change={summary.trendsAnalysis.revenueGrowth}
            trend={summary.trendsAnalysis.revenueGrowth >= 0 ? "up" : "down"}
          />
          <MetricCard
            title="Avg Buy Rate"
            value={`${(summary.avgBuyRate * 100).toFixed(1)}%`}
            change={summary.trendsAnalysis.buyRateChange}
            trend={summary.trendsAnalysis.buyRateChange >= 0 ? "up" : "down"}
          />
          <MetricCard
            title="Avg Margin"
            value={`${summary.avgMarginPercent.toFixed(1)}%`}
            change={summary.trendsAnalysis.marginChange}
            trend={summary.trendsAnalysis.marginChange >= 0 ? "up" : "down"}
          />
          <MetricCard
            title="Total Sessions"
            value={summary.totalSessions.toLocaleString()}
            change={summary.trendsAnalysis.trafficChange}
            trend={summary.trendsAnalysis.trafficChange >= 0 ? "up" : "down"}
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
              <Badge
                variant="secondary"
                className={`${buyRateStatus.color} ${buyRateStatus.bg}`}
              >
                {buyRateStatus.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.buyRate * 100}
              max={100}
              title="Current Buy Rate"
              subtitle={`Target: ${(latestData.expectedBuyRate * 100).toFixed(1)}%`}
              color="#8b5cf6"
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
            <CardTitle className="text-lg">Revenue & Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.marginPercent}
              max={100}
              title="Profit Margin"
              subtitle={`Revenue: $${(latestData.revenue / 100).toLocaleString()}`}
              color="#10b981"
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
            <CardTitle className="text-lg">Volume & Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.volume}
              max={Math.max(latestData.volume * 1.5, 100)}
              title="Units Sold"
              subtitle={`Reorder Rate: ${(latestData.reorderRate * 100).toFixed(1)}%`}
              color="#f59e0b"
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

        {/* Traffic Analytics */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Traffic Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.uniqueVisitors}
              max={Math.max(latestData.uniqueVisitors * 1.5, 100)}
              title="Unique Visitors"
              subtitle={`${latestData.trafficSessions.toLocaleString()} sessions`}
              color="#3b82f6"
            />
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sessions:</span>
                <span className="font-medium">
                  {latestData.trafficSessions.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Page Views:</span>
                <span className="font-medium">
                  {latestData.pageViews.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Metrics */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Conversion Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={latestData.conversionRate * 100}
              max={20}
              title="Conversion Rate"
              subtitle={`Cart Abandonment: ${(latestData.cartAbandonmentRate * 100).toFixed(1)}%`}
              color="#ec4899"
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
            <CardTitle className="text-lg">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <GaugeChart
              value={(1 - latestData.returnRate) * 100}
              max={100}
              title="Satisfaction Score"
              subtitle={`Return Rate: ${(latestData.returnRate * 100).toFixed(1)}%`}
              color="#06b6d4"
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

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(latestData.rebuyRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Rebuy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(latestData.avgSessionDuration / 60)}m
              </div>
              <div className="text-sm text-muted-foreground">Avg Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {(latestData.bounceRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Bounce Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(latestData.pageViews / latestData.trafficSessions).toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Pages/Session</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated:{" "}
        {format(new Date(latestData.calculatedAt), "MMM d, yyyy 'at' h:mm a")}
      </div>
    </div>
  );
}
