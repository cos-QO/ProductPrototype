import {
  type ApprovalType,
  type RiskLevel,
  type ApprovalContext,
  type RiskAssessment,
  type RoutingDecision,
} from "@shared/schema";
import { db } from "../db";
import { approvalPreferences, approvalDecisions, approvalRequests, users } from "@shared/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";

/**
 * Smart Approval Routing Engine
 * Intelligently routes approval requests based on risk, user preferences, historical patterns, and workload
 */

export interface RoutingContext {
  type: ApprovalType;
  riskAssessment: RiskAssessment;
  context: ApprovalContext;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  businessHours: boolean;
  systemLoad: number; // 0-100 percentage
  availableApprovers: string[];
  requesterRole?: string;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export interface UserWorkload {
  userId: string;
  pendingApprovals: number;
  averageResponseTime: number; // minutes
  currentCapacity: number; // 0-100 percentage
  expertiseAreas: string[];
  workingHours: {
    timezone: string;
    available: boolean;
  };
  lastActivity: Date;
}

export interface RoutingRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    types?: ApprovalType[];
    riskLevels?: RiskLevel[];
    urgencyLevels?: string[];
    businessHoursOnly?: boolean;
    maxSystemLoad?: number;
  };
  action: {
    route: 'automated' | 'manual' | 'escalate';
    assignTo?: string[];
    timeout?: number; // minutes
    escalationChain?: string[];
    requireConfidence?: number; // 0-100
  };
  priority: number; // Higher number = higher priority
  enabled: boolean;
}

export class ApprovalRoutingEngine {
  private static instance: ApprovalRoutingEngine;
  private routingRules: RoutingRule[] = [];
  private lastRulesUpdate: Date = new Date(0);

  static getInstance(): ApprovalRoutingEngine {
    if (!ApprovalRoutingEngine.instance) {
      ApprovalRoutingEngine.instance = new ApprovalRoutingEngine();
    }
    return ApprovalRoutingEngine.instance;
  }

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Main routing decision method
   */
  async routeApproval(context: RoutingContext): Promise<RoutingDecision> {
    // Update routing rules if needed
    await this.refreshRoutingRules();

    // Get user workloads
    const userWorkloads = await this.getUserWorkloads(context.availableApprovers);

    // Calculate routing decision through multiple strategies
    const strategies = [
      this.applyAutomationRules(context),
      this.applyRiskBasedRouting(context),
      this.applyWorkloadBalancing(context, userWorkloads),
      this.applyExpertiseMatching(context, userWorkloads),
      this.applyHistoricalPatterns(context),
    ];

    // Combine strategies and make final decision
    const decision = await this.combineStrategies(strategies, context);

    // Learn from this routing decision
    await this.recordRoutingDecision(context, decision);

    return decision;
  }

  /**
   * Check if approval should be automatically approved
   */
  async shouldAutoApprove(context: RoutingContext, userId?: string): Promise<{
    autoApprove: boolean;
    confidence: number;
    reasoning: string;
  }> {
    const reasons: string[] = [];
    let confidence = 0;

    // Check risk level
    if (context.riskAssessment.level === 'low') {
      confidence += 30;
      reasons.push('Low risk level');
    } else if (context.riskAssessment.level === 'medium' && context.riskAssessment.score < 40) {
      confidence += 15;
      reasons.push('Medium risk with low score');
    }

    // Check system confidence
    if (context.riskAssessment.confidenceLevel > 85) {
      confidence += 25;
      reasons.push('High system confidence');
    }

    // Check approval type
    if (context.type === 'large_dataset' && context.riskAssessment.level === 'low') {
      confidence += 20;
      reasons.push('Routine large dataset operation');
    }

    // Check user preferences if provided
    if (userId) {
      const userPrefs = await this.getUserPreferences(userId);
      if (userPrefs?.autoApproveLowRisk && context.riskAssessment.level === 'low') {
        confidence += 15;
        reasons.push('User preference for auto-approval');
      }
    }

    // Check historical success rate
    const historicalSuccess = await this.getHistoricalSuccessRate(context);
    if (historicalSuccess > 95) {
      confidence += 15;
      reasons.push('High historical success rate');
    }

    // Business hours consideration
    if (!context.businessHours && context.riskAssessment.level !== 'critical') {
      confidence -= 10;
      reasons.push('Outside business hours reduces confidence');
    }

    // System load consideration
    if (context.systemLoad > 80) {
      confidence -= 15;
      reasons.push('High system load reduces confidence');
    }

    const shouldAutoApprove = confidence >= 70 && context.riskAssessment.level !== 'critical';

    return {
      autoApprove: shouldAutoApprove,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning: reasons.join('; '),
    };
  }

