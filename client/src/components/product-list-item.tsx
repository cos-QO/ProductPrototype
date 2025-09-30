import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Box, Eye, Share, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

interface ProductListItemProps {
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
    mediaAssets?: Array<{ url: string; assetType: string }>;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
}

const ProductListItem = memo(function ProductListItem({
  product,
  onDelete,
  isDeleting,
}: ProductListItemProps) {
  const [, navigate] = useLocation();

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <TableRow
      className="hover:bg-muted/50 transition-colors cursor-pointer group"
      data-testid={`product-list-item-${product.id}`}
      onClick={() => navigate(`/products/${product.id}/edit`)}
    >
      {/* Product Image */}
      <TableCell className="w-16 p-2">
        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          {product.mediaAssets && product.mediaAssets.length > 0 ? (
            <img
              src={product.mediaAssets[0].url}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `/placeholders/product-fallback.svg`;
                e.currentTarget.classList.add("p-2");
              }}
            />
          ) : (
            <Box className="h-6 w-6 text-muted-foreground opacity-30" />
          )}
        </div>
      </TableCell>

      {/* Product Name */}
      <TableCell className="font-medium">
        <div className="space-y-1">
          <p
            className="font-semibold text-sm line-clamp-1"
            title={product.name}
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </p>
          <p
            className="text-xs text-muted-foreground"
            data-testid={`text-product-brand-${product.id}`}
          >
            {product.brandName || "Unknown Brand"}
          </p>
        </div>
      </TableCell>

      {/* SKU - Hidden on mobile */}
      <TableCell className="text-sm font-mono text-muted-foreground hidden sm:table-cell">
        <span data-testid={`text-product-sku-${product.id}`}>
          {product.sku || "NONE"}
        </span>
      </TableCell>

      {/* Price - Hidden on mobile */}
      <TableCell className="text-sm font-medium hidden md:table-cell">
        ${Math.floor(Math.random() * 5000) + 100}.00
      </TableCell>

      {/* Status & Badges */}
      <TableCell>
        <div className="flex items-center space-x-2">
          {product.isVariant && (
            <Badge
              variant="outline"
              className="text-xs bg-info/10 text-info border-info/20"
            >
              Variant
            </Badge>
          )}
          <StatusBadge status={product.status} className="text-xs capitalize" />
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${product.id}/edit`);
            }}
            data-testid={`button-edit-product-${product.id}`}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            data-testid={`button-share-product-${product.id}`}
          >
            <Share className="h-3 w-3" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              data-testid={`button-delete-product-${product.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            data-testid={`button-more-product-${product.id}`}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default ProductListItem;
