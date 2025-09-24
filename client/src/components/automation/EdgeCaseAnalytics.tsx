import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
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
} from 'recharts';

interface EdgeCaseData {
  summary: {
    totalDetected: number;
    automaticallyResolved: number;
    requiresHumanReview: number;
    criticalIssues: number;
    detectionAccuracy: number;
    falsePositiveRate: number;
    resolutionTime: number;
    costSavings: number;
  };
  categories: Array<{
    name: string;
    count: number;
    resolved: number;
    pending: number;
    critical: number;
    accuracy: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
  }>;
  trends: {
    detection: Array<{
      date: string;
      detected: number;
      resolved: number;
      accuracy: number;
    }>;
    resolution: Array<{
      date: string;
      automated: number;
      manual: number;
      averageTime: number;
    }>;
  };
  performanceMetrics: {
    detectionLatency: number;
    resolutionSpeed: number;
    systemLoad: number;
    confidence: number;
  };
  riskAssessment: {
    currentRisk: number;
    riskTrend: 'increasing' | 'decreasing' | 'stable';
    riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      impact: string;
    }>;
  };
}

interface EdgeCaseAnalyticsProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  compact?: boolean;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
};

export const EdgeCaseAnalytics: React.FC<EdgeCaseAnalyticsProps> = ({
  dateRange,
  compact = false,
}) => {
  const [data, setData] = useState<EdgeCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEdgeCaseData();
  }, [dateRange]);

  const fetchEdgeCaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());

      // Mock data for development - replace with actual API call
      const mockData: EdgeCaseData = {
        summary: {
          totalDetected: 342,
          automaticallyResolved: 289,
          requiresHumanReview: 53,
          criticalIssues: 8,
          detectionAccuracy: 94.2,
          falsePositiveRate: 3.8,
          resolutionTime: 12.5,
          costSavings: 58400,
        },
        categories: [
          {
            name: 'Data Format Issues',
            count: 125,
            resolved: 118,
            pending: 7,
            critical: 2,
            accuracy: 96.8,
            trend: 'down',
            trendValue: -8.2,
          },
          {
            name: 'Field Mapping Errors',
            count: 89,
            resolved: 82,
            pending: 7,
            critical: 1,
            accuracy: 92.1,
            trend: 'stable',
            trendValue: 1.2,
          },
          {
            name: 'Validation Failures',
            count: 67,
            resolved: 58,
            pending: 9,
            critical: 3,
            accuracy: 91.5,
            trend: 'up',
            trendValue: 15.3,
          },
          {
            name: 'Performance Issues',
            count: 41,
            resolved: 31,
            pending: 10,
            critical: 2,
            accuracy: 89.2,
            trend: 'up',
            trendValue: 22.8,
          },
          {
            name: 'Security Concerns',
            count: 20,
            resolved: 0,
            pending: 20,
            critical: 0,
            accuracy: 100.0,
            trend: 'stable',
            trendValue: -2.1,
          },
        ],
        trends: {
          detection: [
            { date: '2024-09-17', detected: 45, resolved: 42, accuracy: 93.3 },
            { date: '2024-09-18', detected: 52, resolved: 48, accuracy: 92.3 },
            { date: '2024-09-19', detected: 38, resolved: 36, accuracy: 94.7 },
            { date: '2024-09-20', detected: 61, resolved: 58, accuracy: 95.1 },
            { date: '2024-09-21', detected: 48, resolved: 44, accuracy: 91.7 },
            { date: '2024-09-22', detected: 55, resolved: 53, accuracy: 96.4 },
            { date: '2024-09-23', detected: 43, resolved: 41, accuracy: 95.3 },
          ],
          resolution: [
            { date: '2024-09-17', automated: 35, manual: 7, averageTime: 8.2 },
            { date: '2024-09-18', automated: 41, manual: 7, averageTime: 9.1 },
            { date: '2024-09-19', automated: 32, manual: 4, averageTime: 7.8 },
            { date: '2024-09-20', automated: 49, manual: 9, averageTime: 11.3 },
            { date: '2024-09-21', automated: 38, manual: 6, averageTime: 8.9 },
            { date: '2024-09-22', automated: 45, manual: 8, averageTime: 10.2 },
            { date: '2024-09-23', automated: 36, manual: 5, averageTime: 9.6 },
          ],
        },
        performanceMetrics: {
          detectionLatency: 2.3,
          resolutionSpeed: 8.7,
          systemLoad: 34.2,
          confidence: 94.1,
        },
        riskAssessment: {
          currentRisk: 23,
          riskTrend: 'decreasing',
          riskFactors: [
            {
              factor: 'Increasing complexity in data patterns',
              severity: 'medium',
              impact: 'May require model retraining',
            },
            {
              factor: 'Higher volume of edge cases',
              severity: 'low',
              impact: 'System handling within capacity',
            },
            {
              factor: 'New data sources introducing unknowns',
              severity: 'high',
              impact: 'Requires immediate attention',
            },
          ],
        },
      };

      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatTime = (minutes: number) => `${minutes.toFixed(1)}m`;

  const getTrendIcon = (trend: string, value: number) => {
    if (trend === 'up') {
      return <ArrowUp className={`h-3 w-3 ${value > 0 ? 'text-red-500' : 'text-green-500'}`} />;
    } else if (trend === 'down') {
      return <ArrowDown className={`h-3 w-3 ${value < 0 ? 'text-green-500' : 'text-red-500'}`} />;
    }
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

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
            <span>Error loading edge case analytics: {error}</span>
          </div>
          <Button variant="outline" onClick={fetchEdgeCaseData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const pieChartData = data.categories.map((cat, index) => ({
    name: cat.name,
    value: cat.count,
    color: Object.values(COLORS)[index % Object.values(COLORS).length],
  }));

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edge Case Analytics</CardTitle>
          <CardDescription>Detection and resolution overview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.summary.totalDetected}
              </div>
              <div className="text-xs text-muted-foreground">Total Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage((data.summary.automaticallyResolved / data.summary.totalDetected) * 100)}
              </div>
              <div className="text-xs text-muted-foreground">Auto Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.summary.requiresHumanReview}
              </div>
              <div className="text-xs text-muted-foreground">Manual Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data.summary.criticalIssues}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Detection Accuracy</span>
              <span className="font-medium">{formatPercentage(data.summary.detectionAccuracy)}</span>
            </div>
            <Progress value={data.summary.detectionAccuracy} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>False Positive Rate</span>
              <span className="font-medium">{formatPercentage(data.summary.falsePositiveRate)}</span>
            </div>
            <Progress value={data.summary.falsePositiveRate} className="h-2 [&>div]:bg-red-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edge Case Analytics</h2>
          <p className="text-muted-foreground">
            Real-time edge case detection and resolution tracking
          </p>
        </div>
        <Button variant="outline" onClick={fetchEdgeCaseData}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Detected</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalDetected}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.summary.criticalIssues} critical issues
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Resolution</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage((data.summary.automaticallyResolved / data.summary.totalDetected) * 100)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.summary.automaticallyResolved} of {data.summary.totalDetected} cases
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(data.summary.resolutionTime)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Average processing time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.costSavings)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              From automated resolutions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detection Accuracy</CardTitle>
                <CardDescription>Current system performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Detection Accuracy</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(data.summary.detectionAccuracy)}
                    </span>
                  </div>
                  <Progress value={data.summary.detectionAccuracy} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">False Positive Rate</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(data.summary.falsePositiveRate)}
                    </span>
                  </div>
                  <Progress 
                    value={data.summary.falsePositiveRate} 
                    className="[&>div]:bg-orange-500" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">System Confidence</span>
                    <span className="text-sm font-medium">
                      {formatPercentage(data.performanceMetrics.confidence)}
                    </span>
                  </div>
                  <Progress value={data.performanceMetrics.confidence} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Current system risk factors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Risk Level</span>
                    <Badge variant={data.riskAssessment.currentRisk > 50 ? 'destructive' : 'outline'}>
                      {data.riskAssessment.currentRisk}%
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {data.riskAssessment.riskFactors.map((factor, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate" title={factor.factor}>
                            {factor.factor.length > 30 ? `${factor.factor.substring(0, 30)}...` : factor.factor}
                          </span>
                          <Badge variant={getSeverityColor(factor.severity)} className="text-xs">
                            {factor.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{factor.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {data.categories.map((category, index) => (
                <Card key={category.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(category.trend, category.trendValue)}
                        <Badge variant="outline">
                          {formatPercentage(category.accuracy)} accuracy
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold">{category.count}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{category.resolved}</div>
                        <div className="text-xs text-muted-foreground">Resolved</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">{category.pending}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">{category.critical}</div>
                        <div className="text-xs text-muted-foreground">Critical</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Distribution</CardTitle>
                <CardDescription>Edge cases by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Count']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detection Trends</CardTitle>
                <CardDescription>Daily detection and resolution rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trends.detection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="detected" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        name="Detected"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="resolved" 
                        stroke={COLORS.secondary} 
                        strokeWidth={2}
                        name="Resolved"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Methods</CardTitle>
                <CardDescription>Automated vs manual resolution trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trends.resolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="automated" 
                        stackId="1"
                        stroke={COLORS.secondary} 
                        fill={COLORS.secondary}
                        name="Automated"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="manual" 
                        stackId="1"
                        stroke={COLORS.warning} 
                        fill={COLORS.warning}
                        name="Manual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Detection Latency</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.performanceMetrics.detectionLatency}s</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Average time to detect
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolution Speed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(data.performanceMetrics.resolutionSpeed)}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Average resolution time
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Load</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(data.performanceMetrics.systemLoad)}</div>
                <Progress value={data.performanceMetrics.systemLoad} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(data.performanceMetrics.confidence)}
                </div>
                <Progress value={data.performanceMetrics.confidence} className="mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};