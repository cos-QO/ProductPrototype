/**
 * Optimization Recommendations Component
 * Displays actionable recommendations for improving automation
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { OptimizationRecommendations as OptimizationRecommendationsType, AutomationMetrics } from '../../../types/automation';

interface OptimizationRecommendationsProps {
  recommendations?: OptimizationRecommendationsType;
  metrics?: AutomationMetrics;
  isLoading: boolean;
}

export function OptimizationRecommendations({ 
  recommendations, 
  metrics, 
  isLoading 
}: OptimizationRecommendationsProps) {
  if (isLoading || !recommendations || !metrics) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((j) => (
                  <div key={j} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getEffortColor = (effort: 'low' | 'medium' | 'high') => {
    switch (effort) {
      case 'low':
        return 'text-green-600 border-green-300 bg-green-50';
      case 'medium':
        return 'text-yellow-600 border-yellow-300 bg-yellow-50';
      case 'high':
        return 'text-red-600 border-red-300 bg-red-50';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-600 border-red-300 bg-red-50';
    if (priority <= 4) return 'text-yellow-600 border-yellow-300 bg-yellow-50';
    return 'text-green-600 border-green-300 bg-green-50';
  };

  const getComplexityColor = (complexity: 'low' | 'medium' | 'high') => {
    switch (complexity) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Wins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Quick Wins
          </CardTitle>
          <CardDescription>
            Low-effort, high-impact optimizations you can implement immediately
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.costOptimization
              .filter(rec => rec.effort === 'low')
              .concat(recommendations.performanceOptimization.filter(rec => rec.effort === 'low'))
              .slice(0, 3)
              .map((rec, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                  <Lightbulb className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-green-900">{rec.recommendation}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-green-700">
                          <span>Timeline: {rec.timeline}</span>
                          {'potentialSavings' in rec && (
                            <span>Savings: ${rec.potentialSavings?.toFixed(0)}</span>
                          )}
                          {'performanceGain' in rec && (
                            <span>Performance: +{rec.performanceGain}%</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Implement
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            
            {recommendations.automationOpportunities
              .filter(opp => opp.complexity === 'low')
              .slice(0, 2)
              .map((opp, index) => (
                <div key={`auto-${index}`} className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <Target className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Automate {opp.area}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                          <span>Potential: {opp.potentialAutomation}%</span>
                          <span>Complexity: {opp.complexity}</span>
                          <Badge variant="outline" className={getPriorityColor(opp.priority)}>
                            Priority {opp.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                        Plan
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Cost Optimization
          </CardTitle>
          <CardDescription>
            Reduce operational costs while maintaining performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.costOptimization.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{rec.recommendation}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={getEffortColor(rec.effort)}>
                          {rec.effort} effort
                        </Badge>
                        <span className="text-sm text-gray-600">Timeline: {rec.timeline}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      ${rec.potentialSavings?.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">potential savings</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    ROI Impact: +{((rec.potentialSavings || 0) / metrics.costEfficiency.llmCosts * 100).toFixed(1)}%
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Total Cost Optimization Potential</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${recommendations.costOptimization.reduce((sum, rec) => sum + (rec.potentialSavings || 0), 0).toFixed(0)}
            </div>
            <div className="text-sm text-green-700">
              Additional annual savings with full implementation
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Performance Optimization
          </CardTitle>
          <CardDescription>
            Improve system performance and user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.performanceOptimization.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{rec.recommendation}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={getEffortColor(rec.effort)}>
                          {rec.effort} effort
                        </Badge>
                        <span className="text-sm text-gray-600">Timeline: {rec.timeline}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      +{rec.performanceGain}%
                    </div>
                    <div className="text-xs text-gray-500">performance gain</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Impact on overall system performance score
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Automation Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Automation Opportunities
          </CardTitle>
          <CardDescription>
            Areas where automation can be expanded to reach the 67% target
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.automationOpportunities
              .sort((a, b) => a.priority - b.priority)
              .map((opp, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">{opp.area}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className={getPriorityColor(opp.priority)}>
                            Priority {opp.priority}
                          </Badge>
                          <span className={`text-sm font-medium ${getComplexityColor(opp.complexity)}`}>
                            {opp.complexity} complexity
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {opp.potentialAutomation}%
                      </div>
                      <div className="text-xs text-gray-500">automation potential</div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${opp.potentialAutomation}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Contributes {opp.potentialAutomation}% toward automation target
                    </div>
                    <Button size="sm" variant="outline">
                      Start Planning
                    </Button>
                  </div>
                </div>
              ))}
          </div>

          {/* Progress toward target */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-900">Automation Target Progress</span>
              <span className="text-purple-700">
                {metrics.automationRate.current.toFixed(1)}% / 67%
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
              <div
                className="bg-purple-500 h-3 rounded-full"
                style={{ width: `${(metrics.automationRate.current / 67) * 100}%` }}
              />
            </div>
            <div className="text-sm text-purple-700">
              {(67 - metrics.automationRate.current).toFixed(1)}% remaining to reach target
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Implementation Roadmap
          </CardTitle>
          <CardDescription>
            Suggested timeline for implementing optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Next 2 weeks */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Next 2 Weeks (Quick Wins)</h4>
              <div className="space-y-2">
                {[
                  ...recommendations.costOptimization.filter(r => r.effort === 'low'),
                  ...recommendations.performanceOptimization.filter(r => r.effort === 'low')
                ].slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{rec.recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next month */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Next Month (Medium Effort)</h4>
              <div className="space-y-2">
                {[
                  ...recommendations.costOptimization.filter(r => r.effort === 'medium'),
                  ...recommendations.performanceOptimization.filter(r => r.effort === 'medium')
                ].slice(0, 2).map((rec, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>{rec.recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next quarter */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Next Quarter (Strategic Initiatives)</h4>
              <div className="space-y-2">
                {recommendations.automationOpportunities
                  .filter(opp => opp.priority <= 2)
                  .map((opp, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span>Implement automation for {opp.area}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}