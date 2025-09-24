import { Request, Response } from "express";
import { db } from "../db";
import {
  approvalRequests,
  approvalDecisions,
  approvalPreferences,
  approvalMetrics,
  testExecutions,
  importSessions,
  users,
  type ApprovalRequest,
  type InsertApprovalRequest,
  type ApprovalDecision,
  type InsertApprovalDecision,
  type ApprovalPreferences,
  type InsertApprovalPreferences,
  type ApprovalType,
  type RiskLevel,
  type ApprovalStatus,
  type DecisionType,
  type ApprovalContext,
  type RiskAssessment,
  type RoutingDecision,
} from "@shared/schema";
import { eq, desc, and, or, sql, inArray, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Approval Service
 * Handles user approval workflows for critical decisions in automated edge case testing
 */

// Enhanced types for service operations
interface CreateApprovalRequestParams {
  type: ApprovalType;
  title: string;
  description: string;
  context: ApprovalContext;
  riskAssessment: RiskAssessment;
  assignedTo: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeoutMinutes?: number;
  testExecutionId?: string;
  importSessionId?: string;
  metadata?: Record<string, any>;
}

interface ApprovalDecisionParams {
  approvalId: string;
  decision: DecisionType;
  approver: string;
  reasoning?: string;
  conditions?: Record<string, any>;
}

interface BatchApprovalParams {
  approvalIds: string[];
  decision: 'approve' | 'reject';
  approver: string;
  reasoning?: string;
}

interface ApprovalFilters {
  status?: ApprovalStatus[];
  type?: ApprovalType[];
  riskLevel?: RiskLevel[];
  assignedTo?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export class ApprovalService {
  private static instance: ApprovalService;

  static getInstance(): ApprovalService {
    if (!ApprovalService.instance) {
      ApprovalService.instance = new ApprovalService();
    }
    return ApprovalService.instance;
  }

  /**
   * Create a new approval request
   */
  async createApprovalRequest(params: CreateApprovalRequestParams): Promise<ApprovalRequest> {
    const {
      type,
      title,
      description,
      context,
      riskAssessment,
      assignedTo,
      priority = this.calculatePriority(riskAssessment.level),
      timeoutMinutes = this.getDefaultTimeout(type, riskAssessment.level),
      testExecutionId,
      importSessionId,
      metadata = {},
    } = params;

    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + timeoutMinutes);

    const approvalData: InsertApprovalRequest = {
      type,
      riskLevel: riskAssessment.level,
      priority,
      title,
      description,
      context: context as any,
      riskAssessment: riskAssessment as any,
      assignedTo,
      currentApprover: assignedTo[0], // Start with first approver
      escalationPath: this.buildEscalationPath(type, riskAssessment.level),
      deadline,
      testExecutionId,
      importSessionId,
      metadata: metadata as any,
    };

    const [approval] = await db
      .insert(approvalRequests)
      .values(approvalData)
      .returning();

    // Send real-time notification
    await this.notifyApprovers(approval);

    // Update metrics
    await this.updateApprovalMetrics(approval.assignedTo[0], 'created', type, riskAssessment.level);

    return approval;
  }

  /**
   * Get approval requests with filtering and pagination
   */
  async getApprovals(
    filters: ApprovalFilters = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 50 }
  ): Promise<{
    data: ApprovalRequest[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const conditions = this.buildFilterConditions(filters);
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(approvalRequests)
      .where(and(...conditions));

    // Get paginated data
    const data = await db
      .select()
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.createdAt))
      .limit(pagination.pageSize)
      .offset(offset);

    return {
      data,
      total: Number(count),
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  /**
   * Get pending approvals for a specific user
   */
  async getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    return await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.status, 'pending'),
          sql`${userId} = ANY(${approvalRequests.assignedTo})`
        )
      )
      .orderBy(approvalRequests.deadline, desc(approvalRequests.priority));
  }

  /**
   * Make an approval decision
   */
  async makeDecision(params: ApprovalDecisionParams): Promise<{
    success: boolean;
    approval: ApprovalRequest;
    nextActions?: string[];
  }> {
    const { approvalId, decision, approver, reasoning, conditions } = params;

    // Get current approval
    const [approval] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));

    if (!approval) {
      throw new Error('Approval request not found');
    }

    if (approval.status !== 'pending') {
      throw new Error('Approval request is no longer pending');
    }

    // Check if user is authorized to approve
    if (!approval.assignedTo.includes(approver)) {
      throw new Error('User not authorized to approve this request');
    }

    // Create decision record
    const decisionData: InsertApprovalDecision = {
      approvalRequestId: approvalId,
      decision,
      approver,
      reasoning,
      conditions: conditions as any,
      contextAtDecision: approval.context,
      systemRecommendation: await this.getSystemRecommendation(approval),
      confidenceScore: await this.calculateConfidenceScore(approval),
    };

    // Record the decision
    const [decisionRecord] = await db
      .insert(approvalDecisions)
      .values(decisionData)
      .returning();

    let updatedApproval: ApprovalRequest;
    let nextActions: string[] = [];

    // Update approval based on decision
    if (decision === 'approve') {
      [updatedApproval] = await db
        .update(approvalRequests)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: approver,
          decision: decisionRecord as any,
          decisionReasoning: reasoning,
        })
        .where(eq(approvalRequests.id, approvalId))
        .returning();

      nextActions = await this.executeApprovedAction(updatedApproval);
    } else if (decision === 'reject') {
      [updatedApproval] = await db
        .update(approvalRequests)
        .set({
          status: 'rejected',
          decision: decisionRecord as any,
          decisionReasoning: reasoning,
        })
        .where(eq(approvalRequests.id, approvalId))
        .returning();

      nextActions = await this.executeRejectedAction(updatedApproval);
    } else if (decision === 'escalate') {
      updatedApproval = await this.escalateApproval(approval, approver, reasoning);
      nextActions = ['Escalated to next approval level'];
    } else {
      throw new Error('Invalid decision type');
    }

    // Update metrics
    await this.updateApprovalMetrics(approver, 'decision', approval.type, approval.riskLevel);

    // Send notifications
    await this.notifyDecisionMade(updatedApproval, decisionRecord);

    return {
      success: true,
      approval: updatedApproval,
      nextActions,
    };
  }

  /**
   * Make batch approval decisions
   */
  async makeBatchDecision(params: BatchApprovalParams): Promise<{
    successful: number;
    failed: string[];
    results: Array<{ approvalId: string; success: boolean; error?: string }>;
  }> {
    const { approvalIds, decision, approver, reasoning } = params;
    const results: Array<{ approvalId: string; success: boolean; error?: string }> = [];
    let successful = 0;
    const failed: string[] = [];

    for (const approvalId of approvalIds) {
      try {
        await this.makeDecision({
          approvalId,
          decision,
          approver,
          reasoning,
        });
        results.push({ approvalId, success: true });
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ approvalId, success: false, error: errorMessage });
        failed.push(approvalId);
      }
    }

    return { successful, failed, results };
  }

  /**
   * Escalate an approval to the next level
   */
  async escalateApproval(
    approval: ApprovalRequest,
    escalatedBy: string,
    reason?: string
  ): Promise<ApprovalRequest> {
    const escalationPath = approval.escalationPath || [];
    const currentIndex = escalationPath.indexOf(approval.currentApprover || '');
    const nextApprover = escalationPath[currentIndex + 1];

    if (!nextApprover) {
      throw new Error('No further escalation path available');
    }

    const [updatedApproval] = await db
      .update(approvalRequests)
      .set({
        status: 'escalated',
        currentApprover: nextApprover,
        assignedTo: [nextApprover, ...approval.assignedTo.filter(a => a !== nextApprover)],
        metadata: {
          ...approval.metadata,
          escalations: [
            ...(approval.metadata?.escalations || []),
            {
              timestamp: new Date(),
              fromUser: escalatedBy,
              toUser: nextApprover,
              reason: reason || 'Manual escalation',
            },
          ],
        } as any,
      })
      .where(eq(approvalRequests.id, approval.id))
      .returning();

    // Notify new approver
    await this.notifyApprovers(updatedApproval);

    return updatedApproval;
  }

  /**
   * Get approval statistics for dashboard
   */
  async getApprovalStats(userId?: string): Promise<{
    totalPending: number;
    byRiskLevel: Record<RiskLevel, number>;
    byType: Record<ApprovalType, number>;
    averageDecisionTime: number;
    automationRate: number;
  }> {
    const conditions = userId
      ? [sql`${userId} = ANY(${approvalRequests.assignedTo})`]
      : [];

    // Get pending count
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)` })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.status, 'pending'),
          ...conditions
        )
      );

    // Get count by risk level
    const riskLevelStats = await db
      .select({
        riskLevel: approvalRequests.riskLevel,
        count: sql<number>`count(*)`,
      })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.status, 'pending'),
          ...conditions
        )
      )
      .groupBy(approvalRequests.riskLevel);

    // Get count by type
    const typeStats = await db
      .select({
        type: approvalRequests.type,
        count: sql<number>`count(*)`,
      })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.status, 'pending'),
          ...conditions
        )
      )
      .groupBy(approvalRequests.type);

    // Calculate average decision time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ avgDecisionTime }] = await db
      .select({
        avgDecisionTime: sql<number>`AVG(EXTRACT(epoch FROM (approved_at - created_at))) / 60`,
      })
      .from(approvalRequests)
      .where(
        and(
          inArray(approvalRequests.status, ['approved', 'rejected']),
          gte(approvalRequests.createdAt, thirtyDaysAgo),
          ...conditions
        )
      );

    // Calculate automation rate
    const [{ automationRate }] = await db
      .select({
        automationRate: sql<number>`
          (COUNT(*) FILTER (WHERE metadata->>'automated' = 'true')::float / COUNT(*)::float) * 100
        `,
      })
      .from(approvalRequests)
      .where(
        and(
          gte(approvalRequests.createdAt, thirtyDaysAgo),
          ...conditions
        )
      );

    return {
      totalPending: Number(pendingCount),
      byRiskLevel: riskLevelStats.reduce((acc, stat) => {
        acc[stat.riskLevel as RiskLevel] = Number(stat.count);
        return acc;
      }, {} as Record<RiskLevel, number>),
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type as ApprovalType] = Number(stat.count);
        return acc;
      }, {} as Record<ApprovalType, number>),
      averageDecisionTime: Number(avgDecisionTime) || 0,
      automationRate: Number(automationRate) || 0,
    };
  }

  /**
   * Get or create user approval preferences
   */
  async getUserPreferences(userId: string): Promise<ApprovalPreferences> {
    const [existing] = await db
      .select()
      .from(approvalPreferences)
      .where(eq(approvalPreferences.userId, userId));

    if (existing) {
      return existing;
    }

    // Create default preferences
    const defaultPreferences: InsertApprovalPreferences = {
      userId,
      autoApproveLowRisk: false,
      autoApproveConfidenceThreshold: '0.85',
      preferredNotificationMethod: 'in_app',
      delegationRules: {},
      decisionPatterns: {},
      performanceMetrics: {},
    };

    const [created] = await db
      .insert(approvalPreferences)
      .values(defaultPreferences)
      .returning();

    return created;
  }

  /**
   * Update user approval preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<InsertApprovalPreferences>
  ): Promise<ApprovalPreferences> {
    const [updated] = await db
      .update(approvalPreferences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(approvalPreferences.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Check timeout approvals and handle them
   */
  async handleTimeoutApprovals(): Promise<void> {
    const timeoutApprovals = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.status, 'pending'),
          lte(approvalRequests.deadline, new Date())
        )
      );

    for (const approval of timeoutApprovals) {
      await this.handleApprovalTimeout(approval);
    }
  }

  // Private helper methods

  private calculatePriority(riskLevel: RiskLevel): 'low' | 'medium' | 'high' | 'critical' {
    const priorityMap: Record<RiskLevel, 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };
    return priorityMap[riskLevel];
  }

  private getDefaultTimeout(type: ApprovalType, riskLevel: RiskLevel): number {
    const timeoutMatrix: Record<ApprovalType, Record<RiskLevel, number>> = {
      data_integrity: { low: 240, medium: 120, high: 60, critical: 30 },
      performance_impact: { low: 120, medium: 60, high: 30, critical: 15 },
      security_risk: { low: 180, medium: 60, high: 30, critical: 15 },
      business_logic: { low: 480, medium: 240, high: 120, critical: 60 },
      large_dataset: { low: 120, medium: 60, high: 30, critical: 15 },
    };

    return timeoutMatrix[type][riskLevel];
  }

  private buildEscalationPath(type: ApprovalType, riskLevel: RiskLevel): string[] {
    // This would typically be configured per organization
    const escalationPaths: Record<ApprovalType, Record<RiskLevel, string[]>> = {
      data_integrity: {
        low: ['data_analyst', 'senior_data_analyst'],
        medium: ['senior_data_analyst', 'data_lead'],
        high: ['data_lead', 'technical_director'],
        critical: ['technical_director', 'cto'],
      },
      performance_impact: {
        low: ['performance_engineer', 'senior_performance_engineer'],
        medium: ['senior_performance_engineer', 'infrastructure_lead'],
        high: ['infrastructure_lead', 'technical_director'],
        critical: ['technical_director', 'cto'],
      },
      security_risk: {
        low: ['security_analyst', 'senior_security_analyst'],
        medium: ['senior_security_analyst', 'security_lead'],
        high: ['security_lead', 'ciso'],
        critical: ['ciso', 'cto'],
      },
      business_logic: {
        low: ['business_analyst', 'senior_business_analyst'],
        medium: ['senior_business_analyst', 'product_manager'],
        high: ['product_manager', 'product_director'],
        critical: ['product_director', 'cpo'],
      },
      large_dataset: {
        low: ['data_engineer', 'senior_data_engineer'],
        medium: ['senior_data_engineer', 'data_lead'],
        high: ['data_lead', 'infrastructure_lead'],
        critical: ['infrastructure_lead', 'cto'],
      },
    };

    return escalationPaths[type][riskLevel];
  }

  private buildFilterConditions(filters: ApprovalFilters): any[] {
    const conditions: any[] = [];

    if (filters.status?.length) {
      conditions.push(inArray(approvalRequests.status, filters.status));
    }

    if (filters.type?.length) {
      conditions.push(inArray(approvalRequests.type, filters.type));
    }

    if (filters.riskLevel?.length) {
      conditions.push(inArray(approvalRequests.riskLevel, filters.riskLevel));
    }

    if (filters.assignedTo?.length) {
      conditions.push(
        or(
          ...filters.assignedTo.map(userId =>
            sql`${userId} = ANY(${approvalRequests.assignedTo})`
          )
        )
      );
    }

    if (filters.dateRange) {
      conditions.push(
        and(
          gte(approvalRequests.createdAt, filters.dateRange.start),
          lte(approvalRequests.createdAt, filters.dateRange.end)
        )
      );
    }

    if (filters.searchQuery) {
      conditions.push(
        or(
          sql`${approvalRequests.title} ILIKE ${'%' + filters.searchQuery + '%'}`,
          sql`${approvalRequests.description} ILIKE ${'%' + filters.searchQuery + '%'}`
        )
      );
    }

    return conditions;
  }

  private async getSystemRecommendation(approval: ApprovalRequest): Promise<string> {
    // Implement AI-based recommendation logic
    // This could integrate with the existing LLM services
    return 'approve'; // Placeholder
  }

  private async calculateConfidenceScore(approval: ApprovalRequest): Promise<string> {
    // Calculate confidence based on risk factors and historical data
    const baseConfidence = approval.riskLevel === 'low' ? 0.9 : 
                          approval.riskLevel === 'medium' ? 0.7 :
                          approval.riskLevel === 'high' ? 0.5 : 0.3;
    
    return baseConfidence.toString();
  }

  private async executeApprovedAction(approval: ApprovalRequest): Promise<string[]> {
    const actions: string[] = [];

    // Execute the approved action based on approval type
    switch (approval.type) {
      case 'data_integrity':
        actions.push('Data operation approved and executed');
        break;
      case 'performance_impact':
        actions.push('Performance-impacting operation approved');
        break;
      case 'security_risk':
        actions.push('Security operation approved with monitoring enabled');
        break;
      case 'business_logic':
        actions.push('Business logic change approved and applied');
        break;
      case 'large_dataset':
        actions.push('Large dataset operation approved and queued');
        break;
    }

    return actions;
  }

  private async executeRejectedAction(approval: ApprovalRequest): Promise<string[]> {
    const actions: string[] = [];

    // Handle rejection based on approval type
    switch (approval.type) {
      case 'data_integrity':
        actions.push('Data operation rejected - reverting to safe state');
        break;
      case 'performance_impact':
        actions.push('Performance operation rejected - maintaining current state');
        break;
      case 'security_risk':
        actions.push('Security operation rejected - additional review required');
        break;
      case 'business_logic':
        actions.push('Business logic change rejected - no changes applied');
        break;
      case 'large_dataset':
        actions.push('Large dataset operation rejected - operation cancelled');
        break;
    }

    return actions;
  }

  private async handleApprovalTimeout(approval: ApprovalRequest): Promise<void> {
    // Handle timeout based on risk level and type
    if (approval.riskLevel === 'critical') {
      // Escalate critical approvals
      if (approval.escalationPath && approval.escalationPath.length > 0) {
        await this.escalateApproval(approval, 'system', 'Timeout escalation');
      } else {
        // No escalation path - reject for safety
        await this.makeDecision({
          approvalId: approval.id,
          decision: 'reject',
          approver: 'system',
          reasoning: 'Timeout - no escalation path available',
        });
      }
    } else if (approval.riskLevel === 'low') {
      // Auto-approve low risk items
      await this.makeDecision({
        approvalId: approval.id,
        decision: 'approve',
        approver: 'system',
        reasoning: 'Auto-approved due to timeout - low risk',
      });
    } else {
      // Escalate medium and high risk items
      if (approval.escalationPath && approval.escalationPath.length > 0) {
        await this.escalateApproval(approval, 'system', 'Timeout escalation');
      }
    }
  }

  private async notifyApprovers(approval: ApprovalRequest): Promise<void> {
    // Implement real-time notification logic
    // This would integrate with WebSocket service and notification service
    console.log(`Notifying approvers for approval ${approval.id}:`, approval.assignedTo);
  }

  private async notifyDecisionMade(
    approval: ApprovalRequest,
    decision: ApprovalDecision
  ): Promise<void> {
    // Implement decision notification logic
    console.log(`Decision made for approval ${approval.id}:`, decision.decision);
  }

  private async updateApprovalMetrics(
    userId: string,
    action: 'created' | 'decision',
    type: ApprovalType,
    riskLevel: RiskLevel
  ): Promise<void> {
    // Update daily metrics for the user
    const today = new Date().toISOString().split('T')[0];
    
    // This would update the approval_metrics table
    // Implementation depends on specific metrics tracking requirements
    console.log(`Updating metrics for ${userId}: ${action} ${type} ${riskLevel}`);
  }
}

export default ApprovalService;