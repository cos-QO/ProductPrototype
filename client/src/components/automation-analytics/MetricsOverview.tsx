/**
 * Metrics Overview Component
 * Displays key automation metrics in a visual format
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Zap,
  Target,
  Clock,
  DollarSign
} from 'lucide-react';
import { AutomationMetrics } from '../../../types/automation';

interface MetricsOverviewProps {
  metrics: AutomationMetrics;
  isLoading: boolean;
}

export function MetricsOverview({ metrics, isLoading }: MetricsOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automation Metrics</CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Automation Metrics
        </CardTitle>
        <CardDescription>
          Key performance indicators for automated systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Automation Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Automation Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {metrics.automationRate.current}%
              </span>
              <Badge variant="outline" className="flex items-center gap-1">
                {getTrendIcon(metrics.automationRate.trend)}
                {Math.abs(metrics.automationRate.weekOverWeek).toFixed(1)}%
              </Badge>
            </div>
          </div>
          <Progress 
            value={metrics.automationRate.current} 
            max={100}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Current: {metrics.automationRate.current}%</span>
            <span>Target: {metrics.automationRate.target}%</span>
          </div>
        </div>

        {/* Cost Efficiency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Cost Efficiency</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                ${metrics.costEfficiency.savings.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">
                {metrics.costEfficiency.roi.toFixed(1)}% ROI
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">LLM Costs:</span>
              <div className="font-medium">
                ${metrics.costEfficiency.llmCosts.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Manual Costs:</span>
              <div className="font-medium">
                ${metrics.costEfficiency.manualProcessingCosts.toFixed(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Time Savings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Time Savings</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                {metrics.timeSavings.savedHours.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500">
                {metrics.timeSavings.productivity.toFixed(0)}% efficiency
              </div>
            </div>
          </div>
          <Progress 
            value={metrics.timeSavings.productivity} 
            max={100}
            className="h-2"
          />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Automation:</span>
              <div className="font-medium">
                {metrics.timeSavings.automationTime.toFixed(1)}m
              </div>
            </div>
            <div>
              <span className="text-gray-500">Manual Est:</span>
              <div className="font-medium">
                {metrics.timeSavings.manualTime.toFixed(0)}m
              </div>
            </div>
          </div>
        </div>

        {/* Error Reduction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Quality Improvement</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">
                {metrics.errorReduction.qualityScore.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">
                {metrics.errorReduction.errorReduction > 0 ? '+' : ''}
                {metrics.errorReduction.errorReduction.toFixed(1)}% vs manual
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Automation:</span>
              <div className="font-medium">
                {metrics.errorReduction.automationAccuracy.toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500">Manual Est:</span>
              <div className="font-medium">
                {metrics.errorReduction.manualAccuracy.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* User Satisfaction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">User Satisfaction</span>
            <div className="text-right">
              <div className="text-lg font-bold">
                {metrics.userSatisfaction.feedbackScore.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">
                {metrics.userSatisfaction.approvalTime.toFixed(1)}m avg approval
              </div>
            </div>
          </div>
          <Progress 
            value={metrics.userSatisfaction.feedbackScore} 
            max={100}
            className="h-2"
          />
          {metrics.userSatisfaction.bottlenecks.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Bottlenecks:</span>
              <div className="flex flex-wrap gap-1">
                {metrics.userSatisfaction.bottlenecks.slice(0, 2).map((bottleneck, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs"
                  >
                    {bottleneck}
                  </Badge>
                ))}
                {metrics.userSatisfaction.bottlenecks.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{metrics.userSatisfaction.bottlenecks.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}