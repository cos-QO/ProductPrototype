import { tokenResolver } from "../utils/token-resolver";

/**
 * Component Factory for creating components that use modular tokens
 * while maintaining backward compatibility with existing CSS variables
 */

type TokenPath = string;
type CSSVariable = string;
type ComponentVariant = Record<string, any>;

/**
 * Enhanced token resolver that falls back to CSS variables
 */
export function resolveToken(
  tokenPath: TokenPath,
  fallback?: CSSVariable,
): string {
  try {
    // Try to resolve from modular token system first
    if (tokenPath.startsWith("{") && tokenPath.endsWith("}")) {
      const resolved = tokenResolver.resolve(tokenPath);
      // If resolution worked and returned a color/value, use it
      if (resolved && resolved !== tokenPath.slice(1, -1)) {
        return resolved;
      }
    }

    // Fallback to CSS variable if provided
    if (fallback) {
      return `var(${fallback})`;
    }

    // Return original token path as final fallback
    return tokenPath;
  } catch (error) {
    console.warn(`Token resolution failed for: ${tokenPath}`, error);
    return fallback ? `var(${fallback})` : tokenPath;
  }
}

/**
 * Create variant classes that use modular tokens
 */
export function createTokenVariants<T extends ComponentVariant>(
  variants: T,
  tokenMap: Record<string, { token: TokenPath; fallback?: CSSVariable }>,
): T {
  const resolvedVariants = { ...variants };

  Object.entries(tokenMap).forEach(([variantKey, { token, fallback }]) => {
    if (resolvedVariants[variantKey]) {
      // Replace token references in variant strings
      resolvedVariants[variantKey] = resolvedVariants[variantKey].replace(
        /\{[^}]+\}/g,
        (match: string) => {
          return resolveToken(match, fallback);
        },
      );
    }
  });

  return resolvedVariants;
}

/**
 * Theme-aware token resolver for components
 */
export class ThemeTokenResolver {
  private static instance: ThemeTokenResolver;

  static getInstance(): ThemeTokenResolver {
    if (!ThemeTokenResolver.instance) {
      ThemeTokenResolver.instance = new ThemeTokenResolver();
    }
    return ThemeTokenResolver.instance;
  }

  /**
   * Get status colors for components
   */
  getStatusColors() {
    return {
      success: {
        background: resolveToken(
          "{semantic.status.success.background}",
          "--success",
        ),
        foreground: resolveToken(
          "{semantic.status.success.foreground}",
          "--success-foreground",
        ),
        border: resolveToken("{semantic.status.success.border}", "--success"),
        hover: resolveToken("{semantic.status.success.hover}", "--success"),
        light: resolveToken("{semantic.status.success.light}", "--success"),
        text: resolveToken("{semantic.status.success.text}", "--success"),
      },
      warning: {
        background: resolveToken(
          "{semantic.status.warning.background}",
          "--warning",
        ),
        foreground: resolveToken(
          "{semantic.status.warning.foreground}",
          "--warning-foreground",
        ),
        border: resolveToken("{semantic.status.warning.border}", "--warning"),
        hover: resolveToken("{semantic.status.warning.hover}", "--warning"),
        light: resolveToken("{semantic.status.warning.light}", "--warning"),
        text: resolveToken("{semantic.status.warning.text}", "--warning"),
      },
      error: {
        background: resolveToken(
          "{semantic.status.error.background}",
          "--destructive",
        ),
        foreground: resolveToken(
          "{semantic.status.error.foreground}",
          "--destructive-foreground",
        ),
        border: resolveToken("{semantic.status.error.border}", "--destructive"),
        hover: resolveToken("{semantic.status.error.hover}", "--destructive"),
        light: resolveToken("{semantic.status.error.light}", "--destructive"),
        text: resolveToken("{semantic.status.error.text}", "--destructive"),
      },
      info: {
        background: resolveToken("{semantic.status.info.background}", "--info"),
        foreground: resolveToken(
          "{semantic.status.info.foreground}",
          "--info-foreground",
        ),
        border: resolveToken("{semantic.status.info.border}", "--info"),
        hover: resolveToken("{semantic.status.info.hover}", "--info"),
        light: resolveToken("{semantic.status.info.light}", "--info"),
        text: resolveToken("{semantic.status.info.text}", "--info"),
      },
      processing: {
        background: resolveToken(
          "{semantic.status.processing.background}",
          "--processing",
        ),
        foreground: resolveToken(
          "{semantic.status.processing.foreground}",
          "--processing-foreground",
        ),
        border: resolveToken(
          "{semantic.status.processing.border}",
          "--processing",
        ),
        hover: resolveToken(
          "{semantic.status.processing.hover}",
          "--processing",
        ),
        light: resolveToken(
          "{semantic.status.processing.light}",
          "--processing",
        ),
        text: resolveToken("{semantic.status.processing.text}", "--processing"),
      },
    };
  }

