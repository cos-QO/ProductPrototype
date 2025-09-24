/**
 * Cost Analysis Component
 * Comprehensive cost tracking and optimization analysis
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp,
  PieChart,
  Calculator,
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { AutomationMetrics, CostBreakdown, TrendData } from '../../../types/automation';

interface CostAnalysisProps {
  costBreakdown?: CostBreakdown;
  costEfficiency?: AutomationMetrics['costEfficiency'];
  trends?: TrendData[];
  timeRange: '1h' | '24h' | '7d' | '30d';
  isLoading: boolean;
}

export function CostAnalysis({ 
  costBreakdown, 
  costEfficiency, 
  trends,
  timeRange,
  isLoading 
}: CostAnalysisProps) {
  if (isLoading || !costBreakdown || !costEfficiency) {
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

  const totalCosts = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);
  const costSavings = costEfficiency.savings;
  const roi = costEfficiency.roi;

  // Prepare cost breakdown data for pie chart
  const pieChartData = [
    { name: 'LLM API', value: costBreakdown.llmApiCosts, color: '#3b82f6' },
    { name: 'Compute', value: costBreakdown.computeResources, color: '#10b981' },
    { name: 'Storage', value: costBreakdown.storageOptimization, color: '#f59e0b' },
    { name: 'Manual Labor', value: costBreakdown.manualLabor, color: '#ef4444' },
    { name: 'QA', value: costBreakdown.qualityAssurance, color: '#8b5cf6' },
    { name: 'Infrastructure', value: costBreakdown.infrastructure, color: '#6b7280' }
  ].filter(item => item.value > 0);

  // Prepare trend data for cost over time
  const costTrendData = trends?.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    costs: trend.costs,
    savings: Math.max(0, 100 - trend.costs) // Estimated savings
  })) || [];

  return (
    <div className="space-y-6">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Costs</p>
                <p className="text-2xl font-bold">${totalCosts.toFixed(0)}</p>
                <p className="text-xs text-gray-500">This {timeRange}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${costSavings.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">vs Manual Processing</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ROI</p>
                <p className="text-2xl font-bold text-purple-600">
                  {roi.toFixed(0)}%
                </p>
                <Badge 
                  variant={roi > 100 ? 'default' : roi > 50 ? 'secondary' : 'outline'}
                  className="mt-1"
                >
                  {roi > 100 ? 'Excellent' : roi > 50 ? 'Good' : 'Improving'}
                </Badge>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of automation costs by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieChartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium ml-auto">
                    ${item.value.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Cost Trends
            </CardTitle>
            <CardDescription>
              Costs and savings over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`, 
                      name === 'costs' ? 'Costs' : 'Savings'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            Detailed Cost Analysis
          </CardTitle>
          <CardDescription>
            Breakdown of all cost components with optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(costBreakdown).map(([category, amount]) => {
              const percentage = (amount / totalCosts) * 100;
              const categoryName = {
                llmApiCosts: 'LLM API Costs',
                computeResources: 'Compute Resources',
                storageOptimization: 'Storage',
                manualLabor: 'Manual Labor',
                qualityAssurance: 'Quality Assurance',
                infrastructure: 'Infrastructure'
              }[category] || category;

              const isHighCost = percentage > 25;
              const isOptimizable = ['llmApiCosts', 'computeResources', 'manualLabor'].includes(category);

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{categoryName}</span>
                      {isHighCost && (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      {isOptimizable && (
                        <Badge variant="outline" className="text-xs">
                          Optimizable
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold">${amount.toFixed(2)}</span>
                      <div className="text-sm text-gray-500">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    max={100}
                    className="h-2"
                  />
                  
                  {/* Optimization suggestions */}
                  {isOptimizable && (
                    <div className="text-sm text-gray-600 ml-4">
                      {category === 'llmApiCosts' && 
                        '💡 Consider implementing response caching and batch processing'}
                      {category === 'computeResources' && 
                        '💡 Optimize resource allocation and implement auto-scaling'}
                      {category === 'manualLabor' && 
                        '💡 Increase automation coverage to reduce manual intervention'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization Opportunities</CardTitle>
          <CardDescription>
            Immediate actions to reduce costs and improve efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">
                  Implement LLM Response Caching
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Cache similar requests to reduce API calls by ~30%
                </p>
                <Badge variant="outline" className="mt-2">
                  Potential savings: ${(costBreakdown.llmApiCosts * 0.3).toFixed(0)}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Calculator className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">
                  Optimize Compute Resource Usage
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Implement auto-scaling and resource pooling
                </p>
                <Badge variant="outline" className="mt-2">
                  Potential savings: ${(costBreakdown.computeResources * 0.25).toFixed(0)}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Target className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">
                  Increase Automation Coverage
                </h4>
                <p className="text-sm text-purple-700 mt-1">
                  Target remaining manual processes for automation
                </p>
                <Badge variant="outline" className="mt-2">
                  Potential savings: ${(costBreakdown.manualLabor * 0.4).toFixed(0)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}