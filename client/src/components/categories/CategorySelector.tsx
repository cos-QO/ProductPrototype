import React, { useState } from "react";
import { Category } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Folder, FolderOpen, X } from "lucide-react";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelect: (categoryId: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CategorySelector({
  categories,
  selectedCategoryId,
  onSelect,
  placeholder = "Select category...",
  allowClear = true,
  disabled = false,
  className,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);

  // Get the selected category
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId,
  );

  // Build category hierarchy for display
  const getCategoryPath = (category: Category): string => {
    const path: string[] = [];
    let current: Category | undefined = category;

    while (current) {
      path.unshift(current.name);
      current = categories.find((cat) => cat.id === current?.parentId);
    }

    return path.join(" / ");
  };

  // Get category depth for indentation
  const getCategoryDepth = (category: Category): number => {
    let depth = 0;
    let current: Category | undefined = category;

    while (current?.parentId) {
      depth++;
      current = categories.find((cat) => cat.id === current?.parentId);
    }

    return depth;
  };

  // Sort categories by hierarchy and name
  const sortedCategories = [...categories]
    .filter((cat) => cat.isActive)
    .sort((a, b) => {
      const aPath = getCategoryPath(a);
      const bPath = getCategoryPath(b);
      return aPath.localeCompare(bPath);
    });

  const handleSelect = (categoryId: number) => {
    onSelect(categoryId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedCategory ? (
              <>
                <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  {getCategoryPath(selectedCategory)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedCategory && allowClear && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandEmpty>No categories found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {allowClear && (
              <CommandItem
                value="clear-selection"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Clear selection
              </CommandItem>
            )}

            {sortedCategories.map((category) => {
              const depth = getCategoryDepth(category);
              const hasChildren = categories.some(
                (cat) => cat.parentId === category.id,
              );
              const isSelected = selectedCategoryId === category.id;

              return (
                <CommandItem
                  key={category.id}
                  value={`${category.name} ${category.slug} ${getCategoryPath(category)}`}
                  onSelect={() => handleSelect(category.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="flex items-center gap-2 flex-1"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    {hasChildren ? (
                      <FolderOpen className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="w-4 h-4 rounded border border-muted-foreground/30" />
                    )}

                    <span className="flex-1">{category.name}</span>

                    {depth > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {getCategoryPath(category)
                          .split(" / ")
                          .slice(0, -1)
                          .join(" / ")}
                      </Badge>
                    )}
                  </div>

                  <Check
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simpler version for inline display
export function CategoryBreadcrumb({
  category,
  categories,
  className,
}: {
  category: Category;
  categories: Category[];
  className?: string;
}) {
  const getCategoryPath = (cat: Category): Category[] => {
    const path: Category[] = [];
    let current: Category | undefined = cat;

    while (current) {
      path.unshift(current);
      current = categories.find((c) => c.id === current?.parentId);
    }

    return path;
  };

  const path = getCategoryPath(category);

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        className,
      )}
    >
      {path.map((cat, index) => (
        <React.Fragment key={cat.id}>
          {index > 0 && <span>/</span>}
          <span
            className={
              index === path.length - 1 ? "text-foreground font-medium" : ""
            }
          >
            {cat.name}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
