import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ThemeTokenResolver } from "./component-factory";

const tokenResolver = ThemeTokenResolver.getInstance();

// Get resolved token values for badge variants
const statusColors = tokenResolver.getStatusColors();

/**
 * Enhanced Badge component using modular token system
 * Maintains full backward compatibility with existing Badge API
 */
const enhancedBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",

        // Enhanced status variants using modular tokens
        success: `border-transparent text-success-foreground hover:opacity-80`,
        warning: `border-transparent text-warning-foreground hover:opacity-80`,
        info: `border-transparent text-info-foreground hover:opacity-80`,
        processing: `border-transparent text-processing-foreground hover:opacity-80`,

        // Additional variants for more granular control
        "success-light": `border-transparent text-success hover:opacity-80`,
        "warning-light": `border-transparent text-warning hover:opacity-80`,
        "info-light": `border-transparent text-info hover:opacity-80`,
        "processing-light": `border-transparent text-processing hover:opacity-80`,

        outline: "text-foreground border-border",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface EnhancedBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedBadgeVariants> {
  /**
   * Custom token path for advanced theming
   * e.g., "{semantic.status.custom.background}"
   */
  tokenPath?: string;
  /**
   * Whether to use CSS-in-JS styles for colors (for complex token paths)
   */
  useTokenStyles?: boolean;
}

function EnhancedBadge({
  className,
  variant,
  size,
  tokenPath,
  useTokenStyles = false,
  style,
  ...props
}: EnhancedBadgeProps) {
  // Dynamic styles based on token resolution
  const dynamicStyles = React.useMemo(() => {
    const baseStyles = style || {};

    if (useTokenStyles && variant) {
      // Apply token-resolved colors directly as CSS-in-JS
      switch (variant) {
        case "success":
          return {
            ...baseStyles,
            backgroundColor: statusColors.success.background,
            color: statusColors.success.foreground,
            borderColor: statusColors.success.border,
          };
        case "warning":
          return {
            ...baseStyles,
            backgroundColor: statusColors.warning.background,
            color: statusColors.warning.foreground,
            borderColor: statusColors.warning.border,
          };
        case "info":
          return {
            ...baseStyles,
            backgroundColor: statusColors.info.background,
            color: statusColors.info.foreground,
            borderColor: statusColors.info.border,
          };
        case "processing":
          return {
            ...baseStyles,
            backgroundColor: statusColors.processing.background,
            color: statusColors.processing.foreground,
            borderColor: statusColors.processing.border,
          };
        case "success-light":
          return {
            ...baseStyles,
            backgroundColor: statusColors.success.light,
            color: statusColors.success.text,
          };
        case "warning-light":
          return {
            ...baseStyles,
            backgroundColor: statusColors.warning.light,
            color: statusColors.warning.text,
          };
        case "info-light":
          return {
            ...baseStyles,
            backgroundColor: statusColors.info.light,
            color: statusColors.info.text,
          };
        case "processing-light":
          return {
            ...baseStyles,
            backgroundColor: statusColors.processing.light,
            color: statusColors.processing.text,
          };
      }
    }

    if (tokenPath) {
      // Custom token path - this would need more sophisticated resolution
      console.log("Custom token path not yet implemented:", tokenPath);
    }

    return baseStyles;
  }, [style, variant, tokenPath, useTokenStyles]);

  return (
    <div
      className={cn(enhancedBadgeVariants({ variant, size }), className)}
      style={dynamicStyles}
      {...props}
    />
  );
}

/**
 * Backward-compatible export that matches original Badge API exactly
 */
const Badge = React.forwardRef<HTMLDivElement, EnhancedBadgeProps>(
  ({ variant, className, ...props }, ref) => {
    return (
      <EnhancedBadge
        ref={ref}
        variant={variant}
        className={className}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { EnhancedBadge, Badge, enhancedBadgeVariants };
export type { EnhancedBadgeProps as BadgeProps };
