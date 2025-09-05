import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Users } from "lucide-react";

export default function Brands() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ["/api/brands"],
    retry: false,
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: number) => {
      await apiRequest("DELETE", `/api/brands/${brandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({
        title: "Success",
        description: "Brand deleted successfully",
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
        description: "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const handleDeleteBrand = (brandId: number) => {
    if (confirm("Are you sure you want to delete this brand? This action cannot be undone.")) {
      deleteBrandMutation.mutate(brandId);
    }
  };

  const filteredBrands = (brands as any[])?.filter((brand: any) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
          <div className="flex items-center justify-between mb-8" data-testid="brands-header">
            <div>
              <h1 className="text-3xl font-bold mb-2">Brand Management</h1>
              <p className="text-muted-foreground">Manage your brands and their storytelling content</p>
            </div>
            <Button 
              className="gradient-primary text-white hover:opacity-90"
              data-testid="button-create-brand"
            >
              <Plus className="mr-2 h-4 w-4" />
              Register New Brand
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6" data-testid="search-filters">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-brands"
              />
            </div>
            <Button variant="outline" size="sm" data-testid="button-filter-brands">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Brands Grid */}
          {brandsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24"></div>
                          <div className="h-3 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBrands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="brands-grid">
              {filteredBrands.map((brand: any) => (
                <Card 
                  key={brand.id} 
                  className="bg-card border-border hover:border-primary/50 transition-colors group"
                  data-testid={`brand-card-${brand.id}`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                          {brand.logoUrl ? (
                            <img 
                              src={brand.logoUrl} 
                              alt={brand.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <Crown className="text-white h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm" data-testid={`text-brand-name-${brand.id}`}>
                            {brand.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {brand.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={brand.isActive ? "default" : "secondary"}
                          className={brand.isActive ? "bg-green-500/10 text-green-400" : ""}
                        >
                          {brand.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-brand-menu-${brand.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-3">
                      {brand.description || brand.story || "No description available."}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          0 Products
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(brand.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-primary/10 text-primary hover:bg-primary/20"
                        data-testid={`button-edit-brand-${brand.id}`}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit Story
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteBrand(brand.id)}
                        disabled={deleteBrandMutation.isPending}
                        data-testid={`button-delete-brand-${brand.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="text-center py-12">
                <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <h3 className="text-lg font-medium mb-2">No brands found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery 
                    ? `No brands match "${searchQuery}". Try a different search term.`
                    : "Start building your brand portfolio by registering your first brand."
                  }
                </p>
                {!searchQuery && (
                  <Button 
                    className="gradient-primary text-white"
                    data-testid="button-register-first-brand"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Register Your First Brand
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
