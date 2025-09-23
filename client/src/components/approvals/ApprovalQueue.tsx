import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

import { ApprovalCard } from './ApprovalCard';

import type {
  ApprovalRequest,
  ApprovalDecisionRequest,
} from '@/types/approval-types';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
  onDecision: (request: ApprovalDecisionRequest) => Promise<void>;
  onSelect?: (approvalId: string, selected: boolean) => void;
  selectedApprovals?: string[];
  compact?: boolean;
  loading?: boolean;
  error?: string | null;
  showBatchSelect?: boolean;
  maxItems?: number;
  sortBy?: 'deadline' | 'priority' | 'created' | 'risk';
  groupBy?: 'none' | 'type' | 'risk' | 'priority';
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  onDecision,
  onSelect,
  selectedApprovals = [],
  compact = false,
  loading = false,
  error = null,
  showBatchSelect = false,
  maxItems,
  sortBy = 'deadline',
  groupBy = 'none',
}) => {
  // Sort approvals
  const sortedApprovals = useMemo(() => {
    const filtered = maxItems ? approvals.slice(0, maxItems) : approvals;
    
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority as keyof typeof priorityOrder] - 
                 priorityOrder[a.priority as keyof typeof priorityOrder];
        case 'risk':
          const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return riskOrder[b.riskLevel as keyof typeof riskOrder] - 
                 riskOrder[a.riskLevel as keyof typeof riskOrder];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [approvals, maxItems, sortBy]);

  // Group approvals if needed
  const groupedApprovals = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Approvals': sortedApprovals };
    }

    return sortedApprovals.reduce((groups, approval) => {
      let key: string;
      
      switch (groupBy) {
        case 'type':
          key = approval.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          break;
        case 'risk':
          key = `${approval.riskLevel.charAt(0).toUpperCase() + approval.riskLevel.slice(1)} Risk`;
          break;
        case 'priority':
          key = `${approval.priority.charAt(0).toUpperCase() + approval.priority.slice(1)} Priority`;
          break;
        default:
          key = 'All Approvals';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(approval);
      return groups;
    }, {} as Record<string, ApprovalRequest[]>);
  }, [sortedApprovals, groupBy]);

  const handleExpand = (approvalId: string) => {
    // Handle expansion logic if needed
    console.log('Expanding approval:', approvalId);
  };

  // Loading state
  if (loading && approvals.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: compact ? 3 : 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold text-destructive mb-2">Error Loading Approvals</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Pending Approvals</h3>
          <p className="text-sm text-muted-foreground">
            All caught up! There are no approvals requiring your attention at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render grouped or ungrouped approvals
  const renderApprovalGroup = (title: string, groupApprovals: ApprovalRequest[]) => (
    <div key={title} className="space-y-3">
      {groupBy !== 'none' && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {groupApprovals.length}
          </Badge>
        </div>
      )}
      
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {groupApprovals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onDecision={onDecision}
            onExpand={handleExpand}
            onSelect={onSelect}
            compact={compact}
            showBatchSelect={showBatchSelect}
            isSelected={selectedApprovals.includes(approval.id)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedApprovals).map(([title, groupApprovals]) =>
        renderApprovalGroup(title, groupApprovals)
      )}
      
      {loading && approvals.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading more approvals...</span>
        </div>
      )}
    </div>
  );
};