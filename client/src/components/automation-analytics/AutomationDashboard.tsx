/**
 * Automation Analytics Dashboard
 * Real-time monitoring and analytics for automation systems
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { MetricsOverview } from "./MetricsOverview";
import { CostAnalysis } from "./CostAnalysis";
import { PerformanceTrends } from "./PerformanceTrends";
import { AutomationProgress } from "./AutomationProgress";
import { SystemHealth } from "./SystemHealth";
import { RealtimeMetrics } from "./RealtimeMetrics";
import { BusinessImpact } from "./BusinessImpact";
import { OptimizationRecommendations } from "./OptimizationRecommendations";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { useAutomationMetrics } from "@/hooks/useAutomationMetrics";
import { useWebSocket } from "@/hooks/useWebSocket";

interface AutomationDashboardProps {
  viewMode?: "executive" | "technical" | "operational";
  refreshInterval?: number;
}

export function AutomationDashboard({
  viewMode = "technical",
  refreshInterval = 30000,
}: AutomationDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "1h" | "24h" | "7d" | "30d"
  >("24h");
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const {
    metrics,
    businessImpact,
    trends,
    costBreakdown,
    recommendations,
    executiveSummary,
    isLoading,
    error,
    refetch,
  } = useAutomationMetrics(selectedTimeRange, refreshInterval);

  // WebSocket for real-time updates with required parameters
  const { isConnected, lastMessage } = useWebSocket(
    "/ws?sessionId=automation-dashboard&userId=local-dev-user",
  );

  useEffect(() => {
    if (lastMessage?.type === "automation-metrics-update" && isLiveMode) {
      setLastUpdate(new Date());
      refetch();
    }
  }, [lastMessage, isLiveMode, refetch]);

  const handleTimeRangeChange = useCallback(
    (range: "1h" | "24h" | "7d" | "30d") => {
      setSelectedTimeRange(range);
      setLastUpdate(new Date());
    },
    [],
  );

  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(!isLiveMode);
  }, [isLiveMode]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Analytics Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Failed to load automation analytics.
            </p>
            <Button onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automation Analytics</h1>
          <p className="text-gray-600">
            Real-time monitoring and insights for automated systems
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Mode Toggle */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected && isLiveMode ? "bg-green-500" : "bg-gray-400"}`}
            />
            <span className="text-sm text-gray-600">
              {isLiveMode ? "Live" : "Static"}
            </span>
            <Button variant="outline" size="sm" onClick={toggleLiveMode}>
              {isLiveMode ? "Pause" : "Resume"}
            </Button>
          </div>

          {/* Time Range Selector */}
          <div className="flex rounded-lg border bg-gray-50">
            {(["1h", "24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTimeRange === range
                    ? "bg-white shadow-sm font-medium"
                    : "hover:bg-gray-100"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {!isLoading && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Automation Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.automationRate.current}%
                    </p>
                    <Badge
                      variant={
                        metrics.automationRate.trend === "increasing"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {metrics.automationRate.trend === "increasing" ? "+" : ""}
                      {metrics.automationRate.weekOverWeek}%
                    </Badge>
                  </div>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Cost Savings
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${metrics.costEfficiency.savings.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {metrics.costEfficiency.roi.toFixed(1)}% ROI
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Time Saved
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.timeSavings.savedHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-gray-500">
                    {metrics.timeSavings.productivity.toFixed(0)}% efficiency
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Quality Score
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.errorReduction.qualityScore.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {metrics.errorReduction.errorReduction > 0 ? "+" : ""}
                    {metrics.errorReduction.errorReduction.toFixed(1)}%
                    reduction
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    System Health
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.systemHealth.uptime.toFixed(1)}%
                    </p>
                    <Badge
                      variant={
                        metrics.systemHealth.status === "healthy"
                          ? "default"
                          : metrics.systemHealth.status === "warning"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {metrics.systemHealth.status}
                    </Badge>
                  </div>
                </div>
                <Activity className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs
        defaultValue={viewMode === "executive" ? "summary" : "overview"}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
          <TabsTrigger value="recommendations">Optimize</TabsTrigger>
          <TabsTrigger value="summary">Executive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics && (
              <>
                <MetricsOverview metrics={metrics} isLoading={isLoading} />
                <AutomationProgress
                  automationRate={metrics.automationRate}
                  target={67}
                  isLoading={isLoading}
                />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealth
              systemHealth={metrics?.systemHealth}
              isLoading={isLoading}
            />
            <RealtimeMetrics
              metrics={metrics}
              isConnected={isConnected}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceTrends
            trends={trends}
            metrics={metrics}
            timeRange={selectedTimeRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <CostAnalysis
            costBreakdown={costBreakdown}
            costEfficiency={metrics?.costEfficiency}
            trends={trends}
            timeRange={selectedTimeRange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <BusinessImpact
            businessImpact={businessImpact}
            metrics={metrics}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <OptimizationRecommendations
            recommendations={recommendations}
            metrics={metrics}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <ExecutiveSummary
            summary={executiveSummary}
            metrics={metrics}
            businessImpact={businessImpact}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
