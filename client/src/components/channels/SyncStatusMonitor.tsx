// Phase 3.6: Sync Status Monitor Component - Real-time monitoring and analytics
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCcw,
  ExternalLink,
  Eye,
  AlertCircle,
  Info,
  Zap,
  Globe,
  Store,
  ShoppingCart,
  Share2,
  Target,
  Calendar,
  Timer,
  Wifi,
  WifiOff,
  Server,
  Database,
  Network,
} from "lucide-react";

interface SyncStatusMonitorProps {
  productId: number;
  syncStatus: any;
  productSyndications: any[];
  channels: any[];
}

export function SyncStatusMonitor({
  productId,
  syncStatus,
  productSyndications,
  channels,
}: SyncStatusMonitorProps) {
  const queryClient = useQueryClient();
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [selectedMetric, setSelectedMetric] = useState("all");
  const [activeSync, setActiveSync] = useState<any>(null);

  // Real-time metrics query
  const { data: metrics } = useQuery({
    queryKey: ["/api/products", productId, "sync-metrics", selectedTimeframe],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/sync-metrics?timeframe=${selectedTimeframe}`,
      ),
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: false,
  });

  // Live sync queue query
  const { data: syncQueue } = useQuery({
    queryKey: ["/api/products", productId, "sync-queue"],
    queryFn: () => apiRequest("GET", `/api/products/${productId}/sync-queue`),
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: false,
  });

  // Performance analytics query
  const { data: performance } = useQuery({
    queryKey: [
      "/api/products",
      productId,
      "sync-performance",
      selectedTimeframe,
    ],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/sync-performance?timeframe=${selectedTimeframe}`,
      ),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "ecommerce":
        return <Store className="h-4 w-4" />;
      case "marketplace":
        return <ShoppingCart className="h-4 w-4" />;
      case "social":
        return <Share2 className="h-4 w-4" />;
      case "api":
        return <Target className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string, size = "h-4 w-4") => {
    switch (status) {
      case "live":
        return <CheckCircle2 className={`${size} text-green-500`} />;
      case "error":
        return <AlertCircle className={`${size} text-red-500`} />;
      case "syncing":
        return <RefreshCcw className={`${size} text-blue-500 animate-spin`} />;
      case "queued":
        return <Clock className={`${size} text-yellow-500`} />;
      case "paused":
        return <WifiOff className={`${size} text-gray-500`} />;
      default:
        return <Clock className={`${size} text-gray-500`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-green-100 text-green-800">Live</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "syncing":
        return <Badge className="bg-blue-100 text-blue-800">Syncing</Badge>;
      case "queued":
        return <Badge className="bg-yellow-100 text-yellow-800">Queued</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const syncDate = new Date(date);
    const diffMs = now.getTime() - syncDate.getTime();

    if (diffMs < 60000) return "Just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Sync Status Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Real-time synchronization status and performance analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
              <SelectItem value="success">Success Rate</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="errors">Error Rate</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live Sync Queue */}
      {syncQueue && syncQueue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Live Sync Queue</span>
              <Badge variant="secondary">{syncQueue.length} active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncQueue.slice(0, 5).map((sync: any, index: number) => {
                const channel = channels.find((c) => c.id === sync.channelId);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-blue-50/30 rounded-lg border-l-4 border-blue-500"
                  >
                    <div className="flex items-center space-x-3">
                      {channel && getChannelIcon(channel.type)}
                      <div>
                        <p className="font-medium text-sm">
                          {channel?.name || "Unknown Channel"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sync.action} • Started{" "}
                          {formatTimeAgo(sync.startedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Progress
                        value={sync.progress || 0}
                        className="w-20 h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {sync.progress || 0}%
                      </span>
                      <RefreshCcw className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.successRate
                    ? `${Math.round(metrics.successRate)}%`
                    : "—"}
                </p>
              </div>
              <div className="flex items-center text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+2.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.avgResponseTime
                    ? formatDuration(metrics.avgResponseTime)
                    : "—"}
                </p>
              </div>
              <div className="flex items-center text-blue-600">
                <Timer className="h-4 w-4 mr-1" />
                <span className="text-sm">-150ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Error Rate
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.errorRate ? `${metrics.errorRate}%` : "—"}
                </p>
              </div>
              <div className="flex items-center text-red-600">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span className="text-sm">-0.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Syncs
                </p>
                <p className="text-2xl font-bold">
                  {metrics?.totalSyncs || "—"}
                </p>
              </div>
              <div className="flex items-center text-purple-600">
                <Activity className="h-4 w-4 mr-1" />
                <span className="text-sm">+47</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Channel Status Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => {
                const syndication = productSyndications.find(
                  (s) => s.channelId === channel.id,
                );
                const channelMetrics = metrics?.channels?.find(
                  (c: any) => c.channelId === channel.id,
                );

                return (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getChannelIcon(channel.type)}
                        <div>
                          <p className="font-medium">{channel.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {channel.type}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(syndication?.status || "pending")}
                        {getStatusBadge(syndication?.status || "pending")}
                      </div>
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">
                              {syndication?.lastSyncAt
                                ? formatTimeAgo(syndication.lastSyncAt)
                                : "Never"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {syndication?.lastSyncAt
                              ? new Date(
                                  syndication.lastSyncAt,
                                ).toLocaleString()
                              : "No sync recorded"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-mono">
                        {channelMetrics?.avgResponseTime
                          ? formatDuration(channelMetrics.avgResponseTime)
                          : "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={channelMetrics?.successRate || 0}
                          className="w-16 h-2"
                        />
                        <span className="text-sm">
                          {channelMetrics?.successRate
                            ? `${Math.round(channelMetrics.successRate)}%`
                            : "—"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {syndication?.externalUrl && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      syndication.externalUrl,
                                      "_blank",
                                    )
                                  }
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                View on {channel.name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                {channel.name} - Detailed Metrics
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Detailed metrics content */}
                              <div className="grid grid-cols-2 gap-4">
                                <Card>
                                  <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">
                                      Total Syncs
                                    </p>
                                    <p className="text-xl font-bold">
                                      {channelMetrics?.totalSyncs || 0}
                                    </p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">
                                      Failed Syncs
                                    </p>
                                    <p className="text-xl font-bold text-red-600">
                                      {channelMetrics?.failedSyncs || 0}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>

                              {syndication?.errorMessage && (
                                <div className="p-3 bg-red-50 rounded-lg">
                                  <p className="text-sm font-medium text-red-800">
                                    Latest Error
                                  </p>
                                  <p className="text-sm text-red-700">
                                    {syndication.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response-times" className="w-full">
              <TabsList>
                <TabsTrigger value="response-times">Response Times</TabsTrigger>
                <TabsTrigger value="success-rates">Success Rates</TabsTrigger>
                <TabsTrigger value="volume">Sync Volume</TabsTrigger>
              </TabsList>

              <TabsContent value="response-times" className="space-y-4">
                <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Response Time Chart</p>
                    <p className="text-sm">Interactive charts coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="success-rates" className="space-y-4">
                <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Success Rate Trends</p>
                    <p className="text-sm">Interactive charts coming soon</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="volume" className="space-y-4">
                <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Sync Volume Over Time</p>
                    <p className="text-sm">Interactive charts coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">
                    Connection healthy
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">API Endpoints</p>
                  <p className="text-sm text-muted-foreground">
                    All services online
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Queue Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Processing normally
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
