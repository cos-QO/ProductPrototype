import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface MediaSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  assetTypeFilter: string | null;
  onAssetTypeChange: (type: string | null) => void;
}

const assetTypes = [
  { value: "hero", label: "Hero Images" },
  { value: "product", label: "Product Images" },
  { value: "lifestyle", label: "Lifestyle Images" },
  { value: "brand", label: "Brand Assets" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
];

export default function MediaSearch({
  searchQuery,
  onSearchChange,
  assetTypeFilter,
  onAssetTypeChange,
}: MediaSearchProps) {
  const clearFilters = () => {
    onSearchChange("");
    onAssetTypeChange(null);
  };

  const hasActiveFilters = searchQuery || assetTypeFilter;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename, description, or alt text..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Asset Type Filter */}
      <div className="w-full sm:w-48">
        <Select
          value={assetTypeFilter || ""}
          onValueChange={(value) => onAssetTypeChange(value || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {assetTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="default"
          onClick={clearFilters}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
