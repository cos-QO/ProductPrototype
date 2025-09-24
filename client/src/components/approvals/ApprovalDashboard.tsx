import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Settings,
  Users,
  Zap,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Timer,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';

import { ApprovalQueue } from './ApprovalQueue';
import { ApprovalStats } from './ApprovalStats';
import { ApprovalFilters } from './ApprovalFilters';
import { BatchActions } from './BatchActions';
import { NotificationCenter } from './NotificationCenter';
import { RiskIndicator, RiskMatrix } from './RiskIndicator';
import { useApprovals } from '@/hooks/useApprovals';

import type {
  ApprovalRequest,
  ApprovalDashboardProps,
  ApprovalDashboardState,
  ApprovalFilters as FilterType,
  ApprovalDashboardStats,
  ApprovalDecisionRequest,
  BatchApprovalRequest,
  ApprovalNotification,
  NotificationPreferences,
  TimeRange,
} from '@/types/approval-types';

interface WebSocketState {
  connected: boolean;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  error: string | null;
}

interface DashboardMetrics {
  totalApprovals: number;
  pendingApprovals: number;
  criticalApprovals: number;
  averageResponseTime: number;
  automationRate: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({
  userId,
  userRole,
  autoRefresh = true,
  defaultFilters,
  compact = false,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket state
  const [wsState, setWsState] = useState<WebSocketState>({
    connected: false,
    lastHeartbeat: null,
    reconnectAttempts: 0,
    error: null,
  });

  // Component state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | undefined>();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Use the enhanced useApprovals hook
  const {
    approvals,
    loading,
    error,
    filters,
    pagination,
    stats,
    actions: {
      refresh,
      setFilters,
      setPage,
      makeDecision,
      batchDecision,
      escalate,
      delegate,
    },
  } = useApprovals({
    userId,
    initialFilters: defaultFilters,
    autoRefresh,
    refreshInterval: 30000,
    pageSize: compact ? 10 : 50,
  });

  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);

  // Real-time metrics calculation
  const dashboardMetrics: DashboardMetrics = useMemo(() => {
    const criticalCount = approvals.filter(a => a.riskLevel === 'critical').length;
    const highCount = approvals.filter(a => a.riskLevel === 'high').length;
    
    return {
      totalApprovals: stats.totalPending,
      pendingApprovals: stats.totalPending,
      criticalApprovals: criticalCount,
      averageResponseTime: stats.averageDecisionTime,
      automationRate: stats.automationRate,
      systemHealth: criticalCount > 5 ? 'critical' : 
                   highCount > 10 ? 'degraded' : 'healthy',
    };
  }, [approvals, stats]);

  // WebSocket connection management
  useEffect(() => {
    if (!autoRefresh) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws/approvals`;
    
    let ws: WebSocket;
    let heartbeatInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setWsState(prev => ({
            ...prev,
            connected: true,
            error: null,
            reconnectAttempts: 0,
          }));

          // Subscribe to user's approval updates
          ws.send(JSON.stringify({
            type: 'approval:subscribe',
            userId,
            filters,
          }));

          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date() }));
              setWsState(prev => ({ ...prev, lastHeartbeat: new Date() }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setWsState(prev => ({
            ...prev,
            connected: false,
            error: event.reason || 'Connection lost',
          }));

          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // Attempt to reconnect
          if (wsState.reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, wsState.reconnectAttempts), 30000);
            reconnectTimeout = setTimeout(() => {
              setWsState(prev => ({
                ...prev,
                reconnectAttempts: prev.reconnectAttempts + 1,
              }));
              connect();
            }, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsState(prev => ({
            ...prev,
            error: 'Connection error',
          }));
        };

      } catch (err) {
        console.error('Failed to create WebSocket connection:', err);
        setWsState(prev => ({
          ...prev,
          error: 'Failed to connect',
        }));
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [userId, filters, autoRefresh, wsState.reconnectAttempts]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'approval:new':
        // New approval request
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        addNotification({
          id: `new-${data.approval.id}`,
          type: 'new_approval',
          approvalId: data.approval.id,
          title: 'New Approval Request',
          message: data.approval.title,
          priority: data.approval.riskLevel === 'critical' ? 'critical' : 'medium',
          timestamp: new Date(),
          read: false,
          actionUrl: `/approvals/${data.approval.id}`,
          metadata: {
            riskLevel: data.approval.riskLevel,
            riskScore: data.approval.context?.riskAssessment?.score,
          },
        });
        break;

      case 'approval:updated':
        // Approval status change
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        setLastUpdate(new Date());
        break;

      case 'approval:decision_made':
        // Decision made on approval
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        addNotification({
          id: `decision-${data.approvalId}`,
          type: 'decision_made',
          approvalId: data.approvalId,
          title: 'Decision Made',
          message: `Approval ${data.decision.decision} by ${data.decision.approver}`,
          priority: 'low',
          timestamp: new Date(),
          read: false,
        });
        break;

      case 'approval:escalated':
        // Approval escalated
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        if (data.newApprovers.includes(userId)) {
          addNotification({
            id: `escalation-${data.approvalId}`,
            type: 'escalation',
            approvalId: data.approvalId,
            title: 'Approval Escalated',
            message: `Escalated to you: ${data.reason}`,
            priority: 'high',
            timestamp: new Date(),
            read: false,
            actionUrl: `/approvals/${data.approvalId}`,
          });
        }
        break;

      case 'approval:timeout_warning':
        // Timeout warning
        addNotification({
          id: `timeout-${data.approvalId}`,
          type: 'deadline_warning',
          approvalId: data.approvalId,
          title: 'Deadline Warning',
          message: `${data.timeRemaining} minutes remaining`,
          priority: data.timeRemaining <= 15 ? 'critical' : 'high',
          timestamp: new Date(),
          read: false,
          actionUrl: `/approvals/${data.approvalId}`,
        });
        break;

      case 'queue:count_updated':
        // Queue count update
        if (data.userId === userId) {
          queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
        }
        break;

      case 'system:status_change':
        // System status change
        toast({
          title: 'System Status Update',
          description: data.message,
          variant: data.status === 'critical' ? 'destructive' : 'default',
        });
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, [userId, queryClient, toast]);

  // Notification management
  const addNotification = useCallback((notification: ApprovalNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100 notifications
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const updateNotificationPreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs } as NotificationPreferences));
    // TODO: Save to backend
  }, []);

  // Handle approval selection
  const handleApprovalSelect = useCallback((approvalId: string, selected: boolean) => {
    setSelectedApprovals(prev => 
      selected 
        ? [...prev, approvalId]
        : prev.filter(id => id !== approvalId)
    );
  }, []);

  // Handle individual decisions
  const handleDecision = useCallback(async (request: ApprovalDecisionRequest) => {
    try {
      await makeDecision(request);
      setSelectedApprovals(prev => prev.filter(id => id !== request.approvalId));
      toast({
        title: 'Decision Recorded',
        description: `Approval ${request.decision} successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Decision Failed',
        description: error instanceof Error ? error.message : 'Failed to record decision',
        variant: 'destructive',
      });
    }
  }, [makeDecision, toast]);

  // Handle batch decisions
  const handleBatchDecision = useCallback(async (decision: 'approve' | 'reject', reasoning?: string) => {
    if (selectedApprovals.length === 0) {
      toast({
        title: 'No Approvals Selected',
        description: 'Please select approvals to process in batch.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await batchDecision({
        approvalIds: selectedApprovals,
        decision,
        reasoning,
      });

      toast({
        title: 'Batch Decision Completed',
        description: `${result.successful} approvals processed successfully.${
          result.failed.length > 0 ? ` ${result.failed.length} failed.` : ''
        }`,
        variant: result.failed.length === 0 ? 'default' : 'destructive',
      });

      setSelectedApprovals([]);
    } catch (error) {
      toast({
        title: 'Batch Decision Failed',
        description: error instanceof Error ? error.message : 'Failed to process batch decision',
        variant: 'destructive',
      });
    }
  }, [selectedApprovals, batchDecision, toast]);

  // Handle search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    const newFilters = { ...filters, searchQuery: query };
    setFilters(newFilters);
  }, [filters, setFilters]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
    setLastUpdate(new Date());
  }, [refresh]);

  // Calculate risk distribution for dashboard
  const riskDistribution = useMemo(() => {
    return approvals.map(approval => ({
      id: approval.id,
      label: approval.title,
      level: approval.riskLevel,
      score: approval.context.riskAssessment.score,
      factors: approval.context.riskAssessment.factors,
    }));
  }, [approvals]);

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {dashboardMetrics.pendingApprovals}
              </Badge>
              <NotificationCenter
                userId={userId}
                notifications={notifications}
                unreadCount={unreadNotificationCount}
                onNotificationClick={() => {}}
                onMarkAsRead={markNotificationAsRead}
                onMarkAllAsRead={markAllNotificationsAsRead}
                onDeleteNotification={deleteNotification}
                onUpdatePreferences={updateNotificationPreferences}
                preferences={preferences}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ApprovalQueue
            approvals={approvals}
            onDecision={handleDecision}
            onSelect={handleApprovalSelect}
            selectedApprovals={selectedApprovals}
            compact={true}
            loading={loading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Dashboard</h1>
          <p className="text-muted-foreground">
            Critical decisions requiring your attention
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            {wsState.connected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-xs">Live</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>

          <NotificationCenter
            userId={userId}
            notifications={notifications}
            unreadCount={unreadNotificationCount}
            onNotificationClick={() => {}}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onDeleteNotification={deleteNotification}
            onUpdatePreferences={updateNotificationPreferences}
            preferences={preferences}
          />
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {dashboardMetrics.systemHealth !== 'healthy' && (
        <Card className={`border-l-4 ${
          dashboardMetrics.systemHealth === 'critical' 
            ? 'border-l-red-500 bg-red-50' 
            : 'border-l-orange-500 bg-orange-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${
                dashboardMetrics.systemHealth === 'critical' ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div>
                <p className="font-medium">
                  System Status: {dashboardMetrics.systemHealth.toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardMetrics.systemHealth === 'critical' 
                    ? `${dashboardMetrics.criticalApprovals} critical approvals require immediate attention`
                    : 'Increased approval volume detected - consider load balancing'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats with Enhanced Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics.criticalApprovals} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <RiskMatrix risks={riskDistribution} compact={true} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(dashboardMetrics.automationRate)}%</div>
            <p className="text-xs text-muted-foreground">
              Decisions automated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(dashboardMetrics.averageResponseTime)}m</div>
            <p className="text-xs text-muted-foreground">
              Average decision time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className={`h-4 w-4 ${
              dashboardMetrics.systemHealth === 'healthy' ? 'text-green-500' :
              dashboardMetrics.systemHealth === 'degraded' ? 'text-orange-500' :
              'text-red-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold capitalize">{dashboardMetrics.systemHealth}</div>
            <p className="text-xs text-muted-foreground">
              {wsState.connected ? 'Real-time monitoring' : 'Offline mode'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search approvals..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {selectedApprovals.length > 0 && (
            <BatchActions
              selectedCount={selectedApprovals.length}
              onBatchApprove={(reasoning) => handleBatchDecision('approve', reasoning)}
              onBatchReject={(reasoning) => handleBatchDecision('reject', reasoning)}
              loading={false}
            />
          )}
        </div>

        {showFilters && (
          <ApprovalFilters
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Approval Queue */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Approval Queue</CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>
                    {selectedApprovals.length > 0 
                      ? `${selectedApprovals.length} selected`
                      : `${pagination.total} total`
                    }
                  </span>
                  {lastUpdate && (
                    <span>
                      • Updated {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ApprovalQueue
                approvals={approvals}
                onDecision={handleDecision}
                onSelect={handleApprovalSelect}
                selectedApprovals={selectedApprovals}
                loading={loading}
                error={error}
                onEscalate={escalate}
                onDelegate={delegate}
                showSystemRecommendations={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {stats && (
            <ApprovalStats
              stats={stats}
              userRole={userRole}
              compact={true}
              realTimeMetrics={dashboardMetrics}
            />
          )}

          {/* Risk Analysis */}
          {riskDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskMatrix 
                  risks={riskDistribution} 
                  onRiskClick={(riskId) => {
                    // Navigate to specific approval
                    console.log('Navigate to approval:', riskId);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Connection</span>
                <Badge variant={wsState.connected ? 'default' : 'destructive'}>
                  {wsState.connected ? 'Live' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Refresh</span>
                <Badge variant={autoRefresh ? 'default' : 'secondary'}>
                  {autoRefresh ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">System Health</span>
                <Badge variant={
                  dashboardMetrics.systemHealth === 'healthy' ? 'default' :
                  dashboardMetrics.systemHealth === 'degraded' ? 'secondary' :
                  'destructive'
                }>
                  {dashboardMetrics.systemHealth}
                </Badge>
              </div>
              {wsState.lastHeartbeat && (
                <div className="text-xs text-muted-foreground">
                  Last sync: {wsState.lastHeartbeat.toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Delegate Approvals
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Emergency Override
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <AlertCircle className="h-4 w-4 mr-2" />
                Escalate Critical
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};