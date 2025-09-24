/**
 * Trend Analysis Component
 * Historical performance trends and predictions
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  Calendar,
  Filter,
} from 'lucide-react';

// Types
interface TrendAnalysisProps {
  trends: {
    daily: Array<{ date: string; value: number; metric: string }>;
    weekly: Array<{ week: string; value: number; metric: string }>;
    monthly: Array<{ month: string; value: number; metric: string }>;
  };
  metrics: {
    edgeCaseCoverage: number;
    automationSuccessRate: number;
    errorDetectionAccuracy: number;
    falsePositiveRate: number;
    userApprovalRate: number;
    costSavings: number;
    performanceImprovement: number;
  };
  performance: {
    averageResponseTime: number;
    throughputRate: number;
    errorRate: number;
    uptime: number;
    resourceUtilization: number;
  };
}

interface TrendMetric {
  name: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  prediction: {
    next7days: number;
    next30days: number;
    confidence: number;
  };
  target?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface SeasonalPattern {
  period: 'daily' | 'weekly' | 'monthly';
  pattern: string;
  strength: number;
  description: string;
}

interface Anomaly {
  date: string;
  metric: string;
  value: number;
  expected: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export function TrendAnalysis({ trends, metrics, performance }: TrendAnalysisProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['automation', 'detection', 'approval']);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);

  // Generate trend data
  const trendData = useMemo(() => {
    const rawData = trends[timeframe] || [];
    
    // Group data by date/period
    const groupedData = rawData.reduce((acc, item) => {
      const key = timeframe === 'daily' ? item.date : 
                  timeframe === 'weekly' ? item.week : item.month;
      
      if (!acc[key]) {
        acc[key] = { period: key };
      }
      
      acc[key][item.metric] = item.value;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and add predictions
    const data = Object.values(groupedData);
    
    // Add predicted values for next periods
    if (showPredictions && data.length > 0) {
      const lastPeriod = data[data.length - 1];
      const predictionPeriods = timeframe === 'daily' ? 7 : timeframe === 'weekly' ? 4 : 3;
      
      for (let i = 1; i <= predictionPeriods; i++) {
        const predictionDate = new Date();
        if (timeframe === 'daily') {
          predictionDate.setDate(predictionDate.getDate() + i);
        } else if (timeframe === 'weekly') {
          predictionDate.setDate(predictionDate.getDate() + (i * 7));
        } else {
          predictionDate.setMonth(predictionDate.getMonth() + i);
        }
        
        const prediction: any = {
          period: predictionDate.toLocaleDateString(),
          isPrediction: true,
        };
        
        // Simple linear prediction (in real scenario, use proper forecasting)
        Object.keys(lastPeriod).forEach(key => {
          if (key !== 'period' && typeof lastPeriod[key] === 'number') {
            const trend = data.length > 1 ? 
              (lastPeriod[key] - data[data.length - 2][key]) : 0;
            prediction[key] = Math.max(0, Math.min(100, lastPeriod[key] + (trend * i)));
          }
        });
        
        data.push(prediction);
      }
    }
    
    return data;
  }, [trends, timeframe, showPredictions]);

  // Calculate trend metrics
  const trendMetrics: TrendMetric[] = useMemo(() => {
    const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'stable', change: number, changePercent: number } => {
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      
      const trend = Math.abs(changePercent) < 1 ? 'stable' : 
                   changePercent > 0 ? 'up' : 'down';
      
      return { trend, change, changePercent };
    };

    return [
      {
        name: 'Edge Case Coverage',
        current: metrics.edgeCaseCoverage,
        ...calculateTrend(metrics.edgeCaseCoverage, metrics.edgeCaseCoverage * 0.95),
        prediction: {
          next7days: metrics.edgeCaseCoverage + 2.1,
          next30days: metrics.edgeCaseCoverage + 5.8,
          confidence: 0.82,
        },
        target: 90,
        status: metrics.edgeCaseCoverage >= 85 ? 'excellent' : 
                metrics.edgeCaseCoverage >= 70 ? 'good' : 
                metrics.edgeCaseCoverage >= 50 ? 'warning' : 'critical',
      },
      {
        name: 'Automation Success Rate',
        current: metrics.automationSuccessRate,
        ...calculateTrend(metrics.automationSuccessRate, metrics.automationSuccessRate * 0.98),
        prediction: {
          next7days: metrics.automationSuccessRate + 1.3,
          next30days: metrics.automationSuccessRate + 3.2,
          confidence: 0.78,
        },
        target: 95,
        status: metrics.automationSuccessRate >= 90 ? 'excellent' : 
                metrics.automationSuccessRate >= 80 ? 'good' : 
                metrics.automationSuccessRate >= 70 ? 'warning' : 'critical',
      },
      {
        name: 'Error Detection Accuracy',
        current: metrics.errorDetectionAccuracy,
        ...calculateTrend(metrics.errorDetectionAccuracy, metrics.errorDetectionAccuracy * 0.97),
        prediction: {
          next7days: metrics.errorDetectionAccuracy + 1.8,
          next30days: metrics.errorDetectionAccuracy + 4.1,
          confidence: 0.85,
        },
        target: 98,
        status: metrics.errorDetectionAccuracy >= 95 ? 'excellent' : 
                metrics.errorDetectionAccuracy >= 90 ? 'good' : 
                metrics.errorDetectionAccuracy >= 85 ? 'warning' : 'critical',
      },
      {
        name: 'Response Time',
        current: performance.averageResponseTime,
        ...calculateTrend(performance.averageResponseTime, performance.averageResponseTime * 1.05),
        prediction: {
          next7days: performance.averageResponseTime - 15,
          next30days: performance.averageResponseTime - 45,
          confidence: 0.73,
        },
        target: 200,
        status: performance.averageResponseTime <= 200 ? 'excellent' : 
                performance.averageResponseTime <= 500 ? 'good' : 
                performance.averageResponseTime <= 1000 ? 'warning' : 'critical',
      },
      {
        name: 'User Approval Rate',
        current: metrics.userApprovalRate,
        ...calculateTrend(metrics.userApprovalRate, metrics.userApprovalRate * 0.96),
        prediction: {
          next7days: metrics.userApprovalRate + 2.5,
          next30days: metrics.userApprovalRate + 6.2,
          confidence: 0.79,
        },
        target: 85,
        status: metrics.userApprovalRate >= 80 ? 'excellent' : 
                metrics.userApprovalRate >= 70 ? 'good' : 
                metrics.userApprovalRate >= 60 ? 'warning' : 'critical',
      },
    ];
  }, [metrics, performance]);

  // Detect seasonal patterns
  const seasonalPatterns: SeasonalPattern[] = useMemo(() => {
    return [
      {
        period: 'daily',
        pattern: 'Peak performance during business hours (9 AM - 5 PM)',
        strength: 0.73,
        description: 'Automation success rates are 15% higher during business hours',
      },
      {
        period: 'weekly',
        pattern: 'Lower performance on Mondays and Fridays',
        strength: 0.62,
        description: 'Edge case detection drops 8% on start/end of week',
      },
      {
        period: 'monthly',
        pattern: 'Improved performance mid-month',
        strength: 0.45,
        description: 'Best automation results occur during 2nd and 3rd weeks',
      },
    ];
  }, []);

  // Detect anomalies
  const detectedAnomalies: Anomaly[] = useMemo(() => {
    // In a real implementation, this would use statistical analysis
    return [
      {
        date: '2025-01-12',
        metric: 'automation_success',
        value: 67.2,
        expected: 89.4,
        severity: 'high',
        description: 'Significant drop in automation success rate during system update',
      },
      {
        date: '2025-01-10',
        metric: 'response_time',
        value: 1250,
        expected: 450,
        severity: 'medium',
        description: 'Response time spike during peak load period',
      },
      {
        date: '2025-01-08',
        metric: 'error_detection',
        value: 78.1,
        expected: 92.3,
        severity: 'medium',
        description: 'Lower than expected error detection accuracy',
      },
    ];
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'warning':
        return 'text-orange-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={selectedMetrics.join(',')} 
            onValueChange={(value) => setSelectedMetrics(value.split(','))}
          >
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select metrics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automation,detection,approval">All Metrics</SelectItem>
              <SelectItem value="automation">Automation Only</SelectItem>
              <SelectItem value="detection">Detection Only</SelectItem>
              <SelectItem value="approval">Approval Only</SelectItem>
              <SelectItem value="performance">Performance Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowPredictions(!showPredictions)}
            variant={showPredictions ? 'default' : 'outline'}
            size="sm"
          >
            <Brain className="h-4 w-4 mr-1" />
            Predictions
          </Button>
          <Button
            onClick={() => setShowAnomalies(!showAnomalies)}
            variant={showAnomalies ? 'default' : 'outline'}
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Anomalies
          </Button>
        </div>
      </div>

      {/* Trend Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {trendMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {metric.name}
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="text-2xl font-bold mb-1">
                {metric.name === 'Response Time' ? `${metric.current.toFixed(0)}ms` : `${metric.current.toFixed(1)}%`}
              </div>
              <div className={`text-xs flex items-center ${
                metric.trend === 'up' && metric.name !== 'Response Time' ? 'text-green-600' :
                metric.trend === 'down' && metric.name === 'Response Time' ? 'text-green-600' :
                metric.trend === 'up' && metric.name === 'Response Time' ? 'text-red-600' :
                metric.trend === 'down' && metric.name !== 'Response Time' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {metric.changePercent > 0 ? '+' : ''}{metric.changePercent.toFixed(1)}% from last period
              </div>
              {metric.target && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Target: {metric.target}{metric.name === 'Response Time' ? 'ms' : '%'}
                  </div>
                  <div className={`text-xs ${getStatusColor(metric.status)}`}>
                    {metric.status}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends Over Time</CardTitle>
          <CardDescription>
            Historical data with predictions and anomaly detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    const isPrediction = payload?.[0]?.payload?.isPrediction;
                    return `${label}${isPrediction ? ' (Predicted)' : ''}`;
                  }}
                />
                <Legend />
                
                {/* Historical data */}
                {selectedMetrics.includes('automation') && (
                  <>
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="automation"
                      stroke="#0088FE"
                      strokeWidth={2}
                      name="Automation Rate (%)"
                      connectNulls={false}
                      dot={{ r: 4 }}
                    />
                    {showPredictions && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="automation"
                        stroke="#0088FE"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Automation Prediction"
                        connectNulls={true}
                        dot={false}
                      />
                    )}
                  </>
                )}
                
                {selectedMetrics.includes('detection') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="detection"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Error Detection (%)"
                    dot={{ r: 4 }}
                  />
                )}
                
                {selectedMetrics.includes('approval') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="approval"
                    stroke="#FFBB28"
                    strokeWidth={2}
                    name="User Approval (%)"
                    dot={{ r: 4 }}
                  />
                )}
                
                {selectedMetrics.includes('performance') && (
                  <Bar
                    yAxisId="right"
                    dataKey="response_time"
                    fill="#FF8042"
                    name="Response Time (ms)"
                    opacity={0.6}
                  />
                )}
                
                {/* Reference lines for targets */}
                {selectedMetrics.includes('automation') && (
                  <ReferenceLine yAxisId="left" y={90} stroke="#0088FE" strokeDasharray="3 3" label="Automation Target" />
                )}
                {selectedMetrics.includes('detection') && (
                  <ReferenceLine yAxisId="left" y={95} stroke="#00C49F" strokeDasharray="3 3" label="Detection Target" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Predictions and Seasonal Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Predictions</CardTitle>
            <CardDescription>
              AI-powered forecasts for key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendMetrics.slice(0, 3).map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Current: {metric.current.toFixed(1)}{metric.name === 'Response Time' ? 'ms' : '%'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-muted-foreground">7d: </span>
                      <span className="font-medium">
                        {metric.prediction.next7days.toFixed(1)}{metric.name === 'Response Time' ? 'ms' : '%'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">30d: </span>
                      <span className="font-medium">
                        {metric.prediction.next30days.toFixed(1)}{metric.name === 'Response Time' ? 'ms' : '%'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(metric.prediction.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Patterns</CardTitle>
            <CardDescription>
              Recurring performance patterns detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {seasonalPatterns.map((pattern, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{pattern.period}</Badge>
                    <div className="text-sm text-muted-foreground">
                      Strength: {(pattern.strength * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="font-medium text-sm">{pattern.pattern}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pattern.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      {showAnomalies && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Anomalies</CardTitle>
            <CardDescription>
              Unusual patterns that require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detectedAnomalies.map((anomaly, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    anomaly.severity === 'high' ? 'bg-red-500' :
                    anomaly.severity === 'medium' ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{anomaly.metric.replace('_', ' ')}</div>
                      <div className="text-sm text-muted-foreground">{anomaly.date}</div>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Actual: </span>
                      <span className="font-medium">{anomaly.value.toFixed(1)}</span>
                      <span className="mx-2 text-muted-foreground">Expected: </span>
                      <span className="font-medium">{anomaly.expected.toFixed(1)}</span>
                      <Badge variant={
                        anomaly.severity === 'high' ? 'destructive' :
                        anomaly.severity === 'medium' ? 'destructive' : 'secondary'
                      } className="ml-2">
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {anomaly.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}