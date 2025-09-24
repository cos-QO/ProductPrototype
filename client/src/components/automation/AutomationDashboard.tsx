import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign, Target, Users, Zap } from 'lucide-react';
import { AutomationMetrics } from './AutomationMetrics';
import { EdgeCaseAnalytics } from './EdgeCaseAnalytics';
import { TrendAnalysis } from './TrendAnalysis';
import { ReportGenerator } from './ReportGenerator';

interface DashboardSummary {
  automationRate: number;
  totalTests: number;
  passRate: number;
  costSavings: number;
  timeSaved: number;
  edgeCasesDetected: number;
  alertsActive: number;
  roi: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface AutomationDashboardProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  refreshInterval?: number;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({
  dateRange,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardSummary();
    
    const interval = setInterval(() => {
      fetchDashboardSummary(false); // Silent refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [dateRange, refreshInterval]);

  const fetchDashboardSummary = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());

      const response = await fetch(`/api/analytics/dashboard-summary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAutomationRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !summary) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading dashboard: {error}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => fetchDashboardSummary()}
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Analytics</h1>
          <p className="text-muted-foreground">
            Real-time insights into automation performance and effectiveness
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last updated: {summary?.lastUpdated ? new Date(summary.lastUpdated).toLocaleTimeString() : 'Unknown'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => fetchDashboardSummary()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Automation Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getAutomationRateColor(summary.automationRate)}`}>
                {formatPercentage(summary.automationRate)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(summary.trend)}
                <span className="ml-1">Target: 80%</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Tests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Pass rate: {formatPercentage(summary.passRate)}
              </p>
            </CardContent>
          </Card>

          {/* Cost Savings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.costSavings)}
              </div>
              <p className="text-xs text-muted-foreground">
                ROI: {summary.roi.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Time Saved */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(summary.timeSaved)}</div>
              <p className="text-xs text-muted-foreground">
                Manual effort reduced
              </p>
            </CardContent>
          </Card>

          {/* Edge Cases Detected */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Edge Cases</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.edgeCasesDetected}</div>
              <p className="text-xs text-muted-foreground">
                Detected this period
              </p>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.alertsActive}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          {/* Team Productivity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Impact</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{summary.roi.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                Productivity gain
              </p>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Excellent</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="edge-cases">Edge Cases</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AutomationMetrics dateRange={dateRange} compact />
            <EdgeCaseAnalytics dateRange={dateRange} compact />
          </div>
          <ReportGenerator />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <AutomationMetrics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="edge-cases" className="space-y-4">
          <EdgeCaseAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendAnalysis dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};