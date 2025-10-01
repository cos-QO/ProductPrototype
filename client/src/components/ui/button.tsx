import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, Check } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform active:scale-95 hover:scale-105",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        "outline-white":
          "border-2 border-white bg-transparent text-white hover:bg-white hover:text-black focus-visible:ring-white focus-visible:ring-offset-slate-800",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        "ghost-white":
          "text-white hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-slate-800",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "gradient-primary text-primary-foreground hover:opacity-90 shadow-lg",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        info: "bg-info text-info-foreground hover:bg-info/90",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-md",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  loadingText?: string;
  successText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      success = false,
      loadingText,
      successText,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Determine button state
    const isDisabled = disabled || loading;
    const showSuccess = success && !loading;

    // Determine button content
    const getButtonContent = () => {
      if (loading) {
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        );
      }

      if (showSuccess) {
        return (
          <>
            <Check className="mr-2 h-4 w-4 text-green-500" />
            {successText || children}
          </>
        );
      }

      return children;
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          loading && "cursor-not-allowed",
          showSuccess &&
            "bg-green-600 hover:bg-green-600 text-white border-green-600",
          className,
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {getButtonContent()}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