  /**
   * Get optimal approvers for a request
   */
  async getOptimalApprovers(
    context: RoutingContext,
    maxApprovers: number = 3
  ): Promise<{
    primary: string;
    backups: string[];
    reasoning: Record<string, string>;
  }> {
    const userWorkloads = await this.getUserWorkloads(context.availableApprovers);
    const scoredUsers = [];

    for (const workload of userWorkloads) {
      const score = await this.calculateUserScore(workload, context);
      scoredUsers.push({ ...workload, score });
    }

    // Sort by score (highest first)
    scoredUsers.sort((a, b) => b.score - a.score);

    const primary = scoredUsers[0]?.userId;
    const backups = scoredUsers.slice(1, maxApprovers).map(u => u.userId);

    const reasoning: Record<string, string> = {};
    scoredUsers.slice(0, maxApprovers).forEach(user => {
      reasoning[user.userId] = this.explainUserScore(user, context);
    });

    return { primary, backups, reasoning };
  }

  /**
   * Predict approval outcome based on historical data
   */
  async predictApprovalOutcome(context: RoutingContext, approver: string): Promise<{
    likelyDecision: 'approve' | 'reject' | 'escalate';
    confidence: number;
    estimatedTime: number; // minutes
    reasoning: string;
  }> {
    // Get historical decisions for this approver and similar contexts
    const historicalDecisions = await this.getHistoricalDecisions(approver, context);

    if (historicalDecisions.length === 0) {
      return {
        likelyDecision: 'approve',
        confidence: 50,
        estimatedTime: this.getDefaultDecisionTime(context),
        reasoning: 'No historical data available - using defaults',
      };
    }

    // Analyze patterns
    const approveCount = historicalDecisions.filter(d => d.decision === 'approve').length;
    const rejectCount = historicalDecisions.filter(d => d.decision === 'reject').length;
    const escalateCount = historicalDecisions.filter(d => d.decision === 'escalate').length;

    const total = historicalDecisions.length;
    const approveRate = approveCount / total;
    const rejectRate = rejectCount / total;
    const escalateRate = escalateCount / total;

    let likelyDecision: 'approve' | 'reject' | 'escalate';
    let confidence: number;

    if (approveRate > rejectRate && approveRate > escalateRate) {
      likelyDecision = 'approve';
      confidence = approveRate * 100;
    } else if (rejectRate > escalateRate) {
      likelyDecision = 'reject';
      confidence = rejectRate * 100;
    } else {
      likelyDecision = 'escalate';
      confidence = escalateRate * 100;
    }

    // Calculate estimated time based on historical data
    const avgDecisionTime = historicalDecisions.reduce((sum, d) => {
      const decisionTime = d.timestamp.getTime() - new Date(d.contextAtDecision.timestamp || Date.now()).getTime();
      return sum + (decisionTime / (1000 * 60)); // Convert to minutes
    }, 0) / total;

    return {
      likelyDecision,
      confidence: Math.round(confidence),
      estimatedTime: Math.round(avgDecisionTime || this.getDefaultDecisionTime(context)),
      reasoning: `Based on ${total} similar decisions: ${Math.round(approveRate * 100)}% approve, ${Math.round(rejectRate * 100)}% reject, ${Math.round(escalateRate * 100)}% escalate`,
    };
  }

  // Private helper methods

  private async applyAutomationRules(context: RoutingContext): Promise<Partial<RoutingDecision>> {
    const autoApprovalCheck = await this.shouldAutoApprove(context);

    if (autoApprovalCheck.autoApprove) {
      return {
        route: 'automated',
        priority: 'low',
        assignedApprovers: ['system'],
        timeoutDuration: 1, // Immediate
        reasoning: `Auto-approved: ${autoApprovalCheck.reasoning}`,
        confidence: autoApprovalCheck.confidence,
      };
    }

    return {
      route: 'approval_required',
      reasoning: 'Requires human approval',
    };
  }

