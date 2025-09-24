// Phase 3.6: Enhanced Channels Tab - Complete Multi-Channel Syndication Management
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  Zap,
  ExternalLink,
  Settings,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Info,
  Activity,
  Target,
  ShoppingCart,
  Store,
  Share2,
  Eye,
  Upload,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  Loader2,
  History,
  BarChart3,
} from "lucide-react";

// Import sub-components
import { ChannelConfiguration } from "./ChannelConfiguration";
import { SyncStatusMonitor } from "./SyncStatusMonitor";
import { ChannelMappings } from "./ChannelMappings";
import { SyncHistory } from "./SyncHistory";

interface ChannelsTabProps {
  productId: number;
  product: any;
}

export function ChannelsTab({ productId, product }: ChannelsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "error"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time sync status polling
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "syndication-status"],
      });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [productId, queryClient]);

  // Fetch available syndication channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/syndication/channels"],
    retry: false,
  });

  // Fetch product syndication status
  const { data: productSyndications = [], isLoading: syndicationsLoading } =
    useQuery({
      queryKey: ["/api/products", productId, "syndications"],
      queryFn: () =>
        apiRequest("GET", `/api/products/${productId}/syndications`),
      retry: false,
    });

  // Fetch syndication analytics
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/products", productId, "syndication-status"],
    queryFn: () =>
      apiRequest("GET", `/api/products/${productId}/syndication-status`),
    retry: false,
  });

  // Fetch sync history
  const { data: syncHistory = [] } = useQuery({
    queryKey: ["/api/products", productId, "sync-history"],
    queryFn: () => apiRequest("GET", `/api/products/${productId}/sync-history`),
    retry: false,
  });

  // Bulk syndication mutation
  const bulkSyndicateMutation = useMutation({
    mutationFn: async ({
      action,
      channelIds,
    }: {
      action: "create" | "update" | "delete" | "pause" | "resume";
      channelIds?: number[];
    }) => {
      if (channelIds && channelIds.length > 0) {
        return apiRequest("POST", `/api/products/${productId}/bulk-syndicate`, {
          action,
          channelIds,
        });
      } else {
        return apiRequest("POST", `/api/products/${productId}/syndicate-all`, {
          action,
        });
      }
    },
    onMutate: () => setSyncInProgress(true),
    onSuccess: (_, variables) => {
      const actionName =
        variables.action === "create"
          ? "Publishing"
          : variables.action === "update"
            ? "Updating"
            : variables.action === "delete"
              ? "Removing"
              : variables.action === "pause"
                ? "Pausing"
                : "Resuming";

      toast({
        title: `${actionName} Started`,
        description: `Product ${actionName.toLowerCase()} initiated across selected channels`,
      });

      // Refresh all related queries
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "syndications"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "syndication-status"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "sync-history"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Syndication Failed",
        description: error?.message || "Failed to process bulk syndication",
        variant: "destructive",
      });
    },
    onSettled: () => setSyncInProgress(false),
  });

  // Individual channel toggle mutation
  const toggleChannelMutation = useMutation({
    mutationFn: async ({
      channelId,
      enabled,
    }: {
      channelId: number;
      enabled: boolean;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/products/${productId}/syndications/${channelId}`,
        {
          isEnabled: enabled,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/products", productId, "syndications"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle Failed",
        description: error?.message || "Failed to toggle channel status",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "live":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "syncing":
        return <RefreshCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Live
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "syncing":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Syncing
          </Badge>
        );
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

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

  // Filter channels based on search and status
  const filteredChannels = channels.filter((channel: any) => {
    const matchesSearch =
      searchQuery === "" ||
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.type.toLowerCase().includes(searchQuery.toLowerCase());

    const syndication = productSyndications.find(
      (s: any) => s.channelId === channel.id,
    );
    const status = syndication?.status || "pending";

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" &&
        (status === "live" || status === "syncing")) ||
      (filterStatus === "inactive" &&
        (status === "pending" || status === "paused")) ||
      (filterStatus === "error" && status === "error");

    return matchesSearch && matchesFilter;
  });

  // Calculate sync progress
  const syncProgress = syncStatus
    ? Math.round((syncStatus.live / (syncStatus.total || 1)) * 100)
    : 0;

  const isLoading = channelsLoading || syndicationsLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading channel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Multi-Channel Syndication</h3>
          <p className="text-sm text-muted-foreground">
            Manage product distribution across all publishing channels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    bulkSyndicateMutation.mutate({ action: "update" })
                  }
                  disabled={bulkSyndicateMutation.isPending}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Sync All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Update product across all channels
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="sm"
            onClick={() => bulkSyndicateMutation.mutate({ action: "create" })}
            disabled={bulkSyndicateMutation.isPending}
            className="bg-primary text-primary-foreground"
          >
            {bulkSyndicateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Publish All
          </Button>
        </div>
      </div>

      {/* Syndication Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.live || 0}</p>
                <p className="text-sm text-muted-foreground">Live</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.error || 0}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {syncStatus && syncStatus.total > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Sync Progress</Label>
                <span className="text-sm text-muted-foreground">
                  {syncProgress}% Complete
                </span>
              </div>
              <Progress value={syncProgress} className="w-full h-2" />
              <p className="text-xs text-muted-foreground">
                {syncStatus.live} of {syncStatus.total} channels are live
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Mapping</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channels Grid */}
          <div className="grid gap-4">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((channel: any) => {
                const syndication = productSyndications.find(
                  (s: any) => s.channelId === channel.id,
                );
                const status = syndication?.status || "pending";

                return (
                  <Card
                    key={channel.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            {getChannelIcon(channel.type)}
                            {getStatusIcon(status)}
                            <div>
                              <h4 className="font-medium">{channel.name}</h4>
                              <p className="text-sm text-muted-foreground capitalize">
                                {channel.type} • {channel.slug}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {getStatusBadge(status)}
                            {syndication?.isEnabled === false && (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* External Link */}
                          {syndication?.externalUrl && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
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

                          {/* Channel Toggle */}
                          <Switch
                            checked={syndication?.isEnabled !== false}
                            onCheckedChange={(enabled) =>
                              toggleChannelMutation.mutate({
                                channelId: channel.id,
                                enabled,
                              })
                            }
                            disabled={toggleChannelMutation.isPending}
                          />

                          {/* Sync Actions */}
                          <Button
                            size="sm"
                            variant={
                              status === "error" ? "destructive" : "default"
                            }
                            onClick={() =>
                              bulkSyndicateMutation.mutate({
                                action: syndication ? "update" : "create",
                                channelIds: [channel.id],
                              })
                            }
                            disabled={bulkSyndicateMutation.isPending}
                          >
                            {status === "syncing" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : status === "error" ? (
                              <>
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Retry
                              </>
                            ) : syndication ? (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                Update
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Publish
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Channel Details */}
                      {syndication && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Last Sync</p>
                              <p className="font-medium">
                                {syndication.lastSyncAt
                                  ? new Date(
                                      syndication.lastSyncAt,
                                    ).toLocaleString()
                                  : "Never"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                External ID
                              </p>
                              <p className="font-medium">
                                {syndication.externalId || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">
                                Sync Retries
                              </p>
                              <p className="font-medium">
                                {syndication.syncRetries || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <p className="font-medium capitalize">
                                {syndication.lastSyncStatus || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Error Message */}
                          {status === "error" && syndication.errorMessage && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                              <div className="flex items-start space-x-2">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Sync Error
                                  </p>
                                  <p className="text-sm text-red-700 dark:text-red-300">
                                    {syndication.errorMessage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    No Channels Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== "all"
                      ? "No channels match your current filters"
                      : "No syndication channels are configured"}
                  </p>
                  {!searchQuery && filterStatus === "all" && (
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Configure Channels
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <ChannelConfiguration
            productId={productId}
            channels={channels}
            productSyndications={productSyndications}
            onConfigUpdate={() => {
              queryClient.invalidateQueries({
                queryKey: ["/api/products", productId, "syndications"],
              });
            }}
          />
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping">
          <ChannelMappings
            productId={productId}
            product={product}
            channels={channels}
            productSyndications={productSyndications}
          />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <SyncStatusMonitor
            productId={productId}
            syncStatus={syncStatus}
            productSyndications={productSyndications}
            channels={channels}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <SyncHistory
            productId={productId}
            syncHistory={syncHistory}
            channels={channels}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
