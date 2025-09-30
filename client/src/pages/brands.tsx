import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BrandCard from "@/components/brand-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  Copy,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export default function Brands() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  const brandRegistrationSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    description: z.string().min(1, "Description is required"),
    website: z.string().url().optional().or(z.literal("")),
    foundedYear: z.string().optional(),
  });

  const form = useForm<z.infer<typeof brandRegistrationSchema>>({
    resolver: zodResolver(brandRegistrationSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      foundedYear: "",
    },
  });

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

  const createBrandMutation = useMutation({
    mutationFn: async (brandData: z.infer<typeof brandRegistrationSchema>) => {
      return await apiRequest("POST", "/api/brands", brandData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });
      setIsRegistrationOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Brand registered successfully",
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
        description: "Failed to register brand",
        variant: "destructive",
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: number) => {
      await apiRequest("DELETE", `/api/brands/${brandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/counts"] });
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
    if (
      confirm(
        "Are you sure you want to delete this brand? This action cannot be undone.",
      )
    ) {
      deleteBrandMutation.mutate(brandId);
    }
  };

  const filteredBrands =
    (brands as any[])?.filter(
      (brand: any) =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-8"
        data-testid="brands-header"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Brand Management</h1>
          <p className="text-muted-foreground">
            Manage your brands and their storytelling content
          </p>
        </div>
        <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
          <DialogTrigger asChild>
            <Button
              className="gradient-primary text-white hover:opacity-90"
              data-testid="button-create-brand"
            >
              <Plus className="mr-2 h-4 w-4" />
              Register New Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Brand</DialogTitle>
              <DialogDescription>
                Add a new brand to your portfolio and start building your
                product catalog.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createBrandMutation.mutate(data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter brand name"
                          {...field}
                          data-testid="input-brand-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief description of your brand"
                          {...field}
                          data-testid="input-brand-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourbrand.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foundedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founded Year (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRegistrationOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBrandMutation.isPending}
                    className="gradient-primary text-white hover:opacity-90"
                    data-testid="button-submit-brand"
                  >
                    {createBrandMutation.isPending
                      ? "Registering..."
                      : "Register Brand"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div
        className="flex items-center space-x-4 mb-6"
        data-testid="search-filters"
      >
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
        <div
          className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(345px, 1fr))",
          }}
          data-testid="brands-grid"
        >
          {filteredBrands.map((brand: any) => (
            <Card
              key={brand.id}
              className="bg-card border-border hover:border-primary/50 transition-colors group min-w-[345px]"
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
                          onError={(e) => {
                            // Fix corrupted URLs that might be missing domain
                            const target = e.target as HTMLImageElement;
                            if (
                              target.src.includes("200x200?text=") &&
                              !target.src.includes(
                                "https://via.placeholder.com/",
                              )
                            ) {
                              target.src = `https://via.placeholder.com/${target.src.split("200x200?text=")[1] ? target.src : "200x200?text=" + encodeURIComponent(brand.name)}`;
                            } else {
                              // Hide image and show fallback
                              target.style.display = "none";
                              target.parentElement
                                ?.querySelector(".fallback-icon")
                                ?.classList.remove("hidden");
                            }
                          }}
                        />
                      ) : null}
                      {/* Fallback icon */}
                      <Crown
                        className={`text-white h-5 w-5 ${brand.logoUrl ? "hidden fallback-icon" : ""}`}
                      />
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-sm"
                        data-testid={`text-brand-name-${brand.id}`}
                      >
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
                      className={
                        brand.isActive ? "bg-success/10 text-success" : ""
                      }
                    >
                      {brand.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-3">
                  {brand.description ||
                    brand.story ||
                    "No description available."}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />0 Products
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-primary/10 hover:text-primary"
                    data-testid={`button-edit-brand-${brand.id}`}
                  >
                    <Edit className="mr-2 h-3 w-3" />
                    Edit Story
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-duplicate-brand-${brand.id}`}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBrand(brand.id)}
                    disabled={deleteBrandMutation.isPending}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
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
                : "Start building your brand portfolio by registering your first brand."}
            </p>
            {!searchQuery && (
              <Button
                className="gradient-primary text-white"
                onClick={() => setIsRegistrationOpen(true)}
                data-testid="button-register-first-brand"
              >
                <Plus className="mr-2 h-4 w-4" />
                Register Your First Brand
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
