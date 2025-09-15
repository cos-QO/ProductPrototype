import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { SyndicationDashboard } from "@/components/syndication-dashboard";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Save, Eye, Settings, Image, Search, Layers, Globe, History, ChevronRight, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schema
const productEditSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  story: z.string().optional(),
  brandId: z.number().min(1, "Brand is required"),
  sku: z.string().optional(),
  status: z.enum(["draft", "review", "live", "active", "archived"]),
  isVariant: z.boolean().default(false),
  // SEO fields
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional(),
  // Additional attributes
  weight: z.string().optional(),
  dimensions: z.string().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  // Pricing
  price: z.string().optional(),
  compareAtPrice: z.string().optional(),
});

type ProductEditForm = z.infer<typeof productEditSchema>;

export default function ProductEdit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/products/:id/edit");
  const productId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("general");
  const [completionProgress, setCompletionProgress] = useState(0);

  // Redirect to home if not authenticated
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

  // Redirect if no product ID
  useEffect(() => {
    if (!productId) {
      toast({
        title: "Error",
        description: "Invalid product ID",
        variant: "destructive",
      });
      navigate("/products");
    }
  }, [productId, navigate, toast]);

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery<any>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
    retry: false,
  });

  // Fetch brands for dropdown
  const { data: brands } = useQuery<any[]>({
    queryKey: ["/api/brands"],
    retry: false,
  });

  // Form setup
  const form = useForm<ProductEditForm>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      slug: "",
      shortDescription: "",
      longDescription: "",
      story: "",
      brandId: 0,
      sku: "",
      status: "draft",
      isVariant: false,
      metaTitle: "",
      metaDescription: "",
      keywords: "",
      weight: "",
      dimensions: "",
      material: "",
      color: "",
      price: "",
      compareAtPrice: "",
    },
  });

  // Update form when product data loads
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        slug: product.slug || "",
        shortDescription: product.shortDescription || "",
        longDescription: product.longDescription || "",
        story: product.story || "",
        brandId: product.brandId || 0,
        sku: product.sku || "",
        status: product.status || "draft",
        isVariant: product.isVariant || false,
        metaTitle: product.metaTitle || "",
        metaDescription: product.metaDescription || "",
        keywords: product.keywords || "",
        weight: product.weight || "",
        dimensions: product.dimensions || "",
        material: product.material || "",
        color: product.color || "",
        price: product.price || "",
        compareAtPrice: product.compareAtPrice || "",
      });
    }
  }, [product, form]);

  // Calculate completion progress
  useEffect(() => {
    const watchedValues = form.watch();
    const requiredFields = ['name', 'slug', 'brandId'];
    const optionalFields = ['shortDescription', 'longDescription', 'story', 'sku', 'metaTitle', 'metaDescription', 'keywords', 'weight', 'dimensions', 'material', 'color', 'price'];
    
    const requiredComplete = requiredFields.every(field => {
      const value = watchedValues[field as keyof typeof watchedValues];
      if (typeof value === 'string') {
        return value.trim() !== '';
      } else if (typeof value === 'number') {
        return value > 0;
      } else if (typeof value === 'boolean') {
        return true; // boolean fields don't affect required completion
      }
      return false;
    });
    
    const optionalComplete = optionalFields.filter(field => {
      const value = watchedValues[field as keyof typeof watchedValues];
      return value && typeof value === 'string' && value.trim() !== '';
    }).length;
    
    const totalProgress = requiredComplete ? 40 + (optionalComplete / optionalFields.length) * 60 : (optionalComplete / optionalFields.length) * 40;
    setCompletionProgress(Math.round(totalProgress));
  }, [form.watch()]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductEditForm) => {
      const response = await apiRequest("PATCH", `/api/products/${productId}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", productId] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      navigate("/products");
    },
    onError: (error: any) => {
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
        description: error?.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductEditForm) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form isValid:", form.formState.isValid);
    console.log("All form values:", form.getValues());
    console.log("BrandId specifically:", form.getValues("brandId"));
    updateProductMutation.mutate(data);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (productLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-4"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The product you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate("/products")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="flex min-h-screen">
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced Header */}
            <div className="bg-card border rounded-lg p-6 mb-6">
              {/* Breadcrumbs */}
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <span>Products</span>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span>{product?.name || 'Loading...'}</span>
                <ChevronRight className="mx-2 h-4 w-4" />
                <span className="text-foreground">Edit</span>
              </div>
              
              {/* Product Identity */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{product?.name || 'Product'}</h1>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-muted-foreground">SKU: {product?.sku || 'Not set'}</span>
                      <Badge variant={product?.status === 'live' ? 'default' : product?.status === 'review' ? 'secondary' : 'outline'}>
                        {product?.status || 'draft'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/products")}
                    className="flex items-center"
                    data-testid="button-back-to-products"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Products
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    data-testid="button-preview-product"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    type="submit"
                    form="product-edit-form"
                    className="flex items-center gradient-primary text-white hover:opacity-90"
                    disabled={updateProductMutation.isPending}
                    data-testid="button-save-product"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
              
              {/* Completion Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Product Information Completeness</span>
                  <span className="font-medium">{completionProgress}%</span>
                </div>
                <Progress value={completionProgress} className="h-2" />
              </div>
            </div>

          {/* Edit Form */}
          <form 
            id="product-edit-form"
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log("Form validation errors:", errors);
              toast({
                title: "Validation Error",
                description: "Please check the form for errors",
                variant: "destructive",
              });
            })} 
            className="space-y-6"
          >
            {/* Tabbed PIM Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-6">
                <TabsTrigger value="general" className="flex items-center space-x-2" data-testid="tab-general">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="attributes" className="flex items-center space-x-2" data-testid="tab-attributes">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Attributes</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center space-x-2" data-testid="tab-media">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Media</span>
                </TabsTrigger>
                <TabsTrigger value="seo" className="flex items-center space-x-2" data-testid="tab-seo">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">SEO</span>
                </TabsTrigger>
                <TabsTrigger value="variants" className="flex items-center space-x-2" data-testid="tab-variants">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Variants</span>
                </TabsTrigger>
                <TabsTrigger value="channels" className="flex items-center space-x-2" data-testid="tab-channels">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Channels</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center space-x-2" data-testid="tab-history">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        onChange={(e) => {
                          form.setValue("name", e.target.value);
                          if (!form.watch("slug")) {
                            form.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                        placeholder="Enter product name"
                        data-testid="input-product-name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="slug">URL Slug *</Label>
                      <Input
                        id="slug"
                        {...form.register("slug")}
                        placeholder="product-url-slug"
                        data-testid="input-product-slug"
                      />
                      {form.formState.errors.slug && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.slug.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        {...form.register("sku")}
                        placeholder="Product SKU"
                        data-testid="input-product-sku"
                      />
                    </div>

                    <div>
                      <Label htmlFor="shortDescription">Short Description</Label>
                      <Textarea
                        id="shortDescription"
                        {...form.register("shortDescription")}
                        placeholder="Brief product description"
                        rows={3}
                        data-testid="textarea-short-description"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="longDescription">Long Description</Label>
                      <Textarea
                        id="longDescription"
                        {...form.register("longDescription")}
                        placeholder="Detailed product description with features and benefits"
                        rows={6}
                        data-testid="textarea-long-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="story">Product Story</Label>
                      <Textarea
                        id="story"
                        {...form.register("story")}
                        placeholder="Tell the story behind this product - inspiration, craftsmanship, heritage"
                        rows={6}
                        data-testid="textarea-product-story"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          {...form.register("price")}
                          placeholder="29.99"
                          data-testid="input-price"
                        />
                      </div>
                      <div>
                        <Label htmlFor="compareAtPrice">Compare At Price</Label>
                        <Input
                          id="compareAtPrice"
                          {...form.register("compareAtPrice")}
                          placeholder="39.99"
                          data-testid="input-compare-at-price"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                
                {/* Publication Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Publication</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={form.watch("status")}
                        onValueChange={(value) => form.setValue("status", value as any)}
                      >
                        <SelectTrigger data-testid="select-product-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="brandId">Brand *</Label>
                      <Select
                        value={form.watch("brandId")?.toString() || ""}
                        onValueChange={(value) => form.setValue("brandId", parseInt(value))}
                      >
                        <SelectTrigger data-testid="select-product-brand">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {(brands as any[])?.map((brand: any) => (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.brandId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.brandId.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isVariant"
                        checked={form.watch("isVariant")}
                        onCheckedChange={(checked) => form.setValue("isVariant", checked)}
                        data-testid="switch-is-variant"
                      />
                      <Label htmlFor="isVariant">Product Variant</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Actions */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full gradient-primary text-white hover:opacity-90"
                        disabled={updateProductMutation.isPending}
                        data-testid="button-save-product"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate("/products")}
                        disabled={updateProductMutation.isPending}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <strong>Created:</strong> {new Date(product.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Updated:</strong> {new Date(product.updatedAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>ID:</strong> {product.id}
                    </div>
                  </CardContent>
                </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Attributes Tab */}
              <TabsContent value="attributes" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          {...form.register("weight")}
                          placeholder="e.g. 250g"
                          data-testid="input-weight"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dimensions">Dimensions</Label>
                        <Input
                          id="dimensions"
                          {...form.register("dimensions")}
                          placeholder="e.g. 40mm x 12mm"
                          data-testid="input-dimensions"
                        />
                      </div>
                      <div>
                        <Label htmlFor="material">Material</Label>
                        <Input
                          id="material"
                          {...form.register("material")}
                          placeholder="e.g. Stainless Steel"
                          data-testid="input-material"
                        />
                      </div>
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          {...form.register("color")}
                          placeholder="e.g. Black"
                          data-testid="input-color"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Digital Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-4" />
                      <p>Media management coming soon</p>
                      <p className="text-sm">Upload and manage product images, videos, and documents</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Engine Optimization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <Input
                        id="metaTitle"
                        {...form.register("metaTitle")}
                        placeholder="SEO-optimized title"
                        data-testid="input-meta-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="metaDescription">Meta Description</Label>
                      <Textarea
                        id="metaDescription"
                        {...form.register("metaDescription")}
                        placeholder="Brief description for search engines"
                        rows={3}
                        data-testid="textarea-meta-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="keywords">Keywords</Label>
                      <Input
                        id="keywords"
                        {...form.register("keywords")}
                        placeholder="keyword1, keyword2, keyword3"
                        data-testid="input-keywords"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Variants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4" />
                      <p>Variant management coming soon</p>
                      <p className="text-sm">Manage color, size, and other product variations</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="space-y-6">
                <SyndicationDashboard productId={productId} />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Change History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4" />
                      <p>Change tracking coming soon</p>
                      <p className="text-sm">View detailed audit trail of all product modifications</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </form>
          </div>
        </main>
      </div>
    </div>
  );
}