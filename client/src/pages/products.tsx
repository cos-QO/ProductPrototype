import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import ProductCard from "@/components/product-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box, Plus, Search, Filter, Download, Upload, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Products() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportBrand, setSelectedImportBrand] = useState<string>("");

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

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: brands } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
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
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const importRolexMutation = useMutation({
    mutationFn: async (brandId: string) => {
      const response = await apiRequest("POST", "/api/products/import/rolex", {
        brandId: parseInt(brandId),
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImportDialogOpen(false);
      setSelectedImportBrand("");
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.total} Rolex products`,
      });
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
        title: "Import Failed",
        description: error?.message || "Failed to import Rolex products",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (productId: number) => {
    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProductMutation.mutate(productId);
    }
  };

  const filteredProducts = (products as any[])?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBrand = selectedBrand === "all" || product.brandId?.toString() === selectedBrand;
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    
    return matchesSearch && matchesBrand && matchesStatus;
  }) || [];

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <div className="flex min-h-screen">
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8" data-testid="products-header">
            <div>
              <h1 className="text-3xl font-bold mb-2">Product Management</h1>
              <p className="text-muted-foreground">Manage your product catalog and storytelling content</p>
            </div>
            <div className="flex space-x-3">
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-rolex">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Import from Rolex
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Import Rolex Products</DialogTitle>
                    <DialogDescription>
                      Import luxury Rolex watches with detailed specifications from TheWatchAPI.
                      This will add 3 sample Rolex products to your selected brand.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="import-brand" className="text-sm font-medium">
                        Select Brand to Import To:
                      </label>
                      <Select value={selectedImportBrand} onValueChange={setSelectedImportBrand}>
                        <SelectTrigger className="w-full" data-testid="select-import-brand">
                          <SelectValue placeholder="Choose a brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(brands as any[])?.map((brand: any) => (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Sample products include:</strong></p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Rolex Daytona 116500LN (Steel, 40mm)</li>
                        <li>Rolex Submariner 126610LV (Steel, 41mm)</li>
                        <li>Rolex Datejust 126234 (Steel/White Gold, 36mm)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setImportDialogOpen(false)}
                      data-testid="button-cancel-import"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedImportBrand) {
                          importRolexMutation.mutate(selectedImportBrand);
                        }
                      }}
                      disabled={!selectedImportBrand || importRolexMutation.isPending}
                      className="gradient-primary text-white hover:opacity-90"
                      data-testid="button-confirm-import"
                    >
                      {importRolexMutation.isPending ? "Importing..." : "Import Products"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" data-testid="button-bulk-upload">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button 
                className="gradient-primary text-white hover:opacity-90"
                data-testid="button-create-product"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6" data-testid="search-filters">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products, SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
            
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-40" data-testid="select-brand-filter">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {(brands as any[])?.map((brand: any) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" data-testid="button-export-products">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Products Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <div className="w-full h-48 bg-muted"></div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                    <div className="flex space-x-2">
                      <div className="flex-1 h-8 bg-muted rounded"></div>
                      <div className="h-8 w-8 bg-muted rounded"></div>
                      <div className="h-8 w-8 bg-muted rounded"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="products-grid">
              {filteredProducts.map((product: any) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onDelete={() => handleDeleteProduct(product.id)}
                  isDeleting={deleteProductMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="text-center py-12">
                <Box className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || selectedBrand !== "all" || statusFilter !== "all"
                    ? "No products match your current filters. Try adjusting your search criteria."
                    : "Start building your product catalog by adding your first product."
                  }
                </p>
                {!searchQuery && selectedBrand === "all" && statusFilter === "all" && (
                  <Button 
                    className="gradient-primary text-white"
                    data-testid="button-add-first-product"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
