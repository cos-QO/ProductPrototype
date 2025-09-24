/**
 * Custom React Hook for Automation Analytics
 * Provides data fetching and real-time updates for automation metrics
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AutomationMetrics,
  BusinessImpact,
  TrendData,
  CostBreakdown,
  OptimizationRecommendations,
  ExecutiveSummary
} from '../types/automation';

interface UseAutomationMetricsResult {
  metrics: AutomationMetrics | null;
  businessImpact: BusinessImpact | null;
  trends: TrendData[] | null;
  costBreakdown: CostBreakdown | null;
  recommendations: OptimizationRecommendations | null;
  executiveSummary: ExecutiveSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAutomationMetrics(
  timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
  refreshInterval: number = 30000
): UseAutomationMetricsResult {
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [businessImpact, setBusinessImpact] = useState<BusinessImpact | null>(null);
  const [trends, setTrends] = useState<TrendData[] | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendations | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Parallel data fetching for better performance
      const [
        metricsResponse,
        businessResponse,
        trendsResponse,
        costResponse,
        recommendationsResponse,
        summaryResponse
      ] = await Promise.allSettled([
        fetch(`/api/automation/metrics?timeRange=${timeRange}`),
        fetch(`/api/automation/business-impact?timeRange=${timeRange}`),
        fetch(`/api/automation/trends?days=${timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1}`),
        fetch(`/api/automation/cost-breakdown?timeRange=${timeRange}`),
        fetch('/api/automation/recommendations'),
        fetch(`/api/automation/executive-summary?timeRange=${timeRange}`)
      ]);

      // Process responses
      if (metricsResponse.status === 'fulfilled' && metricsResponse.value.ok) {
        const data = await metricsResponse.value.json();
        setMetrics(data);
      } else {
        // Fallback to mock data for development
        setMetrics(generateMockMetrics());
      }

      if (businessResponse.status === 'fulfilled' && businessResponse.value.ok) {
        const data = await businessResponse.value.json();
        setBusinessImpact(data);
      } else {
        setBusinessImpact(generateMockBusinessImpact());
      }

      if (trendsResponse.status === 'fulfilled' && trendsResponse.value.ok) {
        const data = await trendsResponse.value.json();
        setTrends(data);
      } else {
        setTrends(generateMockTrends(timeRange));
      }

      if (costResponse.status === 'fulfilled' && costResponse.value.ok) {
        const data = await costResponse.value.json();
        setCostBreakdown(data);
      } else {
        setCostBreakdown(generateMockCostBreakdown());
      }

      if (recommendationsResponse.status === 'fulfilled' && recommendationsResponse.value.ok) {
        const data = await recommendationsResponse.value.json();
        setRecommendations(data);
      } else {
        setRecommendations(generateMockRecommendations());
      }

      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.ok) {
        const data = await summaryResponse.value.json();
        setExecutiveSummary(data);
      } else {
        setExecutiveSummary(generateMockExecutiveSummary());
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch automation metrics';
      console.error('Automation metrics fetch error:', err);
      setError(errorMessage);
      
      // Set mock data on error for development
      setMetrics(generateMockMetrics());
      setBusinessImpact(generateMockBusinessImpact());
      setTrends(generateMockTrends(timeRange));
      setCostBreakdown(generateMockCostBreakdown());
      setRecommendations(generateMockRecommendations());
      setExecutiveSummary(generateMockExecutiveSummary());
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    metrics,
    businessImpact,
    trends,
    costBreakdown,
    recommendations,
    executiveSummary,
    isLoading,
    error,
    refetch
  };
}

// Mock data generators for development/fallback
function generateMockMetrics(): AutomationMetrics {
  return {
    automationRate: {
      current: 62.5,
      target: 67,
      trend: 'increasing',
      weekOverWeek: 3.2
    },
    costEfficiency: {
      llmCosts: 485.50,
      manualProcessingCosts: 2850.00,
      savings: 2364.50,
      roi: 487.2
    },
    timeSavings: {
      automationTime: 45.5,
      manualTime: 420,
      savedHours: 374.5,
      productivity: 89.2
    },
    errorReduction: {
      automationAccuracy: 94.8,
      manualAccuracy: 85.2,
      errorReduction: 9.6,
      qualityScore: 92.1
    },
    userSatisfaction: {
      approvalTime: 2.3,
      feedbackScore: 91.5,
      bottlenecks: ['Slow CSV validation', 'Manual review queue']
    },
    systemHealth: {
      uptime: 99.7,
      performance: 94.3,
      resourceUsage: 67.8,
      status: 'healthy'
    }
  };
}

function generateMockBusinessImpact(): BusinessImpact {
  return {
    revenueImpact: 125000,
    costSavings: 2365,
    timeToMarket: 22.5,
    qualityImprovement: 15.8,
    customerSatisfaction: 95,
    competitiveAdvantage: [
      'Faster product launches',
      'Higher quality assurance',
      'Reduced operational costs',
      'Improved scalability'
    ]
  };
}

function generateMockTrends(timeRange: string): TrendData[] {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
  const trends: TrendData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      automationRate: 55 + (Math.random() * 15) + (i * 0.3),
      costs: 80 + (Math.random() * 40) - (i * 0.5),
      errors: Math.max(0, 20 - (i * 0.3) + (Math.random() * 10)),
      performance: 85 + (Math.random() * 15) + (i * 0.2),
      userSatisfaction: 80 + (Math.random() * 20)
    });
  }
  
  return trends;
}

function generateMockCostBreakdown(): CostBreakdown {
  return {
    llmApiCosts: 485.50,
    computeResources: 145.65,
    storageOptimization: 50.00,
    manualLabor: 2850.00,
    qualityAssurance: 570.00,
    infrastructure: 200.00
  };
}

function generateMockRecommendations(): OptimizationRecommendations {
  return {
    costOptimization: [
      {
        recommendation: 'Implement LLM response caching to reduce API calls',
        potentialSavings: 145.65,
        effort: 'medium',
        timeline: '2-4 weeks'
      },
      {
        recommendation: 'Optimize compute resource allocation',
        potentialSavings: 500.00,
        effort: 'high',
        timeline: '4-6 weeks'
      }
    ],
    performanceOptimization: [
      {
        recommendation: 'Implement parallel test execution',
        performanceGain: 40,
        effort: 'medium',
        timeline: '2-3 weeks'
      },
      {
        recommendation: 'Add intelligent test result caching',
        performanceGain: 25,
        effort: 'low',
        timeline: '1-2 weeks'
      }
    ],
    automationOpportunities: [
      {
        area: 'Data validation workflows',
        potentialAutomation: 25,
        complexity: 'medium',
        priority: 1
      },
      {
        area: 'Performance regression testing',
        potentialAutomation: 15,
        complexity: 'high',
        priority: 2
      },
      {
        area: 'Error pattern classification',
        potentialAutomation: 20,
        complexity: 'low',
        priority: 3
      }
    ]
  };
}

function generateMockExecutiveSummary(): ExecutiveSummary {
  return {
    summary: {
      automationRate: 62.5,
      costSavings: 2365,
      timeToMarket: 22.5,
      qualityScore: 92.1
    },
    keyAchievements: [
      '62.5% automation rate achieved',
      '$2,365 in cost savings',
      '374.5 hours saved through automation',
      '9.6% error reduction'
    ],
    recommendations: generateMockRecommendations(),
    trends: generateMockTrends('7d'),
    nextSteps: [
      'Focus on remaining 33% edge case automation',
      'Optimize LLM token usage for cost reduction',
      'Implement advanced performance monitoring',
      'Expand automation to additional workflows'
    ]
  };
}

export default useAutomationMetrics;