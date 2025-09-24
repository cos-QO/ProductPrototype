/**
 * Automation Progress Component
 * Displays progress toward automation targets with visual indicators
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { AutomationMetrics } from '../../../types/automation';

interface AutomationProgressProps {
  automationRate: AutomationMetrics['automationRate'];
  target: number;
  isLoading: boolean;
}

export function AutomationProgress({ automationRate, target, isLoading }: AutomationProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (automationRate.current / target) * 100;
  const remaining = target - automationRate.current;
  const isOnTrack = automationRate.current >= target * 0.8; // 80% of target
  const isAhead = automationRate.current > target;

  const getTrendIcon = () => {
    switch (automationRate.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getProgressColor = () => {
    if (isAhead) return 'bg-green-500';
    if (isOnTrack) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  const getStatusBadge = () => {
    if (isAhead) return { variant: 'default' as const, text: 'Ahead', color: 'text-green-600' };
    if (isOnTrack) return { variant: 'secondary' as const, text: 'On Track', color: 'text-blue-600' };
    return { variant: 'outline' as const, text: 'Behind', color: 'text-yellow-600' };
  };

  const status = getStatusBadge();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Automation Progress
        </CardTitle>
        <CardDescription>
          Progress toward 67% automation target (33% edge cases)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current vs Target */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-blue-600">
                {automationRate.current.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-sm text-gray-600">
                  {automationRate.weekOverWeek > 0 ? '+' : ''}{automationRate.weekOverWeek.toFixed(1)}%
                </span>
              </div>
            </div>
            <Badge variant={status.variant} className={status.color}>
              {status.text}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={Math.min(progressPercentage, 100)} 
              max={100}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Current: {automationRate.current.toFixed(1)}%</span>
              <span>Target: {target}%</span>
            </div>
          </div>
        </div>

        {/* Progress Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Progress to Target</div>
            <div className="text-lg font-semibold">
              {Math.min(progressPercentage, 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">
              {isAhead ? 'Target exceeded!' : `${progressPercentage.toFixed(0)}% complete`}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Remaining</div>
            <div className="text-lg font-semibold">
              {isAhead ? '0%' : `${remaining.toFixed(1)}%`}
            </div>
            <div className="text-xs text-gray-500">
              {isAhead ? 'Surpassed target' : 'To reach target'}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Milestones</h4>
          <div className="space-y-2">
            {[
              { threshold: 25, label: '25% - Basic Automation', achieved: automationRate.current >= 25 },
              { threshold: 50, label: '50% - Core Processes', achieved: automationRate.current >= 50 },
              { threshold: 67, label: '67% - Target Achievement', achieved: automationRate.current >= 67 },
              { threshold: 75, label: '75% - Advanced Optimization', achieved: automationRate.current >= 75 }
            ].map((milestone) => (
              <div key={milestone.threshold} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    milestone.achieved ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className={`text-sm ${
                    milestone.achieved ? 'text-green-600 font-medium' : 'text-gray-600'
                  }`}>
                    {milestone.label}
                  </span>
                </div>
                {milestone.achieved && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    ✓ Complete
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-gray-900">Trend Analysis</span>
          </div>
          <div className="text-sm text-gray-600">
            {automationRate.trend === 'increasing' && (
              <>
                <span className="text-green-600 font-medium">Positive trend:</span> 
                {' '}Automation rate increasing by {automationRate.weekOverWeek.toFixed(1)}% this week.
                {!isAhead && remaining > 0 && (
                  <> At this rate, target will be reached in approximately {
                    Math.ceil(remaining / Math.abs(automationRate.weekOverWeek))
                  } weeks.</>
                )}
              </>
            )}
            {automationRate.trend === 'decreasing' && (
              <>
                <span className="text-red-600 font-medium">Declining trend:</span>
                {' '}Automation rate decreased by {Math.abs(automationRate.weekOverWeek).toFixed(1)}% this week. 
                Review and adjust automation strategy.
              </>
            )}
            {automationRate.trend === 'stable' && (
              <>
                <span className="text-gray-600 font-medium">Stable trend:</span>
                {' '}Automation rate is stable. 
                {!isAhead && 'Consider implementing new automation initiatives to progress toward target.'}
              </>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {!isAhead && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Next Steps</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {automationRate.current < 25 && (
                <div>• Focus on automating basic data validation workflows</div>
              )}
              {automationRate.current >= 25 && automationRate.current < 50 && (
                <div>• Implement automated testing for core import processes</div>
              )}
              {automationRate.current >= 50 && automationRate.current < 67 && (
                <div>• Target the remaining 33% edge cases for automation</div>
              )}
              <div>• Review manual bottlenecks and prioritize for automation</div>
              <div>• Optimize existing automated processes for better performance</div>
            </div>
          </div>
        )}

        {isAhead && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-900">Target Exceeded!</span>
            </div>
            <div className="text-sm text-green-700">
              Congratulations! You've exceeded the 67% automation target. 
              Consider setting higher targets or focusing on optimization and quality improvements.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}