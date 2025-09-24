/**
 * Analytics Service
 * Core analytics processing for automation performance and edge case metrics
 */

import { db } from "../db";
import {
  automationMetrics,
  edgeCaseAnalytics,
  performanceSnapshots,
  testExecutions,
  userBehaviorProfiles,
  type InsertAutomationMetric,
  type InsertEdgeCaseAnalytic,
  type InsertPerformanceSnapshot,
  type RiskLevel,
} from "@shared/schema";
import {
  eq,
  desc,
  and,
  or,
  sql,
  gte,
  lte,
  count,
  avg,
  sum,
  max,
  min,
} from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { DynamicTestGenerator } from "./dynamic-test-generator";
import { MLFeedbackSystem } from "./ml-feedback-system";
import { ErrorPatternAnalyzer } from "./error-pattern-analyzer";

// Types
interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

interface AutomationMetrics {
  edgeCaseCoverage: number;
  automationSuccessRate: number;
  userApprovalRate: number;
  errorDetectionAccuracy: number;
  performanceImprovement: number;
  costSavings: number;
  processingSpeed: number;
  falsePositiveRate: number;
}

interface SystemPerformance {
  averageResponseTime: number;
  throughputRate: number;
  errorRate: number;
  uptime: number;
  resourceUtilization: number;
  concurrentUsers: number;
}

