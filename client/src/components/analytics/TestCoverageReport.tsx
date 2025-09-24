/**
 * Test Coverage Report Component
 * Edge case coverage analysis and reporting
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TreeChart,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Shield,
  Bug,
  Zap,
  Clock,
  Users,
  FileText,
} from 'lucide-react';
import {
  Treemap,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

// Types
interface TestCoverageReportProps {
  edgeCaseStats: {
    totalCasesDetected: number;
    automaticallyResolved: number;
    requiresHumanReview: number;
    criticalIssues: number;
    categories: Array<{
      name: string;
      count: number;
      successRate: number;
    }>;
  };
  metrics: {
    edgeCaseCoverage: number;
    automationSuccessRate: number;
    errorDetectionAccuracy: number;
    falsePositiveRate: number;
  };
  timeRange: string;
}

interface CoverageCategory {
  name: string;
  category: string;
  covered: number;
  total: number;
  coverage: number;
  testCases: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  lastTested: Date;
  issues: Array<{
    type: 'gap' | 'failure' | 'flaky';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface TestExecution {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  coverage: number;
  errors: number;
  timestamp: Date;
}

const COVERAGE_COLORS = {
  excellent: '#00C49F',
  good: '#0088FE', 
  warning: '#FFBB28',
  critical: '#FF8042',
};

export function TestCoverageReport({ edgeCaseStats, metrics, timeRange }: TestCoverageReportProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'gaps'>('overview');

  // Generate coverage categories
  const coverageCategories: CoverageCategory[] = useMemo(() => {
    const categories = [
      {
        name: 'Field Validation',
        category: 'validation',
        covered: 120,
        total: 150,
        testCases: 85,
        priority: 'high' as const,
        issues: [
          { type: 'gap' as const, description: 'Missing tests for nested object validation', severity: 'medium' as const },
          { type: 'failure' as const, description: 'Flaky test for email format validation', severity: 'low' as const },
        ],
      },
      {
        name: 'Data Format Issues',
        category: 'format',
        covered: 95,
        total: 110,
        testCases: 62,
        priority: 'high' as const,
        issues: [
          { type: 'gap' as const, description: 'No tests for unusual encoding formats', severity: 'high' as const },
        ],
      },
      {
        name: 'Performance Edge Cases',
        category: 'performance',
        covered: 45,
        total: 60,
        testCases: 30,
        priority: 'medium' as const,
        issues: [],
      },
      {
        name: 'Integration Scenarios',
        category: 'integration',
        covered: 35,
        total: 50,
        testCases: 25,
        priority: 'medium' as const,
        issues: [
          { type: 'gap' as const, description: 'Missing API timeout scenarios', severity: 'medium' as const },
          { type: 'gap' as const, description: 'No tests for rate limiting edge cases', severity: 'low' as const },
        ],
      },
      {
        name: 'Security Boundary Tests',
        category: 'security',
        covered: 28,
        total: 40,
        testCases: 20,
        priority: 'critical' as const,
        issues: [
          { type: 'gap' as const, description: 'Missing injection attack scenarios', severity: 'high' as const },
        ],
      },
      {
        name: 'Concurrent Operations',
        category: 'concurrency',
        covered: 20,
        total: 35,
        testCases: 15,
        priority: 'medium' as const,
        issues: [
          { type: 'flaky' as const, description: 'Race condition tests are unreliable', severity: 'medium' as const },
        ],
      },
    ].map(cat => ({
      ...cat,
      coverage: (cat.covered / cat.total) * 100,
      status: (cat.covered / cat.total) >= 0.9 ? 'excellent' as const :
               (cat.covered / cat.total) >= 0.8 ? 'good' as const :
               (cat.covered / cat.total) >= 0.7 ? 'warning' as const : 'critical' as const,
      lastTested: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }));

    return categories;
  }, []);

  // Recent test executions
  const recentExecutions: TestExecution[] = useMemo(() => {
    return [
      {
        id: '1',
        name: 'Field Validation Suite',
        category: 'validation',
        status: 'passed',
        duration: 45000,
        coverage: 92.5,
        errors: 0,
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: '2', 
        name: 'Format Edge Cases',
        category: 'format',
        status: 'failed',
        duration: 38000,
        coverage: 78.2,
        errors: 3,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: '3',
        name: 'Performance Stress Test',
        category: 'performance',
        status: 'running',
        duration: 0,
        coverage: 0,
        errors: 0,
        timestamp: new Date(),
      },
      {
        id: '4',
        name: 'Security Boundary Tests',
        category: 'security',
        status: 'passed',
        duration: 120000,
        coverage: 85.7,
        errors: 0,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    ];
  }, []);

  // Coverage treemap data
  const treemapData = useMemo(() => {
    return coverageCategories.map(cat => ({
      name: cat.name,
      size: cat.total,
      covered: cat.covered,
      coverage: cat.coverage,
      fill: COVERAGE_COLORS[cat.status],
    }));
  }, [coverageCategories]);

  const overallCoverage = useMemo(() => {
    const totalCovered = coverageCategories.reduce((sum, cat) => sum + cat.covered, 0);
    const totalCases = coverageCategories.reduce((sum, cat) => sum + cat.total, 0);
    return totalCases > 0 ? (totalCovered / totalCases) * 100 : 0;
  }, [coverageCategories]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Coverage Analysis</h2>
          <p className="text-muted-foreground">
            Edge case detection and automation coverage report
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setViewMode('overview')}
            variant={viewMode === 'overview' ? 'default' : 'outline'}
            size="sm"
          >
            <TreeChart className="h-4 w-4 mr-1" />
            Overview
          </Button>
          <Button
            onClick={() => setViewMode('detailed')}
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            size="sm"
          >
            <FileText className="h-4 w-4 mr-1" />
            Detailed
          </Button>
          <Button
            onClick={() => setViewMode('gaps')}
            variant={viewMode === 'gaps' ? 'default' : 'outline'}
            size="sm"
          >
            <Bug className="h-4 w-4 mr-1" />
            Gaps
          </Button>
        </div>
      </div>

      {/* Overall Coverage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Coverage</p>
                <p className="text-2xl font-bold">{overallCoverage.toFixed(1)}%</p>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={overallCoverage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-Resolved</p>
                <p className="text-2xl font-bold">{edgeCaseStats.automaticallyResolved}</p>
              </div>
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-xs text-green-600 mt-1">
              {((edgeCaseStats.automaticallyResolved / edgeCaseStats.totalCasesDetected) * 100).toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold">{edgeCaseStats.criticalIssues}</p>
              </div>
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-xs text-red-600 mt-1">
              Requires immediate attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Detection Accuracy</p>
                <p className="text-2xl font-bold">{metrics.errorDetectionAccuracy.toFixed(1)}%</p>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-xs text-blue-600 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +2.3% improvement
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Visualization */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coverage Treemap */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage Distribution</CardTitle>
              <CardDescription>
                Visual representation of test coverage across categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {treemapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Test coverage by edge case category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coverageCategories.map(cat => ({
                        name: cat.name,
                        value: cat.covered,
                        fill: COVERAGE_COLORS[cat.status],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {coverageCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COVERAGE_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Coverage Table */}
      {viewMode === 'detailed' && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Coverage Report</CardTitle>
            <CardDescription>
              Comprehensive breakdown of test coverage by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Test Cases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Last Tested</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageCategories.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={category.coverage} className="w-20" />
                        <span className="text-sm font-medium">
                          {category.coverage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{category.testCases} tests</div>
                        <div className="text-muted-foreground">
                          {category.covered}/{category.total} cases
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(category.status)}
                        <Badge variant={
                          category.status === 'excellent' ? 'default' :
                          category.status === 'good' ? 'secondary' :
                          category.status === 'warning' ? 'destructive' : 'destructive'
                        }>
                          {category.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        category.priority === 'critical' ? 'destructive' :
                        category.priority === 'high' ? 'destructive' :
                        category.priority === 'medium' ? 'secondary' : 'outline'
                      }>
                        {category.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {category.lastTested.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline">
                              {category.issues.length} issues
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {category.issues.map((issue, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-medium">{issue.type}:</span> {issue.description}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gaps Analysis */}
      {viewMode === 'gaps' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Gaps & Issues</CardTitle>
              <CardDescription>
                Areas requiring additional test coverage or fixes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coverageCategories
                  .filter(cat => cat.issues.length > 0)
                  .map((category, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{category.name}</h4>
                          <Badge variant={
                            category.priority === 'critical' ? 'destructive' :
                            category.priority === 'high' ? 'destructive' :
                            'secondary'
                          }>
                            {category.priority} priority
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{category.coverage.toFixed(1)}% covered</span>
                          <Progress value={category.coverage} className="w-16" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {category.issues.map((issue, issueIndex) => (
                          <div key={issueIndex} className="flex items-start space-x-2 text-sm">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              issue.severity === 'high' ? 'bg-red-500' :
                              issue.severity === 'medium' ? 'bg-orange-500' :
                              'bg-yellow-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {issue.type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                {issue.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Test Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Executions</CardTitle>
          <CardDescription>
            Latest automation test runs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Suite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExecutions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{execution.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {execution.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getExecutionStatusIcon(execution.status)}
                      <Badge variant={
                        execution.status === 'passed' ? 'default' :
                        execution.status === 'failed' ? 'destructive' :
                        execution.status === 'running' ? 'secondary' : 'outline'
                      }>
                        {execution.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {execution.duration > 0 ? `${(execution.duration / 1000).toFixed(1)}s` : '-'}
                  </TableCell>
                  <TableCell>
                    {execution.coverage > 0 ? `${execution.coverage.toFixed(1)}%` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={execution.errors > 0 ? 'destructive' : 'default'}>
                      {execution.errors} errors
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {execution.timestamp.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Coverage Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Trends</CardTitle>
          <CardDescription>
            Test coverage improvements over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { period: '4w ago', coverage: 65, tests: 180 },
                { period: '3w ago', coverage: 72, tests: 195 },
                { period: '2w ago', coverage: 78, tests: 210 },
                { period: '1w ago', coverage: 82, tests: 225 },
                { period: 'This week', coverage: overallCoverage, tests: 240 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="coverage" fill="#0088FE" name="Coverage %" />
                <Bar yAxisId="right" dataKey="tests" fill="#00C49F" name="Test Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}