  private async applyRiskBasedRouting(context: RoutingContext): Promise<Partial<RoutingDecision>> {
    const riskLevel = context.riskAssessment.level;

    const riskRouting = {
      low: {
        priority: 'low' as const,
        timeoutDuration: 240, // 4 hours
        escalationPath: ['senior_analyst'],
      },
      medium: {
        priority: 'medium' as const,
        timeoutDuration: 120, // 2 hours
        escalationPath: ['senior_analyst', 'team_lead'],
      },
      high: {
        priority: 'high' as const,
        timeoutDuration: 60, // 1 hour
        escalationPath: ['team_lead', 'director'],
      },
      critical: {
        priority: 'critical' as const,
        timeoutDuration: 30, // 30 minutes
        escalationPath: ['director', 'executive'],
      },
    };

    const routing = riskRouting[riskLevel];

    return {
      priority: routing.priority,
      timeoutDuration: routing.timeoutDuration,
      escalationPath: routing.escalationPath,
      reasoning: `Risk-based routing for ${riskLevel} risk level`,
    };
  }

  private async applyWorkloadBalancing(
    context: RoutingContext,
    userWorkloads: UserWorkload[]
  ): Promise<Partial<RoutingDecision>> {
    // Filter available users
    const availableUsers = userWorkloads.filter(u => 
      u.workingHours.available && 
      u.currentCapacity < 90
    );

    if (availableUsers.length === 0) {
      return {
        route: 'escalation',
        reasoning: 'No available approvers with sufficient capacity',
      };
    }

    // Sort by capacity (lowest first for load balancing)
    availableUsers.sort((a, b) => a.currentCapacity - b.currentCapacity);

    return {
      assignedApprovers: availableUsers.slice(0, 2).map(u => u.userId),
      reasoning: 'Workload-balanced assignment to available approvers',
    };
  }

  private async applyExpertiseMatching(
    context: RoutingContext,
    userWorkloads: UserWorkload[]
  ): Promise<Partial<RoutingDecision>> {
    // Map approval types to required expertise
    const expertiseMap: Record<ApprovalType, string[]> = {
      data_integrity: ['data_engineering', 'database', 'etl'],
      performance_impact: ['performance', 'infrastructure', 'monitoring'],
      security_risk: ['security', 'compliance', 'cybersecurity'],
      business_logic: ['business_analysis', 'product', 'domain_expertise'],
      large_dataset: ['data_engineering', 'big_data', 'analytics'],
    };

    const requiredExpertise = expertiseMap[context.type] || [];
    
    // Score users based on expertise match
    const expertUsers = userWorkloads.filter(u => 
      requiredExpertise.some(expertise => 
        u.expertiseAreas.includes(expertise)
      )
    );

    if (expertUsers.length > 0) {
      return {
        assignedApprovers: expertUsers.slice(0, 2).map(u => u.userId),
        reasoning: `Assigned to users with relevant expertise: ${requiredExpertise.join(', ')}`,
      };
    }

    return {
      reasoning: 'No users found with specific expertise - using general routing',
    };
  }

  private async applyHistoricalPatterns(context: RoutingContext): Promise<Partial<RoutingDecision>> {
    // Analyze historical decisions for similar contexts
    const historicalSuccess = await this.getHistoricalSuccessRate(context);

    if (historicalSuccess > 95) {
      return {
        priority: 'low',
        reasoning: `High historical success rate (${historicalSuccess}%) suggests low risk`,
      };
    } else if (historicalSuccess < 70) {
      return {
        priority: 'high',
        reasoning: `Low historical success rate (${historicalSuccess}%) suggests high risk`,
      };
    }

    return {
      reasoning: `Moderate historical success rate (${historicalSuccess}%)`,
    };
  }

