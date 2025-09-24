/**
 * EdgeCaseAnalytics - Detailed Edge Case Detection Analytics
 * Advanced analytics for AI-powered edge case detection and resolution
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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Brain,
  Users,
  Clock,
  DollarSign,
  Eye,
  Filter,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
  Sankey,
  ScatterChart,
  Scatter,
} from 'recharts';

// Types
interface EdgeCaseAnalyticsProps {
  data: any;
  timeRange: string;
  category: string;
}

interface EdgeCaseCategory {
  id: string;
  name: string;
  description: string;
  detectedCount: number;
  resolvedCount: number;
  accuracy: number;
  avgResolutionTime: number;
  confidenceScore: number;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  examples: string[];
  llmCost: number;
  humanInterventions: number;
}

interface DetectionPattern {
  pattern: string;
  frequency: number;
  accuracy: number;
  falsePositiveRate: number;
  avgConfidence: number;
  categories: string[];
}

interface ResolutionFlowData {
  source: string;
  target: string;
  value: number;
  color?: string;
}

const COLORS = {
  excellent: '#00C853',
  good: '#2196F3', 
  warning: '#FF9800',
  critical: '#F44336',
  info: '#9C27B0',
};

export function EdgeCaseAnalytics({ data, timeRange, category }: EdgeCaseAnalyticsProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'patterns' | 'flow' | 'performance'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'count' | 'accuracy' | 'trend'>('count');

  // Enhanced edge case categories with detailed analytics
  const edgeCaseCategories: EdgeCaseCategory[] = useMemo(() => {
    return [
      {
        id: 'field-validation',
        name: 'Field Validation Errors',
        description: 'Invalid field formats, missing required fields, data type mismatches',
        detectedCount: 1247,
        resolvedCount: 1174,
        accuracy: 94.2,
        avgResolutionTime: 1.3,
        confidenceScore: 87.5,
        trend: 'up',
        riskLevel: 'medium',
        examples: [
          'Email format validation failures',
          'Phone number format inconsistencies', 
          'Date format mismatches',
          'Required field omissions'
        ],
        llmCost: 23.45,
        humanInterventions: 73,
      },
      {
        id: 'data-format',
        name: 'Data Format Issues',
        description: 'Encoding problems, delimiter issues, character set conflicts',
        detectedCount: 892,
        resolvedCount: 818,
        accuracy: 91.7,
        avgResolutionTime: 2.1,
        confidenceScore: 82.3,
        trend: 'stable',
        riskLevel: 'high',
        examples: [
          'CSV delimiter variations',
          'UTF-8 encoding issues',
          'Quote character conflicts',
          'Line ending variations'
        ],
        llmCost: 41.23,
        humanInterventions: 74,
      },
      {
        id: 'performance-edge',
        name: 'Performance Edge Cases',
        description: 'Large file handling, memory constraints, timeout scenarios',
        detectedCount: 445,
        resolvedCount: 393,
        accuracy: 88.3,
        avgResolutionTime: 4.7,
        confidenceScore: 79.1,
        trend: 'up',
        riskLevel: 'medium',
        examples: [
          'Large file processing failures',
          'Memory usage spikes',
          'Processing timeout scenarios',
          'Concurrent operation conflicts'
        ],
        llmCost: 15.67,
        humanInterventions: 52,
      },
      {
        id: 'security-boundary',
        name: 'Security Boundary Tests',
        description: 'Input validation bypass attempts, injection patterns, privilege escalation',
        detectedCount: 263,
        resolvedCount: 255,
        accuracy: 97.1,
        avgResolutionTime: 0.8,
        confidenceScore: 94.2,
        trend: 'stable',
        riskLevel: 'critical',
        examples: [
          'SQL injection attempts',
          'XSS payload detection',
          'File upload bypass attempts',
          'Authentication boundary tests'
        ],
        llmCost: 8.91,
        humanInterventions: 8,
      },
      {
        id: 'integration-edge',
        name: 'Integration Edge Cases',
        description: 'API failures, third-party service issues, network problems',
        detectedCount: 189,
        resolvedCount: 167,
        accuracy: 88.4,
        avgResolutionTime: 3.2,
        confidenceScore: 76.8,
        trend: 'down',
        riskLevel: 'medium',
        examples: [
          'External API timeouts',
          'Rate limiting triggers',
          'Authentication token expiry',
          'Service dependency failures'
        ],
        llmCost: 12.34,
        humanInterventions: 22,
      },
    ];
  }, []);

  // Detection patterns analysis
  const detectionPatterns: DetectionPattern[] = useMemo(() => {
    return [
      {
        pattern: 'Fuzzy String Matching',
        frequency: 34.5,
        accuracy: 89.2,
        falsePositiveRate: 4.2,
        avgConfidence: 82.1,
        categories: ['field-validation', 'data-format'],
      },
      {
        pattern: 'Statistical Anomaly Detection',
        frequency: 28.7,
        accuracy: 92.8,
        falsePositiveRate: 2.8,
        avgConfidence: 87.6,
        categories: ['performance-edge', 'integration-edge'],
      },
      {
        pattern: 'LLM Pattern Recognition',
        frequency: 23.1,
        accuracy: 94.5,
        falsePositiveRate: 1.9,
        avgConfidence: 91.3,
        categories: ['security-boundary', 'data-format'],
      },
      {
        pattern: 'Historical Learning',
        frequency: 13.7,
        accuracy: 96.1,
        falsePositiveRate: 1.2,
        avgConfidence: 93.8,
        categories: ['field-validation', 'performance-edge'],
      },
    ];
  }, []);

  // Resolution flow data for Sankey diagram
  const resolutionFlowData: ResolutionFlowData[] = useMemo(() => {
    return [
      { source: 'Edge Cases Detected', target: 'Auto-Resolved', value: 2485, color: COLORS.excellent },
      { source: 'Edge Cases Detected', target: 'Human Review Required', value: 362, color: COLORS.warning },
      { source: 'Human Review Required', target: 'Approved & Fixed', value: 298, color: COLORS.good },
      { source: 'Human Review Required', target: 'Rejected/Ignored', value: 64, color: COLORS.critical },
      { source: 'Auto-Resolved', target: 'Validated Success', value: 2367, color: COLORS.excellent },
      { source: 'Auto-Resolved', target: 'False Positive', value: 118, color: COLORS.warning },
    ];
  }, []);

  // Performance metrics by category
  const categoryPerformance = useMemo(() => {
    return edgeCaseCategories.map(cat => ({
      category: cat.name,
      detected: cat.detectedCount,
      resolved: cat.resolvedCount,
      accuracy: cat.accuracy,
      avgTime: cat.avgResolutionTime,
      confidence: cat.confidenceScore,
      cost: cat.llmCost,
    }));
  }, [edgeCaseCategories]);

  // Trend data for time series
  const trendData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      detected: Math.floor(Math.random() * 50) + 80,
      resolved: Math.floor(Math.random() * 45) + 70,
      accuracy: Math.random() * 10 + 85,
    })).reverse();
  }, []);

  const getStatusIcon = (accuracy: number) => {
    if (accuracy >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (accuracy >= 90) return <CheckCircle className="h-4 w-4 text-blue-600" />;
    if (accuracy >= 80) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edge Case Detection Analytics</h2>
          <p className="text-muted-foreground">
            AI-powered edge case identification, resolution patterns, and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-40">
              <Eye className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="patterns">Detection Patterns</SelectItem>
              <SelectItem value="flow">Resolution Flow</SelectItem>
              <SelectItem value="performance">Performance Analysis</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">By Count</SelectItem>
              <SelectItem value="accuracy">By Accuracy</SelectItem>
              <SelectItem value="trend">By Trend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Dashboard */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Detected</p>
                    <p className="text-2xl font-bold">{data?.edgeCaseStats?.totalCasesDetected || 2847}</p>
                  </div>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-xs text-blue-600 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.5% vs last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Auto-Resolved</p>
                    <p className="text-2xl font-bold">{data?.edgeCaseStats?.automaticallyResolved || 2485}</p>
                  </div>
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {((2485 / 2847) * 100).toFixed(1)}% automation rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Human Review</p>
                    <p className="text-2xl font-bold">{data?.edgeCaseStats?.requiresHumanReview || 362}</p>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {((362 / 2847) * 100).toFixed(1)}% require intervention
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">LLM Cost</p>
                    <p className="text-2xl font-bold">${edgeCaseCategories.reduce((sum, cat) => sum + cat.llmCost, 0).toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-xs text-green-600 mt-1">
                  $0.035 per resolved case
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edge Case Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle>Edge Case Categories</CardTitle>
              <CardDescription>
                Detailed breakdown of detection and resolution by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>LLM Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {edgeCaseCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div>
                                <div>{category.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {category.description.length > 50 
                                    ? `${category.description.substring(0, 50)}...`
                                    : category.description}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-2 max-w-sm">
                                <p className="font-medium">{category.name}</p>
                                <p>{category.description}</p>
                                <div className="text-xs">
                                  <p>Examples:</p>
                                  <ul className="list-disc list-inside">
                                    {category.examples.slice(0, 3).map((example, i) => (
                                      <li key={i}>{example}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{category.detectedCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{category.resolvedCount.toLocaleString()}</span>
                          <Progress 
                            value={(category.resolvedCount / category.detectedCount) * 100} 
                            className="w-16 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(category.accuracy)}
                          <span>{category.accuracy.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{category.avgResolutionTime.toFixed(1)}s</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{category.confidenceScore.toFixed(1)}%</span>
                          <Progress value={category.confidenceScore} className="w-12 h-1" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(category.riskLevel)}>
                          {category.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(category.trend)}
                          <span className="text-xs">{category.trend}</span>
                        </div>
                      </TableCell>
                      <TableCell>${category.llmCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Trends</CardTitle>
              <CardDescription>
                Edge case detection and resolution trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="detected"
                      stackId="1"
                      stroke={COLORS.info}
                      fill={COLORS.info}
                      fillOpacity={0.6}
                      name="Detected"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stackId="1"
                      stroke={COLORS.excellent}
                      fill={COLORS.excellent}
                      fillOpacity={0.6}
                      name="Auto-Resolved"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detection Patterns Analysis */}
      {selectedView === 'patterns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pattern Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Pattern Performance</CardTitle>
                <CardDescription>
                  Accuracy and efficiency of different detection methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={detectionPatterns}>
                      <CartesianGrid />
                      <XAxis dataKey="frequency" name="Frequency %" />
                      <YAxis dataKey="accuracy" name="Accuracy %" />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background p-3 border rounded-lg shadow">
                                <p className="font-medium">{data.pattern}</p>
                                <p>Frequency: {data.frequency}%</p>
                                <p>Accuracy: {data.accuracy}%</p>
                                <p>False Positive: {data.falsePositiveRate}%</p>
                                <p>Avg Confidence: {data.avgConfidence}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter 
                        dataKey="accuracy" 
                        fill={COLORS.good}
                        shape="circle"
                        size={100}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pattern Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Analysis Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detectionPatterns.map((pattern, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pattern.pattern}</h4>
                        <Badge variant="outline">{pattern.frequency.toFixed(1)}% usage</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="ml-2 font-medium">{pattern.accuracy.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">False Positive:</span>
                          <span className="ml-2 font-medium">{pattern.falsePositiveRate.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Confidence:</span>
                          <span className="ml-2 font-medium">{pattern.avgConfidence.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Categories:</span>
                          <span className="ml-2 text-xs">{pattern.categories.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Performance Analysis */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance Comparison</CardTitle>
              <CardDescription>
                Detection accuracy, resolution time, and cost analysis by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="accuracy" fill={COLORS.excellent} name="Accuracy %" />
                    <Bar yAxisId="left" dataKey="confidence" fill={COLORS.good} name="Confidence %" />
                    <Bar yAxisId="right" dataKey="avgTime" fill={COLORS.warning} name="Avg Time (s)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>LLM Cost Analysis</CardTitle>
              <CardDescription>
                AI processing costs and ROI by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {edgeCaseCategories.map((category, index) => {
                  const costPerCase = category.llmCost / category.resolvedCount;
                  const manualCostSaved = category.resolvedCount * 0.5; // $0.50 per manual review saved
                  const roi = ((manualCostSaved - category.llmCost) / category.llmCost) * 100;

                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {category.resolvedCount} cases resolved
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${category.llmCost.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          ${costPerCase.toFixed(4)}/case
                        </p>
                        <p className="text-xs text-green-600">
                          ROI: {roi.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}