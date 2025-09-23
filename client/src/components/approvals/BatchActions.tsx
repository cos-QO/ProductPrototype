import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  ArrowUp,
  MoreHorizontal,
  Users,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface BatchActionsProps {
  selectedCount: number;
  onBatchApprove: (reasoning?: string) => Promise<void>;
  onBatchReject: (reasoning?: string) => Promise<void>;
  onBatchEscalate?: (reasoning?: string) => Promise<void>;
  onBatchDelegate?: (delegateTo: string, reasoning?: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

type BatchActionType = 'approve' | 'reject' | 'escalate' | 'delegate';

const actionConfigs = {
  approve: {
    label: 'Approve All',
    icon: CheckCircle2,
    variant: 'default' as const,
    description: 'Approve all selected items',
    requiresReasoning: false,
  },
  reject: {
    label: 'Reject All',
    icon: XCircle,
    variant: 'destructive' as const,
    description: 'Reject all selected items',
    requiresReasoning: true,
  },
  escalate: {
    label: 'Escalate All',
    icon: ArrowUp,
    variant: 'outline' as const,
    description: 'Escalate all selected items',
    requiresReasoning: true,
  },
  delegate: {
    label: 'Delegate All',
    icon: Users,
    variant: 'outline' as const,
    description: 'Delegate all selected items',
    requiresReasoning: false,
  },
};

export const BatchActions: React.FC<BatchActionsProps> = ({
  selectedCount,
  onBatchApprove,
  onBatchReject,
  onBatchEscalate,
  onBatchDelegate,
  loading = false,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<BatchActionType | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [delegateTarget, setDelegateTarget] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleActionClick = (action: BatchActionType) => {
    const config = actionConfigs[action];
    
    if (config.requiresReasoning || action === 'delegate') {
      setCurrentAction(action);
      setIsDialogOpen(true);
      setReasoning('');
      setDelegateTarget('');
    } else {
      handleActionExecute(action);
    }
  };

  const handleActionExecute = async (action: BatchActionType) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      switch (action) {
        case 'approve':
          await onBatchApprove(reasoning || undefined);
          break;
        case 'reject':
          await onBatchReject(reasoning || undefined);
          break;
        case 'escalate':
          if (onBatchEscalate) {
            await onBatchEscalate(reasoning || undefined);
          }
          break;
        case 'delegate':
          if (onBatchDelegate && delegateTarget) {
            await onBatchDelegate(delegateTarget, reasoning || undefined);
          }
          break;
      }
      
      setIsDialogOpen(false);
      setCurrentAction(null);
      setReasoning('');
      setDelegateTarget('');
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const canExecuteAction = () => {
    if (!currentAction) return false;
    
    const config = actionConfigs[currentAction];
    
    if (currentAction === 'delegate' && !delegateTarget.trim()) {
      return false;
    }
    
    if (config.requiresReasoning && !reasoning.trim()) {
      return false;
    }
    
    return true;
  };

  if (selectedCount === 0) {
    return null;
  }

  const currentConfig = currentAction ? actionConfigs[currentAction] : null;

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Selection indicator */}
        <Badge variant="secondary" className="flex items-center gap-1">
          <span>{selectedCount} selected</span>
        </Badge>

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={() => handleActionClick('approve')}
            disabled={loading || isProcessing}
            className="h-7"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approve
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleActionClick('reject')}
            disabled={loading || isProcessing}
            className="h-7"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onBatchEscalate && (
                <DropdownMenuItem onClick={() => handleActionClick('escalate')}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Escalate All
                </DropdownMenuItem>
              )}
              
              {onBatchDelegate && (
                <DropdownMenuItem onClick={() => handleActionClick('delegate')}>
                  <Users className="h-4 w-4 mr-2" />
                  Delegate All
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="text-muted-foreground" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Schedule Actions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Batch Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentConfig && React.createElement(currentConfig.icon, { className: "h-5 w-5" })}
              {currentConfig?.label}
            </DialogTitle>
            <DialogDescription>
              {currentConfig?.description} ({selectedCount} item{selectedCount !== 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Delegate target selection */}
            {currentAction === 'delegate' && (
              <div className="space-y-2">
                <Label htmlFor="delegate-target">Delegate to</Label>
                <input
                  id="delegate-target"
                  type="text"
                  placeholder="Enter user name or email"
                  value={delegateTarget}
                  onChange={(e) => setDelegateTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            )}

            {/* Reasoning input */}
            <div className="space-y-2">
              <Label htmlFor="batch-reasoning">
                {currentAction === 'reject' ? 'Reason for rejection *' : 'Additional notes (optional)'}
              </Label>
              <Textarea
                id="batch-reasoning"
                placeholder={
                  currentAction === 'reject'
                    ? 'Please explain why these requests are being rejected...'
                    : 'Add any additional context or conditions...'
                }
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                rows={3}
              />
            </div>

            {/* Warning for critical actions */}
            {(currentAction === 'reject' || currentAction === 'escalate') && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">
                      {currentAction === 'reject' ? 'Batch Rejection' : 'Batch Escalation'}
                    </p>
                    <p className="text-orange-700 mt-1">
                      {currentAction === 'reject'
                        ? 'This will reject all selected approvals. This action cannot be undone.'
                        : 'This will escalate all selected approvals to the next approval level.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing info */}
            {selectedCount > 5 && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Large Batch Operation</p>
                    <p className="mt-1">
                      Processing {selectedCount} items may take a few moments. 
                      You'll be notified when complete.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={currentConfig?.variant}
              onClick={() => currentAction && handleActionExecute(currentAction)}
              disabled={!canExecuteAction() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {currentConfig && React.createElement(currentConfig.icon, { className: "h-4 w-4 mr-2" })}
                  {currentConfig?.label}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};