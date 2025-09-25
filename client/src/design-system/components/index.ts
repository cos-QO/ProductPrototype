/**
 * Design System Component Index
 *
 * This file provides backward-compatible exports for all UI components
 * while enabling the new modular token system. Components can be imported
 * in the same way as before, but now use the enhanced modular architecture.
 */

// Enhanced components with modular token support
export {
  Badge,
  EnhancedBadge,
  enhancedBadgeVariants,
  type BadgeProps,
} from "./enhanced-badge";

export {
  Button,
  EnhancedButton,
  enhancedButtonVariants,
  type ButtonProps,
} from "./enhanced-button";

// Component factory and token utilities
export {
  ThemeTokenResolver,
  resolveToken,
  createTokenVariants,
  componentUtils,
} from "./component-factory";

// Export token resolver for debugging
export { tokenResolver } from "../utils/token-resolver";

// Re-export original components for comparison and testing
export { Badge as OriginalBadge } from "../../components/ui/badge";
export { Button as OriginalButton } from "../../components/ui/button";

/**
 * Migration utilities for gradual component updates
 */
export const migrationUtils = {
  /**
   * Check if enhanced components are available
   */
  isEnhancedMode: () => true,

  /**
   * Get component version info
   */
  getComponentVersion: () => ({
    enhanced: true,
    tokenSystemVersion: "1.0.0",
    backwardCompatible: true,
  }),

  /**
   * Validate token resolution
   */
  validateTokens: () => {
    try {
      const resolver = ThemeTokenResolver.getInstance();
      const statusColors = resolver.getStatusColors();
      const spacing = resolver.getSpacing();
      const typography = resolver.getTypography();

      return {
        valid: true,
        tokensLoaded: {
          statusColors: Object.keys(statusColors).length > 0,
          spacing: Object.keys(spacing).length > 0,
          typography: Object.keys(typography.fontSize).length > 0,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
