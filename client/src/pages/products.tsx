import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProductCard from "@/components/product-card";
import ProductListItem from "@/components/product-list-item";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Box,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  ExternalLink,
  Grid3X3,
  List,
  ArrowUpDown,
  X,
  FilterX,
  Calendar,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLocation } from "wouter";
import { BulkUploadWizard } from "@/components/bulk-upload";
import type { ImportResults } from "@/components/bulk-upload/types";

export default function Products() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>(
    {},
  );
  const [stockFilter, setStockFilter] = useState<string>("all"); // all, in-stock, low-stock, out-of-stock
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportBrand, setSelectedImportBrand] = useState<string>("");
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // View and sorting state
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("products-view-mode");
    return (saved as "grid" | "list") || "grid";
  });
  const [sortBy, setSortBy] = useState<"name" | "dateAdded">(() => {
    const saved = localStorage.getItem("products-sort-by");
    return (saved as "name" | "dateAdded") || "dateAdded";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
      try {
        await apiRequest("DELETE", `/api/products/${productId}`);
      } catch (error) {
        // Re-throw to trigger onError handler
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Product deletion error:", error);
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
        description:
          "Failed to delete product. It might have been deleted already or you lack permissions.",
        variant: "destructive",
      });
    },
  });

  const importKerouacMutation = useMutation({
    mutationFn: async (brandId: string) => {
      const response = await apiRequest(
        "POST",
        "/api/products/import/kerouac",
        {
          brandId: parseInt(brandId),
        },
      );
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImportDialogOpen(false);
      setSelectedImportBrand("");
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.total} Kerouac products`,
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
        description: error?.message || "Failed to import Kerouac products",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (productId: number) => {
    setProductToDelete(productId);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete);
      setProductToDelete(null);
    }
  };

  const cancelDeleteProduct = () => {
    setProductToDelete(null);
  };

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedBrand !== "all") count++;
    if (statusFilter !== "all") count++;
    if (stockFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (priceRange.min !== undefined || priceRange.max !== undefined) count++;
    if (dateRange.start || dateRange.end) count++;
    setActiveFiltersCount(count);
  }, [
    searchQuery,
    selectedBrand,
    statusFilter,
    stockFilter,
    categoryFilter,
    priceRange,
    dateRange,
  ]);

  // Persist preferences to localStorage
  useEffect(() => {
    localStorage.setItem("products-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("products-sort-by", sortBy);
  }, [sortBy]);

  // Memoized handlers for performance
  const handleViewModeChange = useCallback((value: string) => {
    if (value && (value === "grid" || value === "list")) {
      setViewMode(value);
    }
  }, []);

  const handleSortChange = useCallback((value: string) => {
    if (value === "name" || value === "dateAdded") {
      setSortBy(value);
      // Set appropriate default sort order
      setSortOrder(value === "name" ? "asc" : "desc");
    }
  }, []);

  const handleBulkUploadComplete = (results: ImportResults) => {
    // Refresh products list
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });

    // Show success toast
    toast({
      title: "Import Successful",
      description: `Successfully imported ${results.successfulRecords} products`,
    });

    // Update filters to show new products
    if (results.brandId) {
      setSelectedBrand(results.brandId.toString());
    }

    // Close wizard
    setIsBulkUploadOpen(false);
  };

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedBrand("all");
    setStatusFilter("all");
    setStockFilter("all");
    setCategoryFilter("all");
    setPriceRange({});
    setDateRange({});
  }, []);

  // Memoized filtered and sorted products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered =
      (products as any[])?.filter((product: any) => {
        // Multi-field search
        const matchesSearch =
          !searchQuery.trim() ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.shortDescription
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.longDescription
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          product.story?.toLowerCase().includes(searchQuery.toLowerCase());

        // Brand filter
        const matchesBrand =
          selectedBrand === "all" ||
          product.brandId?.toString() === selectedBrand;

        // Status filter
        const matchesStatus =
          statusFilter === "all" || product.status === statusFilter;

        // Stock filter
        const matchesStock = (() => {
          if (stockFilter === "all") return true;
          const stock = product.stock || 0;
          const lowThreshold = product.lowStockThreshold || 10;

          switch (stockFilter) {
            case "in-stock":
              return stock > lowThreshold;
            case "low-stock":
              return stock > 0 && stock <= lowThreshold;
            case "out-of-stock":
              return stock === 0;
            default:
              return true;
          }
        })();

        // Price range filter
        const matchesPrice = (() => {
          if (!priceRange.min && !priceRange.max) return true;
          const price = (product.price || 0) / 100; // Convert from cents
          const minMatch = !priceRange.min || price >= priceRange.min;
          const maxMatch = !priceRange.max || price <= priceRange.max;
          return minMatch && maxMatch;
        })();

        // Date range filter
        const matchesDate = (() => {
          if (!dateRange.start && !dateRange.end) return true;
          const productDate = new Date(product.createdAt);
          const startMatch = !dateRange.start || productDate >= dateRange.start;
          const endMatch = !dateRange.end || productDate <= dateRange.end;
          return startMatch && endMatch;
        })();

        return (
          matchesSearch &&
          matchesBrand &&
          matchesStatus &&
          matchesStock &&
          matchesPrice &&
          matchesDate
        );
      }) || [];

    // Sort products
    return filtered.sort((a: any, b: any) => {
      if (sortBy === "name") {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        return sortOrder === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      } else {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }
    });
  }, [
    products,
    searchQuery,
    selectedBrand,
    statusFilter,
    stockFilter,
    categoryFilter,
    priceRange,
    dateRange,
    sortBy,
    sortOrder,
  ]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-8"
        data-testid="products-header"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and storytelling content
          </p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import-kerouac">
                <ExternalLink className="mr-2 h-4 w-4" />
                Import from Kerouac
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Kerouac Products</DialogTitle>
                <DialogDescription>
                  Import luxury Kerouac watches with detailed specifications
                  from TheWatchAPI. This will add 3 sample Kerouac products to
                  your selected brand.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label htmlFor="import-brand" className="text-sm font-medium">
                    Select Brand to Import To:
                  </label>
                  <Select
                    value={selectedImportBrand}
                    onValueChange={setSelectedImportBrand}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-testid="select-import-brand"
                    >
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
                  <p>
                    <strong>Sample products include:</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Kerouac Daytona 116500LN (Steel, 40mm)</li>
                    <li>Kerouac Submariner 126610LV (Steel, 41mm)</li>
                    <li>Kerouac Datejust 126234 (Steel/White Gold, 36mm)</li>
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
                      importKerouacMutation.mutate(selectedImportBrand);
                    }
                  }}
                  disabled={
                    !selectedImportBrand || importKerouacMutation.isPending
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  data-testid="button-confirm-import"
                >
                  {importKerouacMutation.isPending
                    ? "Importing..."
                    : "Import Products"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            data-testid="button-bulk-upload"
            onClick={() => setIsBulkUploadOpen(true)}
            className="hover:border-primary/50 transition-[border-color] duration-100"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            data-testid="button-create-product"
            onClick={() => navigate("/products/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6" data-testid="search-filters">
        {/* Primary Search Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, descriptions, SKUs, stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {searchQuery.trim() && (
              <Badge variant="outline" className="gap-1">
                Search: "{searchQuery.slice(0, 20)}
                {searchQuery.length > 20 ? "..." : ""}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedBrand !== "all" && (
              <Badge variant="outline" className="gap-1">
                Brand:{" "}
                {(brands as any[])?.find(
                  (b) => b.id.toString() === selectedBrand,
                )?.name || selectedBrand}
                <button
                  onClick={() => setSelectedBrand("all")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="outline" className="gap-1">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {stockFilter !== "all" && (
              <Badge variant="outline" className="gap-1">
                Stock: {stockFilter.replace("-", " ")}
                <button
                  onClick={() => setStockFilter("all")}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <Card className="p-4 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Brand Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Brand</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger data-testid="select-brand-filter">
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
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
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
              </div>

              {/* Stock Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stock Level
                </label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Price Range
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min || ""}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        min: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full"
                  />
                  <span className="self-center text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max || ""}
                    onChange={(e) =>
                      setPriceRange((prev) => ({
                        ...prev,
                        max: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date Created
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={
                      dateRange.start
                        ? dateRange.start.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full"
                  />
                  <span className="self-center text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={
                      dateRange.end
                        ? dateRange.end.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        end: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Row with Sorting and View Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            data-testid="button-export-products"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          {/* Sorting Controls */}
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger
              className="w-44"
              data-testid="select-sort-by"
              aria-label="Sort products by"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateAdded">Date Added (Newest)</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={handleViewModeChange}
            className="border border-border rounded-md flex-shrink-0"
            data-testid="toggle-view-mode"
            aria-label="View mode selector"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Switch to grid view"
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Switch to list view"
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Products Display */}
      {productsLoading ? (
        // Loading state for both grid and list views
        viewMode === "grid" ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(345px, 1fr))",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="bg-card border-border animate-pulse min-w-[345px]"
              >
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
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 bg-muted rounded w-24"></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : filteredAndSortedProducts.length > 0 ? (
        // Products display based on view mode
        viewMode === "grid" ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(345px, 1fr))",
            }}
            data-testid="products-grid"
          >
            {filteredAndSortedProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={() => handleDeleteProduct(product.id)}
                isDeleting={deleteProductMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div
            className="border border-border rounded-xl overflow-hidden"
            data-testid="products-list"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProducts.map((product: any) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    onDelete={() => handleDeleteProduct(product.id)}
                    isDeleting={deleteProductMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="text-center py-12">
            <Box className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedBrand !== "all" || statusFilter !== "all"
                ? "No products match your current filters. Try adjusting your search criteria."
                : "Start building your product catalog by adding your first product."}
            </p>
            {!searchQuery &&
              selectedBrand === "all" &&
              statusFilter === "all" && (
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  data-testid="button-add-first-product"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!productToDelete}
        onClose={cancelDeleteProduct}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete Product"
        isLoading={deleteProductMutation.isPending}
      />
      {/* Bulk Upload Wizard */}
      <BulkUploadWizard
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onComplete={handleBulkUploadComplete}
      />
    </div>
  );
}