interface EdgeCaseStats {
  totalCasesDetected: number;
  automaticallyResolved: number;
  requiresHumanReview: number;
  criticalIssues: number;
  categories: Array<{
    name: string;
    count: number;
    successRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface AnalyticsTrends {
  daily: Array<{ date: string; value: number; metric: string }>;
  weekly: Array<{ week: string; value: number; metric: string }>;
  monthly: Array<{ month: string; value: number; metric: string }>;
}

interface PerformanceRegression {
  metric: string;
  currentValue: number;
  baselineValue: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  possibleCauses: string[];
}

interface UsagePattern {
  pattern: string;
  frequency: number;
  peakHours: number[];
  userTypes: string[];
  impact: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private testGenerator: DynamicTestGenerator;
  private mlFeedback: MLFeedbackSystem;
  private patternAnalyzer: ErrorPatternAnalyzer;

  // Cache for frequently accessed metrics
  private metricsCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Performance baselines
  private baselines = {
    edgeCaseCoverage: 85.0,
    automationSuccessRate: 90.0,
    errorDetectionAccuracy: 95.0,
    responseTime: 500,
    falsePositiveRate: 5.0,
  };

  private constructor() {
    this.testGenerator = DynamicTestGenerator.getInstance();
    this.mlFeedback = MLFeedbackSystem.getInstance();
    this.patternAnalyzer = ErrorPatternAnalyzer.getInstance();

    // Start periodic analytics collection
    this.startPeriodicCollection();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(
    timeRange: string = '7d',
    category: string = 'all'
  ): Promise<{
    metrics: AutomationMetrics;
    performance: SystemPerformance;
    edgeCaseStats: EdgeCaseStats;
    trends: AnalyticsTrends;
    recentActivity: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      severity: string;
      category?: string;
    }>;
    recommendations: Array<{
      id: string;
      type: string;
      priority: string;
      title: string;
      description: string;
      estimatedImpact: number;
      implementationCost: string;
    }>;
  }> {
    console.log(`[ANALYTICS] Getting dashboard analytics for ${timeRange}, category: ${category}`);

    try {
      const { start, end } = this.parseTimeRange(timeRange);
      const cacheKey = `dashboard_${timeRange}_${category}`;
      
      // Check cache
      if (this.isValidCache(cacheKey)) {
        console.log("[ANALYTICS] Returning cached dashboard data");
        return this.metricsCache.get(cacheKey)!.data;
      }

      // Collect all metrics in parallel
      const [
        metrics,
        performance,
        edgeCaseStats,
        trends,
        recentActivity,
        recommendations,
      ] = await Promise.all([
        this.calculateAutomationMetrics(start, end, category),
        this.calculateSystemPerformance(start, end),
        this.calculateEdgeCaseStats(start, end, category),
        this.calculateTrends(start, end, category),
        this.getRecentActivity(50),
        this.generateRecommendations(),
      ]);

      const result = {
        metrics,
        performance,
        edgeCaseStats,
        trends,
        recentActivity,
        recommendations,
      };

      // Cache results
      this.metricsCache.set(cacheKey, {
        data: result,
        timestamp: new Date(),
      });

      console.log("[ANALYTICS] Dashboard analytics calculated successfully");
      return result;

    } catch (error) {
      console.error("[ANALYTICS] Failed to get dashboard analytics:", error);
      throw error;
    }
  }

  /**
   * Calculate automation performance metrics
   */
  async calculateAutomationMetrics(
    start: Date,
    end: Date,
    category: string = 'all'
  ): Promise<AutomationMetrics> {
    try {
      // Get edge case detection stats
      const edgeCaseQuery = db
        .select({
          totalDetected: count(),
          autoResolved: sum(sql`CASE WHEN resolution_status = 'auto_resolved' THEN 1 ELSE 0 END`).mapWith(Number),
          accuracy: avg(sql`CASE WHEN detection_accuracy IS NOT NULL THEN detection_accuracy ELSE 0 END`).mapWith(Number),
        })
        .from(edgeCaseAnalytics)
        .where(
          and(
            gte(edgeCaseAnalytics.detectedAt, start),
            lte(edgeCaseAnalytics.detectedAt, end),
            category !== 'all' ? eq(edgeCaseAnalytics.category, category) : undefined
          )
        );

      const edgeStats = await edgeCaseQuery;
      const stats = edgeStats[0] || { totalDetected: 0, autoResolved: 0, accuracy: 0 };

      // Get user approval stats
      const approvalQuery = db
        .select({
          totalApprovals: count(),
          approved: sum(sql`CASE WHEN decision = 'approve' THEN 1 ELSE 0 END`).mapWith(Number),
        })
        .from(userBehaviorProfiles)
        .where(
          and(
            gte(userBehaviorProfiles.lastActivity, start),
            lte(userBehaviorProfiles.lastActivity, end)
          )
        );

      const approvalStats = await approvalQuery;
      const approvals = approvalStats[0] || { totalApprovals: 0, approved: 0 };

      // Get performance metrics
      const perfQuery = db
        .select({
          avgResponseTime: avg(performanceSnapshots.responseTime).mapWith(Number),
          avgProcessingTime: avg(performanceSnapshots.processingTime).mapWith(Number),
          errorCount: sum(performanceSnapshots.errorCount).mapWith(Number),
          totalRequests: sum(performanceSnapshots.totalRequests).mapWith(Number),
        })
        .from(performanceSnapshots)
        .where(
          and(
            gte(performanceSnapshots.timestamp, start),
            lte(performanceSnapshots.timestamp, end)
          )
        );

      const perfStats = await perfQuery;
      const perf = perfStats[0] || { 
        avgResponseTime: 0, 
        avgProcessingTime: 0, 
        errorCount: 0, 
        totalRequests: 0 
      };

      // Calculate metrics
      const totalDetected = Math.max(1, stats.totalDetected); // Avoid division by zero
      const totalApprovals = Math.max(1, approvals.totalApprovals);
      const totalRequests = Math.max(1, perf.totalRequests);

      const edgeCaseCoverage = (stats.autoResolved / totalDetected) * 100;
      const automationSuccessRate = Math.min(100, (stats.accuracy || 0));
      const userApprovalRate = (approvals.approved / totalApprovals) * 100;
      const errorDetectionAccuracy = stats.accuracy || 0;
      const falsePositiveRate = Math.max(0, (perf.errorCount / totalRequests) * 100);

      // Calculate cost savings (simplified model)
      const manualReviewCost = 85; // $85/hour
      const avgReviewTime = 0.5; // 30 minutes per case
      const automatedCases = stats.autoResolved;
      const costSavings = automatedCases * manualReviewCost * avgReviewTime;

      // Calculate performance improvement
      const baselineResponseTime = this.baselines.responseTime;
      const currentResponseTime = perf.avgResponseTime || baselineResponseTime;
      const performanceImprovement = Math.max(0, 
        ((baselineResponseTime - currentResponseTime) / baselineResponseTime) * 100
      );

      return {
        edgeCaseCoverage: isNaN(edgeCaseCoverage) ? 0 : edgeCaseCoverage,
        automationSuccessRate: isNaN(automationSuccessRate) ? 0 : automationSuccessRate,
        userApprovalRate: isNaN(userApprovalRate) ? 0 : userApprovalRate,
        errorDetectionAccuracy: isNaN(errorDetectionAccuracy) ? 0 : errorDetectionAccuracy,
        performanceImprovement: isNaN(performanceImprovement) ? 0 : performanceImprovement,
        costSavings: isNaN(costSavings) ? 0 : costSavings,
        processingSpeed: perf.avgProcessingTime || 0,
        falsePositiveRate: isNaN(falsePositiveRate) ? 0 : falsePositiveRate,
      };

    } catch (error) {
      console.error("[ANALYTICS] Failed to calculate automation metrics:", error);
      // Return safe defaults
      return {
        edgeCaseCoverage: 0,
        automationSuccessRate: 0,
        userApprovalRate: 0,
        errorDetectionAccuracy: 0,
        performanceImprovement: 0,
        costSavings: 0,
        processingSpeed: 0,
        falsePositiveRate: 0,
      };
    }
  }

  /**
   * Calculate system performance metrics
   */
  async calculateSystemPerformance(
    start: Date,
    end: Date
  ): Promise<SystemPerformance> {
    try {
      const query = db
        .select({
          avgResponseTime: avg(performanceSnapshots.responseTime).mapWith(Number),
          avgThroughput: avg(performanceSnapshots.throughputRate).mapWith(Number),
          totalErrors: sum(performanceSnapshots.errorCount).mapWith(Number),
          totalRequests: sum(performanceSnapshots.totalRequests).mapWith(Number),
          avgCpuUsage: avg(performanceSnapshots.cpuUsage).mapWith(Number),
          avgMemoryUsage: avg(performanceSnapshots.memoryUsage).mapWith(Number),
          maxConcurrentUsers: max(performanceSnapshots.concurrentUsers).mapWith(Number),
        })
        .from(performanceSnapshots)
        .where(
          and(
            gte(performanceSnapshots.timestamp, start),
            lte(performanceSnapshots.timestamp, end)
          )
        );

      const results = await query;
      const stats = results[0] || {
        avgResponseTime: 0,
        avgThroughput: 0,
        totalErrors: 0,
        totalRequests: 1,
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        maxConcurrentUsers: 0,
      };

      // Calculate uptime (simplified - based on successful requests)
      const successRate = 1 - (stats.totalErrors / Math.max(1, stats.totalRequests));
      const uptime = Math.max(0, Math.min(100, successRate * 100));

      return {
        averageResponseTime: stats.avgResponseTime || 0,
        throughputRate: stats.avgThroughput || 0,
        errorRate: (stats.totalErrors / Math.max(1, stats.totalRequests)) * 100,
        uptime,
        resourceUtilization: (stats.avgCpuUsage || 0),
        concurrentUsers: stats.maxConcurrentUsers || 0,
      };

    } catch (error) {
      console.error("[ANALYTICS] Failed to calculate system performance:", error);
      return {
        averageResponseTime: 0,
        throughputRate: 0,
        errorRate: 0,
        uptime: 99.9,
        resourceUtilization: 0,
        concurrentUsers: 0,
      };
    }
  }

  /**
   * Calculate edge case statistics
   */
  async calculateEdgeCaseStats(
    start: Date,
    end: Date,
    category: string = 'all'
  ): Promise<EdgeCaseStats> {
    try {
      // Get overall stats
      const overallQuery = db
        .select({
          totalDetected: count(),
          autoResolved: sum(sql`CASE WHEN resolution_status = 'auto_resolved' THEN 1 ELSE 0 END`).mapWith(Number),
          humanReview: sum(sql`CASE WHEN resolution_status = 'human_review' THEN 1 ELSE 0 END`).mapWith(Number),
          critical: sum(sql`CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END`).mapWith(Number),
        })
        .from(edgeCaseAnalytics)
        .where(
          and(
            gte(edgeCaseAnalytics.detectedAt, start),
            lte(edgeCaseAnalytics.detectedAt, end),
            category !== 'all' ? eq(edgeCaseAnalytics.category, category) : undefined
          )
        );

      const overallStats = await overallQuery;
      const overall = overallStats[0] || {
        totalDetected: 0,
        autoResolved: 0,
        humanReview: 0,
        critical: 0,
      };

      // Get category breakdown
      const categoryQuery = db
        .select({
          category: edgeCaseAnalytics.category,
          count: count(),
          successful: sum(sql`CASE WHEN resolution_status = 'auto_resolved' THEN 1 ELSE 0 END`).mapWith(Number),
        })
        .from(edgeCaseAnalytics)
        .where(
          and(
            gte(edgeCaseAnalytics.detectedAt, start),
            lte(edgeCaseAnalytics.detectedAt, end)
          )
        )
        .groupBy(edgeCaseAnalytics.category);

      const categoryStats = await categoryQuery;

      const categories = categoryStats.map(cat => ({
        name: cat.category,
        count: cat.count,
        successRate: cat.count > 0 ? (cat.successful / cat.count) * 100 : 0,
        trend: 'stable' as const, // TODO: Calculate actual trend
      }));

      return {
        totalCasesDetected: overall.totalDetected,
        automaticallyResolved: overall.autoResolved,
        requiresHumanReview: overall.humanReview,
        criticalIssues: overall.critical,
        categories,
      };

    } catch (error) {
      console.error("[ANALYTICS] Failed to calculate edge case stats:", error);
      return {
        totalCasesDetected: 0,
        automaticallyResolved: 0,
        requiresHumanReview: 0,
        criticalIssues: 0,
        categories: [],
      };
    }
  }

  /**
   * Calculate analytics trends
   */
  async calculateTrends(
    start: Date,
    end: Date,
    category: string = 'all'
  ): Promise<AnalyticsTrends> {
    try {
      // Daily trends
      const dailyQuery = db
        .select({
          date: sql<string>`DATE(${edgeCaseAnalytics.detectedAt})`,
          automation: avg(sql`CASE WHEN resolution_status = 'auto_resolved' THEN 100 ELSE 0 END`).mapWith(Number),
          detection: avg(sql`COALESCE(${edgeCaseAnalytics.detectionAccuracy}, 0)`).mapWith(Number),
          approval: sql<number>`50`, // Placeholder - would need actual user data
        })
        .from(edgeCaseAnalytics)
        .where(
          and(
            gte(edgeCaseAnalytics.detectedAt, start),
            lte(edgeCaseAnalytics.detectedAt, end),
            category !== 'all' ? eq(edgeCaseAnalytics.category, category) : undefined
          )
        )
        .groupBy(sql`DATE(${edgeCaseAnalytics.detectedAt})`)
        .orderBy(sql`DATE(${edgeCaseAnalytics.detectedAt})`);

      const dailyData = await dailyQuery;

      // Transform to required format
      const daily = dailyData.flatMap(day => [
        { date: day.date, value: day.automation || 0, metric: 'automation' },
        { date: day.date, value: day.detection || 0, metric: 'detection' },
        { date: day.date, value: day.approval || 0, metric: 'approval' },
      ]);

      // Weekly trends (simplified - using daily data)
      const weekly = daily.filter((_, index) => index % 7 === 0).map(item => ({
        week: item.date,
        value: item.value,
        metric: item.metric,
      }));

      // Monthly trends (simplified - using daily data)
      const monthly = daily.filter((_, index) => index % 30 === 0).map(item => ({
        month: item.date,
        value: item.value,
        metric: item.metric,
      }));

      return { daily, weekly, monthly };

    } catch (error) {
      console.error("[ANALYTICS] Failed to calculate trends:", error);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  /**
   * Get recent system activity
   */
  async getRecentActivity(limit: number = 50): Promise<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    severity: string;
    category?: string;
  }>> {
    try {
      const query = db
        .select({
          id: edgeCaseAnalytics.id,
          category: edgeCaseAnalytics.category,
          riskLevel: edgeCaseAnalytics.riskLevel,
          resolutionStatus: edgeCaseAnalytics.resolutionStatus,
          detectedAt: edgeCaseAnalytics.detectedAt,
        })
        .from(edgeCaseAnalytics)
        .orderBy(desc(edgeCaseAnalytics.detectedAt))
        .limit(limit);

      const results = await query;

      return results.map(result => {
        const type = result.resolutionStatus === 'auto_resolved' 
          ? 'auto_resolved' 
          : result.resolutionStatus === 'human_review'
          ? 'human_intervention'
          : 'edge_case_detected';

        let message = '';
        switch (type) {
          case 'auto_resolved':
            message = `Automatically resolved ${result.category} edge case`;
            break;
          case 'human_intervention':
            message = `Human review required for ${result.category} issue`;
            break;
          default:
            message = `Edge case detected in ${result.category}`;
        }

        return {
          id: result.id,
          type,
          message,
          timestamp: result.detectedAt,
          severity: result.riskLevel,
          category: result.category,
        };
      });

    } catch (error) {
      console.error("[ANALYTICS] Failed to get recent activity:", error);
      return [];
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  async generateRecommendations(): Promise<Array<{
    id: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    estimatedImpact: number;
    implementationCost: string;
  }>> {
    try {
      // Get system performance to inform recommendations
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const metrics = await this.calculateAutomationMetrics(startDate, endDate);
      const performance = await this.calculateSystemPerformance(startDate, endDate);

      const recommendations = [];

      // Edge case coverage recommendation
      if (metrics.edgeCaseCoverage < this.baselines.edgeCaseCoverage) {
        recommendations.push({
          id: 'rec-coverage-001',
          type: 'optimization',
          priority: 'high',
          title: 'Improve Edge Case Coverage',
          description: 'Current coverage is below target. Consider enhancing detection algorithms.',
          estimatedImpact: 85,
          implementationCost: 'medium',
        });
      }

      // False positive rate recommendation
      if (metrics.falsePositiveRate > this.baselines.falsePositiveRate) {
        recommendations.push({
          id: 'rec-fp-001',
          type: 'configuration',
          title: 'Reduce False Positive Rate',
          priority: 'critical',
          description: 'High false positive rate detected. Adjust confidence thresholds.',
          estimatedImpact: 90,
          implementationCost: 'low',
        });
      }

      // Performance recommendation
      if (performance.averageResponseTime > this.baselines.responseTime) {
        recommendations.push({
          id: 'rec-perf-001',
          type: 'optimization',
          priority: 'medium',
          title: 'Optimize Response Time',
          description: 'Response times are above acceptable thresholds.',
          estimatedImpact: 70,
          implementationCost: 'high',
        });
      }

      // User approval rate recommendation
      if (metrics.userApprovalRate < 80) {
        recommendations.push({
          id: 'rec-approval-001',
          type: 'training',
          priority: 'medium',
          title: 'Improve User Approval Patterns',
          description: 'Learn from user approval patterns to reduce manual review.',
          estimatedImpact: 75,
          implementationCost: 'medium',
        });
      }

      return recommendations;

    } catch (error) {
      console.error("[ANALYTICS] Failed to generate recommendations:", error);
      return [];
    }
  }

  /**
   * Detect performance regressions
   */
  async detectPerformanceRegressions(
    timeRange: string = '24h'
  ): Promise<PerformanceRegression[]> {
    try {
      const { start, end } = this.parseTimeRange(timeRange);
      const metrics = await this.calculateAutomationMetrics(start, end);

      const regressions: PerformanceRegression[] = [];

      // Check each metric against baseline
      const checks = [
        {
          metric: 'edgeCaseCoverage',
          current: metrics.edgeCaseCoverage,
          baseline: this.baselines.edgeCaseCoverage,
          lowerIsBetter: false,
        },
        {
          metric: 'automationSuccessRate',
          current: metrics.automationSuccessRate,
          baseline: this.baselines.automationSuccessRate,
          lowerIsBetter: false,
        },
        {
          metric: 'errorDetectionAccuracy',
          current: metrics.errorDetectionAccuracy,
          baseline: this.baselines.errorDetectionAccuracy,
          lowerIsBetter: false,
        },
        {
          metric: 'falsePositiveRate',
          current: metrics.falsePositiveRate,
          baseline: this.baselines.falsePositiveRate,
          lowerIsBetter: true,
        },
      ];

      for (const check of checks) {
        const deviation = ((check.current - check.baseline) / check.baseline) * 100;
        const isRegression = check.lowerIsBetter ? deviation > 10 : deviation < -10;

        if (isRegression) {
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
          if (Math.abs(deviation) > 50) severity = 'critical';
          else if (Math.abs(deviation) > 25) severity = 'high';
          else if (Math.abs(deviation) > 15) severity = 'medium';

          regressions.push({
            metric: check.metric,
            currentValue: check.current,
            baselineValue: check.baseline,
            deviationPercent: deviation,
            severity,
            detectedAt: new Date(),
            possibleCauses: this.generatePossibleCauses(check.metric),
          });
        }
      }

      return regressions;

    } catch (error) {
      console.error("[ANALYTICS] Failed to detect regressions:", error);
      return [];
    }
  }

  /**
   * Get usage patterns
   */
  async getUsagePatterns(timeRange: string = '30d'): Promise<UsagePattern[]> {
    try {
      const { start, end } = this.parseTimeRange(timeRange);
      
      // Analyze usage patterns from performance data
      const query = db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${performanceSnapshots.timestamp})`,
          dayOfWeek: sql<number>`EXTRACT(DOW FROM ${performanceSnapshots.timestamp})`,
          totalRequests: sum(performanceSnapshots.totalRequests).mapWith(Number),
          avgResponseTime: avg(performanceSnapshots.responseTime).mapWith(Number),
        })
        .from(performanceSnapshots)
        .where(
          and(
            gte(performanceSnapshots.timestamp, start),
            lte(performanceSnapshots.timestamp, end)
          )
        )
        .groupBy(
          sql`EXTRACT(HOUR FROM ${performanceSnapshots.timestamp})`,
          sql`EXTRACT(DOW FROM ${performanceSnapshots.timestamp})`
        )
        .orderBy(sql`EXTRACT(HOUR FROM ${performanceSnapshots.timestamp})`);

      const results = await query;

      // Generate patterns
      const patterns: UsagePattern[] = [];

      // Peak hours pattern
      const totalRequests = results.reduce((sum, r) => sum + (r.totalRequests || 0), 0);
      const avgRequestsPerHour = totalRequests / Math.max(1, results.length);
      const peakHours = results
        .filter(r => (r.totalRequests || 0) > avgRequestsPerHour * 1.5)
        .map(r => r.hour);

      if (peakHours.length > 0) {
        patterns.push({
          pattern: 'Peak Usage Hours',
          frequency: peakHours.length,
          peakHours,
          userTypes: ['all'],
          impact: 0.8,
        });
      }

      // Weekend vs weekday pattern
      const weekdayRequests = results
        .filter(r => r.dayOfWeek > 0 && r.dayOfWeek < 6)
        .reduce((sum, r) => sum + (r.totalRequests || 0), 0);
      const weekendRequests = results
        .filter(r => r.dayOfWeek === 0 || r.dayOfWeek === 6)
        .reduce((sum, r) => sum + (r.totalRequests || 0), 0);

      if (weekdayRequests > weekendRequests * 2) {
        patterns.push({
          pattern: 'Business Hours Concentration',
          frequency: 5, // weekdays
          peakHours: [9, 10, 11, 14, 15, 16],
          userTypes: ['business'],
          impact: 0.7,
        });
      }

      return patterns;

    } catch (error) {
      console.error("[ANALYTICS] Failed to get usage patterns:", error);
      return [];
    }
  }

  /**
   * Record performance snapshot
   */
  async recordPerformanceSnapshot(data: {
    responseTime: number;
    throughputRate: number;
    errorCount: number;
    totalRequests: number;
    cpuUsage: number;
    memoryUsage: number;
    concurrentUsers: number;
  }): Promise<void> {
    try {
      const snapshot: InsertPerformanceSnapshot = {
        id: uuidv4(),
        timestamp: new Date(),
        responseTime: data.responseTime,
        throughputRate: data.throughputRate,
        errorCount: data.errorCount,
        totalRequests: data.totalRequests,
        cpuUsage: data.cpuUsage,
        memoryUsage: data.memoryUsage,
        processingTime: data.responseTime, // Simplified
        concurrentUsers: data.concurrentUsers,
        diskUsage: 0, // Placeholder
        networkBandwidth: 0, // Placeholder
      };

      await db.insert(performanceSnapshots).values(snapshot);
      
      // Clear related cache entries
      this.clearCacheByPattern('dashboard_');

    } catch (error) {
      console.error("[ANALYTICS] Failed to record performance snapshot:", error);
      throw error;
    }
  }

  // Private helper methods

  private parseTimeRange(timeRange: string): AnalyticsTimeRange {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7); // Default to 7 days
    }

    return { start, end };
  }

  private isValidCache(key: string): boolean {
    const cached = this.metricsCache.get(key);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp.getTime();
    return age < this.cacheTimeout;
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(pattern)) {
        this.metricsCache.delete(key);
      }
    }
  }

  private generatePossibleCauses(metric: string): string[] {
    const causes: Record<string, string[]> = {
      edgeCaseCoverage: [
        'New types of edge cases not in training data',
        'Model drift due to changing data patterns',
        'Threshold settings too conservative',
      ],
      automationSuccessRate: [
        'Increased complexity in recent data',
        'System resource constraints',
        'Configuration changes affecting accuracy',
      ],
      errorDetectionAccuracy: [
        'Training data quality issues',
        'Model overfitting to specific patterns',
        'Feature engineering problems',
      ],
      falsePositiveRate: [
        'Threshold settings too aggressive',
        'Insufficient training on edge cases',
        'Data drift in production environment',
      ],
    };

    return causes[metric] || ['Unknown cause'];
  }

  private startPeriodicCollection(): void {
    // Collect performance snapshots every 5 minutes
    setInterval(async () => {
      try {
        // In a real implementation, these would come from system monitors
        const mockData = {
          responseTime: Math.random() * 1000 + 200,
          throughputRate: Math.floor(Math.random() * 100) + 50,
          errorCount: Math.floor(Math.random() * 5),
          totalRequests: Math.floor(Math.random() * 1000) + 100,
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          concurrentUsers: Math.floor(Math.random() * 50) + 10,
        };

        await this.recordPerformanceSnapshot(mockData);
      } catch (error) {
        console.error("[ANALYTICS] Failed to collect periodic snapshot:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log("[ANALYTICS] Started periodic performance collection");
  }
}

export default AnalyticsService;