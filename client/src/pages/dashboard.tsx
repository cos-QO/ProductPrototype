import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import BrandRegistrationForm from "@/components/brand-registration-form";
import ProductCard from "@/components/product-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricsTrendChart } from "@/components/dashboard/MetricsTrendChart";
import { ConnectionStatusIndicator } from "@/components/dashboard/ConnectionStatusIndicator";
import { DataQualityWidget } from "@/components/dashboard/DataQualityWidget";
import { PerformanceInsights } from "@/components/dashboard/PerformanceInsights";
import { SKUDialComponent } from "@/components/dashboard/SKUDialComponent";
import { SKUDialDialog } from "@/components/dashboard/SKUDialDialog";
import {
  Crown,
  Box,
  Share,
  Clock,
  Plus,
  Upload,
  Filter,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Users,
  Code,
  Folder,
  Images,
  Video,
  FileText,
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [skuDialOpen, setSkuDialOpen] = useState(false);

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

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });

  const {
    data: recentProducts,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["/api/products"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Hero Section */}
      <div className="mb-8" data-testid="hero-section">
        <div className="gradient-primary p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">
              Achieve Hexellence
            </h1>
            <p className="text-lg text-white/80 mb-6">
              Every product has a story. Let's tell yours.
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                className="bg-white text-primary hover:bg-white/90 font-semibold"
                data-testid="button-register-brand"
              >
                <Plus className="mr-2 h-4 w-4" />
                Register New Brand
              </Button>
              <Button
                className="bg-white/20 text-white hover:bg-white/30 font-semibold"
                data-testid="button-upload-products"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Products
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Performance Insights */}
        <div className="mb-8 max-w-6xl mx-auto">
          <PerformanceInsights className="mb-8" />
        </div>

        {/* Metrics Trend Chart */}
        <div className="mb-8 max-w-6xl mx-auto">
          <MetricsTrendChart />
        </div>

        {/* Data Quality Widget */}
        <div className="mb-8 max-w-6xl mx-auto">
          <DataQualityWidget />
        </div>

        {/* SKU Dial Component */}
        <div className="mb-8 max-w-6xl mx-auto">
          <SKUDialComponent
            productId={1} // Demo product ID
            onEdit={() => setSkuDialOpen(true)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 max-w-6xl mx-auto">
          {/* Brand Registration Form */}
          <BrandRegistrationForm />

          {/* Recent Products */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Recent Products</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                >
                  View All <span className="ml-1">→</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {productsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-3 rounded-lg animate-pulse"
                    >
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentProducts && (recentProducts as any[])?.length > 0 ? (
                (recentProducts as any[]).slice(0, 4).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`product-item-${product.id}`}
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Box className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {product.brandName} •{" "}
                        {new Date(product.createdAt).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          },
                        )}{" "}
                        ago
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.status === "live"
                            ? "bg-success"
                            : product.status === "review"
                              ? "bg-warning"
                              : "bg-info"
                        }`}
                      ></span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {product.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>
                    No products yet. Create your first product to get started.
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-semibold"
                data-testid="button-add-product"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Product
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Product Management Section */}
        <div className="max-w-6xl mx-auto">
          <Card className="bg-card border-border mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Product Management</CardTitle>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-filter"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-primary text-white"
                    data-testid="button-export"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recentProducts && (recentProducts as any[])?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {(recentProducts as any[]).slice(0, 3).map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Box className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">No products yet</h3>
                  <p className="mb-6">
                    Start by registering a brand and adding your first product.
                  </p>
                  <Button
                    className="gradient-primary text-white"
                    data-testid="button-create-first-product"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Categories & Media Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 max-w-6xl mx-auto">
          {/* Categories Overview */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Categories</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => (window.location.href = "/categories")}
                >
                  Manage <span className="ml-1">→</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Organize Products</h3>
                <p className="text-muted-foreground mb-4">
                  Create hierarchical categories to organize your product
                  catalog.
                </p>
                <Button
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={() => (window.location.href = "/categories")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Categories
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Media Library Quick Access */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Media Library</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => (window.location.href = "/media")}
                >
                  Browse All <span className="ml-1">→</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Images className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-sm font-medium">Images</p>
                  <p className="text-xs text-muted-foreground">Ready to use</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Video className="h-6 w-6 text-info" />
                  </div>
                  <p className="text-sm font-medium">Videos</p>
                  <p className="text-xs text-muted-foreground">High quality</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-6 w-6 text-warning" />
                  </div>
                  <p className="text-sm font-medium">Documents</p>
                  <p className="text-xs text-muted-foreground">Organized</p>
                </div>
              </div>

              <Button
                className="w-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => (window.location.href = "/media")}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Media
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* API & Syndication Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Real-time Connection Status */}
          <div className="lg:col-span-2 mb-4">
            <ConnectionStatusIndicator showDetails={true} />
          </div>

          {/* API Status */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">API & Syndication</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-success rounded-full"></span>
                  <span className="text-sm text-success">
                    All Systems Operational
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <span className="text-success font-semibold">A</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Amazon Marketplace</h3>
                    <p className="text-xs text-muted-foreground">
                      Last sync: 2 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className="text-sm font-medium text-success"
                    data-testid="text-amazon-syncs"
                  >
                    847
                  </span>
                  <span className="text-xs text-muted-foreground">
                    syncs today
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                    <span className="text-info font-semibold">S</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Shopify Stores</h3>
                    <p className="text-xs text-muted-foreground">
                      Last sync: 5 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className="text-sm font-medium text-info"
                    data-testid="text-shopify-syncs"
                  >
                    1,234
                  </span>
                  <span className="text-xs text-muted-foreground">
                    syncs today
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Code className="text-accent h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">
                      Custom API Endpoints
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Response time: 120ms avg
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className="text-sm font-medium text-accent"
                    data-testid="text-api-requests"
                  >
                    456
                  </span>
                  <span className="text-xs text-muted-foreground">
                    requests/hour
                  </span>
                </div>
              </div>

              <Button
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-semibold"
                data-testid="button-add-integration"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Integration
              </Button>
            </CardContent>
          </Card>

          {/* Permission Management */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Permission Management</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  data-testid="button-manage-roles"
                >
                  Manage Roles <span className="ml-1">→</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                      <Crown className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Brand Owners</h3>
                      <p className="text-xs text-muted-foreground">
                        Full control over brand content
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold text-primary"
                    data-testid="text-brand-owners-count"
                  >
                    24 Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Create Products
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Manage Assets
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    API Access
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Syndication
                  </span>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-accent text-sm font-semibold">
                        R
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">
                        Licensed Retailers
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Can enhance with custom content
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold text-accent"
                    data-testid="text-retailers-count"
                  >
                    147 Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    Add Custom Images
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    Create Bundles
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    Limited API
                  </span>
                </div>
              </div>

              <div className="p-4 bg-info/5 border border-info/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center">
                      <Users className="text-info h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Content Teams</h3>
                      <p className="text-xs text-muted-foreground">
                        Manage storytelling and enrichment
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-sm font-semibold text-info"
                    data-testid="text-content-teams-count"
                  >
                    12 Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-info/10 text-info px-2 py-1 rounded-full">
                    Edit Stories
                  </span>
                  <span className="text-xs bg-info/10 text-info px-2 py-1 rounded-full">
                    Manage SEO
                  </span>
                  <span className="text-xs bg-info/10 text-info px-2 py-1 rounded-full">
                    Content Review
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SKU Dial Dialog */}
      <SKUDialDialog
        productId={1} // Demo product ID
        open={skuDialOpen}
        onOpenChange={setSkuDialOpen}
      />
    </>
  );
}
