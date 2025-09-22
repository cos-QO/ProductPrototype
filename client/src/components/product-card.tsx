import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Eye, Share, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

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
    mediaAssets?: Array<{ url: string; assetType: string }>;
  };
  onDelete?: () => void;
  isDeleting?: boolean;
}

export default function ProductCard({
  product,
  onDelete,
  isDeleting,
}: ProductCardProps) {
  const [, navigate] = useLocation();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-400";
      case "review":
        return "bg-yellow-400";
      case "draft":
        return "bg-blue-400";
      case "archived":
        return "bg-gray-400";
      default:
        return "bg-muted";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500/10 text-green-400";
      case "review":
        return "bg-yellow-500/10 text-yellow-400";
      case "draft":
        return "bg-blue-500/10 text-blue-400";
      case "archived":
        return "bg-gray-500/10 text-gray-400";
      default:
        return "";
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card
      className="border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors group"
      data-testid={`product-card-${product.id}`}
    >
      {/* Product Image Placeholder */}
      <div className="w-full h-48 bg-muted flex items-center justify-center relative overflow-hidden">
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

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm mb-1 truncate"
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
          <div className="flex items-center space-x-1 flex-shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${getStatusColor(product.status)}`}
            ></span>
            <span
              className="text-xs capitalize"
              data-testid={`text-product-status-${product.id}`}
            >
              {product.status}
            </span>
          </div>
        </div>

        <p
          className="text-xs text-muted-foreground mb-4 line-clamp-3"
          data-testid={`text-product-description-${product.id}`}
        >
          {product.story
            ? truncateText(product.story, 120)
            : product.shortDescription
              ? truncateText(product.shortDescription, 120)
              : "No description available. Add a compelling story to bring this product to life."}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
                className="text-xs bg-primary/10 text-primary border-primary/20"
              >
                Variant
              </Badge>
            )}
            {product.sku && (
              <Badge
                variant="outline"
                className={`text-xs ${getStatusBadgeVariant(product.status)} border-current`}
              >
                {product.status === "live"
                  ? "Live"
                  : product.status === "review"
                    ? "Review"
                    : product.status === "draft"
                      ? "Draft"
                      : "Archived"}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            size="sm"
            className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 font-medium"
            onClick={() => navigate(`/products/${product.id}/edit`)}
            data-testid={`button-edit-product-${product.id}`}
          >
            <Edit className="mr-2 h-3 w-3" />
            Edit Content
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-muted/80"
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
            className="hover:bg-muted/80"
            data-testid={`button-more-product-${product.id}`}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {product.sku && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              SKU:{" "}
              <span
                className="font-mono"
                data-testid={`text-product-sku-${product.id}`}
              >
                {product.sku}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
