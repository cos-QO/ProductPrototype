import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  ArrowUp,
  Users,
  MoreHorizontal,
  Zap,
  Clock,
  AlertTriangle,
  Target,
  MessageSquare,
  TrendingUp,
  Shield,
  ChevronDown,
} from 'lucide-react';

import type {
  ApprovalRequest,
  ApprovalDecisionRequest,
  DecisionType,
  RiskLevel,
} from '@/types/approval-types';

interface ApprovalActionsProps {
  approval: ApprovalRequest;
  onDecision: (request: ApprovalDecisionRequest) => Promise<void>;
  onDelegate?: (approvalId: string, delegateTo: string, reason: string) => Promise<void>;
  onEscalate?: (approvalId: string, reason: string) => Promise<void>;
  compact?: boolean;
  disabled?: boolean;
  showSystemRecommendation?: boolean;
  availableApprovers?: Array<{ id: string; name: string; role: string }>;
  className?: string;
}

interface ActionDialogState {
  isOpen: boolean;
  type: 'approve' | 'reject' | 'escalate' | 'delegate' | null;
  reasoning: string;
  delegateTo: string;
  conditions: string[];
  estimatedImpact: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  decision: DecisionType;
  requiresReason: boolean;
  riskLevels: RiskLevel[];
  tooltip: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'quick-approve',
    label: 'Quick Approve',
    icon: CheckCircle2,
    variant: 'default',
    decision: 'approve',
    requiresReason: false,
    riskLevels: ['low', 'medium'],
    tooltip: 'Approve immediately for low to medium risk items',
  },
  {
    id: 'conditional-approve',
    label: 'Approve with Conditions',
    icon: Target,
    variant: 'outline',
    decision: 'approve',
    requiresReason: true,
    riskLevels: ['medium', 'high'],
    tooltip: 'Approve with specific conditions or monitoring',
  },
  {
    id: 'reject',
    label: 'Reject',
    icon: XCircle,
    variant: 'destructive',
    decision: 'reject',
    requiresReason: true,
    riskLevels: ['low', 'medium', 'high', 'critical'],
    tooltip: 'Reject the request with reasoning',
  },
  {
    id: 'escalate',
    label: 'Escalate',
    icon: ArrowUp,
    variant: 'outline',
    decision: 'escalate',
    requiresReason: true,
    riskLevels: ['high', 'critical'],
    tooltip: 'Escalate to higher authority',
  },
];

