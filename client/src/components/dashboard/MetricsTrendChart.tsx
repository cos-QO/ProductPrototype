import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, RefreshCcw } from "lucide-react";

interface MetricData {
  date: string;
  products: number;
  brands: number;
  syncs: number;
  activeUsers: number;
}

interface MetricsTrendChartProps {
  className?: string;
}

const chartConfig = {
  products: {
    label: "Products",
    color: "hsl(var(--chart-1))",
  },
  brands: {
    label: "Brands",
    color: "hsl(var(--chart-2))",
  },
  syncs: {
    label: "API Syncs",
    color: "hsl(var(--chart-3))",
  },
  activeUsers: {
    label: "Active Users",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function MetricsTrendChart({ className }: MetricsTrendChartProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [selectedMetric, setSelectedMetric] =
    useState<keyof typeof chartConfig>("products");
  const [chartType, setChartType] = useState<"line" | "area">("area");

  // Mock data for now - this would come from a real API endpoint
  const generateMockData = (days: number): MetricData[] => {
    const data: MetricData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split("T")[0],
        products: Math.floor(Math.random() * 50) + 100 + (days - i) * 2,
        brands:
          Math.floor(Math.random() * 10) + 20 + Math.floor((days - i) * 0.5),
        syncs: Math.floor(Math.random() * 200) + 300 + (days - i) * 5,
        activeUsers:
          Math.floor(Math.random() * 20) + 40 + Math.floor((days - i) * 1.2),
      });
    }

    return data;
  };

  const {
    data: trendData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/dashboard/trends", timeRange],
    queryFn: () => {
      // Mock data for now - replace with actual API call
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      return Promise.resolve(generateMockData(days));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Calculate trend percentage
  const calculateTrend = (data: MetricData[], metric: keyof MetricData) => {
    if (!data || data.length < 2) return 0;

    const latest = data[data.length - 1][metric] as number;
    const previous = data[data.length - 2][metric] as number;

    if (previous === 0) return 0;
    return ((latest - previous) / previous) * 100;
  };

  const trendPercentage = trendData
    ? calculateTrend(trendData, selectedMetric)
    : 0;
  const isPositiveTrend = trendPercentage > 0;

  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem);
    if (timeRange === "7d") {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else if (timeRange === "30d") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
  };

  // Custom tick filtering for better grid distribution
  const getXAxisTicks = (data: MetricData[]) => {
    if (!data || data.length === 0) return [];

    if (timeRange === "30d") {
      // Show labels every 5 days for 30d view
      return data
        .map((_, index) => index)
        .filter((index) => index % 5 === 0 || index === data.length - 1);
    } else if (timeRange === "90d") {
      // Show labels every 10 days for 90d view
      return data
        .map((_, index) => index)
        .filter((index) => index % 10 === 0 || index === data.length - 1);
    }

    // For 7d view, show all ticks
    return data.map((_, index) => index);
  };

  const formatTooltipLabel = (label: string) => {
    return new Date(label).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Trends
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCcw className="h-3 w-3" />
          </Button>
          <Select
            value={timeRange}
            onValueChange={(value: any) => setTimeRange(value)}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(chartConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedMetric === key ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedMetric(key as keyof typeof chartConfig)
                }
                className="h-8"
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </Button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={chartType === "area" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("area")}
              className="h-8"
            >
              Area
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
              className="h-8"
            >
              Line
            </Button>
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isPositiveTrend ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span
              className={isPositiveTrend ? "text-success" : "text-destructive"}
            >
              {Math.abs(trendPercentage).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </div>

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-64">
            {chartType === "area" ? (
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisLabel}
                  interval={0}
                  ticks={trendData ? getXAxisTicks(trendData) : []}
                />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={formatTooltipLabel} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={chartConfig[selectedMetric].color}
                  fill={chartConfig[selectedMetric].color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  className="hover:fill-opacity-40 transition-all duration-200"
                  style={{
                    filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))",
                  }}
                />
              </AreaChart>
            ) : (
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisLabel}
                  interval={0}
                  ticks={trendData ? getXAxisTicks(trendData) : []}
                />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={formatTooltipLabel} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={chartConfig[selectedMetric].color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ChartContainer>

          {/* Summary Stats */}
          {trendData && trendData.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {Object.entries(chartConfig).map(([key, config]) => {
                const latest = trendData[trendData.length - 1][
                  key as keyof MetricData
                ] as number;
                const trend = calculateTrend(
                  trendData,
                  key as keyof MetricData,
                );

                return (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold">
                      {latest.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {config.label}
                    </div>
                    <div
                      className={`text-xs ${trend > 0 ? "text-success" : "text-destructive"}`}
                    >
                      {trend > 0 ? "+" : ""}
                      {trend.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
