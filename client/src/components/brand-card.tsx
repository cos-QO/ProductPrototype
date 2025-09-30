import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, Share, Edit, Trash2, Copy } from "lucide-react";

interface BrandCardProps {
  brand: {
    id: number;
    name: string;
    description?: string;
    story?: string;
    category?: string;
    isActive: boolean;
    createdAt: string;
    logoUrl?: string;
    productCount?: number;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export default function BrandCard({
  brand,
  onEdit,
  onDelete,
  isDeleting,
}: BrandCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card
      className="border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-[border-color] duration-100 group w-full min-w-[345px]"
      data-testid={`brand-card-${brand.id}`}
    >
      {/* Brand Logo/Header */}
      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `/placeholders/brand-fallback.svg`;
              e.currentTarget.classList.add("p-12");
            }}
          />
        ) : (
          <>
            <Crown className="h-16 w-16 text-muted-foreground opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
          </>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Header Section */}
        <div className="space-y-1">
          <h3
            className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]"
            title={brand.name}
            data-testid={`text-brand-name-${brand.id}`}
          >
            {brand.name}
          </h3>
          <p
            className="text-xs text-muted-foreground"
            data-testid={`text-brand-category-${brand.id}`}
          >
            {brand.category || "Uncategorized"}
          </p>
        </div>

        {/* Description - Fixed Height */}
        <p
          className="text-xs text-muted-foreground line-clamp-3 min-h-[3rem]"
          data-testid={`text-brand-description-${brand.id}`}
        >
          {brand.story
            ? truncateText(brand.story, 120)
            : brand.description
              ? truncateText(brand.description, 120)
              : "No description available. Add a compelling story to bring this brand to life."}
        </p>

        {/* Metrics Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span
              className="flex items-center"
              data-testid={`text-brand-products-${brand.id}`}
            >
              <Users className="h-3 w-3 mr-1" />
              {brand.productCount || 0} Products
            </span>
            <span
              className="flex items-center"
              data-testid={`text-brand-created-${brand.id}`}
            >
              <Share className="h-3 w-3 mr-1" />
              {new Date(brand.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge
              status={brand.isActive ? "active" : "inactive"}
              className="text-xs capitalize"
            />
          </div>
        </div>

        {/* Action Buttons - Consistent Layout */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10 hover:text-primary"
            onClick={onEdit}
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
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              data-testid={`button-delete-brand-${brand.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Founded:{" "}
            <span
              className="font-mono"
              data-testid={`text-brand-founded-${brand.id}`}
            >
              {new Date(brand.createdAt).getFullYear()}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}