  /**
   * Get spacing values
   */
  getSpacing() {
    return {
      1: resolveToken("{primitive.spacing.1}", "--space-1"),
      2: resolveToken("{primitive.spacing.2}", "--space-2"),
      3: resolveToken("{primitive.spacing.3}", "--space-3"),
      4: resolveToken("{primitive.spacing.4}", "--space-4"),
      5: resolveToken("{primitive.spacing.5}", "--space-5"),
      6: resolveToken("{primitive.spacing.6}", "--space-6"),
      8: resolveToken("{primitive.spacing.8}", "--space-8"),
      10: resolveToken("{primitive.spacing.10}", "--space-10"),
      12: resolveToken("{primitive.spacing.12}", "--space-12"),
    };
  }

  /**
   * Get typography values
   */
  getTypography() {
    return {
      fontSize: {
        xs: resolveToken(
          "{primitive.typography.fontSize.xs}",
          "--font-size-xs",
        ),
        sm: resolveToken(
          "{primitive.typography.fontSize.sm}",
          "--font-size-sm",
        ),
        base: resolveToken(
          "{primitive.typography.fontSize.base}",
          "--font-size-base",
        ),
        lg: resolveToken(
          "{primitive.typography.fontSize.lg}",
          "--font-size-lg",
        ),
        xl: resolveToken(
          "{primitive.typography.fontSize.xl}",
          "--font-size-xl",
        ),
        "2xl": resolveToken(
          "{primitive.typography.fontSize.2xl}",
          "--font-size-2xl",
        ),
        "3xl": resolveToken(
          "{primitive.typography.fontSize.3xl}",
          "--font-size-3xl",
        ),
      },
      lineHeight: {
        tight: resolveToken(
          "{primitive.typography.lineHeight.tight}",
          "--line-height-tight",
        ),
        normal: resolveToken(
          "{primitive.typography.lineHeight.normal}",
          "--line-height-normal",
        ),
        relaxed: resolveToken(
          "{primitive.typography.lineHeight.relaxed}",
          "--line-height-relaxed",
        ),
      },
    };
  }

  /**
   * Get theme colors
   */
  getThemeColors() {
    return {
      primary: resolveToken("{semantic.theme.primary}", "--primary"),
      secondary: resolveToken("{semantic.theme.secondary}", "--secondary"),
      accent: resolveToken("{semantic.theme.accent}", "--accent"),
      background: resolveToken(
        "{semantic.theme.background.primary}",
        "--background",
      ),
      foreground: resolveToken(
        "{semantic.theme.foreground.primary}",
        "--foreground",
      ),
      muted: resolveToken("{semantic.theme.muted}", "--muted"),
      border: resolveToken("{semantic.theme.border.primary}", "--border"),
    };
  }
}

/**
 * Utility functions for common component patterns
 */
export const componentUtils = {
  /**
   * Create CSS-in-JS styles using tokens
   */
  createStyles: (styles: Record<string, string | Record<string, string>>) => {
    const resolvedStyles: Record<string, any> = {};

    Object.entries(styles).forEach(([key, value]) => {
      if (typeof value === "string") {
        resolvedStyles[key] = value.replace(/\{[^}]+\}/g, (match) =>
          resolveToken(match),
        );
      } else if (typeof value === "object") {
        resolvedStyles[key] = componentUtils.createStyles(
          value as Record<string, string>,
        );
      }
    });

    return resolvedStyles;
  },

  /**
   * Generate Tailwind classes using tokens
   */
  createTailwindClasses: (tokenClasses: Record<string, TokenPath>) => {
    const classes: Record<string, string> = {};

    Object.entries(tokenClasses).forEach(([key, tokenPath]) => {
      // For Tailwind, we'll use CSS variables since Tailwind doesn't support dynamic values
      const resolved = resolveToken(tokenPath);
      if (resolved.startsWith("var(")) {
        classes[key] = resolved.replace("var(", "").replace(")", "");
      } else {
        classes[key] = resolved;
      }
    });

    return classes;
  },
};

export default ThemeTokenResolver.getInstance();
