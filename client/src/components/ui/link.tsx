import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const linkVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-primary hover:text-primary/80 underline-offset-4 hover:underline",
        destructive:
          "text-destructive hover:text-destructive/80 underline-offset-4 hover:underline",
        success:
          "text-success hover:text-success/80 underline-offset-4 hover:underline",
        warning:
          "text-warning hover:text-warning/80 underline-offset-4 hover:underline",
        info: "text-info hover:text-info/80 underline-offset-4 hover:underline",
        muted: "text-muted-foreground hover:text-foreground",
        white:
          "text-white hover:text-white/80 underline-offset-4 hover:underline",
        ghost: "text-foreground hover:text-primary",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        xl: "text-lg",
      },
      underline: {
        none: "",
        hover: "hover:underline",
        always: "underline",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      underline: "hover",
    },
  },
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      className,
      variant,
      size,
      underline,
      external = false,
      children,
      ...props
    },
    ref,
  ) => {
    const externalProps = external
      ? {
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : {};

    return (
      <a
        className={cn(linkVariants({ variant, size, underline, className }))}
        ref={ref}
        {...externalProps}
        {...props}
      >
        {children}
        {external && (
          <svg
            className="ml-1 h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </a>
    );
  },
);
Link.displayName = "Link";

export { Link, linkVariants };
