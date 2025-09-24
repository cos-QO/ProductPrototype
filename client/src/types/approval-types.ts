// User Approval Checkpoints System - TypeScript Types
// Integration with QueenOne ProductPrototype Automated Edge Case Testing Framework

import type {
  ApprovalRequest as DBApprovalRequest,
  ApprovalDecision as DBApprovalDecision,
  ApprovalPreferences as DBApprovalPreferences,
  ApprovalMetrics as DBApprovalMetrics,
  ApprovalType,
  RiskLevel,
  ApprovalStatus,
  DecisionType,
  ApprovalContext,
  RiskAssessment,
  RoutingDecision,
} from "@shared/schema";

// Re-export base types from schema
export type {
  ApprovalType,
  RiskLevel,
  ApprovalStatus,
  DecisionType,
  ApprovalContext,
  RiskAssessment,
  RoutingDecision,
};

// Extended types for frontend components
export interface ApprovalRequest extends Omit<DBApprovalRequest, 'assignedTo' | 'escalationPath'> {
  assignedTo: string[];
  escalationPath: string[] | null;
  timeRemaining?: number; // milliseconds until deadline
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  canApprove?: boolean; // User permission check
  relatedApprovals?: string[]; // Related approval IDs
}

export interface ApprovalDecision extends DBApprovalDecision {
  isCurrentUser?: boolean; // If decision was made by current user
}

export interface ApprovalPreferences extends DBApprovalPreferences {
  notificationSettings?: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
  };
}

// Dashboard and UI component types
export interface ApprovalDashboardProps {
  userId: string;
  userRole: string;
  autoRefresh?: boolean;
  defaultFilters?: ApprovalFilters;
  compact?: boolean;
}

export interface ApprovalDashboardState {
  approvals: ApprovalRequest[];
  loading: boolean;
  error: string | null;
  filters: ApprovalFilters;
  selectedApprovals: string[];
  realTimeConnected: boolean;
  lastUpdate: Date | null;
  totalCount: number;
}

export interface ApprovalFilters {
  status?: ApprovalStatus[];
  type?: ApprovalType[];
  riskLevel?: RiskLevel[];
  assignedTo?: string[];
  timeRange?: TimeRange;
  urgency?: string[];
  searchQuery?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: 'today' | 'week' | 'month' | 'custom';
}

// Approval Card Component Types
export interface ApprovalCardProps {
  approval: ApprovalRequest;
  onDecision: (decision: ApprovalDecisionRequest) => Promise<void>;
  onExpand: (approvalId: string) => void;
  onSelect?: (approvalId: string, selected: boolean) => void;
  compact?: boolean;
  showBatchSelect?: boolean;
  isSelected?: boolean;
  className?: string;
}

export interface ApprovalCardState {
  isExpanded: boolean;
  isLoading: boolean;
  showDecisionDialog: boolean;
  decisionType: DecisionType | null;
}

// Risk Indicator Component Types
export interface RiskIndicatorProps {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: string[];
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  className?: string;
}

export interface RiskIndicatorConfig {
  color: string;
  icon: string;
  label: string;
  description: string;
  animation?: string;
  gradient?: string;
}

// Approval Decision Types
export interface ApprovalDecisionRequest {
  approvalId: string;
  decision: DecisionType;
  reasoning?: string;
  conditions?: string[];
  delegateTo?: string;
  estimatedImpact?: string;
  followUpActions?: string[];
}

export interface ApprovalDecisionResponse {
  success: boolean;
  approval: ApprovalRequest;
  nextActions?: string[];
  recommendations?: string[];
  error?: string;
}

export interface BatchApprovalRequest {
  approvalIds: string[];
  decision: 'approve' | 'reject';
  reasoning?: string;
  batchReason?: string;
}

export interface BatchApprovalResponse {
  successful: number;
  failed: string[];
  results: {
    approvalId: string;
    success: boolean;
    error?: string;
  }[];
  summary: {
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
  };
}

// Notification Types
export interface ApprovalNotification {
  id: string;
  type: 'new_approval' | 'deadline_warning' | 'decision_made' | 'escalation' | 'timeout';
  approvalId: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  types: {
    newApproval: boolean;
    deadlineWarning: boolean;
    decisionMade: boolean;
    escalation: boolean;
    timeout: boolean;
  };
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  schedule: {
    businessHoursOnly: boolean;
    timezone: string;
    quietHours: {
      start: string; // HH:mm format
      end: string;
    };
  };
}

// WebSocket Event Types
export interface ApprovalWebSocketEvents {
  // Server to Client
  'approval:new': ApprovalRequest;
  'approval:updated': {
    approvalId: string;
    changes: Partial<ApprovalRequest>;
    timestamp: Date;
  };
  'approval:decision_made': {
    approvalId: string;
    decision: ApprovalDecision;
    nextApprovers?: string[];
  };
  'approval:escalated': {
    approvalId: string;
    escalationLevel: number;
    newApprovers: string[];
    reason: string;
  };
  'approval:timeout_warning': {
    approvalId: string;
    timeRemaining: number; // minutes
    autoAction: 'escalate' | 'auto_approve' | 'auto_reject';
  };
  'queue:count_updated': {
    userId: string;
    pendingCount: number;
    urgentCount: number;
  };
  'system:status_change': {
    status: 'healthy' | 'degraded' | 'critical';
    message: string;
    affectedServices: string[];
  };
}

