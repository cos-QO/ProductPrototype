/**
 * TypeScript types for automation analytics system
 */

export interface AutomationMetrics {
  automationRate: {
    current: number;
    target: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    weekOverWeek: number;
  };
  costEfficiency: {
    llmCosts: number;
    manualProcessingCosts: number;
    savings: number;
    roi: number;
  };
  timeSavings: {
    automationTime: number;
    manualTime: number;
    savedHours: number;
    productivity: number;
  };
  errorReduction: {
    automationAccuracy: number;
    manualAccuracy: number;
    errorReduction: number;
    qualityScore: number;
  };
  userSatisfaction: {
    approvalTime: number;
    feedbackScore: number;
    bottlenecks: string[];
  };
  systemHealth: {
    uptime: number;
    performance: number;
    resourceUsage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface BusinessImpact {
  revenueImpact: number;
  costSavings: number;
  timeToMarket: number;
  qualityImprovement: number;
  customerSatisfaction: number;
  competitiveAdvantage: string[];
}

export interface TrendData {
  date: string;
  automationRate: number;
  costs: number;
  errors: number;
  performance: number;
  userSatisfaction: number;
}

export interface CostBreakdown {
  llmApiCosts: number;
  computeResources: number;
  storageOptimization: number;
  manualLabor: number;
  qualityAssurance: number;
  infrastructure: number;
}

export interface OptimizationRecommendation {
  recommendation: string;
  potentialSavings?: number;
  performanceGain?: number;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface OptimizationRecommendations {
  costOptimization: OptimizationRecommendation[];
  performanceOptimization: OptimizationRecommendation[];
  automationOpportunities: {
    area: string;
    potentialAutomation: number;
    complexity: 'low' | 'medium' | 'high';
    priority: number;
  }[];
}

export interface ExecutiveSummary {
  summary: {
    automationRate: number;
    costSavings: number;
    timeToMarket: number;
    qualityScore: number;
  };
  keyAchievements: string[];
  recommendations: OptimizationRecommendations;
  trends: TrendData[];
  nextSteps: string[];
}

export interface ReportConfig {
  type: 'executive' | 'technical' | 'operational' | 'cost';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'html' | 'pdf' | 'json';
  includeCharts: boolean;
  customSections?: string[];
}

export interface GeneratedReport {
  id: string;
  type: ReportConfig['type'];
  generatedAt: Date;
  timeRange: string;
  filePath: string;
  size: number;
  recipients: string[];
  status: 'generating' | 'completed' | 'failed' | 'sent';
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface LiveMetricUpdate {
  timestamp: string;
  type: 'automation-rate' | 'cost-savings' | 'error-reduction' | 'system-health';
  value: number;
  change: number;
}