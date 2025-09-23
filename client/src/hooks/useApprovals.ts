import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import type {
  ApprovalRequest,
  ApprovalFilters,
  ApprovalDashboardStats,
  ApprovalDecisionRequest,
  BatchApprovalRequest,
  ApprovalDecisionResponse,
  BatchApprovalResponse,
  UseApprovalsResult,
} from '@/types/approval-types';

interface UseApprovalsOptions {
  userId: string;
  initialFilters?: ApprovalFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

export const useApprovals = ({
  userId,
  initialFilters,
  autoRefresh = true,
  refreshInterval = 30000,
  pageSize = 50,
}: UseApprovalsOptions): UseApprovalsResult => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [filters, setFilters] = useState<ApprovalFilters>(
    initialFilters || {
      status: ['pending'],
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
        preset: 'week',
      },
    }
  );
  const [page, setPage] = useState(1);

  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.status?.length) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.type?.length) {
      filters.type.forEach(type => params.append('type', type));
    }
    if (filters.riskLevel?.length) {
      filters.riskLevel.forEach(level => params.append('riskLevel', level));
    }
    if (filters.assignedTo?.length) {
      filters.assignedTo.forEach(user => params.append('assignedTo', user));
    }
    if (filters.searchQuery?.trim()) {
      params.set('search', filters.searchQuery.trim());
    }
    if (filters.timeRange) {
      params.set('startDate', filters.timeRange.start.toISOString());
      params.set('endDate', filters.timeRange.end.toISOString());
    }

    // Add pagination
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    params.set('userId', userId);

    return params.toString();
  }, [filters, page, pageSize, userId]);

  // Fetch approvals
  const {
    data: approvalsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['approvals', userId, filters, page],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      return apiRequest(`/api/approvals?${queryParams}`);
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    keepPreviousData: true,
  });

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['approval-stats', userId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('userId', userId);
      
      // Add date range if specified
      if (filters.timeRange) {
        params.set('startDate', filters.timeRange.start.toISOString());
        params.set('endDate', filters.timeRange.end.toISOString());
      }
      
      return apiRequest(`/api/approvals/stats?${params.toString()}`);
    },
    refetchInterval: autoRefresh ? refreshInterval * 2 : false, // Refresh stats less frequently
  });

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: async (request: ApprovalDecisionRequest): Promise<ApprovalDecisionResponse> => {
      return apiRequest(`/api/approvals/${request.approvalId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: request.decision,
          reasoning: request.reasoning,
          conditions: request.conditions,
          delegateTo: request.delegateTo,
          estimatedImpact: request.estimatedImpact,
          followUpActions: request.followUpActions,
        }),
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Decision Recorded',
        description: `Approval ${
          variables.decision === 'approve' ? 'approved' : 
          variables.decision === 'reject' ? 'rejected' : 
          variables.decision === 'escalate' ? 'escalated' : 'delegated'
        } successfully.`,
      });

      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      
      // Update the specific approval in the cache
      queryClient.setQueryData(
        ['approvals', userId, filters, page],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map((approval: ApprovalRequest) =>
              approval.id === variables.approvalId
                ? { ...approval, status: data.approval.status, decision: data.approval.decision }
                : approval
            ),
          };
        }
      );
    },
    onError: (error, variables) => {
      toast({
        title: 'Decision Failed',
        description: error instanceof Error ? error.message : 'Failed to record decision',
        variant: 'destructive',
      });
    },
  });

  // Batch decision mutation
  const batchDecisionMutation = useMutation({
    mutationFn: async (request: BatchApprovalRequest): Promise<BatchApprovalResponse> => {
      return apiRequest('/api/approvals/batch', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },
    onSuccess: (data, variables) => {
      const successCount = data.successful;
      const failedCount = data.failed.length;
      
      toast({
        title: 'Batch Decision Completed',
        description: `${successCount} approvals processed successfully.${
          failedCount > 0 ? ` ${failedCount} failed.` : ''
        }`,
        variant: failedCount === 0 ? 'default' : 'destructive',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Batch Decision Failed',
        description: error instanceof Error ? error.message : 'Failed to process batch decision',
        variant: 'destructive',
      });
    },
  });

  // Escalation mutation
  const escalateMutation = useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string; reason: string }) => {
      return apiRequest(`/api/approvals/${approvalId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Approval Escalated',
        description: 'The approval has been escalated to the next level.',
      });

      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Escalation Failed',
        description: error instanceof Error ? error.message : 'Failed to escalate approval',
        variant: 'destructive',
      });
    },
  });

  // Delegation mutation
  const delegateMutation = useMutation({
    mutationFn: async ({ 
      approvalId, 
      delegateTo, 
      reason 
    }: { 
      approvalId: string; 
      delegateTo: string; 
      reason: string; 
    }) => {
      return apiRequest(`/api/approvals/${approvalId}/delegate`, {
        method: 'POST',
        body: JSON.stringify({ delegateTo, reason }),
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Approval Delegated',
        description: `The approval has been delegated to ${variables.delegateTo}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Delegation Failed',
        description: error instanceof Error ? error.message : 'Failed to delegate approval',
        variant: 'destructive',
      });
    },
  });

  // Action handlers
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] }),
    ]);
  }, [refetch, queryClient]);

  const handleSetFilters = useCallback((newFilters: Partial<ApprovalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleMakeDecision = useCallback(async (request: ApprovalDecisionRequest): Promise<ApprovalDecisionResponse> => {
    return decisionMutation.mutateAsync(request);
  }, [decisionMutation]);

  const handleBatchDecision = useCallback(async (request: BatchApprovalRequest): Promise<BatchApprovalResponse> => {
    return batchDecisionMutation.mutateAsync(request);
  }, [batchDecisionMutation]);

  const handleEscalate = useCallback(async (approvalId: string, reason: string) => {
    await escalateMutation.mutateAsync({ approvalId, reason });
  }, [escalateMutation]);

  const handleDelegate = useCallback(async (approvalId: string, delegateTo: string, reason: string) => {
    await delegateMutation.mutateAsync({ approvalId, delegateTo, reason });
  }, [delegateMutation]);

  // Real-time updates via polling (WebSocket would be better in production)
  useEffect(() => {
    if (!autoRefresh) return;

    const pollForUpdates = setInterval(() => {
      // Only refetch if we're not currently loading
      if (!isLoading && !decisionMutation.isPending && !batchDecisionMutation.isPending) {
        queryClient.invalidateQueries({ queryKey: ['approvals', userId] });
      }
    }, refreshInterval);

    return () => clearInterval(pollForUpdates);
  }, [autoRefresh, refreshInterval, isLoading, decisionMutation.isPending, batchDecisionMutation.isPending, queryClient, userId]);

  // Prepare return data
  const approvals = approvalsData?.data || [];
  const totalCount = approvalsData?.total || 0;
  const currentPage = approvalsData?.page || page;
  const currentPageSize = approvalsData?.pageSize || pageSize;

  const pagination = {
    page: currentPage,
    pageSize: currentPageSize,
    total: totalCount,
    hasNext: currentPage * currentPageSize < totalCount,
    hasPrevious: currentPage > 1,
  };

  const dashboardStats: ApprovalDashboardStats = stats || {
    totalPending: 0,
    byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
    byType: { 
      data_integrity: 0, 
      performance_impact: 0, 
      security_risk: 0, 
      business_logic: 0, 
      large_dataset: 0 
    },
    averageDecisionTime: 0,
    automationRate: 0,
    userStats: {
      todayApproved: 0,
      weekApproved: 0,
      accuracyScore: 0,
      averageResponseTime: 0,
    },
    systemHealth: {
      status: 'healthy',
      uptime: 99.9,
      errorRate: 0.001,
      avgResponseTime: 200,
    },
  };

  return {
    approvals,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    filters,
    pagination,
    stats: dashboardStats,
    actions: {
      refresh: handleRefresh,
      setFilters: handleSetFilters,
      setPage: handleSetPage,
      makeDecision: handleMakeDecision,
      batchDecision: handleBatchDecision,
      escalate: handleEscalate,
      delegate: handleDelegate,
    },
  };
};