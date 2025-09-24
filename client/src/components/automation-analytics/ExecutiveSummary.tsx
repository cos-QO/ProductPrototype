/**
 * Executive Summary Component
 * High-level dashboard for executive stakeholders
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award,
  BarChart3,
  Download,
  Mail,
  Calendar
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
  Area
} from 'recharts';
import { 
  ExecutiveSummary as ExecutiveSummaryType, 
  AutomationMetrics, 
  BusinessImpact 
} from '../../../types/automation';

interface ExecutiveSummaryProps {
  summary?: ExecutiveSummaryType;
  metrics?: AutomationMetrics;
  businessImpact?: BusinessImpact;
  isLoading: boolean;
}

export function ExecutiveSummary({ 
  summary, 
  metrics, 
  businessImpact, 
  isLoading 
}: ExecutiveSummaryProps) {
  if (isLoading || !summary || !metrics || !businessImpact) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare trend data for executive chart
  const executiveTrends = summary.trends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    automation: trend.automationRate,
    satisfaction: trend.userSatisfaction,
    performance: trend.performance
  }));

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-900">
                Automation Analytics Executive Summary
              </CardTitle>
              <CardDescription className="text-blue-700">
                Strategic overview of automation performance and business impact
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-blue-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Report Date: {currentDate}</span>
            </div>
            <Badge variant="default" className="bg-blue-600">
              Current Period
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Business Value Created</p>
                <p className="text-3xl font-bold text-green-900">
                  ${(businessImpact.revenueImpact + businessImpact.costSavings).toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {metrics.costEfficiency.roi.toFixed(0)}% ROI
                  </span>
                </div>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Automation Progress</p>
                <p className="text-3xl font-bold text-blue-900">
                  {metrics.automationRate.current.toFixed(0)}%
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(metrics.automationRate.current / 67) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-blue-600 whitespace-nowrap">
                    Target: 67%
                  </span>
                </div>
              </div>
              <Target className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Quality Excellence</p>
                <p className="text-3xl font-bold text-purple-900">
                  {metrics.errorReduction.qualityScore.toFixed(0)}%
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-600">
                    {Math.abs(metrics.errorReduction.errorReduction).toFixed(1)}% improvement
                  </span>
                </div>
              </div>
              <Award className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Time to Market</p>
                <p className="text-3xl font-bold text-orange-900">
                  {businessImpact.timeToMarket.toFixed(0)}%
                </p>
                <p className="text-sm text-orange-600 mt-2">
                  Faster product launches
                </p>
              </div>
              <BarChart3 className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold-500" />
            Key Achievements This Period
          </CardTitle>
          <CardDescription>
            Major milestones and successes in automation implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {summary.keyAchievements.slice(0, Math.ceil(summary.keyAchievements.length / 2)).map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-green-900">{achievement}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {summary.keyAchievements.slice(Math.ceil(summary.keyAchievements.length / 2)).map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">
                      {Math.ceil(summary.keyAchievements.length / 2) + index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{achievement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Performance Trends</CardTitle>
          <CardDescription>
            Key metrics tracking over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={executiveTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'automation' ? 'Automation Rate' :
                    name === 'satisfaction' ? 'User Satisfaction' :
                    'Performance Score'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="automation"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="performance"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Line
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-8 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Automation Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Performance Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span>User Satisfaction</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
          <CardDescription>
            High-level initiatives to drive continued success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Priority Initiatives</h4>
              <div className="space-y-3">
                {summary.recommendations.automationOpportunities
                  .sort((a, b) => a.priority - b.priority)
                  .slice(0, 3)
                  .map((rec, index) => (
                    <div key={index} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-blue-900">{rec.area}</h5>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                          Priority {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        Potential automation: {rec.potentialAutomation}%
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${rec.potentialAutomation}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Next Steps</h4>
              <div className="space-y-3">
                {summary.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Impact Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-green-900">Business Impact Summary</CardTitle>
          <CardDescription className="text-green-700">
            Quantified value delivery and competitive advantages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${businessImpact.costSavings.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Annual Cost Savings</div>
              <div className="text-xs text-green-600 mt-2">
                vs. manual processing costs
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {businessImpact.customerSatisfaction}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Customer Satisfaction</div>
              <div className="text-xs text-blue-600 mt-2">
                +{businessImpact.customerSatisfaction - 80}% improvement
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {businessImpact.timeToMarket.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Faster Time to Market</div>
              <div className="text-xs text-purple-600 mt-2">
                Competitive advantage gained
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3">Competitive Advantages</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {businessImpact.competitiveAdvantage.map((advantage, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-gold-500" />
                  <span>{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Continue the Automation Journey
              </h3>
              <p className="text-blue-700 mt-1">
                Schedule a strategic review to discuss next phase expansion and ROI optimization
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Schedule Review
              </Button>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                View Detailed Reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}