  private async combineStrategies(
    strategies: Promise<Partial<RoutingDecision>>[],
    context: RoutingContext
  ): Promise<RoutingDecision> {
    const results = await Promise.all(strategies);
    
    // Combine results with weighted importance
    const combined: RoutingDecision = {
      route: 'approval_required',
      priority: 'medium',
      assignedApprovers: [],
      timeoutDuration: 120,
      escalationPath: [],
      reasoning: '',
      confidence: 50,
    };

    // Apply automation rules first (highest priority)
    const automation = results[0];
    if (automation.route === 'automated') {
      return { ...combined, ...automation };
    }

    // Combine other strategies
    const reasons: string[] = [];
    
    results.forEach((result, index) => {
      if (result.priority) combined.priority = result.priority;
      if (result.assignedApprovers?.length) combined.assignedApprovers = result.assignedApprovers;
      if (result.timeoutDuration) combined.timeoutDuration = result.timeoutDuration;
      if (result.escalationPath?.length) combined.escalationPath = result.escalationPath;
      if (result.reasoning) reasons.push(result.reasoning);
    });

    // Ensure we have assigned approvers
    if (combined.assignedApprovers.length === 0) {
      const optimal = await this.getOptimalApprovers(context);
      combined.assignedApprovers = [optimal.primary, ...optimal.backups].filter(Boolean);
    }

    combined.reasoning = reasons.join('; ');
    combined.confidence = this.calculateCombinedConfidence(results);

    return combined;
  }

