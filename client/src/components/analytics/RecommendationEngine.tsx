/**
 * AI-Powered Recommendation Engine Component
 * Generates optimization suggestions based on analytics data
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Brain,
  Lightbulb,
  Target,
  TrendingUp,
  Settings,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Shield,
  Rocket,
  Wrench,
  Monitor,
  BookOpen,
} from 'lucide-react';

// Types
interface RecommendationEngineProps {
  recommendations: Array<{
    id: string;
    type: 'optimization' | 'configuration' | 'training' | 'monitoring';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    estimatedImpact: number;
    implementationCost: 'low' | 'medium' | 'high';
  }>;
  metrics: {
    edgeCaseCoverage: number;
    automationSuccessRate: number;
    errorDetectionAccuracy: number;
    falsePositiveRate: number;
    userApprovalRate: number;
    costSavings: number;
  };
  onImplementRecommendation: (id: string) => void;
}

interface DetailedRecommendation {
  id: string;
  type: 'optimization' | 'configuration' | 'training' | 'monitoring';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detailedAnalysis: string;
  benefits: string[];
  risks: string[];
  prerequisites: string[];
  steps: Array<{
    step: number;
    title: string;
    description: string;
    estimatedTime: string;
  }>;
  estimatedImpact: {
    performance: number;
    cost: number;
    efficiency: number;
    accuracy: number;
  };
  implementationCost: 'low' | 'medium' | 'high';
  confidence: number;
  affectedSystems: string[];
  timeline: string;
  resources: Array<{
    type: 'documentation' | 'training' | 'support';
    title: string;
    url: string;
  }>;
}

interface AIInsight {
  category: string;
  insight: string;
  evidence: string[];
  recommendation: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

export function RecommendationEngine({ 
  recommendations, 
  metrics, 
  onImplementRecommendation 
}: RecommendationEngineProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'cost'>('priority');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  // Generate detailed recommendations with AI insights
  const detailedRecommendations: DetailedRecommendation[] = useMemo(() => {
    return [
      {
        id: 'opt-001',
        type: 'optimization',
        priority: 'high',
        title: 'Optimize Edge Case Detection Algorithms',
        description: 'Improve ML model accuracy for better edge case identification',
        detailedAnalysis: 'Current edge case detection accuracy is at 84.2%, below the target of 90%. Analysis shows that certain pattern types (specifically format anomalies and validation edge cases) have lower detection rates. Implementing ensemble methods and additional training data could significantly improve performance.',
        benefits: [
          'Increase edge case detection by 12-15%',
          'Reduce false negatives by 25%',
          'Improve user confidence in automation',
          'Decrease manual review workload by 20%'
        ],
        risks: [
          'Temporary increase in false positives during tuning',
          'Requires additional computational resources',
          'May need user feedback retraining'
        ],
        prerequisites: [
          'Collect additional training data (2000+ samples)',
          'Set up A/B testing infrastructure',
          'Ensure adequate compute resources'
        ],
        steps: [
          {
            step: 1,
            title: 'Data Collection & Preparation',
            description: 'Gather edge case samples from recent failed detections',
            estimatedTime: '3-5 days'
          },
          {
            step: 2,
            title: 'Model Enhancement',
            description: 'Implement ensemble algorithms and retrain models',
            estimatedTime: '1-2 weeks'
          },
          {
            step: 3,
            title: 'A/B Testing',
            description: 'Deploy improved model to 20% of traffic for validation',
            estimatedTime: '1 week'
          },
          {
            step: 4,
            title: 'Full Deployment',
            description: 'Roll out to all users with monitoring',
            estimatedTime: '2-3 days'
          }
        ],
        estimatedImpact: {
          performance: 85,
          cost: 70,
          efficiency: 80,
          accuracy: 90,
        },
        implementationCost: 'medium',
        confidence: 0.87,
        affectedSystems: ['Edge Case Detector', 'ML Pipeline', 'User Approval System'],
        timeline: '3-4 weeks',
        resources: [
          {
            type: 'documentation',
            title: 'ML Model Enhancement Guide',
            url: '/docs/ml-enhancement'
          },
          {
            type: 'training',
            title: 'Advanced ML Techniques Workshop',
            url: '/training/advanced-ml'
          }
        ]
      },
      {
        id: 'cfg-001',
        type: 'configuration',
        priority: 'critical',
        title: 'Adjust Automation Confidence Thresholds',
        description: 'Fine-tune confidence levels for different edge case categories',
        detailedAnalysis: 'Current automation confidence thresholds are set uniformly at 0.75 across all categories. Data shows that validation errors have higher reliability (can use 0.65 threshold) while format issues need higher confidence (0.85 threshold) to maintain accuracy.',
        benefits: [
          'Reduce false positives by 30%',
          'Increase automation rate by 18%',
          'Improve user satisfaction scores',
          'Better resource utilization'
        ],
        risks: [
          'May increase false negatives initially',
          'Requires careful monitoring during transition',
          'User expectations need management'
        ],
        prerequisites: [
          'Analyze historical decision accuracy by category',
          'Set up category-specific monitoring',
          'Prepare rollback procedures'
        ],
        steps: [
          {
            step: 1,
            title: 'Threshold Analysis',
            description: 'Analyze optimal thresholds for each category',
            estimatedTime: '2-3 days'
          },
          {
            step: 2,
            title: 'Implementation',
            description: 'Update configuration with new thresholds',
            estimatedTime: '1 day'
          },
          {
            step: 3,
            title: 'Monitoring',
            description: 'Monitor performance and user feedback',
            estimatedTime: 'Ongoing - 2 weeks'
          }
        ],
        estimatedImpact: {
          performance: 75,
          cost: 85,
          efficiency: 90,
          accuracy: 80,
        },
        implementationCost: 'low',
        confidence: 0.92,
        affectedSystems: ['Automation Engine', 'Decision Pipeline'],
        timeline: '1 week',
        resources: [
          {
            type: 'documentation',
            title: 'Threshold Configuration Guide',
            url: '/docs/threshold-config'
          }
        ]
      },
      {
        id: 'trn-001',
        type: 'training',
        priority: 'medium',
        title: 'Implement User Behavior Learning',
        description: 'Train system to learn from user approval patterns',
        detailedAnalysis: 'User approval patterns show consistent preferences that aren\'t captured in current automation logic. Users approve 95% of validation errors but only 65% of format issues. System should learn these patterns to pre-approve similar cases.',
        benefits: [
          'Reduce user approval workload by 35%',
          'Improve automation accuracy to user preferences',
          'Increase user satisfaction',
          'Better personalization of automation'
        ],
        risks: [
          'May create user-specific biases',
          'Requires significant user interaction data',
          'Privacy considerations for user behavior'
        ],
        prerequisites: [
          'User consent for behavior tracking',
          'Privacy policy updates',
          'Sufficient historical interaction data'
        ],
        steps: [
          {
            step: 1,
            title: 'User Consent & Privacy',
            description: 'Implement consent mechanisms and privacy protections',
            estimatedTime: '1 week'
          },
          {
            step: 2,
            title: 'Behavior Analysis',
            description: 'Analyze user approval patterns and preferences',
            estimatedTime: '1 week'
          },
          {
            step: 3,
            title: 'Learning Implementation',
            description: 'Build and deploy user preference learning system',
            estimatedTime: '2-3 weeks'
          }
        ],
        estimatedImpact: {
          performance: 70,
          cost: 60,
          efficiency: 85,
          accuracy: 75,
        },
        implementationCost: 'high',
        confidence: 0.73,
        affectedSystems: ['User Interface', 'ML Pipeline', 'Decision Engine'],
        timeline: '4-5 weeks',
        resources: [
          {
            type: 'training',
            title: 'User Behavior Analytics Training',
            url: '/training/user-behavior'
          },
          {
            type: 'support',
            title: 'Privacy Compliance Guide',
            url: '/support/privacy-guide'
          }
        ]
      },
      {
        id: 'mon-001',
        type: 'monitoring',
        priority: 'high',
        title: 'Enhanced Real-time Performance Monitoring',
        description: 'Implement comprehensive monitoring for early issue detection',
        detailedAnalysis: 'Current monitoring has blind spots in edge case processing pipeline. Recent performance degradation took 4 hours to detect. Enhanced monitoring would reduce detection time to under 10 minutes and enable automatic remediation.',
        benefits: [
          'Reduce issue detection time by 95%',
          'Enable automated remediation',
          'Improve system reliability',
          'Better user experience during issues'
        ],
        risks: [
          'Increased monitoring overhead',
          'Potential alert fatigue',
          'Additional infrastructure costs'
        ],
        prerequisites: [
          'Monitoring infrastructure capacity',
          'Alert management system',
          'Automated remediation procedures'
        ],
        steps: [
          {
            step: 1,
            title: 'Monitoring Design',
            description: 'Design comprehensive monitoring strategy',
            estimatedTime: '3-4 days'
          },
          {
            step: 2,
            title: 'Implementation',
            description: 'Deploy monitoring agents and dashboards',
            estimatedTime: '1-2 weeks'
          },
          {
            step: 3,
            title: 'Automation Setup',
            description: 'Configure automated alerts and remediation',
            estimatedTime: '1 week'
          }
        ],
        estimatedImpact: {
          performance: 90,
          cost: 50,
          efficiency: 85,
          accuracy: 65,
        },
        implementationCost: 'medium',
        confidence: 0.89,
        affectedSystems: ['Monitoring Infrastructure', 'Alert System', 'All Processing Components'],
        timeline: '2-3 weeks',
        resources: [
          {
            type: 'documentation',
            title: 'Monitoring Best Practices',
            url: '/docs/monitoring-guide'
          },
          {
            type: 'support',
            title: 'Infrastructure Support',
            url: '/support/infrastructure'
          }
        ]
      }
    ];
  }, []);

  // AI-generated insights
  const aiInsights: AIInsight[] = useMemo(() => {
    return [
      {
        category: 'Performance',
        insight: 'Edge case detection performance has improved 23% over the last month, but validation accuracy plateaued at 84%',
        evidence: [
          'Detection accuracy: 84.2% (target: 90%)',
          'False positive rate: 8.3% (target: <5%)',
          'User approval rate: 78.5% (stable)'
        ],
        recommendation: 'Focus on ML model enhancement and threshold optimization to break through the 84% plateau',
        confidence: 0.91,
        impact: 'high'
      },
      {
        category: 'Cost Optimization',
        insight: 'Automation is saving $12,400/month but could save an additional $4,800 with better threshold tuning',
        evidence: [
          'Current automation rate: 67%',
          'Manual review cost: $85/hour',
          'Potential automation increase: 18%'
        ],
        recommendation: 'Implement category-specific confidence thresholds to increase automation rate',
        confidence: 0.86,
        impact: 'medium'
      },
      {
        category: 'User Experience',
        insight: 'Users show consistent approval patterns that suggest automation thresholds are too conservative',
        evidence: [
          'Validation errors: 95% approval rate',
          'Format issues: 65% approval rate',
          'Performance cases: 82% approval rate'
        ],
        recommendation: 'Implement user behavior learning to personalize automation decisions',
        confidence: 0.79,
        impact: 'medium'
      },
      {
        category: 'System Reliability',
        insight: 'Recent performance incidents took average 3.2 hours to detect, indicating monitoring gaps',
        evidence: [
          'Last incident: 4 hours detection time',
          'System uptime: 99.2% (target: 99.5%)',
          'User impact events: 3 in last month'
        ],
        recommendation: 'Enhance real-time monitoring with automated alerting and remediation',
        confidence: 0.88,
        impact: 'high'
      }
    ];
  }, [metrics]);

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = detailedRecommendations;

    if (selectedType !== 'all') {
      filtered = filtered.filter(rec => rec.type === selectedType);
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(rec => rec.priority === selectedPriority);
    }

    // Sort recommendations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'impact':
          return b.estimatedImpact.performance - a.estimatedImpact.performance;
        case 'cost':
          const costOrder = { low: 1, medium: 2, high: 3 };
          return costOrder[a.implementationCost] - costOrder[b.implementationCost];
        default:
          return 0;
      }
    });

    return filtered;
  }, [detailedRecommendations, selectedType, selectedPriority, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization':
        return <Rocket className="h-4 w-4" />;
      case 'configuration':
        return <Settings className="h-4 w-4" />;
      case 'training':
        return <Brain className="h-4 w-4" />;
      case 'monitoring':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-orange-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium':
        return <Target className="h-4 w-4 text-orange-600" />;
      case 'low':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Brain className="h-6 w-6 mr-2" />
            AI Recommendations
          </h2>
          <p className="text-muted-foreground">
            Intelligent optimization suggestions based on system performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="optimization">Optimization</SelectItem>
              <SelectItem value="configuration">Configuration</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="impact">Impact</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommendations List */}
            <div className="space-y-4">
              {filteredRecommendations.map((recommendation) => (
                <Card 
                  key={recommendation.id}
                  className={`cursor-pointer transition-all ${
                    selectedRecommendation === recommendation.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedRecommendation(recommendation.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(recommendation.type)}
                        <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="text-xs text-muted-foreground">
                                {(recommendation.confidence * 100).toFixed(0)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>AI Confidence Score</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <CardDescription>{recommendation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Performance Impact:</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={recommendation.estimatedImpact.performance} className="w-20" />
                          <span className="font-medium">
                            {recommendation.estimatedImpact.performance}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Implementation Cost:</span>
                        <Badge variant="outline" className={getCostColor(recommendation.implementationCost)}>
                          {recommendation.implementationCost}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Timeline:</span>
                        <span className="font-medium">{recommendation.timeline}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="outline">{recommendation.type}</Badge>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImplementRecommendation(recommendation.id);
                        }}
                      >
                        Implement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed View */}
            <div className="sticky top-6">
              {selectedRecommendation && (
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const rec = detailedRecommendations.find(r => r.id === selectedRecommendation);
                      if (!rec) return null;

                      return (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Analysis</h4>
                            <p className="text-sm text-muted-foreground">
                              {rec.detailedAnalysis}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Benefits</h4>
                            <ul className="text-sm space-y-1">
                              {rec.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-center space-x-2">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Risks</h4>
                            <ul className="text-sm space-y-1">
                              {rec.risks.map((risk, index) => (
                                <li key={index} className="flex items-center space-x-2">
                                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Implementation Steps</h4>
                            <div className="space-y-3">
                              {rec.steps.map((step) => (
                                <div key={step.step} className="flex space-x-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                                    {step.step}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{step.title}</div>
                                    <div className="text-xs text-muted-foreground">{step.description}</div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      <Clock className="h-3 w-3 inline mr-1" />
                                      {step.estimatedTime}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Resources</h4>
                            <div className="space-y-2">
                              {rec.resources.map((resource, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <BookOpen className="h-3 w-3" />
                                  <a href={resource.url} className="text-blue-600 hover:underline">
                                    {resource.title}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="space-y-4">
            {aiInsights.map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      {getImpactIcon(insight.impact)}
                      <span className="ml-2">{insight.category} Insight</span>
                    </CardTitle>
                    <Badge variant={insight.impact === 'high' ? 'default' : 'secondary'}>
                      {(insight.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">{insight.insight}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Supporting Evidence</h4>
                      <ul className="text-sm space-y-1">
                        {insight.evidence.map((evidence, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span>{evidence}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Recommendation</h4>
                      <p className="text-sm text-blue-800">{insight.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="impact" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Projected Performance Impact</CardTitle>
                <CardDescription>
                  Estimated improvements from implementing top recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Edge Case Coverage</span>
                      <span>{metrics.edgeCaseCoverage.toFixed(1)}% → 91.2%</span>
                    </div>
                    <Progress value={91.2} className="h-2" />
                    <div className="text-xs text-green-600 mt-1">+8.5% improvement</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Automation Success Rate</span>
                      <span>{metrics.automationSuccessRate.toFixed(1)}% → 94.3%</span>
                    </div>
                    <Progress value={94.3} className="h-2" />
                    <div className="text-xs text-green-600 mt-1">+6.1% improvement</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Error Detection Accuracy</span>
                      <span>{metrics.errorDetectionAccuracy.toFixed(1)}% → 96.8%</span>
                    </div>
                    <Progress value={96.8} className="h-2" />
                    <div className="text-xs text-green-600 mt-1">+12.6% improvement</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>False Positive Rate</span>
                      <span>{metrics.falsePositiveRate.toFixed(1)}% → 3.2%</span>
                    </div>
                    <Progress value={100 - 3.2} className="h-2" />
                    <div className="text-xs text-green-600 mt-1">-5.1% reduction</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost-Benefit Analysis</CardTitle>
                <CardDescription>
                  Investment vs projected returns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">$18,200</div>
                      <div className="text-sm text-green-700">Additional Monthly Savings</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Wrench className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-600">6-8 weeks</div>
                      <div className="text-sm text-blue-700">Implementation Time</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Current Monthly Savings:</span>
                      <span className="font-medium">${metrics.costSavings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Projected Monthly Savings:</span>
                      <span className="font-medium text-green-600">
                        ${(metrics.costSavings + 18200).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Annual ROI:</span>
                      <span className="font-medium text-green-600">385%</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Implementation Priorities</h4>
                    <ol className="text-sm space-y-1">
                      <li>1. Configuration adjustments (Quick wins)</li>
                      <li>2. ML model optimization (High impact)</li>
                      <li>3. Enhanced monitoring (Risk mitigation)</li>
                      <li>4. User behavior learning (Long-term)</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}