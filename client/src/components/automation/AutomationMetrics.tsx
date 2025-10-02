import React, { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  Zap,
  Users,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";

interface MetricsData {
  automation: {
    rate: number;
    target: number;
    trend: number;
    historical: Array<{
      date: string;
      value: number;
    }>;
  };
  performance: {
    totalTests: number;
    passRate: number;
    avgExecutionTime: number;
    testsPerHour: number;
  };
  financial: {
    costSavings: number;
    roi: number;
    costPerTest: number;
    budgetUtilization: number;
  };
  productivity: {
    timeSaved: number;
    manualEffortReduced: number;
    teamProductivity: number;
    taskAutomation: number;
  };
  quality: {
    defectDetectionRate: number;
    falsePositiveRate: number;
    coverageScore: number;
    reliability: number;
  };
}

interface AutomationMetricsProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  compact?: boolean;
}

export const AutomationMetrics: React.FC<AutomationMetricsProps> = ({
  dateRange,
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState("automation");

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.from) params.append("from", dateRange.from.toISOString());
      if (dateRange?.to) params.append("to", dateRange.to.toISOString());

      // Mock data for development - replace with actual API call
      const mockData: MetricsData = {
        automation: {
          rate: 0.847,
          target: 0.8,
          trend: 0.12,
          historical: [
            { date: "2024-09-01", value: 0.72 },
            { date: "2024-09-08", value: 0.78 },
            { date: "2024-09-15", value: 0.82 },
            { date: "2024-09-22", value: 0.847 },
          ],
        },
        performance: {
          totalTests: 15847,
          passRate: 0.943,
          avgExecutionTime: 2.3,
          testsPerHour: 450,
        },
        financial: {
          costSavings: 125000,
          roi: 340,
          costPerTest: 0.85,
          budgetUtilization: 0.73,
        },
        productivity: {
          timeSaved: 2840,
          manualEffortReduced: 0.68,
          teamProductivity: 1.45,
          taskAutomation: 0.82,
        },
        quality: {
          defectDetectionRate: 0.91,
          falsePositiveRate: 0.05,
          coverageScore: 0.87,
          reliability: 0.96,
        },
      };

      setMetrics(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTrendIndicator = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUp className="h-3 w-3 mr-1" />
          <span className="text-xs">+{formatPercentage(Math.abs(value))}</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDown className="h-3 w-3 mr-1" />
          <span className="text-xs">-{formatPercentage(Math.abs(value))}</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-500">No change</span>;
  };

  const getScoreColor = (score: number, threshold = 0.8) => {
    if (score >= threshold) return "text-green-600";
    if (score >= threshold * 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const pieChartData = metrics
    ? [
        {
          name: "Automated",
          value: metrics.automation.rate * 100,
          color: "#10b981",
        },
        {
          name: "Manual",
          value: (1 - metrics.automation.rate) * 100,
          color: "#e5e7eb",
        },
      ]
    : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Error loading metrics: {error}</span>
          </div>
          <Button variant="outline" onClick={fetchMetrics} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automation Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Automation Rate
                </span>
                <Badge
                  variant={
                    metrics.automation.rate >= 0.8 ? "default" : "secondary"
                  }
                >
                  {formatPercentage(metrics.automation.rate)}
                </Badge>
              </div>
              <Progress value={metrics.automation.rate * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pass Rate</span>
                <Badge variant="default">
                  {formatPercentage(metrics.performance.passRate)}
                </Badge>
              </div>
              <Progress
                value={metrics.performance.passRate * 100}
                className="h-2"
              />
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.financial.costSavings)}
              </div>
              <div className="text-xs text-muted-foreground">Cost Savings</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatTime(metrics.productivity.timeSaved)}
              </div>
              <div className="text-xs text-muted-foreground">Time Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Automation Metrics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive performance analytics and KPI tracking
          </p>
        </div>
        <Button variant="outline" onClick={fetchMetrics}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeMetric} onValueChange={setActiveMetric}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Automation Rate
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getScoreColor(metrics.automation.rate)}`}
                >
                  {formatPercentage(metrics.automation.rate)}
                </div>
                <div className="mt-2">
                  {getTrendIndicator(metrics.automation.trend)}
                </div>
                <Progress
                  value={metrics.automation.rate * 100}
                  className="mt-3"
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Target: {formatPercentage(metrics.automation.target)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Task Coverage
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercentage(metrics.productivity.taskAutomation)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Tasks fully automated
                </div>
                <Progress
                  value={metrics.productivity.taskAutomation * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Distribution
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={85}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="#ffffff"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-4 mt-2">
                  <div className="flex items-center text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Automated
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
                    Manual
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Automation Rate Trend</CardTitle>
              <CardDescription>
                Historical automation rate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.automation.historical}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis
                      tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      domain={[0.6, 1]}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      formatter={(value: number) => [
                        formatPercentage(value),
                        "Rate",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981" }}
                    />
                    <Line
                      type="monotone"
                      dataKey={() => metrics.automation.target}
                      stroke="#6b7280"
                      strokeDasharray="5 5"
                      name="Target"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tests
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics.performance.totalTests.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Executed in period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getScoreColor(metrics.performance.passRate, 0.9)}`}
                >
                  {formatPercentage(metrics.performance.passRate)}
                </div>
                <Progress
                  value={metrics.performance.passRate * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Execution
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics.performance.avgExecutionTime}s
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Per test case
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Throughput
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics.performance.testsPerHour}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Tests per hour
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost Savings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(metrics.financial.costSavings)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Total savings achieved
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics.financial.roi}%
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Return on investment
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost per Test
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${metrics.financial.costPerTest}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Average cost efficiency
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Budget Usage
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercentage(metrics.financial.budgetUtilization)}
                </div>
                <Progress
                  value={metrics.financial.budgetUtilization * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Time Saved
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatTime(metrics.productivity.timeSaved)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Total time savings
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Manual Reduction
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  -{formatPercentage(metrics.productivity.manualEffortReduced)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Manual effort reduced
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Productivity
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  +
                  {(metrics.productivity.teamProductivity * 100 - 100).toFixed(
                    0,
                  )}
                  %
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Productivity increase
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Task Automation
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercentage(metrics.productivity.taskAutomation)}
                </div>
                <Progress
                  value={metrics.productivity.taskAutomation * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Defect Detection
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getScoreColor(metrics.quality.defectDetectionRate)}`}
                >
                  {formatPercentage(metrics.quality.defectDetectionRate)}
                </div>
                <Progress
                  value={metrics.quality.defectDetectionRate * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  False Positive Rate
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${metrics.quality.falsePositiveRate <= 0.1 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatPercentage(metrics.quality.falsePositiveRate)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Target: ≤10%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Coverage Score
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getScoreColor(metrics.quality.coverageScore)}`}
                >
                  {formatPercentage(metrics.quality.coverageScore)}
                </div>
                <Progress
                  value={metrics.quality.coverageScore * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reliability
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${getScoreColor(metrics.quality.reliability, 0.95)}`}
                >
                  {formatPercentage(metrics.quality.reliability)}
                </div>
                <Progress
                  value={metrics.quality.reliability * 100}
                  className="mt-3"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
