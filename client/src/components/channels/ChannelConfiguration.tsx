// Phase 3.6: Channel Configuration Component - Individual channel settings and mapping
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Globe,
  Store,
  ShoppingCart,
  Target,
  Share2,
  Key,
  Link,
  MapPin,
  DollarSign,
  Package,
  Tag,
  AlertTriangle,
  Info,
  CheckCircle2,
  Edit2,
} from "lucide-react";

interface ChannelConfigurationProps {
  productId: number;
  channels: any[];
  productSyndications: any[];
  onConfigUpdate: () => void;
}

export function ChannelConfiguration({
  productId,
  channels,
  productSyndications,
  onConfigUpdate,
}: ChannelConfigurationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [channelSettings, setChannelSettings] = useState<Record<number, any>>(
    {},
  );
  const [showApiKeys, setShowApiKeys] = useState<Record<number, boolean>>({});

  // Update channel configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({
      channelId,
      settings,
    }: {
      channelId: number;
      settings: any;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/products/${productId}/syndications/${channelId}/config`,
        settings,
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Channel settings have been saved successfully",
      });
      onConfigUpdate();
      setEditingChannel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update channel configuration",
        variant: "destructive",
      });
    },
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

  const getChannelSpecificFields = (channel: any, syndication?: any) => {
    const settings = syndication?.settings || {};

    switch (channel.type) {
      case "ecommerce":
        if (channel.slug === "shopify") {
          return (
            <div className="space-y-4">
              <div>
                <Label>Product Handle</Label>
                <Input
                  value={settings.handle || ""}
                  onChange={(e) =>
                    updateChannelSetting(channel.id, "handle", e.target.value)
                  }
                  placeholder="auto-generated-from-product-name"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL handle for the product in Shopify
                </p>
              </div>

              <div>
                <Label>Product Type</Label>
                <Input
                  value={settings.productType || ""}
                  onChange={(e) =>
                    updateChannelSetting(
                      channel.id,
                      "productType",
                      e.target.value,
                    )
                  }
                  placeholder="Electronics, Clothing, etc."
                />
              </div>

              <div>
                <Label>Vendor</Label>
                <Input
                  value={settings.vendor || ""}
                  onChange={(e) =>
                    updateChannelSetting(channel.id, "vendor", e.target.value)
                  }
                  placeholder="Brand or vendor name"
                />
              </div>

              <div>
                <Label>Collections</Label>
                <Input
                  value={settings.collections || ""}
                  onChange={(e) =>
                    updateChannelSetting(
                      channel.id,
                      "collections",
                      e.target.value,
                    )
                  }
                  placeholder="collection-1, collection-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list of Shopify collections
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.publishToOnlineStore !== false}
                  onCheckedChange={(checked) =>
                    updateChannelSetting(
                      channel.id,
                      "publishToOnlineStore",
                      checked,
                    )
                  }
                />
                <Label>Publish to Online Store</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.trackQuantity === true}
                  onCheckedChange={(checked) =>
                    updateChannelSetting(channel.id, "trackQuantity", checked)
                  }
                />
                <Label>Track Inventory Quantity</Label>
              </div>
            </div>
          );
        }
        break;

      case "marketplace":
        if (channel.slug === "amazon") {
          return (
            <div className="space-y-4">
              <div>
                <Label>ASIN (if existing)</Label>
                <Input
                  value={settings.asin || ""}
                  onChange={(e) =>
                    updateChannelSetting(channel.id, "asin", e.target.value)
                  }
                  placeholder="B08XXXXX"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to create new product
                </p>
              </div>

              <div>
                <Label>Product Category</Label>
                <Select
                  value={settings.category || ""}
                  onValueChange={(value) =>
                    updateChannelSetting(channel.id, "category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Amazon category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="home-garden">Home & Garden</SelectItem>
                    <SelectItem value="clothing">
                      Clothing & Accessories
                    </SelectItem>
                    <SelectItem value="sports">Sports & Outdoors</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Brand Name</Label>
                <Input
                  value={settings.brandName || ""}
                  onChange={(e) =>
                    updateChannelSetting(
                      channel.id,
                      "brandName",
                      e.target.value,
                    )
                  }
                  placeholder="Your Brand Name"
                />
              </div>

              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={settings.manufacturer || ""}
                  onChange={(e) =>
                    updateChannelSetting(
                      channel.id,
                      "manufacturer",
                      e.target.value,
                    )
                  }
                  placeholder="Manufacturer name"
                />
              </div>

              <div>
                <Label>Keywords</Label>
                <Textarea
                  value={settings.keywords || ""}
                  onChange={(e) =>
                    updateChannelSetting(channel.id, "keywords", e.target.value)
                  }
                  placeholder="keyword1, keyword2, keyword3"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Search terms for Amazon SEO
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.fulfillmentByAmazon === true}
                  onCheckedChange={(checked) =>
                    updateChannelSetting(
                      channel.id,
                      "fulfillmentByAmazon",
                      checked,
                    )
                  }
                />
                <Label>Fulfillment by Amazon (FBA)</Label>
              </div>
            </div>
          );
        }
        break;

      case "api":
        return (
          <div className="space-y-4">
            <div>
              <Label>Custom Endpoint</Label>
              <Input
                value={settings.customEndpoint || ""}
                onChange={(e) =>
                  updateChannelSetting(
                    channel.id,
                    "customEndpoint",
                    e.target.value,
                  )
                }
                placeholder="https://api.example.com/products"
              />
            </div>

            <div>
              <Label>Authentication Method</Label>
              <Select
                value={settings.authMethod || ""}
                onValueChange={(value) =>
                  updateChannelSetting(channel.id, "authMethod", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select auth method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api-key">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Request Format</Label>
              <Select
                value={settings.requestFormat || "json"}
                onValueChange={(value) =>
                  updateChannelSetting(channel.id, "requestFormat", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="form">Form Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custom Headers</Label>
              <Textarea
                value={settings.customHeaders || ""}
                onChange={(e) =>
                  updateChannelSetting(
                    channel.id,
                    "customHeaders",
                    e.target.value,
                  )
                }
                placeholder='{"X-Custom-Header": "value", "Content-Type": "application/json"}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                JSON format for custom HTTP headers
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No specific configuration options for this channel type</p>
          </div>
        );
    }
  };

  const updateChannelSetting = (channelId: number, key: string, value: any) => {
    setChannelSettings((prev) => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [key]: value,
      },
    }));
  };

  const saveChannelConfig = (channelId: number) => {
    const settings = channelSettings[channelId] || {};
    updateConfigMutation.mutate({ channelId, settings });
  };

  const toggleApiKeyVisibility = (channelId: number) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [channelId]: !prev[channelId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Channel Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure individual channel settings and authentication
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {channels.map((channel) => {
          const syndication = productSyndications.find(
            (s) => s.channelId === channel.id,
          );
          const isActive = syndication?.isEnabled !== false;
          const hasConfig =
            syndication && Object.keys(syndication.settings || {}).length > 0;

          return (
            <Card
              key={channel.id}
              className={`${!isActive ? "opacity-60" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getChannelIcon(channel.type)}
                    <div>
                      <CardTitle className="text-base">
                        {channel.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {channel.type} Channel
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {hasConfig && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    )}
                    {!isActive && <Badge variant="outline">Disabled</Badge>}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Basic Channel Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Endpoint
                    </Label>
                    <p className="text-sm font-medium">
                      {channel.endpoint || "Not configured"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Type
                    </Label>
                    <p className="text-sm font-medium capitalize">
                      {channel.type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <p className="text-sm font-medium">
                      {channel.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      API Key
                    </Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">
                        {channel.apiKey
                          ? showApiKeys[channel.id]
                            ? channel.apiKey
                            : "•".repeat(8)
                          : "Not set"}
                      </p>
                      {channel.apiKey && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleApiKeyVisibility(channel.id)}
                        >
                          {showApiKeys[channel.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Channel-Specific Configuration */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={`config-${channel.id}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Channel-Specific Settings</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      {getChannelSpecificFields(channel, syndication)}

                      <div className="flex items-center justify-end space-x-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setChannelSettings((prev) => ({
                              ...prev,
                              [channel.id]: {},
                            }))
                          }
                          disabled={!channelSettings[channel.id]}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveChannelConfig(channel.id)}
                          disabled={
                            updateConfigMutation.isPending ||
                            !channelSettings[channel.id]
                          }
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Sync Settings */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Sync Preferences
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={syndication?.autoSync !== false}
                        onCheckedChange={(checked) => {
                          // Update auto sync setting
                          updateConfigMutation.mutate({
                            channelId: channel.id,
                            settings: {
                              ...syndication?.settings,
                              autoSync: checked,
                            },
                          });
                        }}
                      />
                      <Label className="text-sm">
                        Auto-sync on product changes
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={syndication?.syncPricing !== false}
                        onCheckedChange={(checked) => {
                          updateConfigMutation.mutate({
                            channelId: channel.id,
                            settings: {
                              ...syndication?.settings,
                              syncPricing: checked,
                            },
                          });
                        }}
                      />
                      <Label className="text-sm">Sync pricing changes</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={syndication?.syncInventory !== false}
                        onCheckedChange={(checked) => {
                          updateConfigMutation.mutate({
                            channelId: channel.id,
                            settings: {
                              ...syndication?.settings,
                              syncInventory: checked,
                            },
                          });
                        }}
                      />
                      <Label className="text-sm">Sync inventory levels</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={syndication?.syncMedia !== false}
                        onCheckedChange={(checked) => {
                          updateConfigMutation.mutate({
                            channelId: channel.id,
                            settings: {
                              ...syndication?.settings,
                              syncMedia: checked,
                            },
                          });
                        }}
                      />
                      <Label className="text-sm">Sync media assets</Label>
                    </div>
                  </div>
                </div>

                {/* Connection Test */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Connection Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Test connection to this channel
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {channels.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Channels Configured
              </h3>
              <p className="text-muted-foreground mb-4">
                Contact your administrator to set up syndication channels
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
