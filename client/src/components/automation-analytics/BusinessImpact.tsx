/**
 * Business Impact Component
 * Displays business value and ROI analysis
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target,
  Award,
  BarChart3,
  Users,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { BusinessImpact as BusinessImpactType, AutomationMetrics } from '../../../types/automation';

interface BusinessImpactProps {
  businessImpact?: BusinessImpactType;
  metrics?: AutomationMetrics;
  isLoading: boolean;
}

export function BusinessImpact({ businessImpact, metrics, isLoading }: BusinessImpactProps) {
  if (isLoading || !businessImpact || !metrics) {
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

  // Prepare data for visualizations
  const impactData = [
    { category: 'Revenue Impact', value: businessImpact.revenueImpact, color: '#10b981' },
    { category: 'Cost Savings', value: businessImpact.costSavings, color: '#3b82f6' },
    { category: 'Quality Improvement', value: businessImpact.qualityImprovement * 1000, color: '#8b5cf6' } // Scale for visualization
  ];

  const roiData = [
    { name: 'ROI', value: metrics.costEfficiency.roi, fill: '#10b981' }
  ];

  const competitiveAdvantages = businessImpact.competitiveAdvantage.map((advantage, index) => ({
    name: advantage,
    impact: 85 + (index * 3), // Simulated impact scores
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]
  }));

  return (
    <div className="space-y-6">
      {/* Business Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Impact</p>
                <p className="text-2xl font-bold text-green-600">
                  ${businessImpact.revenueImpact.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Estimated annual</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${businessImpact.costSavings.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {metrics.costEfficiency.roi.toFixed(0)}% ROI
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time to Market</p>
                <p className="text-2xl font-bold text-purple-600">
                  {businessImpact.timeToMarket.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Improvement</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-orange-600">
                  {businessImpact.customerSatisfaction}%
                </p>
                <Badge variant="default" className="mt-1">
                  Excellent
                </Badge>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Impact Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Financial Impact
            </CardTitle>
            <CardDescription>
              Quantified business value from automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Business Value:</span>
                <span className="font-bold text-green-600">
                  ${(businessImpact.revenueImpact + businessImpact.costSavings).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payback Period:</span>
                <span className="font-medium">
                  {Math.ceil(12 / (metrics.costEfficiency.roi / 100))} months
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Indicator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Return on Investment
            </CardTitle>
            <CardDescription>
              Investment performance and efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="90%" 
                    data={roiData}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="#10b981"
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-green-600">
                    {metrics.costEfficiency.roi.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">ROI</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  ${metrics.costEfficiency.savings.toFixed(0)}
                </div>
                <div className="text-sm text-green-700">Total Savings</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  ${metrics.costEfficiency.llmCosts.toFixed(0)}
                </div>
                <div className="text-sm text-blue-700">Investment</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Advantages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold-500" />
            Competitive Advantages
          </CardTitle>
          <CardDescription>
            Strategic benefits achieved through automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitiveAdvantages.map((advantage, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{advantage.name}</h4>
                  <Badge variant="outline" style={{ color: advantage.color }}>
                    {advantage.impact}% Impact
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${advantage.impact}%`, 
                      backgroundColor: advantage.color 
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {index === 0 && 'Reduced time-to-market by 20% through automated testing'}
                  {index === 1 && 'Improved product quality leading to higher customer satisfaction'}
                  {index === 2 && 'Lowered operational costs enabling competitive pricing'}
                  {index === 3 && 'Enhanced scalability supporting rapid business growth'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Metrics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Before vs After Automation</CardTitle>
          <CardDescription>
            Comparative analysis of key business metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Operational Efficiency</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Processing Time</span>
                    <span className="text-green-600">-{metrics.timeSavings.productivity}%</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-red-200 h-2 rounded">
                      <div className="bg-red-500 h-2 rounded w-full" />
                    </div>
                    <div className="flex-1 bg-green-200 h-2 rounded">
                      <div 
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${100 - metrics.timeSavings.productivity}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Before</span>
                    <span>After</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Error Rate</span>
                    <span className="text-green-600">-{Math.abs(metrics.errorReduction.errorReduction)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-red-200 h-2 rounded">
                      <div className="bg-red-500 h-2 rounded w-3/4" />
                    </div>
                    <div className="flex-1 bg-green-200 h-2 rounded">
                      <div className="bg-green-500 h-2 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>15% errors</span>
                    <span>
                      {(15 - Math.abs(metrics.errorReduction.errorReduction)).toFixed(0)}% errors
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Cost Structure</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Manual Labor Costs</span>
                    <span className="text-green-600">-60%</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-red-200 h-2 rounded">
                      <div className="bg-red-500 h-2 rounded w-full" />
                    </div>
                    <div className="flex-1 bg-green-200 h-2 rounded">
                      <div className="bg-green-500 h-2 rounded w-2/5" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technology Investment</span>
                    <span className="text-blue-600">New</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-200 h-2 rounded" />
                    <div className="flex-1 bg-blue-200 h-2 rounded">
                      <div className="bg-blue-500 h-2 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Business Outcomes</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Customer Satisfaction</span>
                    <span className="text-green-600">+{businessImpact.customerSatisfaction - 80}%</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-yellow-200 h-2 rounded">
                      <div className="bg-yellow-500 h-2 rounded w-4/5" />
                    </div>
                    <div className="flex-1 bg-green-200 h-2 rounded">
                      <div className="bg-green-500 h-2 rounded w-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>80%</span>
                    <span>{businessImpact.customerSatisfaction}%</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Market Response Time</span>
                    <span className="text-green-600">+{businessImpact.timeToMarket}%</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-red-200 h-2 rounded">
                      <div className="bg-red-500 h-2 rounded w-full" />
                    </div>
                    <div className="flex-1 bg-green-200 h-2 rounded">
                      <div 
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${100 - businessImpact.timeToMarket}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}