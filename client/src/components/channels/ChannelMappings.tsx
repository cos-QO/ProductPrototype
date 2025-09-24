// Phase 3.6: Channel Mappings Component - Field mapping and data transformation
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
  Target,
  ArrowRight,
  Settings,
  Save,
  RotateCcw,
  Eye,
  Edit2,
  Plus,
  Minus,
  Check,
  X,
  AlertTriangle,
  Info,
  Code,
  Zap,
  Globe,
  Store,
  ShoppingCart,
  Share2,
  DollarSign,
  Package,
  Tag,
  Image,
} from "lucide-react";

interface ChannelMappingsProps {
  productId: number;
  product: any;
  channels: any[];
  productSyndications: any[];
}

export function ChannelMappings({
  productId,
  product,
  channels,
  productSyndications,
}: ChannelMappingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, any>>({});
  const [previewData, setPreviewData] = useState<any>(null);

  // Field mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({
      channelId,
      mappings,
    }: {
      channelId: number;
      mappings: any;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/products/${productId}/syndications/${channelId}/mappings`,
        {
          fieldMappings: mappings,
        },
      );
    },
    onSuccess: () => {
      toast({
        title: "Mappings Updated",
        description: "Field mappings have been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update field mappings",
        variant: "destructive",
      });
    },
  });

  // Preview mapping mutation
  const previewMappingMutation = useMutation({
    mutationFn: async ({
      channelId,
      mappings,
    }: {
      channelId: number;
      mappings: any;
    }) => {
      return apiRequest(
        "POST",
        `/api/products/${productId}/syndications/${channelId}/preview`,
        {
          fieldMappings: mappings,
        },
      );
    },
    onSuccess: (data) => {
      setPreviewData(data);
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description: error?.message || "Failed to generate preview",
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

  // Get available source fields from product
  const getSourceFields = () => {
    return [
      {
        key: "name",
        label: "Product Name",
        value: product?.name || "",
        type: "string",
      },
      {
        key: "slug",
        label: "URL Slug",
        value: product?.slug || "",
        type: "string",
      },
      {
        key: "shortDescription",
        label: "Short Description",
        value: product?.shortDescription || "",
        type: "text",
      },
      {
        key: "longDescription",
        label: "Long Description",
        value: product?.longDescription || "",
        type: "text",
      },
      {
        key: "story",
        label: "Product Story",
        value: product?.story || "",
        type: "text",
      },
      { key: "sku", label: "SKU", value: product?.sku || "", type: "string" },
      {
        key: "price",
        label: "Price",
        value: product?.price ? (product.price / 100).toFixed(2) : "",
        type: "number",
      },
      {
        key: "compareAtPrice",
        label: "Compare Price",
        value: product?.compareAtPrice
          ? (product.compareAtPrice / 100).toFixed(2)
          : "",
        type: "number",
      },
      {
        key: "stock",
        label: "Stock Quantity",
        value: product?.stock || "",
        type: "number",
      },
      {
        key: "weight",
        label: "Weight",
        value: product?.weight || "",
        type: "string",
      },
      {
        key: "dimensions",
        label: "Dimensions",
        value: product?.dimensions || "",
        type: "string",
      },
      {
        key: "material",
        label: "Material",
        value: product?.material || "",
        type: "string",
      },
      {
        key: "color",
        label: "Color",
        value: product?.color || "",
        type: "string",
      },
      {
        key: "status",
        label: "Status",
        value: product?.status || "",
        type: "string",
      },
      {
        key: "brandId",
        label: "Brand ID",
        value: product?.brandId || "",
        type: "number",
      },
      {
        key: "metaTitle",
        label: "Meta Title",
        value: product?.metaTitle || "",
        type: "string",
      },
      {
        key: "metaDescription",
        label: "Meta Description",
        value: product?.metaDescription || "",
        type: "text",
      },
      {
        key: "focusKeywords",
        label: "Focus Keywords",
        value: product?.focusKeywords || "",
        type: "string",
      },
    ];
  };

  // Get target fields for each channel type
  const getTargetFields = (channel: any) => {
    switch (channel.type) {
      case "ecommerce":
        if (channel.slug === "shopify") {
          return [
            {
              key: "title",
              label: "Product Title",
              required: true,
              type: "string",
            },
            {
              key: "body_html",
              label: "Description HTML",
              required: false,
              type: "text",
            },
            { key: "vendor", label: "Vendor", required: false, type: "string" },
            {
              key: "product_type",
              label: "Product Type",
              required: false,
              type: "string",
            },
            { key: "handle", label: "Handle", required: false, type: "string" },
            { key: "status", label: "Status", required: false, type: "string" },
            { key: "price", label: "Price", required: true, type: "number" },
            {
              key: "compare_at_price",
              label: "Compare At Price",
              required: false,
              type: "number",
            },
            {
              key: "inventory_quantity",
              label: "Inventory",
              required: false,
              type: "number",
            },
            { key: "weight", label: "Weight", required: false, type: "number" },
            { key: "sku", label: "SKU", required: false, type: "string" },
            {
              key: "barcode",
              label: "Barcode",
              required: false,
              type: "string",
            },
            { key: "tags", label: "Tags", required: false, type: "string" },
            {
              key: "seo_title",
              label: "SEO Title",
              required: false,
              type: "string",
            },
            {
              key: "seo_description",
              label: "SEO Description",
              required: false,
              type: "text",
            },
          ];
        }
        break;

      case "marketplace":
        if (channel.slug === "amazon") {
          return [
            {
              key: "title",
              label: "Product Title",
              required: true,
              type: "string",
            },
            {
              key: "description",
              label: "Description",
              required: true,
              type: "text",
            },
            { key: "brand", label: "Brand", required: true, type: "string" },
            {
              key: "manufacturer",
              label: "Manufacturer",
              required: false,
              type: "string",
            },
            { key: "price", label: "Price", required: true, type: "number" },
            { key: "msrp", label: "MSRP", required: false, type: "number" },
            { key: "sku", label: "SKU", required: true, type: "string" },
            { key: "upc", label: "UPC", required: false, type: "string" },
            {
              key: "category",
              label: "Product Category",
              required: true,
              type: "string",
            },
            {
              key: "keywords",
              label: "Search Keywords",
              required: false,
              type: "text",
            },
            {
              key: "bullet_points",
              label: "Bullet Points",
              required: false,
              type: "array",
            },
            { key: "weight", label: "Weight", required: false, type: "number" },
            {
              key: "dimensions",
              label: "Dimensions",
              required: false,
              type: "string",
            },
            { key: "color", label: "Color", required: false, type: "string" },
            { key: "size", label: "Size", required: false, type: "string" },
            {
              key: "material",
              label: "Material",
              required: false,
              type: "string",
            },
          ];
        }
        break;

      case "api":
        return [
          { key: "id", label: "Product ID", required: false, type: "string" },
          { key: "name", label: "Name", required: true, type: "string" },
          {
            key: "description",
            label: "Description",
            required: false,
            type: "text",
          },
          { key: "price", label: "Price", required: false, type: "number" },
          { key: "sku", label: "SKU", required: false, type: "string" },
          { key: "status", label: "Status", required: false, type: "string" },
          {
            key: "category",
            label: "Category",
            required: false,
            type: "string",
          },
          { key: "brand", label: "Brand", required: false, type: "string" },
          { key: "weight", label: "Weight", required: false, type: "string" },
          {
            key: "metadata",
            label: "Custom Metadata",
            required: false,
            type: "object",
          },
        ];

      default:
        return [];
    }
  };

  const updateFieldMapping = (
    channelId: number,
    targetField: string,
    mapping: any,
  ) => {
    setFieldMappings((prev) => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [targetField]: mapping,
      },
    }));
  };

  const saveFieldMappings = (channelId: number) => {
    const mappings = fieldMappings[channelId] || {};
    updateMappingMutation.mutate({ channelId, mappings });
  };

  const previewChannelData = (channelId: number) => {
    const mappings = fieldMappings[channelId] || {};
    previewMappingMutation.mutate({ channelId, mappings });
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "string":
        return <Tag className="h-3 w-3" />;
      case "text":
        return <Code className="h-3 w-3" />;
      case "number":
        return <DollarSign className="h-3 w-3" />;
      case "array":
        return <Package className="h-3 w-3" />;
      case "object":
        return <Settings className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Field Mapping & Transformation
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure how product data maps to each channel's requirements
          </p>
        </div>
      </div>

      {/* Channel Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((channel) => {
          const syndication = productSyndications.find(
            (s) => s.channelId === channel.id,
          );
          const isActive = syndication?.isEnabled !== false;
          const hasMappings =
            syndication?.fieldMappings &&
            Object.keys(syndication.fieldMappings).length > 0;

          return (
            <Card
              key={channel.id}
              className={`cursor-pointer transition-all ${activeChannel?.id === channel.id ? "ring-2 ring-primary" : ""} ${!isActive ? "opacity-60" : ""}`}
              onClick={() => setActiveChannel(channel)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getChannelIcon(channel.type)}
                    <div>
                      <h4 className="font-medium">{channel.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {channel.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {hasMappings && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mapped
                      </Badge>
                    )}
                    {!isActive && <Badge variant="outline">Disabled</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mapping Interface */}
      {activeChannel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {getChannelIcon(activeChannel.type)}
                <span>Field Mapping: {activeChannel.name}</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewChannelData(activeChannel.id)}
                  disabled={previewMappingMutation.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveFieldMappings(activeChannel.id)}
                  disabled={updateMappingMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Mappings
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="mapping" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                <TabsTrigger value="transformation">
                  Transformations
                </TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              {/* Field Mapping Tab */}
              <TabsContent value="mapping" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Source Fields */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Source Fields (Product Data)
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {getSourceFields().map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {getFieldIcon(field.type)}
                            <div>
                              <p className="font-medium text-sm">
                                {field.label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-48">
                                {field.value || "No value"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Target Fields */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Target Fields ({activeChannel.name})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {getTargetFields(activeChannel).map((field) => (
                        <div
                          key={field.key}
                          className={`p-3 border rounded-lg ${field.required ? "border-orange-200 bg-orange-50/30" : ""}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getFieldIcon(field.type)}
                              <p className="font-medium text-sm">
                                {field.label}
                              </p>
                              {field.required && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-orange-100 text-orange-800"
                                >
                                  Required
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>

                          <Select
                            value={
                              fieldMappings[activeChannel.id]?.[field.key]
                                ?.sourceField || ""
                            }
                            onValueChange={(value) =>
                              updateFieldMapping(activeChannel.id, field.key, {
                                sourceField: value,
                                type: "direct",
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select source field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No mapping</SelectItem>
                              {getSourceFields().map((sourceField) => (
                                <SelectItem
                                  key={sourceField.key}
                                  value={sourceField.key}
                                >
                                  {sourceField.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {fieldMappings[activeChannel.id]?.[field.key]
                            ?.sourceField && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <ArrowRight className="h-3 w-3 inline mr-1" />
                              Maps to:{" "}
                              <strong>
                                {
                                  getSourceFields().find(
                                    (f) =>
                                      f.key ===
                                      fieldMappings[activeChannel.id][field.key]
                                        .sourceField,
                                  )?.label
                                }
                              </strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Transformation Tab */}
              <TabsContent value="transformation" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      Configure data transformations before sending to channels
                    </span>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="price-transforms">
                      <AccordionTrigger>Price Transformations</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Currency Conversion</Label>
                            <Select defaultValue="none">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  No conversion
                                </SelectItem>
                                <SelectItem value="usd-eur">
                                  USD to EUR
                                </SelectItem>
                                <SelectItem value="usd-gbp">
                                  USD to GBP
                                </SelectItem>
                                <SelectItem value="usd-cad">
                                  USD to CAD
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Price Adjustment (%)</Label>
                            <Input type="number" placeholder="0" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="text-transforms">
                      <AccordionTrigger>Text Transformations</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch />
                            <Label>Strip HTML tags</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch />
                            <Label>Convert to uppercase</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch />
                            <Label>Truncate long descriptions</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch />
                            <Label>Add channel prefix</Label>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="custom-rules">
                      <AccordionTrigger>Custom Rules</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <Label>JavaScript Transformation</Label>
                          <Textarea
                            placeholder="// Custom transformation function
function transform(value, product) {
  // Your custom logic here
  return value;
}"
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="space-y-4">
                {previewData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Preview Output</h4>
                      <Badge variant="secondary">{activeChannel.name}</Badge>
                    </div>

                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                          {JSON.stringify(previewData, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click "Preview" to see how your data will look</p>
                    <p className="text-sm">
                      Configure your field mappings and transformations first
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!activeChannel && channels.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a Channel</h3>
            <p className="text-muted-foreground">
              Choose a channel above to configure field mappings and
              transformations
            </p>
          </CardContent>
        </Card>
      )}

      {channels.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Channels Available</h3>
            <p className="text-muted-foreground">
              Configure syndication channels to set up field mappings
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
