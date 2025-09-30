import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Save,
  Send,
  CheckCircle,
  Globe,
  ChevronLeft,
  Edit,
  Package,
  Image,
  Tags,
  Palette,
  Box,
  Share,
  History,
  Plus,
  Trash,
  Eye,
  Upload,
  Copy,
  ExternalLink,
  Languages,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  shortDescription: z.string().min(1, "Short description is required"),
  longDescription: z.string().optional(),
  story: z.string().optional(),
  brandId: z.number().min(1, "Brand selection is required"),
  status: z.enum(["draft", "review", "published", "archived"]),
});

interface ProductAttribute {
  id: string;
  category: string;
  name: string;
  value: string;
  unit?: string;
  required: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  attributes: { [key: string]: string };
  price?: number;
  inventory?: number;
}

interface MediaAsset {
  id: string;
  type: "image" | "video" | "document";
  url: string;
  alt?: string;
  isPrimary: boolean;
  tags: string[];
}

export default function ProductDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/products/:id/edit");
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);

  const productId = params?.id ? parseInt(params.id) : null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    retry: false,
  });

  const { data: brands } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  const { data: productAttributes } = useQuery<ProductAttribute[]>({
    queryKey: ["/api/products", productId, "attributes"],
    enabled: !!productId,
    retry: false,
  });

  const { data: productVariants } = useQuery<ProductVariant[]>({
    queryKey: ["/api/products", productId, "variants"],
    enabled: !!productId,
    retry: false,
  });

  const { data: mediaAssets } = useQuery<MediaAsset[]>({
    queryKey: ["/api/products", productId, "media"],
    enabled: !!productId,
    retry: false,
  });

  const { data: auditHistory } = useQuery({
    queryKey: ["/api/products", productId, "history"],
    enabled: !!productId,
    retry: false,
  });

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: product || {
      name: "",
      sku: "",
      shortDescription: "",
      longDescription: "",
      story: "",
      brandId: 0,
      status: "draft" as const,
    },
  });

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      form.reset(product);
    }
  }, [product, form]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/products/${productId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const formData = form.getValues();
    updateProductMutation.mutate(formData);
  };

  const handlePublish = () => {
    const formData = { ...form.getValues(), status: "published" };
    updateProductMutation.mutate(formData);
  };

  const handleRequestApproval = () => {
    const formData = { ...form.getValues(), status: "review" };
    updateProductMutation.mutate(formData);
  };

  if (isLoading || !isAuthenticated || productLoading) {
    return null;
  }

  if (!product) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  const brandName =
    brands?.find((b: any) => b.id === product.brandId)?.name || "Unknown Brand";
  const completionPercentage = 65; // Calculate based on filled fields

  return (
    <div className="flex-1 p-6">
      {/* Breadcrumbs */}
      <div className="mb-6" data-testid="breadcrumbs">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/brands/${product.brandId}`}>
                {brandName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="mb-8" data-testid="product-header">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/products")}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h1
                      className="text-2xl font-bold"
                      data-testid="product-name"
                    >
                      {product.name}
                    </h1>
                    <Badge
                      variant={
                        product.status === "published"
                          ? "default"
                          : product.status === "review"
                            ? "secondary"
                            : "outline"
                      }
                      data-testid="product-status"
                    >
                      {product.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span data-testid="product-sku">SKU: {product.sku}</span>
                    <span>Brand: {brandName}</span>
                    <div className="flex items-center space-x-2">
                      <span>Completion:</span>
                      <Progress value={completionPercentage} className="w-20" />
                      <span>{completionPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-toggle-edit"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProductMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={handleRequestApproval}
                  variant="secondary"
                  disabled={updateProductMutation.isPending}
                  data-testid="button-request-approval"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Request Approval
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={
                    updateProductMutation.isPending ||
                    product.status !== "review"
                  }
                  data-testid="button-publish"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publish
                </Button>
                <Button variant="outline" data-testid="button-translate">
                  <Languages className="h-4 w-4 mr-2" />
                  Translate
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabbed Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList
          className="grid w-full grid-cols-8"
          data-testid="product-tabs"
        >
          <TabsTrigger value="general" data-testid="tab-general">
            <Package className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="attributes" data-testid="tab-attributes">
            <Tags className="h-4 w-4 mr-2" />
            Attributes
          </TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media">
            <Image className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
          <TabsTrigger value="keywords" data-testid="tab-keywords">
            <Globe className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="variants" data-testid="tab-variants">
            <Palette className="h-4 w-4 mr-2" />
            Variants
          </TabsTrigger>
          <TabsTrigger value="bundles" data-testid="tab-bundles">
            <Box className="h-4 w-4 mr-2" />
            Kits & Bundles
          </TabsTrigger>
          <TabsTrigger value="syndication" data-testid="tab-syndication">
            <Share className="h-4 w-4 mr-2" />
            Syndication
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card data-testid="general-tab-content">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    disabled={!isEditing}
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    {...form.register("sku")}
                    disabled={!isEditing}
                    data-testid="input-sku"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description *</Label>
                <Textarea
                  id="shortDescription"
                  {...form.register("shortDescription")}
                  disabled={!isEditing}
                  rows={3}
                  data-testid="input-short-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDescription">Long Description</Label>
                <Textarea
                  id="longDescription"
                  {...form.register("longDescription")}
                  disabled={!isEditing}
                  rows={6}
                  data-testid="input-long-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="story">Brand Story</Label>
                <Textarea
                  id="story"
                  {...form.register("story")}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Tell the story behind this product..."
                  data-testid="input-story"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand *</Label>
                  <Select
                    value={form.watch("brandId")?.toString() || ""}
                    onValueChange={(value) =>
                      form.setValue("brandId", parseInt(value))
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger data-testid="select-brand">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands?.map((brand: any) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) =>
                      form.setValue("status", value as any)
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes">
          <Card data-testid="attributes-tab-content">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Product Attributes & Specifications</CardTitle>
                <Button
                  size="sm"
                  disabled={!isEditing}
                  data-testid="button-add-attribute"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Technical Specifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Technical Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productAttributes
                      ?.filter((attr) => attr.category === "technical")
                      .map((attr) => (
                        <div
                          key={attr.id}
                          className="flex items-center space-x-4"
                          data-testid={`attribute-${attr.id}`}
                        >
                          <Label className="min-w-[120px]">{attr.name}</Label>
                          <Input
                            value={attr.value}
                            disabled={!isEditing}
                            placeholder={
                              attr.unit ? `Value (${attr.unit})` : "Value"
                            }
                          />
                          {attr.required && (
                            <span className="text-destructive">*</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Materials */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Materials & Composition
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productAttributes
                      ?.filter((attr) => attr.category === "materials")
                      .map((attr) => (
                        <div
                          key={attr.id}
                          className="flex items-center space-x-4"
                          data-testid={`material-${attr.id}`}
                        >
                          <Label className="min-w-[120px]">{attr.name}</Label>
                          <Input
                            value={attr.value}
                            disabled={!isEditing}
                            placeholder="Material/Percentage"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media">
          <Card data-testid="media-tab-content">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Digital Asset Management</CardTitle>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    disabled={!isEditing}
                    data-testid="button-upload-media"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-bulk-edit"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bulk Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaAssets?.map((asset) => (
                  <div
                    key={asset.id}
                    className="border rounded-lg p-4"
                    data-testid={`media-${asset.id}`}
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                      {asset.type === "image" ? (
                        <Image className="h-16 w-16 text-muted-foreground" />
                      ) : asset.type === "video" ? (
                        <div className="h-16 w-16 text-muted-foreground">
                          📹
                        </div>
                      ) : (
                        <div className="h-16 w-16 text-muted-foreground">
                          📄
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {asset.type}
                        </span>
                        {asset.isPrimary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                      </div>
                      <Input
                        placeholder="Alt text"
                        value={asset.alt || ""}
                        disabled={!isEditing}
                        className="text-sm"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isEditing}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          <Card data-testid="keywords-tab-content">
            <CardHeader>
              <CardTitle>SEO & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input
                    disabled={!isEditing}
                    placeholder="SEO optimized title"
                    data-testid="input-meta-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea
                    disabled={!isEditing}
                    placeholder="SEO description"
                    rows={3}
                    data-testid="input-meta-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <Input
                    disabled={!isEditing}
                    placeholder="keyword1, keyword2, keyword3"
                    data-testid="input-keywords"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Channel-Specific SEO</h3>
                <Tabs defaultValue="website" className="w-full">
                  <TabsList>
                    <TabsTrigger value="website">Website</TabsTrigger>
                    <TabsTrigger value="amazon">Amazon</TabsTrigger>
                    <TabsTrigger value="google">Google Shopping</TabsTrigger>
                  </TabsList>
                  <TabsContent value="website" className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL Slug</Label>
                      <Input
                        disabled={!isEditing}
                        placeholder="product-url-slug"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Search Terms</Label>
                      <Input
                        disabled={!isEditing}
                        placeholder="Internal search terms"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="amazon" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amazon Keywords</Label>
                      <Textarea
                        disabled={!isEditing}
                        placeholder="Amazon-specific search terms"
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="google" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Product Category</Label>
                      <Input
                        disabled={!isEditing}
                        placeholder="Google Shopping category"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants">
          <Card data-testid="variants-tab-content">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Product Variations</CardTitle>
                <Button
                  size="sm"
                  disabled={!isEditing}
                  data-testid="button-add-variant"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productVariants?.map((variant) => (
                  <div
                    key={variant.id}
                    className="border rounded-lg p-4"
                    data-testid={`variant-${variant.id}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Variant Name</Label>
                        <Input value={variant.name} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input value={variant.sku} disabled={!isEditing} />
                      </div>
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          value={variant.price || ""}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Inventory</Label>
                        <Input
                          type="number"
                          value={variant.inventory || ""}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(variant.attributes).map(
                        ([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {value}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kits & Bundles Tab */}
        <TabsContent value="bundles">
          <Card data-testid="bundles-tab-content">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Kits and Bundles</CardTitle>
                <Button
                  size="sm"
                  disabled={!isEditing}
                  data-testid="button-create-bundle"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bundle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Bundles Created
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create product bundles to offer complete solutions
                </p>
                <Button disabled={!isEditing}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Bundle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Syndication Tab */}
        <TabsContent value="syndication">
          <Card data-testid="syndication-tab-content">
            <CardHeader>
              <CardTitle>Publishing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Main Website</h3>
                    <Badge variant="default">Published</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Last synced: 2 hours ago
                  </p>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live
                    </Button>
                    <Button size="sm" className="w-full" disabled={!isEditing}>
                      Update
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Amazon</h3>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Waiting for approval
                  </p>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live
                    </Button>
                    <Button size="sm" className="w-full" disabled={!isEditing}>
                      Publish
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Shopify</h3>
                    <Badge variant="destructive">Error</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sync failed - missing required fields
                  </p>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Live
                    </Button>
                    <Button size="sm" className="w-full" disabled={!isEditing}>
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card data-testid="history-tab-content">
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditHistory?.map((entry: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 border rounded-lg"
                    data-testid={`history-${index}`}
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{entry.userName}</span>
                        <span className="text-sm text-muted-foreground">
                          {entry.action}
                        </span>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.details}
                      </p>
                      {entry.changes && (
                        <div className="mt-2 text-xs bg-muted/50 p-2 rounded">
                          <pre>{JSON.stringify(entry.changes, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