const systemRecommendationReasons = {
  approve: [
    'Low risk with high confidence',
    'Historical success pattern',
    'Standard operation parameters',
    'System validation passed',
  ],
  reject: [
    'High risk factors detected',
    'Validation errors present',
    'Resource constraints',
    'Policy violation detected',
  ],
  escalate: [
    'Complexity exceeds standard parameters',
    'Novel scenario requires expertise',
    'Risk level requires higher authority',
    'Business impact needs review',
  ],
};

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  approval,
  onDecision,
  onDelegate,
  onEscalate,
  compact = false,
  disabled = false,
  showSystemRecommendation = true,
  availableApprovers = [],
  className,
}) => {
  const [dialogState, setDialogState] = useState<ActionDialogState>({
    isOpen: false,
    type: null,
    reasoning: '',
    delegateTo: '',
    conditions: [],
    estimatedImpact: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  // Get system recommendation from context
  const systemRecommendation = approval.context.recommendations?.[0];
  
  // Filter available actions based on risk level and user permissions
  const availableActions = quickActions.filter(action => 
    action.riskLevels.includes(approval.riskLevel) &&
    (approval.canApprove || action.decision !== 'approve')
  );

  // Calculate time pressure indicator
  const getTimePressure = (): 'low' | 'medium' | 'high' => {
    const deadline = new Date(approval.deadline);
    const now = new Date();
    const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes <= 15) return 'high';
    if (diffMinutes <= 60) return 'medium';
    return 'low';
  };

  const timePressure = getTimePressure();

  // Handle quick decisions
  const handleQuickDecision = useCallback(async (action: QuickAction) => {
    if (action.requiresReason || approval.riskLevel === 'critical') {
      setDialogState({
        isOpen: true,
        type: action.decision as any,
        reasoning: '',
        delegateTo: '',
        conditions: [],
        estimatedImpact: '',
      });
    } else {
      // Direct execution for simple approvals
      setIsLoading(true);
      try {
        await onDecision({
          approvalId: approval.id,
          decision: action.decision,
          reasoning: `Quick ${action.decision} - ${action.tooltip}`,
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [approval.id, approval.riskLevel, onDecision]);

  // Handle system recommendation acceptance
  const handleAcceptRecommendation = useCallback(async () => {
    if (!systemRecommendation) return;

    setIsLoading(true);
    try {
      await onDecision({
        approvalId: approval.id,
        decision: systemRecommendation.action as DecisionType,
        reasoning: `Accepted system recommendation: ${systemRecommendation.reasoning}`,
        estimatedImpact: `System confidence: ${Math.round(systemRecommendation.confidence)}%`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [approval.id, systemRecommendation, onDecision]);

  // Handle dialog submission
  const handleDialogSubmit = useCallback(async () => {
    if (!dialogState.type) return;

    setIsLoading(true);
    try {
      if (dialogState.type === 'delegate' && onDelegate) {
        await onDelegate(approval.id, dialogState.delegateTo, dialogState.reasoning);
      } else if (dialogState.type === 'escalate' && onEscalate) {
        await onEscalate(approval.id, dialogState.reasoning);
      } else {
        const request: ApprovalDecisionRequest = {
          approvalId: approval.id,
          decision: dialogState.type,
          reasoning: dialogState.reasoning,
          conditions: dialogState.conditions.length > 0 ? dialogState.conditions : undefined,
          estimatedImpact: dialogState.estimatedImpact || undefined,
        };

        if (dialogState.type === 'delegate') {
          request.delegateTo = dialogState.delegateTo;
        }

        await onDecision(request);
      }

      setDialogState({
        isOpen: false,
        type: null,
        reasoning: '',
        delegateTo: '',
        conditions: [],
        estimatedImpact: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dialogState, approval.id, onDecision, onDelegate, onEscalate]);

  const closeDialog = useCallback(() => {
    setDialogState({
      isOpen: false,
      type: null,
      reasoning: '',
      delegateTo: '',
      conditions: [],
      estimatedImpact: '',
    });
  }, []);

  // Add condition to approval
  const addCondition = useCallback((condition: string) => {
    if (condition.trim()) {
      setDialogState(prev => ({
        ...prev,
        conditions: [...prev.conditions, condition.trim()],
      }));
    }
  }, []);

  const removeCondition = useCallback((index: number) => {
    setDialogState(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  }, []);

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* System recommendation quick action */}
        {showSystemRecommendation && systemRecommendation && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAcceptRecommendation}
            disabled={disabled || isLoading}
            className="h-7 px-2 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Accept ({Math.round(systemRecommendation.confidence)}%)
          </Button>
        )}

        {/* Primary actions */}
        <Button
          size="sm"
          variant="default"
          onClick={() => handleQuickDecision(quickActions.find(a => a.id === 'quick-approve')!)}
          disabled={disabled || isLoading || !approval.canApprove}
          className="h-7 px-2"
        >
          <CheckCircle2 className="h-3 w-3" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleQuickDecision(quickActions.find(a => a.id === 'reject')!)}
          disabled={disabled || isLoading}
          className="h-7 px-2"
        >
          <XCircle className="h-3 w-3" />
        </Button>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || isLoading}
              className="h-7 w-7 p-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleQuickDecision(quickActions.find(a => a.id === 'escalate')!)}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Escalate
            </DropdownMenuItem>
            {onDelegate && availableApprovers.length > 0 && (
              <DropdownMenuItem onClick={() => setDialogState({ ...dialogState, isOpen: true, type: 'delegate' })}>
                <Users className="h-4 w-4 mr-2" />
                Delegate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {/* System Recommendation */}
        {showSystemRecommendation && systemRecommendation && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    System Recommendation: {systemRecommendation.action}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {systemRecommendation.reasoning}
                  </p>
                  <div className="flex items-center mt-2 space-x-4">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(systemRecommendation.confidence)}% confidence
                    </Badge>
                    {systemRecommendation.estimatedTime && (
                      <span className="text-xs text-blue-600">
                        <Clock className="inline h-3 w-3 mr-1" />
                        ~{systemRecommendation.estimatedTime}min impact
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAcceptRecommendation}
                disabled={disabled || isLoading}
                className="ml-2"
              >
                Accept
              </Button>
            </div>
          </div>
        )}

        {/* Time Pressure Indicator */}
        {timePressure !== 'low' && (
          <div className={`flex items-center space-x-2 p-2 rounded-md ${
            timePressure === 'high' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {timePressure === 'high' ? 'Urgent - Deadline approaching' : 'Time sensitive'}
            </span>
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const Icon = action.icon;
            const isRecommended = systemRecommendation?.action === action.decision;
            
            return (
              <Button
                key={action.id}
                variant={isRecommended ? 'default' : action.variant}
                size="sm"
                onClick={() => handleQuickDecision(action)}
                disabled={disabled || isLoading}
                className={`${isRecommended ? 'ring-2 ring-blue-300' : ''}`}
                title={action.tooltip}
              >
                <Icon className="h-4 w-4 mr-1" />
                {action.label}
                {isRecommended && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Recommended
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Advanced Actions */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          {onDelegate && availableApprovers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogState({ ...dialogState, isOpen: true, type: 'delegate' })}
              disabled={disabled || isLoading}
            >
              <Users className="h-4 w-4 mr-1" />
              Delegate
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogState({ ...dialogState, isOpen: true, type: 'approve' })}
            disabled={disabled || isLoading || !approval.canApprove}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Add Comment & Decide
          </Button>
        </div>
      </div>

      {/* Decision Dialog */}
      <Dialog open={dialogState.isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'approve' && 'Approve Request'}
              {dialogState.type === 'reject' && 'Reject Request'}
              {dialogState.type === 'escalate' && 'Escalate Request'}
              {dialogState.type === 'delegate' && 'Delegate Request'}
            </DialogTitle>
            <DialogDescription>
              {approval.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Delegation target */}
            {dialogState.type === 'delegate' && (
              <div>
                <Label htmlFor="delegateTo">Delegate to</Label>
                <Select value={dialogState.delegateTo} onValueChange={(value) => 
                  setDialogState(prev => ({ ...prev, delegateTo: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApprovers.map((approver) => (
                      <SelectItem key={approver.id} value={approver.id}>
                        {approver.name} ({approver.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reasoning */}
            <div>
              <Label htmlFor="reasoning">
                {dialogState.type === 'reject' ? 'Reason for rejection *' : 
                 dialogState.type === 'escalate' ? 'Escalation reason *' :
                 dialogState.type === 'delegate' ? 'Delegation reason *' :
                 'Additional notes'}
              </Label>
              <Textarea
                id="reasoning"
                placeholder={
                  dialogState.type === 'reject' ? 'Explain why this request is being rejected...' :
                  dialogState.type === 'escalate' ? 'Why does this need escalation?' :
                  dialogState.type === 'delegate' ? 'Why are you delegating this decision?' :
                  'Add any conditions, monitoring requirements, or additional context...'
                }
                value={dialogState.reasoning}
                onChange={(e) => setDialogState(prev => ({ ...prev, reasoning: e.target.value }))}
                className="min-h-[80px]"
              />
              
              {/* Quick reasoning options */}
              {dialogState.type && systemRecommendationReasons[dialogState.type as keyof typeof systemRecommendationReasons] && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">Quick options:</p>
                  <div className="flex flex-wrap gap-1">
                    {systemRecommendationReasons[dialogState.type as keyof typeof systemRecommendationReasons].map((reason, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setDialogState(prev => ({ 
                          ...prev, 
                          reasoning: prev.reasoning ? `${prev.reasoning}\n• ${reason}` : `• ${reason}` 
                        }))}
                        className="h-7 text-xs"
                      >
                        {reason}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conditions for approval */}
            {dialogState.type === 'approve' && (
              <div>
                <Label>Approval Conditions (optional)</Label>
                <div className="space-y-2 mt-1">
                  {dialogState.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm bg-muted px-2 py-1 rounded flex-1">{condition}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(index)}
                        className="h-6 w-6 p-0"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const condition = prompt('Add a condition:');
                      if (condition) addCondition(condition);
                    }}
                    className="w-full"
                  >
                    Add Condition
                  </Button>
                </div>
              </div>
            )}

            {/* Impact estimation */}
            {dialogState.type === 'approve' && (
              <div>
                <Label htmlFor="estimatedImpact">Estimated Impact (optional)</Label>
                <Textarea
                  id="estimatedImpact"
                  placeholder="Describe the expected impact of this approval..."
                  value={dialogState.estimatedImpact}
                  onChange={(e) => setDialogState(prev => ({ ...prev, estimatedImpact: e.target.value }))}
                  rows={2}
                />
              </div>
            )}

            {/* Risk warning for critical items */}
            {approval.riskLevel === 'critical' && dialogState.type === 'approve' && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Critical Risk Approval</p>
                    <p className="text-orange-700 mt-1">
                      This approval has critical risk implications. Please ensure you have:
                    </p>
                    <ul className="list-disc list-inside text-orange-700 mt-1 space-y-1">
                      <li>Reviewed all risk factors and mitigation strategies</li>
                      <li>Considered the business and technical impact</li>
                      <li>Added appropriate monitoring or rollback conditions</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDialogSubmit}
              disabled={
                isLoading || 
                (dialogState.type === 'delegate' && !dialogState.delegateTo) ||
                (['reject', 'escalate', 'delegate'].includes(dialogState.type!) && !dialogState.reasoning.trim())
              }
            >
              {isLoading ? 'Processing...' : 
               dialogState.type === 'approve' ? 'Approve' :
               dialogState.type === 'reject' ? 'Reject' :
               dialogState.type === 'escalate' ? 'Escalate' :
               'Delegate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};