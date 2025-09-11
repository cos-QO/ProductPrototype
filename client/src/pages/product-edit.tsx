import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute, useLocation } from "wouter";
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
import { ArrowLeft, Save, Eye } from "lucide-react";
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
  status: z.enum(["draft", "review", "live", "archived"]),
  isVariant: z.boolean().default(false),
});

type ProductEditForm = z.infer<typeof productEditSchema>;

export default function ProductEdit() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/products/:id/edit");
  const productId = params?.id ? parseInt(params.id) : null;

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
      });
    }
  }, [product, form]);

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
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate("/products")}
                data-testid="button-back-to-products"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit Product</h1>
                <p className="text-muted-foreground">Update product information and content</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                data-testid="button-preview-product"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("Form validation errors:", errors);
            toast({
              title: "Validation Error",
              description: "Please check the form for errors",
              variant: "destructive",
            });
          })} className="space-y-6">
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
          </form>
        </main>
      </div>
    </div>
  );
}