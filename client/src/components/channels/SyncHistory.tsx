// Phase 3.6: Sync History Component - Audit trail and historical data
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  AlertCircle,
  Eye,
  Download,
  Filter,
  Search,
  Calendar,
  Timer,
  ExternalLink,
  MoreHorizontal,
  Globe,
  Store,
  ShoppingCart,
  Share2,
  Target,
  User,
  Bot,
  Zap,
  Play,
  Square,
  RotateCcw,
} from "lucide-react";

interface SyncHistoryProps {
  productId: number;
  syncHistory: any[];
  channels: any[];
}

export function SyncHistory({
  productId,
  syncHistory,
  channels,
}: SyncHistoryProps) {
  const [filteredHistory, setFilteredHistory] = useState(syncHistory);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Enhanced sync history query with filters
  const { data: enhancedHistory, isLoading } = useQuery({
    queryKey: [
      "/api/products",
      productId,
      "sync-history-detailed",
      filterTimeframe,
      filterStatus,
      filterChannel,
    ],
    queryFn: () =>
      apiRequest(
        "GET",
        `/api/products/${productId}/sync-history/detailed?timeframe=${filterTimeframe}&status=${filterStatus}&channel=${filterChannel}`,
      ),
    retry: false,
  });

  // Use enhanced history if available, fallback to prop
  const historyData = enhancedHistory || syncHistory || [];

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
      case "success":
        return <CheckCircle2 className={`${size} text-green-500`} />;
      case "error":
        return <XCircle className={`${size} text-red-500`} />;
      case "warning":
        return <AlertCircle className={`${size} text-yellow-500`} />;
      case "pending":
        return <Clock className={`${size} text-blue-500`} />;
      case "in_progress":
        return <RefreshCcw className={`${size} text-blue-500 animate-spin`} />;
      default:
        return <Clock className={`${size} text-gray-500`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Play className="h-4 w-4 text-green-500" />;
      case "update":
        return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <Square className="h-4 w-4 text-red-500" />;
      case "retry":
        return <RotateCcw className="h-4 w-4 text-yellow-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTriggerIcon = (triggeredBy: string) => {
    if (triggeredBy?.includes("user")) {
      return <User className="h-3 w-3" />;
    } else if (
      triggeredBy?.includes("system") ||
      triggeredBy?.includes("auto")
    ) {
      return <Bot className="h-3 w-3" />;
    }
    return <Zap className="h-3 w-3" />;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date),
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) return "Just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  // Filter and search history
  React.useEffect(() => {
    let filtered = historyData;

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((entry: any) => entry.status === filterStatus);
    }

    // Channel filter
    if (filterChannel !== "all") {
      filtered = filtered.filter(
        (entry: any) => entry.channelId === parseInt(filterChannel),
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (entry: any) =>
          entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.channelName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          entry.triggeredBy
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          entry.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredHistory(filtered);
  }, [historyData, filterStatus, filterChannel, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCcw className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>Loading sync history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Synchronization History</h3>
          <p className="text-sm text-muted-foreground">
            Complete audit trail of all sync operations and their results
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger>
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id.toString()}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Timeframe Filter */}
            <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {
                  filteredHistory.filter((h: any) => h.status === "success")
                    .length
                }
              </p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">
                {
                  filteredHistory.filter((h: any) => h.status === "error")
                    .length
                }
              </p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Timer className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">
                {filteredHistory.length > 0
                  ? formatDuration(
                      filteredHistory.reduce(
                        (sum: number, h: any) => sum + (h.responseTime || 0),
                        0,
                      ) / filteredHistory.length,
                    )
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Avg Time</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <History className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{filteredHistory.length}</p>
              <p className="text-sm text-muted-foreground">Total Syncs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory
                  .slice(0, 50)
                  .map((entry: any, index: number) => {
                    const channel = channels.find(
                      (c) => c.id === entry.channelId,
                    );
                    const dateTime = formatDateTime(
                      entry.createdAt || entry.timestamp,
                    );

                    return (
                      <TableRow key={entry.id || index}>
                        <TableCell>
                          <div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <p className="text-sm font-medium">
                                    {dateTime.relative}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div>
                                    <p>{dateTime.date}</p>
                                    <p>{dateTime.time}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <p className="text-xs text-muted-foreground">
                              {dateTime.time}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {channel && getChannelIcon(channel.type)}
                            <div>
                              <p className="font-medium text-sm">
                                {channel?.name ||
                                  entry.channelName ||
                                  "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {channel?.type || "api"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getActionIcon(entry.action)}
                            <span className="font-medium capitalize">
                              {entry.action}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(entry.status)}
                            {getStatusBadge(entry.status)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono text-sm">
                            {entry.responseTime
                              ? formatDuration(entry.responseTime)
                              : "—"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getTriggerIcon(entry.triggeredBy)}
                            <span className="text-sm capitalize">
                              {entry.triggeredBy || "system"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {entry.externalUrl && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(entry.externalUrl, "_blank")
                                      }
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    View External Resource
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEntry(entry)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Sync Operation Details
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Timestamp
                                      </Label>
                                      <p className="text-sm font-medium">
                                        {new Date(
                                          entry.createdAt || entry.timestamp,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Channel
                                      </Label>
                                      <p className="text-sm font-medium">
                                        {channel?.name ||
                                          entry.channelName ||
                                          "Unknown"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Action
                                      </Label>
                                      <p className="text-sm font-medium capitalize">
                                        {entry.action}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Status
                                      </Label>
                                      <div className="flex items-center space-x-2">
                                        {getStatusIcon(entry.status)}
                                        <span className="capitalize">
                                          {entry.status}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Response Time
                                      </Label>
                                      <p className="text-sm font-medium">
                                        {entry.responseTime
                                          ? formatDuration(entry.responseTime)
                                          : "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        HTTP Status
                                      </Label>
                                      <p className="text-sm font-medium">
                                        {entry.httpStatus || "—"}
                                      </p>
                                    </div>
                                  </div>

                                  {entry.errorMessage && (
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Error Message
                                      </Label>
                                      <div className="mt-1 p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-800">
                                          {entry.errorMessage}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {entry.requestPayload && (
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Request Payload
                                      </Label>
                                      <pre className="mt-1 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32">
                                        {typeof entry.requestPayload ===
                                        "string"
                                          ? entry.requestPayload
                                          : JSON.stringify(
                                              entry.requestPayload,
                                              null,
                                              2,
                                            )}
                                      </pre>
                                    </div>
                                  )}

                                  {entry.responsePayload && (
                                    <div>
                                      <Label className="text-sm text-muted-foreground">
                                        Response Payload
                                      </Label>
                                      <pre className="mt-1 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32">
                                        {typeof entry.responsePayload ===
                                        "string"
                                          ? entry.responsePayload
                                          : JSON.stringify(
                                              entry.responsePayload,
                                              null,
                                              2,
                                            )}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <History className="h-8 w-8 mb-2 opacity-50" />
                      <p>No sync history found</p>
                      <p className="text-sm">
                        {searchQuery ||
                        filterStatus !== "all" ||
                        filterChannel !== "all"
                          ? "Try adjusting your filters"
                          : "Sync operations will appear here once they start"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredHistory.length > 50 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline">
                Load More ({filteredHistory.length - 50} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
