import * as React from "react";
import { Badge, BadgeProps } from "./badge";

// Status mapping configuration
const STATUS_VARIANT_MAP = {
  // Product Status
  live: "success",
  published: "success",
  active: "success",

  // Warning States
  review: "warning",
  pending: "warning",
  draft: "warning",

  // Info States
  inactive: "info",
  paused: "info",
  scheduled: "info",

  // Processing States
  processing: "processing",
  syncing: "processing",
  uploading: "processing",

  // Error States
  archived: "secondary",
  disabled: "secondary",
  failed: "destructive",
  error: "destructive",
} as const;

type ProductStatus = keyof typeof STATUS_VARIANT_MAP;

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: ProductStatus | string;
}

function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  // Get the variant for the status, fallback to default
  const variant = STATUS_VARIANT_MAP[status as ProductStatus] || "default";

  return (
    <Badge variant={variant as any} {...props}>
      {children || status}
    </Badge>
  );
}

export { StatusBadge, STATUS_VARIANT_MAP };
export type { ProductStatus };
