import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Category, InsertCategory } from "@/shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import CategoryTree from "@/components/categories/CategoryTree";
import CategoryForm from "@/components/categories/CategoryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Folder,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Package,
} from "lucide-react";

export default function CategoriesPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [formCategory, setFormCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

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

  // Fetch categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["/api/categories"],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: isAuthenticated,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          window.location.href = "/api/login";
          return;
        }
        throw new Error("Failed to create category");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InsertCategory>;
    }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          window.location.href = "/api/login";
          return;
        }
        throw new Error("Failed to update category");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          window.location.href = "/api/login";
          return;
        }
        throw new Error("Failed to delete category");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCategory = (parentCat?: Category) => {
    setFormCategory(null);
    setParentCategory(parentCat || null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setFormCategory(category);
    setParentCategory(null);
    setIsFormOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleFormSubmit = async (data: InsertCategory) => {
    if (formCategory) {
      await updateCategoryMutation.mutateAsync({
        id: formCategory.id,
        data,
      });
    } else {
      await createCategoryMutation.mutateAsync(data);
    }
  };

  // Calculate category statistics
  const getCategoryStats = () => {
    const total = categories.length;
    const active = categories.filter((cat) => cat.isActive).length;
    const rootCategories = categories.filter((cat) => !cat.parentId).length;

    return { total, active, rootCategories };
  };

  const stats = getCategoryStats();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground mt-1">
              Organize your products with hierarchical categories
            </p>
          </div>
          <Button onClick={() => handleCreateCategory()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Categories
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Folder className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Categories
                </p>
                <p className="text-2xl font-bold text-success">
                  {stats.active}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Root Categories
                </p>
                <p className="text-2xl font-bold text-info">
                  {stats.rootCategories}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Tree */}
        <div className="lg:col-span-2">
          {categoriesLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
                </div>
                <p className="text-muted-foreground mt-4">
                  Loading categories...
                </p>
              </CardContent>
            </Card>
          ) : categoriesError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">Failed to load categories</p>
              </CardContent>
            </Card>
          ) : (
            <CategoryTree
              categories={categories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onAddChild={handleCreateCategory}
              selectedCategoryId={selectedCategory?.id}
              onSelect={setSelectedCategory}
            />
          )}
        </div>

        {/* Category Details */}
        <div>
          {selectedCategory ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Category Details</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(selectedCategory)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(selectedCategory)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedCategory.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    /{selectedCategory.slug}
                  </p>
                </div>

                {selectedCategory.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategory.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedCategory.isActive ? "default" : "secondary"
                    }
                  >
                    {selectedCategory.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {selectedCategory.sortOrder > 0 && (
                    <Badge variant="outline">
                      Order: {selectedCategory.sortOrder}
                    </Badge>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Products in Category
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    View products in this category
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    View Products
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select a Category</h3>
                <p className="text-muted-foreground">
                  Click on a category in the tree to view its details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Category Form Dialog */}
      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={formCategory}
        parentCategory={parentCategory}
        categories={categories}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This
              action cannot be undone. All subcategories will need to be
              reassigned or will become root categories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
