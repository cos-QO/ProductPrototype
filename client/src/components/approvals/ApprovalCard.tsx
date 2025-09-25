import React, { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  CheckCircle2,
  XCircle,
  ArrowUp,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Zap,
  Info,
  TrendingUp,
  Users,
  Database,
  Shield,
  Building,
  HardDrive,
} from 'lucide-react';

import { RiskIndicator } from './RiskIndicator';

import type {
  ApprovalCardProps,
  ApprovalCardState,
  ApprovalDecisionRequest,
  ApprovalType,
  RiskLevel,
  DecisionType,
} from '@/types/approval-types';

const getApprovalTypeIcon = (type: ApprovalType) => {
  const iconMap = {
    data_integrity: Database,
    performance_impact: TrendingUp,
    security_risk: Shield,
    business_logic: Building,
    large_dataset: HardDrive,
  };
  return iconMap[type] || Info;
};

const getApprovalTypeColor = (type: ApprovalType): string => {
  const colorMap = {
    data_integrity: 'bg-blue-100 text-blue-800 border-blue-300',
    performance_impact: 'bg-orange-100 text-orange-800 border-orange-300',
    security_risk: 'bg-red-100 text-red-800 border-red-300',
    business_logic: 'bg-purple-100 text-purple-800 border-purple-300',
    large_dataset: 'bg-green-100 text-green-800 border-green-300',
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-300';
};

const formatTimeRemaining = (deadline: string): { text: string; urgent: boolean } => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return { text: 'Overdue', urgent: true };
  } else if (diffMinutes < 60) {
    return { text: `${diffMinutes}m remaining`, urgent: diffMinutes <= 15 };
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { text: `${hours}h remaining`, urgent: hours <= 2 };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { text: `${days}d remaining`, urgent: false };
  }
};

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onDecision,
  onExpand,
  onSelect,
  compact = false,
  showBatchSelect = false,
  isSelected = false,
  className,
}) => {
  const [state, setState] = useState<ApprovalCardState>({
    isExpanded: false,
    isLoading: false,
    showDecisionDialog: false,
    decisionType: null,
  });

  const [decisionReasoning, setDecisionReasoning] = useState('');

  // Calculate time remaining
  const timeRemaining = formatTimeRemaining(approval.deadline);
  const TypeIcon = getApprovalTypeIcon(approval.type);

  // Extract key metrics from context
  const keyMetrics = (() => {
    const metrics: Array<{ label: string; value: string; urgent?: boolean }> = [];
    
    if (approval.context.scenario?.recordCount) {
      metrics.push({
        label: 'Records',
        value: approval.context.scenario.recordCount.toLocaleString(),
      });
    }
    
    if (approval.context.systemMetrics?.errorRate) {
      metrics.push({
        label: 'Error Rate',
        value: `${(approval.context.systemMetrics.errorRate * 100).toFixed(1)}%`,
        urgent: approval.context.systemMetrics.errorRate > 0.05,
      });
    }

    if (approval.context.riskAssessment.score) {
      metrics.push({
        label: 'Risk Score',
        value: `${approval.context.riskAssessment.score}/100`,
        urgent: approval.context.riskAssessment.score > 70,
      });
    }

    return metrics.slice(0, 3); // Show max 3 metrics
  })();

  // Handle decision making
  const handleDecision = useCallback(async (decision: DecisionType) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const request: ApprovalDecisionRequest = {
        approvalId: approval.id,
        decision,
        reasoning: decisionReasoning || undefined,
      };

      await onDecision(request);
      
      setState(prev => ({
        ...prev,
        showDecisionDialog: false,
        decisionType: null,
        isLoading: false,
      }));
      setDecisionReasoning('');
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [approval.id, decisionReasoning, onDecision]);

  const handleQuickDecision = useCallback((decision: DecisionType) => {
    if (approval.riskLevel === 'critical' || decision === 'reject') {
      // Require reasoning for critical items or rejections
      setState(prev => ({
        ...prev,
        showDecisionDialog: true,
        decisionType: decision,
      }));
    } else {
      // Quick approval for low-risk items
      handleDecision(decision);
    }
  }, [approval.riskLevel, handleDecision]);

  const handleExpand = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
    if (!state.isExpanded) {
      onExpand?.(approval.id);
    }
  }, [state.isExpanded, onExpand, approval.id]);

  const handleSelect = useCallback((checked: boolean) => {
    onSelect?.(approval.id, checked);
  }, [onSelect, approval.id]);

  if (compact) {
    return (
      <Card className={`${className} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {showBatchSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                />
              )}
              
              <RiskIndicator
                riskLevel={approval.riskLevel}
                riskScore={approval.context.riskAssessment.score}
                riskFactors={approval.context.riskAssessment.factors}
                size="small"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{approval.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {approval.type.replace('_', ' ')} • {timeRemaining.text}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleQuickDecision('approve')}
                disabled={state.isLoading}
                className="h-7 px-2"
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickDecision('reject')}
                disabled={state.isLoading}
                className="h-7 px-2"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${className} ${isSelected ? 'ring-2 ring-primary' : ''} transition-all duration-200 hover:shadow-md`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              {showBatchSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                  className="mt-1"
                />
              )}

              <div className="flex items-center space-x-2">
                <RiskIndicator
                  riskLevel={approval.riskLevel}
                  riskScore={approval.context.riskAssessment.score}
                  riskFactors={approval.context.riskAssessment.factors}
                  size="medium"
                />
                
                <Badge className={getApprovalTypeColor(approval.type)}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {approval.type.replace('_', ' ')}
                </Badge>
              </div>

              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg leading-tight">{approval.title}</CardTitle>
                <CardDescription className="mt-1 line-clamp-2">
                  {approval.description}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-3">
              <Badge variant={timeRemaining.urgent ? 'destructive' : 'secondary'}>
                <Clock className="h-3 w-3 mr-1" />
                {timeRemaining.text}
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpand}
                className="p-1"
              >
                {state.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Key Metrics */}
          {keyMetrics.length > 0 && (
            <div className="flex items-center space-x-4 mb-4">
              {keyMetrics.map((metric, index) => (
                <div key={index} className="text-sm">
                  <span className="text-muted-foreground">{metric.label}:</span>
                  <span className={`ml-1 font-medium ${metric.urgent ? 'text-destructive' : ''}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {approval.context.recommendations.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">System Recommendation:</p>
              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {approval.context.recommendations[0].action}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {approval.context.recommendations[0].reasoning}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {Math.round(approval.context.recommendations[0].confidence)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Content */}
          <Collapsible open={state.isExpanded}>
            <CollapsibleContent className="space-y-4">
              <Separator />

              {/* Risk Assessment Details */}
              <div>
                <h4 className="font-medium text-sm mb-2">Risk Assessment</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Risk Level:</span>
                    <RiskIndicator
                      riskLevel={approval.riskLevel}
                      riskScore={approval.context.riskAssessment.score}
                      riskFactors={approval.context.riskAssessment.factors}
                      size="small"
                      showDetails={true}
                    />
                  </div>
                  
                  {approval.context.riskAssessment.factors.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Risk Factors:</span>
                      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                        {approval.context.riskAssessment.factors.map((factor, index) => (
                          <li key={index} className="text-muted-foreground">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* System Context */}
              {approval.context.systemMetrics && (
                <div>
                  <h4 className="font-medium text-sm mb-2">System Context</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {approval.context.systemMetrics.cpuUsage && (
                      <div>
                        <span className="text-muted-foreground">CPU Usage:</span>
                        <span className="ml-1">{Math.round(approval.context.systemMetrics.cpuUsage)}%</span>
                      </div>
                    )}
                    {approval.context.systemMetrics.memoryUsage && (
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <span className="ml-1">{Math.round(approval.context.systemMetrics.memoryUsage)}%</span>
                      </div>
                    )}
                    {approval.context.systemMetrics.responseTime && (
                      <div>
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className="ml-1">{Math.round(approval.context.systemMetrics.responseTime)}ms</span>
                      </div>
                    )}
                    {approval.context.systemMetrics.errorRate && (
                      <div>
                        <span className="text-muted-foreground">Error Rate:</span>
                        <span className="ml-1">{(approval.context.systemMetrics.errorRate * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Context */}
              {(approval.context.businessImpact || approval.context.technicalImpact) && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Impact Assessment</h4>
                  <div className="space-y-2 text-sm">
                    {approval.context.businessImpact && (
                      <div>
                        <span className="text-muted-foreground">Business Impact:</span>
                        <p className="mt-1">{approval.context.businessImpact}</p>
                      </div>
                    )}
                    {approval.context.technicalImpact && (
                      <div>
                        <span className="text-muted-foreground">Technical Impact:</span>
                        <p className="mt-1">{approval.context.technicalImpact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Created {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
              {approval.assignedTo.length > 1 && (
                <span className="ml-2">
                  <Users className="inline h-3 w-3 mr-1" />
                  {approval.assignedTo.length} approvers
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDecision('escalate')}
                disabled={state.isLoading}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Escalate
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDecision('reject')}
                disabled={state.isLoading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              
              <Button
                size="sm"
                onClick={() => handleQuickDecision('approve')}
                disabled={state.isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog 
        open={state.showDecisionDialog} 
        onOpenChange={(open) => 
          setState(prev => ({ ...prev, showDecisionDialog: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {state.decisionType === 'approve' ? 'Approve' : 
               state.decisionType === 'reject' ? 'Reject' : 'Escalate'} Request
            </DialogTitle>
            <DialogDescription>
              {approval.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reasoning">
                {state.decisionType === 'reject' ? 'Reason for rejection' : 'Additional notes (optional)'}
              </Label>
              <Textarea
                id="reasoning"
                placeholder={
                  state.decisionType === 'reject' 
                    ? 'Please explain why this request is being rejected...'
                    : 'Add any additional context or conditions...'
                }
                value={decisionReasoning}
                onChange={(e) => setDecisionReasoning(e.target.value)}
                className="mt-1"
              />
            </div>

            {state.decisionType === 'approve' && approval.riskLevel === 'critical' && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Critical Risk Approval</p>
                    <p className="text-orange-700 mt-1">
                      This is a critical risk approval. Please ensure you have reviewed all risk factors and mitigation strategies.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, showDecisionDialog: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={() => state.decisionType && handleDecision(state.decisionType)}
              disabled={state.isLoading || (state.decisionType === 'reject' && !decisionReasoning.trim())}
            >
              {state.isLoading ? 'Processing...' : 
               state.decisionType === 'approve' ? 'Approve' :
               state.decisionType === 'reject' ? 'Reject' : 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};