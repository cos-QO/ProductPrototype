import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Activity,
  BarChart3,
} from 'lucide-react';

import { RiskIndicator, RiskMatrix } from './RiskIndicator';

import type { ApprovalDashboardStats, RiskLevel, ApprovalType } from '@/types/approval-types';

interface ApprovalStatsProps {
  stats: ApprovalDashboardStats;
  userRole: string;
  compact?: boolean;
  className?: string;
}

export const ApprovalStats: React.FC<ApprovalStatsProps> = ({
  stats,
  userRole,
  compact = false,
  className = '',
}) => {
  // Calculate percentages and trends
  const totalPending = stats.totalPending;
  const urgentCount = (stats.byRiskLevel.high || 0) + (stats.byRiskLevel.critical || 0);
  const urgentPercentage = totalPending > 0 ? (urgentCount / totalPending) * 100 : 0;
  
  const automationRate = stats.automationRate || 0;
  const avgDecisionTime = stats.averageDecisionTime || 0;

  // Get trend indicators
  const getTrendIcon = (value: number, baseline: number = 50) => {
    if (value > baseline * 1.1) return TrendingUp;
    if (value < baseline * 0.9) return TrendingDown;
    return Activity;
  };

  const getTrendColor = (value: number, baseline: number = 50, inverse: boolean = false) => {
    const isGood = inverse ? value < baseline : value > baseline;
    if (Math.abs(value - baseline) < baseline * 0.1) return 'text-muted-foreground';
    return isGood ? 'text-green-500' : 'text-red-500';
  };

  // Risk level distribution for chart
  const riskData = Object.entries(stats.byRiskLevel).map(([level, count]) => ({
    id: level,
    label: level.charAt(0).toUpperCase() + level.slice(1),
    level: level as RiskLevel,
    score: count * 10, // Mock score for display
  }));

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold">{totalPending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-500">{urgentCount}</div>
              <div className="text-xs text-muted-foreground">Urgent</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Automation Rate</span>
              <span className="font-medium">{Math.round(automationRate)}%</span>
            </div>
            <Progress value={automationRate} className="h-1" />
          </div>
          
          <div className="text-xs text-center text-muted-foreground">
            Avg response: {Math.round(avgDecisionTime)}m
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overview
          </CardTitle>
          <CardDescription>
            Your approval performance and workload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Approvals */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Pending Approvals</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={totalPending > 10 ? 'destructive' : 'secondary'}>
                {totalPending}
              </Badge>
              {urgentCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {urgentCount} urgent
                </Badge>
              )}
            </div>
          </div>

          {/* Automation Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Automation Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{Math.round(automationRate)}%</span>
                {React.createElement(getTrendIcon(automationRate, 70), {
                  className: `h-3 w-3 ${getTrendColor(automationRate, 70)}`,
                })}
              </div>
            </div>
            <Progress value={automationRate} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Target: 80% • Current: {Math.round(automationRate)}%
            </div>
          </div>

          {/* Average Decision Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Avg Decision Time</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">{Math.round(avgDecisionTime)}m</span>
              {React.createElement(getTrendIcon(avgDecisionTime, 30), {
                className: `h-3 w-3 ${getTrendColor(avgDecisionTime, 30, true)}`,
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Performance
          </CardTitle>
          <CardDescription>
            Personal metrics and achievements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {stats.userStats.todayApproved}
              </div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {stats.userStats.weekApproved}
              </div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Accuracy Score</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">
                  {Math.round(stats.userStats.accuracyScore)}%
                </span>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Response Time</span>
              <span className="text-sm font-medium">
                {Math.round(stats.userStats.averageResponseTime)}m
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
          <CardDescription>
            Breakdown by risk level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiskMatrix risks={riskData} compact={true} />
        </CardContent>
      </Card>

      {/* Approval Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.byType).map(([type, count]) => {
            const typeLabel = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const percentage = totalPending > 0 ? (count / totalPending) * 100 : 0;
            
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{typeLabel}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress value={percentage} className="h-1" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <Badge variant={
              stats.systemHealth.status === 'healthy' ? 'default' :
              stats.systemHealth.status === 'degraded' ? 'secondary' : 'destructive'
            }>
              {stats.systemHealth.status}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Uptime</span>
            <span className="font-medium">{stats.systemHealth.uptime.toFixed(1)}%</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Error Rate</span>
            <span className="font-medium">
              {(stats.systemHealth.errorRate * 100).toFixed(2)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Response Time</span>
            <span className="font-medium">{Math.round(stats.systemHealth.avgResponseTime)}ms</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};