  private async getUserWorkloads(userIds: string[]): Promise<UserWorkload[]> {
    // Get pending approvals count for each user
    const workloads: UserWorkload[] = [];

    for (const userId of userIds) {
      const [{ pendingCount }] = await db
        .select({ pendingCount: sql<number>`count(*)` })
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.status, 'pending'),
            sql`${userId} = ANY(${approvalRequests.assignedTo})`
          )
        );

      // Calculate average response time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ avgResponseTime }] = await db
        .select({
          avgResponseTime: sql<number>`AVG(EXTRACT(epoch FROM (timestamp - created_at))) / 60`,
        })
        .from(approvalDecisions)
        .innerJoin(approvalRequests, eq(approvalDecisions.approvalRequestId, approvalRequests.id))
        .where(
          and(
            eq(approvalDecisions.approver, userId),
            gte(approvalRequests.createdAt, thirtyDaysAgo)
          )
        );

      workloads.push({
        userId,
        pendingApprovals: Number(pendingCount),
        averageResponseTime: Number(avgResponseTime) || 60,
        currentCapacity: this.calculateCapacity(Number(pendingCount)),
        expertiseAreas: await this.getUserExpertise(userId),
        workingHours: await this.getUserWorkingHours(userId),
        lastActivity: new Date(), // Would be fetched from user activity logs
      });
    }

    return workloads;
  }

  private calculateCapacity(pendingApprovals: number): number {
    // Simple capacity calculation - could be more sophisticated
    const maxCapacity = 10; // Max concurrent approvals per user
    return Math.min(100, (pendingApprovals / maxCapacity) * 100);
  }

  private async getUserExpertise(userId: string): Promise<string[]> {
    // This would typically come from user profiles or HR systems
    // For now, return empty array - would be implemented based on user management system
    return [];
  }

  private async getUserWorkingHours(userId: string): Promise<{ timezone: string; available: boolean }> {
    // This would check user's timezone and working hours
    // For now, assume all users are available - would be implemented with user preferences
    return {
      timezone: 'UTC',
      available: true,
    };
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const [preferences] = await db
      .select()
      .from(approvalPreferences)
      .where(eq(approvalPreferences.userId, userId));

    return preferences;
  }

  private async getHistoricalSuccessRate(context: RoutingContext): Promise<number> {
    // Calculate success rate for similar approval types and risk levels
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ successRate }] = await db
      .select({
        successRate: sql<number>`
          (COUNT(*) FILTER (WHERE status = 'approved')::float / COUNT(*)::float) * 100
        `,
      })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.type, context.type),
          eq(approvalRequests.riskLevel, context.riskAssessment.level),
          gte(approvalRequests.createdAt, thirtyDaysAgo)
        )
      );

    return Number(successRate) || 75; // Default to 75% if no data
  }

  private async getHistoricalDecisions(approver: string, context: RoutingContext): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await db
      .select()
      .from(approvalDecisions)
      .innerJoin(approvalRequests, eq(approvalDecisions.approvalRequestId, approvalRequests.id))
      .where(
        and(
          eq(approvalDecisions.approver, approver),
          eq(approvalRequests.type, context.type),
          gte(approvalRequests.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(approvalDecisions.timestamp))
      .limit(50);
  }

  private getDefaultDecisionTime(context: RoutingContext): number {
    const timeMap: Record<ApprovalType, number> = {
      data_integrity: 15,
      performance_impact: 10,
      security_risk: 20,
      business_logic: 25,
      large_dataset: 8,
    };

    return timeMap[context.type] || 15;
  }

  private async calculateUserScore(workload: UserWorkload, context: RoutingContext): Promise<number> {
    let score = 100;

    // Capacity penalty
    score -= workload.currentCapacity * 0.5;

    // Response time factor
    if (workload.averageResponseTime > 60) {
      score -= 20;
    } else if (workload.averageResponseTime < 15) {
      score += 10;
    }

    // Availability bonus
    if (workload.workingHours.available) {
      score += 15;
    } else {
      score -= 30;
    }

    // Expertise bonus
    const expertiseMap: Record<ApprovalType, string[]> = {
      data_integrity: ['data_engineering', 'database'],
      performance_impact: ['performance', 'infrastructure'],
      security_risk: ['security', 'compliance'],
      business_logic: ['business_analysis', 'product'],
      large_dataset: ['data_engineering', 'big_data'],
    };

    const relevantExpertise = expertiseMap[context.type] || [];
    const expertiseMatch = workload.expertiseAreas.filter(area => 
      relevantExpertise.includes(area)
    ).length;

    score += expertiseMatch * 15;

    return Math.max(0, Math.min(100, score));
  }

  private explainUserScore(user: UserWorkload & { score: number }, context: RoutingContext): string {
    const reasons: string[] = [];

    if (user.currentCapacity < 50) {
      reasons.push('Low workload');
    } else if (user.currentCapacity > 80) {
      reasons.push('High workload');
    }

    if (user.averageResponseTime < 15) {
      reasons.push('Fast response time');
    } else if (user.averageResponseTime > 60) {
      reasons.push('Slow response time');
    }

    if (user.workingHours.available) {
      reasons.push('Currently available');
    } else {
      reasons.push('Outside working hours');
    }

    if (user.expertiseAreas.length > 0) {
      reasons.push(`Relevant expertise: ${user.expertiseAreas.join(', ')}`);
    }

    return reasons.join('; ') || 'General assignment';
  }

  private calculateCombinedConfidence(results: Partial<RoutingDecision>[]): number {
    const confidences = results
      .map(r => r.confidence)
      .filter((c): c is number => c !== undefined);

    if (confidences.length === 0) return 50;

    return Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length);
  }

  private async recordRoutingDecision(context: RoutingContext, decision: RoutingDecision): Promise<void> {
    // Record the routing decision for future learning
    // This would be implemented to store routing analytics
    console.log('Recording routing decision:', { context, decision });
  }

  private async refreshRoutingRules(): Promise<void> {
    // Check if rules need updating (implement caching logic)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (this.lastRulesUpdate < oneHourAgo) {
      // Load rules from database or configuration
      await this.loadRoutingRules();
      this.lastRulesUpdate = new Date();
    }
  }

  private async loadRoutingRules(): Promise<void> {
    // Load routing rules from database or configuration
    // For now, use the default rules
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.routingRules = [
      {
        id: 'auto-approve-low-risk',
        name: 'Auto-approve Low Risk',
        description: 'Automatically approve low risk requests with high confidence',
        conditions: {
          riskLevels: ['low'],
          businessHoursOnly: false,
          maxSystemLoad: 100,
        },
        action: {
          route: 'automated',
          timeout: 1,
          requireConfidence: 80,
        },
        priority: 100,
        enabled: true,
      },
      {
        id: 'escalate-critical',
        name: 'Escalate Critical',
        description: 'Immediately escalate critical risk requests',
        conditions: {
          riskLevels: ['critical'],
        },
        action: {
          route: 'escalate',
          escalationChain: ['senior_analyst', 'director', 'executive'],
          timeout: 15,
        },
        priority: 90,
        enabled: true,
      },
      {
        id: 'security-specialist',
        name: 'Security Specialist Routing',
        description: 'Route security risks to security specialists',
        conditions: {
          types: ['security_risk'],
          riskLevels: ['medium', 'high', 'critical'],
        },
        action: {
          route: 'manual',
          assignTo: ['security_analyst', 'security_engineer'],
          timeout: 60,
        },
        priority: 80,
        enabled: true,
      },
    ];
  }
}

export default ApprovalRoutingEngine;