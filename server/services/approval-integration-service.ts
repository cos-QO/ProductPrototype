import { ApprovalService } from './approval-service';
import { ApprovalRoutingEngine } from './approval-routing-engine';
import type {
  ApprovalType,
  RiskLevel,
  ApprovalContext,
  RiskAssessment,
  ApprovalRequest,
} from '@shared/schema';

/**
 * Approval Integration Service
 * Provides integration points for the bulk upload workflow and other systems
 * Implements the 80/20 rule for intelligent automation with human oversight
 */

export interface BulkUploadApprovalContext extends ApprovalContext {
  importSessionId: string;
  fileName: string;
  recordCount: number;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    confidence: number;
    strategy: string;
  }>;
  validationErrors: Array<{
    type: string;
    severity: 'error' | 'warning';
    count: number;
    samples: string[];
  }>;
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    throughput: number;
  };
  businessImpact: {
    affectedRecords: number;
    revenueImpact: number;
    complianceRisk: boolean;
  };
}

export interface ApprovalCheckpoint {
  id: string;
  name: string;
  description: string;
  trigger: (context: BulkUploadApprovalContext) => boolean;
  assessRisk: (context: BulkUploadApprovalContext) => RiskAssessment;
  getApprovalType: (context: BulkUploadApprovalContext) => ApprovalType;
  autoApprovalEligible: (context: BulkUploadApprovalContext) => boolean;
  mitigation: string[];
}

export class ApprovalIntegrationService {
  private static instance: ApprovalIntegrationService;
  private approvalService: ApprovalService;
  private routingEngine: ApprovalRoutingEngine;
  private checkpoints: ApprovalCheckpoint[];

  static getInstance(): ApprovalIntegrationService {
    if (!ApprovalIntegrationService.instance) {
      ApprovalIntegrationService.instance = new ApprovalIntegrationService();
    }
    return ApprovalIntegrationService.instance;
  }

  constructor() {
    this.approvalService = ApprovalService.getInstance();
    this.routingEngine = ApprovalRoutingEngine.getInstance();
    this.initializeCheckpoints();
  }

