import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  Zap,
  ExternalLink,
} from "lucide-react";

interface SyndicationDashboardProps {
  productId: string;
}

export function SyndicationDashboard({ productId }: SyndicationDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch syndication channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/syndication/channels'],
  });

  // Fetch product syndications
  const { data: syndications = [], isLoading: syndicationsLoading } = useQuery({
    queryKey: ['/api/products', productId, 'syndications'],
  });

  // Fetch syndication status
  const { data: syndicationStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/products', productId, 'syndication-status'],
  });

  // Syndicate to all channels mutation
  const syndicateAllMutation = useMutation({
    mutationFn: async (action: 'create' | 'update') => {
      return apiRequest(`/api/products/${productId}/syndicate-all`, {
        method: 'POST',
        body: { action },
      });
    },
    onSuccess: () => {
      toast({
        title: "Syndication Started",
        description: "Product is being syndicated to all channels",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'syndications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'syndication-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Syndication Failed",
        description: error.message || "Failed to start syndication",
        variant: "destructive",
      });
    },
  });

  // Individual channel syndication mutation
  const syndicateChannelMutation = useMutation({
    mutationFn: async ({ channelId, action }: { channelId: number; action: 'create' | 'update' }) => {
      return apiRequest(`/api/products/${productId}/syndicate`, {
        method: 'POST',
        body: { channelId, action },
      });
    },
    onSuccess: () => {
      toast({
        title: "Channel Syndication Started", 
        description: "Product is being syndicated to the selected channel",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'syndications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'syndication-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Syndication Failed",
        description: error.message || "Failed to syndicate to channel",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'syncing':
        return <RefreshCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Live</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'syncing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Syncing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (channelsLoading || syndicationsLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span>Loading syndication data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Syndication Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Syndication Overview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => syndicateAllMutation.mutate('update')}
                disabled={syndicateAllMutation.isPending}
                data-testid="button-syndicate-all"
              >
                {syndicateAllMutation.isPending ? (
                  <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Syndicate All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {syndicationStatus && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syndicationStatus.total}</div>
                <div className="text-sm text-muted-foreground">Total Channels</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syndicationStatus.live}</div>
                <div className="text-sm text-muted-foreground">Live</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{syndicationStatus.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{syndicationStatus.error}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Management */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channels.map((channel: any) => {
              const channelSyndication = syndications.find((s: any) => s.channelId === channel.id);
              
              return (
                <div 
                  key={channel.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`channel-card-${channel.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(channelSyndication?.status || 'pending')}
                      <div>
                        <div className="font-medium">{channel.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{channel.type}</div>
                      </div>
                    </div>
                    {getStatusBadge(channelSyndication?.status || 'pending')}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {channelSyndication?.externalUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(channelSyndication.externalUrl, '_blank')}
                        data-testid={`button-view-external-${channel.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => syndicateChannelMutation.mutate({ 
                        channelId: channel.id, 
                        action: channelSyndication ? 'update' : 'create'
                      })}
                      disabled={syndicateChannelMutation.isPending}
                      data-testid={`button-syndicate-${channel.id}`}
                    >
                      {syndicateChannelMutation.isPending ? (
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                      ) : (
                        channelSyndication ? 'Update' : 'Publish'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {channels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No syndication channels configured</p>
                <p className="text-sm">Contact your administrator to set up publishing channels</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Syndication Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syndicationStatus?.channels?.slice(0, 5).map((channel: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(channel.status)}
                  <span>{channel.channelName}</span>
                </div>
                <div className="text-muted-foreground">
                  {channel.lastSyncAt ? new Date(channel.lastSyncAt).toLocaleString() : 'Never synced'}
                </div>
              </div>
            ))}
            
            {(!syndicationStatus?.channels || syndicationStatus.channels.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No syndication activity yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}