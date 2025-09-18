import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Edit, 
  Check, 
  X, 
  Filter, 
  Search,
  Package,
  Tags,
  Crown,
  Save,
  Eye,
  AlertTriangle
} from "lucide-react";

interface BulkEditProduct {
  id: number;
  name: string;
  sku: string;
  brandId: number;
  brandName: string;
  status: string;
  shortDescription: string;
  category: string;
  selected: boolean;
}

interface BulkEditData {
  brandId?: number;
  status?: string;
  category?: string;
  tags?: string[];
  shortDescription?: string;
  attributes?: { [key: string]: string };
}

interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export default function BulkEditInterface() {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<BulkEditProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editScope, setEditScope] = useState<'selected' | 'brand' | 'category' | 'subcategory'>('selected');
  const [bulkEditData, setBulkEditData] = useState<BulkEditData>({});
  const [validationResults, setValidationResults] = useState<ValidationRule[]>([]);

  // Fetch products for bulk editing
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: brands } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    retry: false,
  });

  // Transform products data for bulk editing
  const bulkEditProducts: BulkEditProduct[] = (products as any[])?.map(product => ({
    ...product,
    brandName: (brands as any[])?.find(brand => brand.id === product.brandId)?.name || 'Unknown',
    selected: false
  })) || [];

  // Initialize selected products when products load
  useEffect(() => {
    if (bulkEditProducts.length > 0 && selectedProducts.length === 0) {
      setSelectedProducts(bulkEditProducts);
    }
  }, [bulkEditProducts.length]);

  // Filter products
  const filteredProducts = bulkEditProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = brandFilter === "all" || product.brandId.toString() === brandFilter;
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesBrand && matchesStatus && matchesCategory;
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { productIds: number[]; updates: BulkEditData; scope: string }) => {
      return await apiRequest("POST", "/api/products/bulk-update", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });
      toast({
        title: "Success",
        description: `Updated ${selectedProducts.filter(p => p.selected).length} products successfully`,
      });
      setSelectedProducts([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update products",
        variant: "destructive",
      });
    },
  });

  // Validation check mutation
  const validateMutation = useMutation({
    mutationFn: async (data: { productIds: number[]; updates: BulkEditData }) => {
      return await apiRequest("POST", "/api/products/validate-bulk", data);
    },
    onSuccess: (data) => {
      setValidationResults(data.validationErrors || []);
    },
  });

  const handleProductSelection = (productId: number, selected: boolean) => {
    setSelectedProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, selected } : p)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedProducts(prev => 
      prev.map(p => ({ ...p, selected }))
    );
  };

  const handleBulkUpdate = () => {
    const selectedIds = selectedProducts.filter(p => p.selected).map(p => p.id);
    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one product to update",
        variant: "destructive",
      });
      return;
    }

    bulkUpdateMutation.mutate({
      productIds: selectedIds,
      updates: bulkEditData,
      scope: editScope
    });
  };

  const handleValidate = () => {
    const selectedIds = selectedProducts.filter(p => p.selected).map(p => p.id);
    if (selectedIds.length === 0) return;

    validateMutation.mutate({
      productIds: selectedIds,
      updates: bulkEditData
    });
  };

  const selectedCount = selectedProducts.filter(p => p.selected).length;

  return (
    <div className="space-y-6" data-testid="bulk-edit-interface">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Bulk Product Editor
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Edit multiple products at once across brands, categories, or individual selections
              </p>
            </div>
            {selectedCount > 0 && (
              <Badge variant="secondary" data-testid="selection-count">
                {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Edit Scope Selection */}
      <Card data-testid="edit-scope">
        <CardHeader>
          <CardTitle className="text-lg">Edit Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={editScope} onValueChange={(value) => setEditScope(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="selected" data-testid="scope-selected">
                <Package className="h-4 w-4 mr-2" />
                Selected Products
              </TabsTrigger>
              <TabsTrigger value="brand" data-testid="scope-brand">
                <Crown className="h-4 w-4 mr-2" />
                By Brand
              </TabsTrigger>
              <TabsTrigger value="category" data-testid="scope-category">
                <Tags className="h-4 w-4 mr-2" />
                By Category
              </TabsTrigger>
              <TabsTrigger value="subcategory" data-testid="scope-subcategory">
                <Tags className="h-4 w-4 mr-2" />
                By Subcategory
              </TabsTrigger>
            </TabsList>

            <TabsContent value="selected" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Apply changes only to individually selected products from the list below.
              </p>
            </TabsContent>

            <TabsContent value="brand" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Apply changes to all products within selected brands.
                </p>
                <Select value={bulkEditData.brandId?.toString() || ""} 
                       onValueChange={(value) => setBulkEditData(prev => ({ ...prev, brandId: parseInt(value) }))}>
                  <SelectTrigger data-testid="select-bulk-brand">
                    <SelectValue placeholder="Select brand for bulk edit" />
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
            </TabsContent>

            <TabsContent value="category" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Apply changes to all products within selected categories.
                </p>
                <Select value={bulkEditData.category || ""} 
                       onValueChange={(value) => setBulkEditData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger data-testid="select-bulk-category">
                    <SelectValue placeholder="Select category for bulk edit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories as any[])?.map((category: any) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="subcategory" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Apply changes to all products within selected subcategories.
                </p>
                <Select disabled>
                  <SelectTrigger data-testid="select-bulk-subcategory">
                    <SelectValue placeholder="Select subcategory for bulk edit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Subcategory functionality coming soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card data-testid="bulk-edit-filters">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                data-testid="bulk-search-input"
              />
            </div>
            
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]" data-testid="bulk-filter-brand">
                <SelectValue placeholder="Brand" />
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
              <SelectTrigger className="w-[150px]" data-testid="bulk-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => handleSelectAll(true)}
              data-testid="button-select-all"
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSelectAll(false)}
              data-testid="button-clear-selection"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection List */}
        <Card data-testid="product-selection-list">
          <CardHeader>
            <CardTitle>Product Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                  data-testid={`product-item-${product.id}`}
                >
                  <Checkbox
                    checked={selectedProducts.find(p => p.id === product.id)?.selected || false}
                    onCheckedChange={(checked) => handleProductSelection(product.id, !!checked)}
                    data-testid={`checkbox-${product.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{product.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{product.sku}</span>
                      <span>•</span>
                      <span>{product.brandName}</span>
                      <Badge variant="outline" size="sm">{product.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Edit Form */}
        <Card data-testid="bulk-edit-form">
          <CardHeader>
            <CardTitle>Bulk Edit Fields</CardTitle>
            <p className="text-sm text-muted-foreground">
              Only specify fields you want to update. Empty fields will remain unchanged.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={bulkEditData.status || ""} 
                onValueChange={(value) => setBulkEditData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger data-testid="bulk-edit-status">
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Leave unchanged</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Select 
                value={bulkEditData.brandId?.toString() || ""} 
                onValueChange={(value) => setBulkEditData(prev => ({ ...prev, brandId: value ? parseInt(value) : undefined }))}
              >
                <SelectTrigger data-testid="bulk-edit-brand">
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Leave unchanged</SelectItem>
                  {(brands as any[])?.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Short Description (will overwrite existing)</Label>
              <Textarea
                value={bulkEditData.shortDescription || ""}
                onChange={(e) => setBulkEditData(prev => ({ ...prev, shortDescription: e.target.value }))}
                placeholder="Leave empty to keep existing descriptions"
                rows={3}
                data-testid="bulk-edit-description"
              />
            </div>

            <Separator />

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-red-600">Validation Issues</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {validationResults.map((rule, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center space-x-2 p-2 rounded text-sm ${
                        rule.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                      }`}
                      data-testid={`validation-${index}`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>{rule.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleValidate}
                variant="outline"
                disabled={selectedCount === 0 || validateMutation.isPending}
                data-testid="button-validate"
              >
                <Eye className="h-4 w-4 mr-2" />
                Validate
              </Button>
              <Button
                onClick={handleBulkUpdate}
                disabled={selectedCount === 0 || bulkUpdateMutation.isPending}
                data-testid="button-bulk-update"
              >
                <Save className="h-4 w-4 mr-2" />
                Update {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}