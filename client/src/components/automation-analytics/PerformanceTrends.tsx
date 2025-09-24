/**
 * Performance Trends Component
 * Visualizes performance metrics and trends over time
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp,
  Clock,
  Zap,
  Target,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';
import { AutomationMetrics, TrendData } from '../../../types/automation';

interface PerformanceTrendsProps {
  trends?: TrendData[];
  metrics?: AutomationMetrics;
  timeRange: '1h' | '24h' | '7d' | '30d';
  isLoading: boolean;
}

export function PerformanceTrends({ 
  trends, 
  metrics, 
  timeRange,
  isLoading 
}: PerformanceTrendsProps) {
  if (isLoading || !trends || !metrics) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare trend data with performance calculations
  const performanceData = trends.map(trend => {
    const performanceScore = (
      (trend.automationRate * 0.3) +
      (Math.max(0, 100 - trend.errors) * 0.3) +
      (trend.performance * 0.25) +
      (trend.userSatisfaction * 0.15)
    );

    return {
      ...trend,
      date: new Date(trend.date).toLocaleDateString(),
      performanceScore: Math.round(performanceScore),
      errorRate: trend.errors,
      throughput: Math.round(trend.automationRate * 1.5), // Simulated throughput
      responseTime: Math.max(200, 1000 - (trend.performance * 8)) // Simulated response time
    };
  });

  // Calculate performance insights
  const avgPerformance = performanceData.reduce((sum, d) => sum + d.performanceScore, 0) / performanceData.length;
  const performanceTrend = performanceData.length > 1 
    ? performanceData[performanceData.length - 1].performanceScore - performanceData[0].performanceScore
    : 0;

  const getPerformanceStatus = (score: number) => {
    if (score >= 90) return { status: 'Excellent', color: 'text-green-600', variant: 'default' as const };
    if (score >= 80) return { status: 'Good', color: 'text-blue-600', variant: 'secondary' as const };
    if (score >= 70) return { status: 'Fair', color: 'text-yellow-600', variant: 'outline' as const };
    return { status: 'Needs Improvement', color: 'text-red-600', variant: 'destructive' as const };
  };

  const currentStatus = getPerformanceStatus(avgPerformance);

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance Score</p>
                <p className={`text-2xl font-bold ${currentStatus.color}`}>
                  {avgPerformance.toFixed(0)}%
                </p>
                <Badge variant={currentStatus.variant} className="mt-1">
                  {currentStatus.status}
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.systemHealth.uptime.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Last {timeRange}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-600">
                  {performanceData[performanceData.length - 1]?.responseTime || 850}ms
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Target: &lt;1000ms
                </Badge>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trend</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${performanceTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performanceTrend >= 0 ? '+' : ''}{performanceTrend.toFixed(0)}%
                  </p>
                  {performanceTrend >= 0 ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  }
                </div>
                <p className="text-xs text-gray-500">
                  {timeRange} change
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Performance Over Time
          </CardTitle>
          <CardDescription>
            Overall system performance trends and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  domain={[0, 2000]}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    const formatters = {
                      performanceScore: (val: number) => [`${val}%`, 'Performance Score'],
                      automationRate: (val: number) => [`${val}%`, 'Automation Rate'],
                      userSatisfaction: (val: number) => [`${val}%`, 'User Satisfaction'],
                      responseTime: (val: number) => [`${val}ms`, 'Response Time']
                    };
                    return formatters[name as keyof typeof formatters]?.(value) || [value, name];
                  }}
                />
                
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="performanceScore"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  stroke="#3b82f6"
                  strokeWidth={3}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="automationRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="userSatisfaction"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="responseTime"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                  radius={[2, 2, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Performance Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Automation Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span>User Satisfaction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>Response Time (ms)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Rate vs Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Automation Rate Progression</CardTitle>
            <CardDescription>
              Progress toward automation targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Automation Rate']} />
                  <Area
                    type="monotone"
                    dataKey="automationRate"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  {/* Target line */}
                  <Line
                    type="monotone"
                    dataKey={() => 67}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <span>Current: {metrics.automationRate.current}%</span>
              <span className="text-red-500">Target: 67%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Rate Analysis</CardTitle>
            <CardDescription>
              Error trends and quality improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [value, 'Errors']} />
                  <Bar
                    dataKey="errorRate"
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Quality Score: {metrics.errorReduction.qualityScore.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Key performance bottlenecks and optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.userSatisfaction.bottlenecks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-amber-900">Identified Bottlenecks:</h4>
                <div className="flex flex-wrap gap-2">
                  {metrics.userSatisfaction.bottlenecks.map((bottleneck, index) => (
                    <Badge key={index} variant="outline" className="text-amber-700 border-amber-300">
                      {bottleneck}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-green-900">Optimization Wins</h4>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {metrics.timeSavings.savedHours.toFixed(1)}h saved through automation</li>
                  <li>• {metrics.errorReduction.errorReduction.toFixed(1)}% error reduction achieved</li>
                  <li>• {metrics.systemHealth.uptime.toFixed(1)}% uptime maintained</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-blue-900">Next Targets</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Reach 67% automation rate</li>
                  <li>• Reduce response time to &lt;500ms</li>
                  <li>• Achieve 95% user satisfaction</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}