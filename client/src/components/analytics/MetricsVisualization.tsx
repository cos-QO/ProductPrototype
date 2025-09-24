/**
 * Metrics Visualization Component
 * Charts and graphs for performance data visualization
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// Types
interface MetricsVisualizationProps {
  data: any;
  timeRange: string;
  category: string;
}

interface MetricTrend {
  name: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  category?: string;
  label?: string;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  benchmark: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function MetricsVisualization({ data, timeRange, category }: MetricsVisualizationProps) {
  const [selectedChart, setSelectedChart] = useState<'line' | 'area' | 'bar' | 'pie'>('line');
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  // Process data for different visualizations
  const processedData = useMemo(() => {
    if (!data) return { trends: [], performance: [], distributions: [] };

    // Time series data
    const trends = data.trends?.daily?.map((point: any) => ({
      timestamp: new Date(point.date).toLocaleDateString(),
      automationRate: point.metric === 'automation' ? point.value : 0,
      errorDetection: point.metric === 'detection' ? point.value : 0,
      userApproval: point.metric === 'approval' ? point.value : 0,
      performance: point.metric === 'performance' ? point.value : 0,
    })) || [];

    // Performance metrics
    const performance: PerformanceMetric[] = [
      {
        metric: 'Edge Case Coverage',
        value: data.metrics?.edgeCaseCoverage || 0,
        benchmark: 85,
        status: (data.metrics?.edgeCaseCoverage || 0) >= 85 ? 'excellent' : 
                 (data.metrics?.edgeCaseCoverage || 0) >= 70 ? 'good' : 
                 (data.metrics?.edgeCaseCoverage || 0) >= 50 ? 'warning' : 'critical',
      },
      {
        metric: 'Success Rate',
        value: data.metrics?.automationSuccessRate || 0,
        benchmark: 90,
        status: (data.metrics?.automationSuccessRate || 0) >= 90 ? 'excellent' : 
                 (data.metrics?.automationSuccessRate || 0) >= 80 ? 'good' : 
                 (data.metrics?.automationSuccessRate || 0) >= 70 ? 'warning' : 'critical',
      },
      {
        metric: 'Response Time',
        value: data.performance?.averageResponseTime || 0,
        benchmark: 500,
        status: (data.performance?.averageResponseTime || 0) <= 200 ? 'excellent' : 
                 (data.performance?.averageResponseTime || 0) <= 500 ? 'good' : 
                 (data.performance?.averageResponseTime || 0) <= 1000 ? 'warning' : 'critical',
      },
      {
        metric: 'Error Detection',
        value: data.metrics?.errorDetectionAccuracy || 0,
        benchmark: 95,
        status: (data.metrics?.errorDetectionAccuracy || 0) >= 95 ? 'excellent' : 
                 (data.metrics?.errorDetectionAccuracy || 0) >= 90 ? 'good' : 
                 (data.metrics?.errorDetectionAccuracy || 0) >= 80 ? 'warning' : 'critical',
      },
    ];

    // Distribution data for pie charts
    const distributions = [
      { name: 'Auto-Resolved', value: data.edgeCaseStats?.automaticallyResolved || 0, color: '#00C49F' },
      { name: 'Human Review', value: data.edgeCaseStats?.requiresHumanReview || 0, color: '#FFBB28' },
      { name: 'Critical Issues', value: data.edgeCaseStats?.criticalIssues || 0, color: '#FF8042' },
    ];

    return { trends, performance, distributions };
  }, [data, timeRange, category]);

  // Calculate metric trends
  const metricTrends: MetricTrend[] = useMemo(() => {
    if (!data) return [];

    return [
      {
        name: 'Edge Case Coverage',
        current: data.metrics?.edgeCaseCoverage || 0,
        previous: (data.metrics?.edgeCaseCoverage || 0) * 0.95,
        trend: 'up',
        change: 5.2,
        unit: '%',
      },
      {
        name: 'Success Rate',
        current: data.metrics?.automationSuccessRate || 0,
        previous: (data.metrics?.automationSuccessRate || 0) * 0.98,
        trend: 'up',
        change: 2.1,
        unit: '%',
      },
      {
        name: 'Response Time',
        current: data.performance?.averageResponseTime || 0,
        previous: (data.performance?.averageResponseTime || 0) * 1.1,
        trend: 'down',
        change: -10.2,
        unit: 'ms',
      },
      {
        name: 'Cost Savings',
        current: data.metrics?.costSavings || 0,
        previous: (data.metrics?.costSavings || 0) * 0.92,
        trend: 'up',
        change: 8.3,
        unit: '$',
      },
    ];
  }, [data]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setSelectedChart('line')}
            variant={selectedChart === 'line' ? 'default' : 'outline'}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-1" />
            Line
          </Button>
          <Button
            onClick={() => setSelectedChart('area')}
            variant={selectedChart === 'area' ? 'default' : 'outline'}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Area
          </Button>
          <Button
            onClick={() => setSelectedChart('bar')}
            variant={selectedChart === 'bar' ? 'default' : 'outline'}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Bar
          </Button>
          <Button
            onClick={() => setSelectedChart('pie')}
            variant={selectedChart === 'pie' ? 'default' : 'outline'}
            size="sm"
          >
            <PieChartIcon className="h-4 w-4 mr-1" />
            Pie
          </Button>
        </div>
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            <SelectItem value="automation">Automation Rate</SelectItem>
            <SelectItem value="detection">Error Detection</SelectItem>
            <SelectItem value="approval">User Approval</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricTrends.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.name}
                  </p>
                  <p className="text-2xl font-bold">
                    {metric.unit === '$' ? '$' : ''}{metric.current.toLocaleString()}{metric.unit !== '$' ? metric.unit : ''}
                  </p>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-center mt-2">
                <span className={`text-xs ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            {timeRange} view of automation metrics and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {selectedChart === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedMetric === 'all' || selectedMetric === 'automation' ? (
                    <Line 
                      type="monotone" 
                      dataKey="automationRate" 
                      stroke="#0088FE" 
                      strokeWidth={2}
                      name="Automation Rate (%)"
                    />
                  ) : null}
                  {selectedMetric === 'all' || selectedMetric === 'detection' ? (
                    <Line 
                      type="monotone" 
                      dataKey="errorDetection" 
                      stroke="#00C49F" 
                      strokeWidth={2}
                      name="Error Detection (%)"
                    />
                  ) : null}
                  {selectedMetric === 'all' || selectedMetric === 'approval' ? (
                    <Line 
                      type="monotone" 
                      dataKey="userApproval" 
                      stroke="#FFBB28" 
                      strokeWidth={2}
                      name="User Approval (%)"
                    />
                  ) : null}
                  {selectedMetric === 'all' || selectedMetric === 'performance' ? (
                    <Line 
                      type="monotone" 
                      dataKey="performance" 
                      stroke="#FF8042" 
                      strokeWidth={2}
                      name="Performance Score"
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            )}

            {selectedChart === 'area' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="automationRate" 
                    stackId="1"
                    stroke="#0088FE" 
                    fill="#0088FE"
                    fillOpacity={0.6}
                    name="Automation Rate"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="errorDetection" 
                    stackId="1"
                    stroke="#00C49F" 
                    fill="#00C49F"
                    fillOpacity={0.6}
                    name="Error Detection"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {selectedChart === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="automationRate" fill="#0088FE" name="Automation Rate" />
                  <Bar dataKey="errorDetection" fill="#00C49F" name="Error Detection" />
                  <Bar dataKey="userApproval" fill="#FFBB28" name="User Approval" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {selectedChart === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.distributions}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {processedData.distributions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
          <CardDescription>
            Current performance against established benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processedData.performance.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getStatusColor(metric.status)}`}>
                    {getStatusIcon(metric.status)}
                  </div>
                  <div>
                    <h4 className="font-medium">{metric.metric}</h4>
                    <p className="text-sm text-muted-foreground">
                      Target: {metric.benchmark}{metric.metric.includes('Time') ? 'ms' : '%'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {metric.value.toFixed(metric.metric.includes('Time') ? 0 : 1)}
                      {metric.metric.includes('Time') ? 'ms' : '%'}
                    </div>
                    <Badge variant={
                      metric.status === 'excellent' ? 'default' :
                      metric.status === 'good' ? 'secondary' :
                      metric.status === 'warning' ? 'destructive' : 'destructive'
                    }>
                      {metric.status}
                    </Badge>
                  </div>
                  <div className="w-24">
                    <ResponsiveContainer width="100%" height={40}>
                      <RadialBarChart innerRadius="40%" outerRadius="100%" data={[{
                        value: metric.metric.includes('Time') 
                          ? Math.max(0, 100 - (metric.value / metric.benchmark) * 100)
                          : (metric.value / metric.benchmark) * 100,
                        fill: metric.status === 'excellent' ? '#00C49F' :
                              metric.status === 'good' ? '#0088FE' :
                              metric.status === 'warning' ? '#FFBB28' : '#FF8042',
                      }]}>
                        <RadialBar dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Performance Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Performance vs Accuracy</CardTitle>
          <CardDescription>
            Relationship between automation speed and accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                data={[
                  { speed: data?.performance?.averageResponseTime || 300, accuracy: data?.metrics?.errorDetectionAccuracy || 85, name: 'Current' },
                  { speed: 250, accuracy: 90, name: 'Target' },
                  { speed: 400, accuracy: 80, name: 'Previous' },
                  { speed: 200, accuracy: 95, name: 'Best Case' },
                  { speed: 500, accuracy: 75, name: 'Worst Case' },
                ]}
              >
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="speed" 
                  name="Response Time (ms)"
                  label={{ value: 'Response Time (ms)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="accuracy" 
                  name="Accuracy (%)"
                  label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Performance Points" dataKey="accuracy" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}