  private initializeCheckpoints(): void {
    this.checkpoints = [
      // Data Integrity Checkpoint
      {
        id: 'data-integrity',
        name: 'Data Integrity Validation',
        description: 'Validates data quality and prevents data loss',
        trigger: (context) => {
          return context.validationErrors.some(e => e.severity === 'error') ||
                 context.fieldMappings.some(m => m.confidence < 60);
        },
        assessRisk: (context) => {
          const errorCount = context.validationErrors.filter(e => e.severity === 'error').length;
          const lowConfidenceMappings = context.fieldMappings.filter(m => m.confidence < 60).length;
          const revenueFieldsAffected = context.fieldMappings.some(m => 
            ['price', 'cost', 'revenue', 'profit'].includes(m.targetField.toLowerCase())
          );

          let score = 0;
          let factors: string[] = [];

          if (errorCount > 0) {
            score += Math.min(40, errorCount * 5);
            factors.push(`${errorCount} validation errors detected`);
          }

          if (lowConfidenceMappings > 0) {
            score += Math.min(30, lowConfidenceMappings * 3);
            factors.push(`${lowConfidenceMappings} field mappings with low confidence`);
          }

          if (revenueFieldsAffected) {
            score += 25;
            factors.push('Revenue-impacting fields affected');
          }

          if (context.recordCount > 10000) {
            score += 10;
            factors.push('Large dataset - high impact potential');
          }

          const level: RiskLevel = 
            score >= 75 ? 'critical' :
            score >= 50 ? 'high' :
            score >= 25 ? 'medium' : 'low';

          return {
            level,
            score,
            factors,
            confidenceLevel: Math.max(60, 100 - score),
            mitigationStrategies: [
              'Preview data before import',
              'Validate critical fields manually',
              'Enable rollback capability',
              'Monitor data quality metrics',
            ],
          };
        },
        getApprovalType: () => 'data_integrity',
        autoApprovalEligible: (context) => {
          const hasErrors = context.validationErrors.some(e => e.severity === 'error');
          const hasLowConfidence = context.fieldMappings.some(m => m.confidence < 80);
          return !hasErrors && !hasLowConfidence && context.recordCount < 1000;
        },
        mitigation: [
          'Implement data validation rules',
          'Review field mapping confidence',
          'Enable incremental import',
          'Set up data quality monitoring',
        ],
      },

      // Performance Impact Checkpoint
      {
        id: 'performance-impact',
        name: 'Performance Impact Assessment',
        description: 'Monitors system performance and resource usage',
        trigger: (context) => {
          return context.performanceMetrics.memoryUsage > 80 ||
                 context.performanceMetrics.cpuUsage > 80 ||
                 context.performanceMetrics.responseTime > 3000 ||
                 context.recordCount > 50000;
        },
        assessRisk: (context) => {
          const metrics = context.performanceMetrics;
          let score = 0;
          let factors: string[] = [];

          if (metrics.memoryUsage > 80) {
            score += 30;
            factors.push(`High memory usage: ${metrics.memoryUsage}%`);
          }

          if (metrics.cpuUsage > 80) {
            score += 25;
            factors.push(`High CPU usage: ${metrics.cpuUsage}%`);
          }

          if (metrics.responseTime > 3000) {
            score += 20;
            factors.push(`Slow response time: ${metrics.responseTime}ms`);
          }

          if (context.recordCount > 100000) {
            score += 25;
            factors.push(`Very large dataset: ${context.recordCount.toLocaleString()} records`);
          } else if (context.recordCount > 50000) {
            score += 15;
            factors.push(`Large dataset: ${context.recordCount.toLocaleString()} records`);
          }

          // Time-based factors
          const hour = new Date().getHours();
          const isBusinessHours = hour >= 9 && hour <= 17;
          if (!isBusinessHours) {
            score -= 10; // Lower risk outside business hours
            factors.push('Outside business hours - reduced impact');
          } else {
            score += 10;
            factors.push('During business hours - potential user impact');
          }

          const level: RiskLevel = 
            score >= 75 ? 'critical' :
            score >= 50 ? 'high' :
            score >= 25 ? 'medium' : 'low';

          return {
            level,
            score,
            factors,
            confidenceLevel: 85,
            mitigationStrategies: [
              'Process during off-peak hours',
              'Implement batch processing',
              'Monitor system resources',
              'Set up performance alerts',
            ],
          };
        },
        getApprovalType: () => 'performance_impact',
        autoApprovalEligible: (context) => {
          const metrics = context.performanceMetrics;
          const isOffPeak = new Date().getHours() < 9 || new Date().getHours() > 17;
          return metrics.memoryUsage < 50 && 
                 metrics.cpuUsage < 50 && 
                 context.recordCount < 10000 &&
                 isOffPeak;
        },
        mitigation: [
          'Schedule during off-peak hours',
          'Implement resource throttling',
          'Use streaming processing',
          'Monitor system health',
        ],
      },

      // Security Risk Checkpoint
      {
        id: 'security-risk',
        name: 'Security Risk Assessment',
        description: 'Identifies potential security threats and vulnerabilities',
        trigger: (context) => {
          // Check for potentially dangerous file patterns
          const suspiciousPatterns = [
            /javascript:/i,
            /<script/i,
            /eval\(/i,
            /exec\(/i,
            /system\(/i,
            /\${/,
            /\$\(/,
          ];

          return context.validationErrors.some(error => 
            suspiciousPatterns.some(pattern => pattern.test(error.samples.join(' ')))
          );
        },
        assessRisk: (context) => {
          let score = 0;
          let factors: string[] = [];

          // Check for injection patterns
          const suspiciousData = context.validationErrors.some(error =>
            error.samples.some(sample => 
              /<script|javascript:|eval\(|exec\(/.test(sample)
            )
          );

          if (suspiciousData) {
            score += 80;
            factors.push('Potential code injection patterns detected');
          }

          // Check for unusual file patterns
          const unusualPatterns = context.fieldMappings.some(mapping =>
            /password|secret|token|key|auth/.test(mapping.sourceField.toLowerCase())
          );

          if (unusualPatterns) {
            score += 30;
            factors.push('Sensitive field names detected');
          }

          // Check upload frequency and user behavior
          const isHighVolumeUpload = context.recordCount > 100000;
          if (isHighVolumeUpload) {
            score += 15;
            factors.push('High volume upload - potential data exfiltration');
          }

          const level: RiskLevel = 
            score >= 75 ? 'critical' :
            score >= 50 ? 'high' :
            score >= 25 ? 'medium' : 'low';

          return {
            level,
            score,
            factors,
            confidenceLevel: 95, // High confidence in security assessment
            mitigationStrategies: [
              'Scan for malicious content',
              'Validate data sources',
              'Enable enhanced logging',
              'Require additional authorization',
            ],
          };
        },
        getApprovalType: () => 'security_risk',
        autoApprovalEligible: () => false, // Never auto-approve security risks
        mitigation: [
          'Content security scanning',
          'User behavior monitoring',
          'Enhanced audit logging',
          'Multi-factor authentication',
        ],
      },

      // Business Logic Checkpoint
      {
        id: 'business-logic',
        name: 'Business Logic Validation',
        description: 'Validates business rules and logic constraints',
        trigger: (context) => {
          return context.businessImpact.revenueImpact > 0 ||
                 context.businessImpact.complianceRisk ||
                 context.fieldMappings.some(m => 
                   ['price', 'status', 'category', 'brand'].includes(m.targetField.toLowerCase())
                 );
        },
        assessRisk: (context) => {
          let score = 0;
          let factors: string[] = [];

          if (context.businessImpact.revenueImpact > 100000) {
            score += 40;
            factors.push(`High revenue impact: $${context.businessImpact.revenueImpact.toLocaleString()}`);
          } else if (context.businessImpact.revenueImpact > 10000) {
            score += 25;
            factors.push(`Medium revenue impact: $${context.businessImpact.revenueImpact.toLocaleString()}`);
          }

          if (context.businessImpact.complianceRisk) {
            score += 35;
            factors.push('Compliance regulations may be affected');
          }

          const criticalFields = context.fieldMappings.filter(m =>
            ['price', 'cost', 'tax', 'shipping'].includes(m.targetField.toLowerCase())
          );

          if (criticalFields.length > 0) {
            score += 20;
            factors.push(`${criticalFields.length} critical business fields affected`);
          }

          const level: RiskLevel = 
            score >= 75 ? 'critical' :
            score >= 50 ? 'high' :
            score >= 25 ? 'medium' : 'low';

          return {
            level,
            score,
            factors,
            confidenceLevel: 80,
            mitigationStrategies: [
              'Review business rule compliance',
              'Validate pricing logic',
              'Check regulatory requirements',
              'Notify stakeholders',
            ],
          };
        },
        getApprovalType: () => 'business_logic',
        autoApprovalEligible: (context) => {
          return context.businessImpact.revenueImpact === 0 &&
                 !context.businessImpact.complianceRisk &&
                 context.recordCount < 5000;
        },
        mitigation: [
          'Business stakeholder review',
          'Compliance team approval',
          'Financial impact assessment',
          'Regulatory check',
        ],
      },

      // Large Dataset Checkpoint
      {
        id: 'large-dataset',
        name: 'Large Dataset Processing',
        description: 'Handles large dataset imports with appropriate safeguards',
        trigger: (context) => {
          return context.recordCount > 25000 ||
                 context.performanceMetrics.memoryUsage > 70;
        },
        assessRisk: (context) => {
          let score = 0;
          let factors: string[] = [];

          if (context.recordCount > 500000) {
            score += 40;
            factors.push(`Very large dataset: ${context.recordCount.toLocaleString()} records`);
          } else if (context.recordCount > 100000) {
            score += 25;
            factors.push(`Large dataset: ${context.recordCount.toLocaleString()} records`);
          } else if (context.recordCount > 25000) {
            score += 15;
            factors.push(`Medium dataset: ${context.recordCount.toLocaleString()} records`);
          }

          if (context.performanceMetrics.memoryUsage > 70) {
            score += 20;
            factors.push(`High memory usage: ${context.performanceMetrics.memoryUsage}%`);
          }

          // Check for complex field mappings
          const complexMappings = context.fieldMappings.filter(m => m.confidence < 70).length;
          if (complexMappings > 0) {
            score += 15;
            factors.push(`${complexMappings} complex field mappings`);
          }

          const level: RiskLevel = 
            score >= 75 ? 'critical' :
            score >= 50 ? 'high' :
            score >= 25 ? 'medium' : 'low';

          return {
            level,
            score,
            factors,
            confidenceLevel: 90,
            mitigationStrategies: [
              'Process in smaller batches',
              'Monitor system resources',
              'Implement streaming',
              'Schedule during off-peak',
            ],
          };
        },
        getApprovalType: () => 'large_dataset',
        autoApprovalEligible: (context) => {
          const isOffPeak = new Date().getHours() < 9 || new Date().getHours() > 17;
          return context.recordCount < 50000 &&
                 context.performanceMetrics.memoryUsage < 50 &&
                 isOffPeak &&
                 context.fieldMappings.every(m => m.confidence > 80);
        },
        mitigation: [
          'Batch processing strategy',
          'Resource monitoring',
          'Progress tracking',
          'Rollback capability',
        ],
      },
    ];
  }

  /**
   * Main integration method for bulk upload workflow
   */
  async evaluateImportSession(
    importSessionId: string,
    context: BulkUploadApprovalContext
  ): Promise<{
    requiresApproval: boolean;
    approvalRequest?: ApprovalRequest;
    autoApproved: boolean;
    recommendations: string[];
  }> {
    // Evaluate all checkpoints
    const triggeredCheckpoints = this.checkpoints.filter(checkpoint => 
      checkpoint.trigger(context)
    );

    if (triggeredCheckpoints.length === 0) {
      return {
        requiresApproval: false,
        autoApproved: true,
        recommendations: ['Import can proceed automatically - no risks detected'],
      };
    }

    // Find the highest risk checkpoint
    const riskAssessments = triggeredCheckpoints.map(checkpoint => ({
      checkpoint,
      risk: checkpoint.assessRisk(context),
    }));

    const highestRisk = riskAssessments.reduce((max, current) => 
      current.risk.score > max.risk.score ? current : max
    );

    const { checkpoint, risk } = highestRisk;

    // Check if auto-approval is possible
    const canAutoApprove = triggeredCheckpoints.every(cp => cp.autoApprovalEligible(context));
    
    if (canAutoApprove && risk.level === 'low') {
      return {
        requiresApproval: false,
        autoApproved: true,
        recommendations: [
          'Auto-approved based on low risk assessment',
          ...checkpoint.mitigation,
        ],
      };
    }

    // Route for human approval
    const routingContext = {
      type: checkpoint.getApprovalType(context),
      riskAssessment: risk,
      context,
      urgency: risk.level === 'critical' ? 'critical' as const :
               risk.level === 'high' ? 'high' as const :
               risk.level === 'medium' ? 'medium' as const : 'low' as const,
      businessHours: this.isBusinessHours(),
      systemLoad: context.performanceMetrics.cpuUsage,
      availableApprovers: await this.getAvailableApprovers(checkpoint.getApprovalType(context)),
      estimatedComplexity: risk.score > 75 ? 'complex' as const :
                          risk.score > 50 ? 'moderate' as const : 'simple' as const,
    };

    const routingDecision = await this.routingEngine.routeApproval(routingContext);

    if (routingDecision.route === 'automated') {
      return {
        requiresApproval: false,
        autoApproved: true,
        recommendations: [
          'Auto-approved by routing engine',
          routingDecision.reasoning,
        ],
      };
    }

    // Create approval request
    const approvalRequest = await this.approvalService.createApprovalRequest({
      type: checkpoint.getApprovalType(context),
      title: `${checkpoint.name} - ${context.fileName}`,
      description: `${checkpoint.description}\n\nFile: ${context.fileName}\nRecords: ${context.recordCount.toLocaleString()}\nRisk Level: ${risk.level}`,
      context: {
        ...context,
        recommendations: [{
          action: 'approve',
          reasoning: routingDecision.reasoning,
          confidence: routingDecision.confidence || 70,
          estimatedTime: 15,
        }],
        riskAssessment: risk,
        timestamp: new Date().toISOString(),
      },
      riskAssessment: risk,
      assignedTo: routingDecision.assignedApprovers,
      priority: routingDecision.priority,
      timeoutMinutes: routingDecision.timeoutDuration,
      importSessionId,
      metadata: {
        checkpointId: checkpoint.id,
        fileName: context.fileName,
        recordCount: context.recordCount,
        triggeredCheckpoints: triggeredCheckpoints.map(cp => cp.id),
      },
    });

    return {
      requiresApproval: true,
      approvalRequest,
      autoApproved: false,
      recommendations: [
        `Requires ${risk.level} risk approval`,
        ...checkpoint.mitigation,
        `Assigned to: ${routingDecision.assignedApprovers.join(', ')}`,
        `Timeout: ${routingDecision.timeoutDuration} minutes`,
      ],
    };
  }

  /**
   * Wait for approval decision with timeout handling
   */
  async waitForApprovalDecision(
    approvalId: string,
    timeoutMinutes: number = 60
  ): Promise<{
    approved: boolean;
    decision: string;
    reasoning?: string;
    timedOut: boolean;
  }> {
    return new Promise((resolve) => {
      const checkInterval = 5000; // Check every 5 seconds
      const maxChecks = (timeoutMinutes * 60 * 1000) / checkInterval;
      let checks = 0;

      const intervalId = setInterval(async () => {
        checks++;

        try {
          const approval = await this.approvalService.getApprovals(
            { status: ['approved', 'rejected', 'escalated'] },
            { page: 1, pageSize: 1 }
          );

          const targetApproval = approval.data.find(a => a.id === approvalId);

          if (targetApproval) {
            clearInterval(intervalId);
            resolve({
              approved: targetApproval.status === 'approved',
              decision: targetApproval.status,
              reasoning: targetApproval.decisionReasoning,
              timedOut: false,
            });
            return;
          }

          if (checks >= maxChecks) {
            clearInterval(intervalId);
            // Handle timeout
            await this.approvalService.handleTimeoutApprovals();
            resolve({
              approved: false,
              decision: 'timeout',
              reasoning: 'Approval request timed out',
              timedOut: true,
            });
          }
        } catch (error) {
          console.error('Error checking approval status:', error);
        }
      }, checkInterval);
    });
  }

  /**
   * Integration hook for error recovery system
   */
  async evaluateErrorRecovery(
    errorContext: {
      errorType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      autoRecoveryAttempted: boolean;
      autoRecoverySuccess: boolean;
      proposedSolution: string;
      affectedRecords: number;
    }
  ): Promise<{
    requiresApproval: boolean;
    approvalRequest?: ApprovalRequest;
    canProceed: boolean;
  }> {
    // High severity errors always require approval
    if (errorContext.severity === 'critical' || errorContext.severity === 'high') {
      const risk: RiskAssessment = {
        level: errorContext.severity as RiskLevel,
        score: errorContext.severity === 'critical' ? 90 : 70,
        factors: [
          `${errorContext.errorType} error occurred`,
          `Auto-recovery ${errorContext.autoRecoverySuccess ? 'succeeded' : 'failed'}`,
          `${errorContext.affectedRecords} records affected`,
        ],
        confidenceLevel: 80,
        mitigationStrategies: [
          'Manual intervention required',
          'Data integrity validation',
          'System health check',
        ],
      };

      const approvalRequest = await this.approvalService.createApprovalRequest({
        type: 'data_integrity',
        title: `Error Recovery: ${errorContext.errorType}`,
        description: `Error recovery approval required for ${errorContext.errorType}\n\nProposed solution: ${errorContext.proposedSolution}\nAffected records: ${errorContext.affectedRecords}`,
        context: {
          businessImpact: `${errorContext.affectedRecords} records may be affected`,
          technicalImpact: `${errorContext.errorType} error in data processing`,
          recommendations: [{
            action: errorContext.autoRecoverySuccess ? 'approve' : 'reject',
            reasoning: errorContext.autoRecoverySuccess 
              ? 'Auto-recovery succeeded, manual approval recommended'
              : 'Auto-recovery failed, manual intervention required',
            confidence: errorContext.autoRecoverySuccess ? 75 : 25,
          }],
          riskAssessment: risk,
          timestamp: new Date().toISOString(),
        },
        riskAssessment: risk,
        assignedTo: ['data_engineer', 'senior_data_engineer'],
        priority: errorContext.severity === 'critical' ? 'critical' : 'high',
        timeoutMinutes: errorContext.severity === 'critical' ? 30 : 60,
      });

      return {
        requiresApproval: true,
        approvalRequest,
        canProceed: false,
      };
    }

    // Low/medium severity with successful auto-recovery can proceed
    if (errorContext.autoRecoverySuccess) {
      return {
        requiresApproval: false,
        canProceed: true,
      };
    }

    // Failed auto-recovery requires approval
    return {
      requiresApproval: true,
      canProceed: false,
    };
  }

  private isBusinessHours(): boolean {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  private async getAvailableApprovers(approvalType: ApprovalType): Promise<string[]> {
    // This would integrate with user management system
    const approverMap: Record<ApprovalType, string[]> = {
      data_integrity: ['data_analyst', 'senior_data_analyst', 'data_engineer'],
      performance_impact: ['performance_engineer', 'infrastructure_engineer', 'sre'],
      security_risk: ['security_analyst', 'security_engineer', 'ciso'],
      business_logic: ['business_analyst', 'product_manager', 'domain_expert'],
      large_dataset: ['data_engineer', 'senior_data_engineer', 'data_architect'],
    };

    return approverMap[approvalType] || ['admin'];
  }
}

export default ApprovalIntegrationService;