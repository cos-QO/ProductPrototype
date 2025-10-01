import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Box,
  Eye,
  Share,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  Package,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatPrice, formatStock } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    shortDescription?: string;
    story?: string;
    brandName?: string;
    status: string;
    sku?: string;
    isVariant: boolean;
    createdAt: string;
    price?: number | null;
    compareAtPrice?: number | null;
    stock?: number | null;
    lowStockThreshold?: number | null;
    mediaAssets?: Array<{ url: string; assetType: string }>;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
}

const ProductCard = memo(function ProductCard({
  product,
  onDelete,
  isDeleting,
}: ProductCardProps) {
  const [, navigate] = useLocation();

  // Status badge function removed - now using StatusBadge component

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card
      className="border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-[border-color] duration-100 group w-full min-w-80"
      data-testid={`product-card-${product.id}`}
    >
      {/* Product Image Placeholder */}
      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
        {product.mediaAssets && product.mediaAssets.length > 0 ? (
          <img
            src={product.mediaAssets[0].url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `/placeholders/product-fallback.svg`;
              e.currentTarget.classList.add("p-12");
            }}
          />
        ) : (
          <>
            <Box className="h-16 w-16 text-muted-foreground opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
          </>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Header Section */}
        <div className="space-y-1">
          <h3
            className="font-semibold text-sm line-clamp-2 min-h-10"
            title={product.name}
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>
          <p
            className="text-xs text-muted-foreground"
            data-testid={`text-product-brand-${product.id}`}
          >
            {product.brandName || "Unknown Brand"}
          </p>
        </div>

        {/* Description - Fixed Height */}
        <p
          className="text-xs text-muted-foreground line-clamp-3 min-h-12"
          data-testid={`text-product-description-${product.id}`}
        >
          {product.story
            ? truncateText(product.story, 120)
            : product.shortDescription
              ? truncateText(product.shortDescription, 120)
              : "No description available. Add a compelling story to bring this product to life."}
        </p>

        {/* Price and Stock Information */}
        <div className="space-y-2">
          {/* Price Display */}
          <div className="flex items-center space-x-2">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold text-sm"
                data-testid={`text-product-price-${product.id}`}
              >
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice &&
                product.compareAtPrice > (product.price || 0) && (
                  <span
                    className="text-xs text-muted-foreground line-through"
                    data-testid={`text-product-compare-price-${product.id}`}
                  >
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
            </div>
          </div>

          {/* Stock Display */}
          <div className="flex items-center space-x-2">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span
              className={`text-xs font-medium ${
                formatStock(product.stock, product.lowStockThreshold).color
              }`}
              data-testid={`text-product-stock-${product.id}`}
            >
              {formatStock(product.stock, product.lowStockThreshold).text}
            </span>
            {formatStock(product.stock, product.lowStockThreshold).status ===
              "low-stock" && (
              <Badge
                variant="outline"
                className="text-xs bg-warning/10 text-warning border-warning/20"
              >
                Low Stock
              </Badge>
            )}
            {formatStock(product.stock, product.lowStockThreshold).status ===
              "out-of-stock" && (
              <Badge
                variant="outline"
                className="text-xs bg-destructive/10 text-destructive border-destructive/20"
              >
                Out of Stock
              </Badge>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span
              className="flex items-center"
              data-testid={`text-product-views-${product.id}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              {Math.floor(Math.random() * 2000) + 100} {/* Mock view count */}
            </span>
            <span
              className="flex items-center"
              data-testid={`text-product-shares-${product.id}`}
            >
              <Share className="h-3 w-3 mr-1" />
              {Math.floor(Math.random() * 100) + 1} {/* Mock share count */}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {product.isVariant && (
              <Badge
                variant="outline"
                className="text-xs bg-info/10 text-info border-info/20"
              >
                Variant
              </Badge>
            )}
            <StatusBadge
              status={product.status}
              className="text-xs capitalize"
            />
          </div>
        </div>

        {/* Action Buttons - Consistent Layout */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={product.status === "draft" ? "outline" : "secondary"}
            className={`flex-1 ${
              product.status === "draft"
                ? "border-primary text-primary hover:bg-primary/10 hover:text-primary"
                : ""
            }`}
            onClick={() => navigate(`/products/${product.id}/edit`)}
            data-testid={`button-edit-product-${product.id}`}
          >
            <Edit className="mr-2 h-3 w-3" />
            {product.status === "draft" ? "Continue Editing" : "Edit Content"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-share-product-${product.id}`}
          >
            <Share className="h-3 w-3" />
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              data-testid={`button-delete-product-${product.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-more-product-${product.id}`}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            SKU:{" "}
            <span
              className="font-mono"
              data-testid={`text-product-sku-${product.id}`}
            >
              {product.sku || "NONE"}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

export default ProductCard;
