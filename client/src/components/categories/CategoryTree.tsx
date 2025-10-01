import React, { useState } from "react";
import { Category } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryTreeProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onAddChild?: (parentCategory: Category) => void;
  selectedCategoryId?: number;
  onSelect?: (category: Category) => void;
}

interface CategoryItemProps {
  category: Category;
  children: Category[];
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onAddChild?: (parentCategory: Category) => void;
  isSelected?: boolean;
  onSelect?: (category: Category) => void;
}

function CategoryItem({
  category,
  children,
  level,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  isSelected,
  onSelect,
}: CategoryItemProps) {
  const hasChildren = children.length > 0;
  const indentLevel = level * 20;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
          isSelected && "bg-primary/10 border border-primary/20",
          !category.isActive && "opacity-60",
        )}
        style={{ marginLeft: `${indentLevel}px` }}
        onClick={() => onSelect?.(category)}
      >
        <div className="flex items-center gap-1 flex-1">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex items-center gap-2">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-primary" />
              )
            ) : (
              <div className="w-4 h-4 rounded border border-muted-foreground/30" />
            )}

            <span className="text-sm font-medium">{category.name}</span>

            {!category.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}

            {children.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {children.length}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild?.(category);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(category);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(category);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1">
          {children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              allCategories={[]} // Will be provided by parent
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              selectedCategoryId={category.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryTreeNode({
  category,
  allCategories,
  level,
  onEdit,
  onDelete,
  onAddChild,
  selectedCategoryId,
  onSelect,
}: {
  category: Category;
  allCategories: Category[];
  level: number;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onAddChild?: (parentCategory: Category) => void;
  selectedCategoryId?: number;
  onSelect?: (category: Category) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const children = allCategories.filter((cat) => cat.parentId === category.id);
  const isSelected = selectedCategoryId === category.id;

  return (
    <CategoryItem
      category={category}
      children={children}
      level={level}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddChild={onAddChild}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
}

export default function CategoryTree({
  categories,
  onEdit,
  onDelete,
  onAddChild,
  selectedCategoryId,
  onSelect,
}: CategoryTreeProps) {
  // Get root categories (no parent)
  const rootCategories = categories.filter((cat) => !cat.parentId);

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No categories yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first category to organize your products.
          </p>
          <Button
            onClick={() => onAddChild?.({ name: "Root", id: 0 } as Category)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Category
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Categories</CardTitle>
          <Button
            size="sm"
            onClick={() => onAddChild?.({ name: "Root", id: 0 } as Category)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-1 group">
          {rootCategories.map((category) => (
            <CategoryTreeNode
              key={category.id}
              category={category}
              allCategories={categories}
              level={0}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
