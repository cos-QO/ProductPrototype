import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ThemeTokenResolver } from "./component-factory";

const tokenResolver = ThemeTokenResolver.getInstance();
const statusColors = tokenResolver.getStatusColors();
const spacing = tokenResolver.getSpacing();

/**
 * Enhanced Button component using modular token system
 * Maintains full backward compatibility with existing Button API
 */
const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",

        // Enhanced status variants using modular tokens
        success: "text-success-foreground hover:opacity-90 shadow",
        warning: "text-warning-foreground hover:opacity-90 shadow",
        info: "text-info-foreground hover:opacity-90 shadow",
        processing: "text-processing-foreground hover:opacity-90 shadow",

        // Gradient variants
        gradient:
          "gradient-primary text-primary-foreground hover:opacity-90 shadow-lg",
        "gradient-accent":
          "gradient-accent text-accent-foreground hover:opacity-90 shadow-lg",

        // Outline status variants
        "success-outline":
          "border border-success text-success hover:bg-success hover:text-success-foreground",
        "warning-outline":
          "border border-warning text-warning hover:bg-warning hover:text-warning-foreground",
        "info-outline":
          "border border-info text-info hover:bg-info hover:text-info-foreground",
        "processing-outline":
          "border border-processing text-processing hover:bg-processing hover:text-processing-foreground",

        // Ghost status variants
        "success-ghost": "text-success hover:bg-success/10",
        "warning-ghost": "text-warning hover:bg-warning/10",
        "info-ghost": "text-info hover:bg-info/10",
        "processing-ghost": "text-processing hover:bg-processing/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  /**
   * Render as child component (e.g., Link)
   */
  asChild?: boolean;
  /**
   * Custom token path for advanced theming
   */
  tokenPath?: string;
  /**
   * Whether to use CSS-in-JS styles for colors
   */
  useTokenStyles?: boolean;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Icon to show before text
   */
  startIcon?: React.ReactNode;
  /**
   * Icon to show after text
   */
  endIcon?: React.ReactNode;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      useTokenStyles = false,
      loading = false,
      startIcon,
      endIcon,
      children,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Dynamic styles based on token resolution
    const dynamicStyles = React.useMemo(() => {
      const baseStyles = style || {};

      if (useTokenStyles && variant) {
        switch (variant) {
          case "success":
            return {
              ...baseStyles,
              backgroundColor: statusColors.success.background,
              color: statusColors.success.foreground,
            };
          case "warning":
            return {
              ...baseStyles,
              backgroundColor: statusColors.warning.background,
              color: statusColors.warning.foreground,
            };
          case "info":
            return {
              ...baseStyles,
              backgroundColor: statusColors.info.background,
              color: statusColors.info.foreground,
            };
          case "processing":
            return {
              ...baseStyles,
              backgroundColor: statusColors.processing.background,
              color: statusColors.processing.foreground,
            };
        }
      }

      return baseStyles;
    }, [style, variant, useTokenStyles]);

    const content = (
      <>
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {startIcon && !loading && startIcon}
        {children}
        {endIcon && endIcon}
      </>
    );

    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size }), className)}
        ref={ref}
        style={dynamicStyles}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
EnhancedButton.displayName = "EnhancedButton";

/**
 * Backward-compatible Button export
 */
const Button = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (props, ref) => {
    return <EnhancedButton ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { EnhancedButton, Button, enhancedButtonVariants };
export type { EnhancedButtonProps as ButtonProps };