export interface ApprovalWebSocketClientEvents {
  // Client to Server
  'approval:subscribe': {
    userId: string;
    filters?: ApprovalFilters;
  };
  'approval:unsubscribe': {
    userId: string;
  };
  'approval:decision': ApprovalDecisionRequest;
  'approval:request_details': {
    approvalId: string;
    includeHistory: boolean;
  };
  'heartbeat': {
    timestamp: Date;
  };
}

// Detailed Context Types
export interface DetailedApprovalContext extends ApprovalContext {
  testScenario?: {
    type: string;
    complexity: 'low' | 'medium' | 'high';
    recordCount: number;
    expectedErrors: any[];
    performanceTargets: any[];
  };
  systemMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  userContext?: {
    previousDecisions: ApprovalDecision[];
    expertiseAreas: string[];
    delegationRules: any;
    workloadScore: number;
  };
  complianceRequirements?: {
    regulations: string[];
    auditRequired: boolean;
    retentionPeriod: number;
    approvalChain: string[];
  };
}

// Dashboard Statistics Types
export interface ApprovalDashboardStats {
  totalPending: number;
  byRiskLevel: Record<RiskLevel, number>;
  byType: Record<ApprovalType, number>;
  byUrgency: Record<string, number>;
  averageDecisionTime: number; // minutes
  automationRate: number; // percentage
  userStats: {
    todayApproved: number;
    weekApproved: number;
    accuracyScore: number;
    averageResponseTime: number;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

// Approval History Types
export interface ApprovalHistoryEntry {
  id: string;
  approval: ApprovalRequest;
  decisions: ApprovalDecision[];
  timeline: {
    created: Date;
    firstResponse?: Date;
    completed?: Date;
    escalations: {
      timestamp: Date;
      fromUser: string;
      toUser: string;
      reason: string;
    }[];
  };
  outcome: {
    finalDecision: DecisionType;
    effectiveApprover: string;
    totalDuration: number; // minutes
    escalationCount: number;
  };
  impact?: {
    businessImpact: string;
    technicalOutcome: string;
    lessonsLearned: string[];
  };
}

// Smart Routing Types
export interface RoutingConfiguration {
  autoApprovalRules: {
    riskLevel: RiskLevel[];
    confidenceThreshold: number;
    approvalTypes: ApprovalType[];
    businessHoursOnly: boolean;
    maxValue?: number;
  };
  escalationRules: {
    timeoutMinutes: number;
    escalationChain: string[];
    maxEscalations: number;
    escalationCriteria: string[];
  };
  delegationRules: {
    allowDelegation: boolean;
    delegationCriteria: string[];
    maxDelegationDepth: number;
    requireApproverConfirmation: boolean;
  };
  workloadBalancing: {
    enabled: boolean;
    maxConcurrentApprovals: number;
    skillBasedRouting: boolean;
    availabilityAware: boolean;
  };
}

// Performance Monitoring Types
export interface ApprovalSystemMetrics {
  performance: {
    avgDecisionTime: number;
    medianDecisionTime: number;
    p95DecisionTime: number;
    automationRate: number;
    throughputPerHour: number;
  };
  quality: {
    accuracyRate: number;
    escalationRate: number;
    timeoutRate: number;
    userSatisfactionScore: number;
    errorRate: number;
  };
  volume: {
    totalApprovals: number;
    approvalsToday: number;
    pendingApprovals: number;
    overdueApprovals: number;
    peakHourVolume: number;
  };
  trends: {
    volumeTrend: 'up' | 'down' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
    automationTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

// Export utility types
export interface ApprovalSystemConfig {
  features: {
    batchApprovals: boolean;
    autoEscalation: boolean;
    smartRouting: boolean;
    realTimeUpdates: boolean;
    mobileSupport: boolean;
  };
  limits: {
    maxBatchSize: number;
    maxConcurrentApprovals: number;
    maxEscalationDepth: number;
    sessionTimeoutMinutes: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    showAdvancedControls: boolean;
    defaultPageSize: number;
  };
}

// Hook return types
export interface UseApprovalsResult {
  approvals: ApprovalRequest[];
  loading: boolean;
  error: string | null;
  filters: ApprovalFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  stats: ApprovalDashboardStats;
  actions: {
    refresh: () => Promise<void>;
    setFilters: (filters: Partial<ApprovalFilters>) => void;
    setPage: (page: number) => void;
    makeDecision: (request: ApprovalDecisionRequest) => Promise<ApprovalDecisionResponse>;
    batchDecision: (request: BatchApprovalRequest) => Promise<BatchApprovalResponse>;
    escalate: (approvalId: string, reason: string) => Promise<void>;
    delegate: (approvalId: string, delegateTo: string, reason: string) => Promise<void>;
  };
}

export interface UseApprovalDecisionResult {
  isLoading: boolean;
  error: string | null;
  makeDecision: (request: ApprovalDecisionRequest) => Promise<ApprovalDecisionResponse>;
  makeBatchDecision: (request: BatchApprovalRequest) => Promise<BatchApprovalResponse>;
  canApprove: (approvalId: string) => boolean;
  getRecommendation: (approvalId: string) => string | null;
}

// Error types
export interface ApprovalError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestedActions?: string[];
}

export interface ApprovalValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Export all types as a namespace for easy importing
export namespace ApprovalTypes {
  export type Request = ApprovalRequest;
  export type Decision = ApprovalDecision;
  export type Preferences = ApprovalPreferences;
  export type Context = DetailedApprovalContext;
  export type Notification = ApprovalNotification;
  export type Stats = ApprovalDashboardStats;
  export type History = ApprovalHistoryEntry;
  export type Metrics = ApprovalSystemMetrics;
  export type Config = ApprovalSystemConfig;
  export type Error = ApprovalError;
}