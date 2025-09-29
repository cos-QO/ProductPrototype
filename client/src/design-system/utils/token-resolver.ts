import primitiveColors from "../tokens/primitive/colors.json";
import primitiveSpacing from "../tokens/primitive/spacing.json";
import primitiveTypography from "../tokens/primitive/typography.json";
import primitiveElevation from "../tokens/primitive/elevation.json";
import primitiveMotion from "../tokens/primitive/motion.json";
import primitiveLayout from "../tokens/primitive/layout.json";
import primitiveAccessibility from "../tokens/primitive/accessibility.json";
import semanticStatus from "../tokens/semantic/status.json";
import semanticTheme from "../tokens/semantic/theme.json";
import semanticElevation from "../tokens/semantic/elevation.json";
import semanticAccessibility from "../tokens/semantic/accessibility.json";

type TokenValue = string | number | object | string[];
type TokenMap = Record<string, TokenValue>;

class TokenResolver {
  private tokens: TokenMap = {};
  private cache: Map<string, string> = new Map();

  constructor() {
    // Merge all token files with proper nesting
    this.tokens = this.mergeTokens([
      primitiveColors,
      primitiveSpacing,
      primitiveTypography,
      primitiveElevation,
      primitiveMotion,
      primitiveLayout,
      primitiveAccessibility,
      semanticStatus,
      semanticTheme,
      semanticElevation,
      semanticAccessibility,
    ]);
  }

  /**
   * Recursively merge token objects maintaining nested structure
   */
  private mergeTokens(tokenFiles: any[]): TokenMap {
    const merged: TokenMap = {};

    tokenFiles.forEach((tokenFile) => {
      this.deepMerge(merged, tokenFile);
    });

    return merged;
  }

  /**
   * Deep merge utility for nested objects
   */
  private deepMerge(target: any, source: any): any {
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (!target[key] || typeof target[key] !== "object") {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  }

  /**
   * Resolve a token path to its final value
   * Handles references like {primitive.colors.blue.500}
   */
  resolve(tokenPath: string): string {
    // Check cache first for performance
    if (this.cache.has(tokenPath)) {
      return this.cache.get(tokenPath)!;
    }

    let resolved: string;

    // Handle token references
    if (tokenPath.startsWith("{") && tokenPath.endsWith("}")) {
      const path = tokenPath.slice(1, -1);
      resolved = this.getNestedValue(path);
    } else {
      resolved = tokenPath;
    }

    // Cache the result
    this.cache.set(tokenPath, resolved);
    return resolved;
  }

  /**
   * Get a nested value from the token object
   */
  private getNestedValue(path: string): string {
    const keys = path.split(".");
    let current: any = this.tokens;

    // Navigate through the nested structure
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        console.warn(`Token not found: ${path} (stopped at key: ${key})`);
        console.warn(
          `Available keys at current level:`,
          Object.keys(current || {}),
        );
        return path; // Return original path if not found
      }
    }

    // If we find another token reference, resolve it recursively
    if (typeof current === "string" && current.includes("{")) {
      return this.resolve(current);
    }

    // Convert to string if it's a number or other primitive
    return String(current);
  }

  /**
   * Get all tokens for a specific category (flattened)
   */
  getTokenCategory(category: string): Record<string, string> {
    const resolved: Record<string, string> = {};

    try {
      const categoryTokens = this.getNestedValue(category);

      if (typeof categoryTokens === "object" && categoryTokens !== null) {
        this.flattenTokens(categoryTokens, resolved);
      }
    } catch (error) {
      console.warn(`Category not found: ${category}`);
    }

    return resolved;
  }

  /**
   * Flatten nested token objects into CSS-ready format
   */
  private flattenTokens(
    obj: any,
    result: Record<string, string>,
    prefix = "",
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const tokenPath = prefix ? `${prefix}-${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        this.flattenTokens(value, result, tokenPath);
      } else if (typeof value === "string") {
        result[tokenPath] = this.resolve(value);
      }
    }
  }

  /**
   * Generate CSS custom properties for a token category
   */
  generateCSSProperties(category: string): string {
    const tokens = this.getTokenCategory(category);
    let css = "";

    for (const [name, value] of Object.entries(tokens)) {
      css += `  --${name}: ${value};\n`;
    }

    return css;
  }

  /**
   * Get color palette for data visualization
   */
  getColorPalette(
    type: "categorical" | "sequential" | "diverging" = "categorical",
  ): string[] {
    const palettes = {
      categorical: [
        this.resolve("{primitive.colors.blue.500}"),
        this.resolve("{primitive.colors.green.500}"),
        this.resolve("{primitive.colors.yellow.500}"),
        this.resolve("{primitive.colors.red.500}"),
        this.resolve("{primitive.colors.purple.500}"),
      ],
      sequential: [
        this.resolve("{primitive.colors.blue.200}"),
        this.resolve("{primitive.colors.blue.400}"),
        this.resolve("{primitive.colors.blue.500}"),
        this.resolve("{primitive.colors.blue.700}"),
        this.resolve("{primitive.colors.blue.900}"),
      ],
      diverging: [
        this.resolve("{primitive.colors.red.500}"),
        this.resolve("{primitive.colors.neutral.200}"),
        this.resolve("{primitive.colors.blue.500}"),
      ],
    };

    return palettes[type];
  }

  /**
   * Clear the resolution cache (useful for theme switching)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Debug method to inspect loaded tokens
   */
  debug(): void {
    console.log("=== Token Resolver Debug ===");
    console.log("Loaded tokens structure:");
    console.log(JSON.stringify(this.tokens, null, 2));
    console.log("Cache size:", this.cache.size);
    console.log("Cache contents:", Array.from(this.cache.entries()));
  }

  /**
   * Get all available token paths
   */
  getAvailablePaths(obj: any = this.tokens, prefix = ""): string[] {
    const paths: string[] = [];

    Object.keys(obj).forEach((key) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === "object" &&
        !Array.isArray(obj[key]) &&
        obj[key] !== null
      ) {
        paths.push(...this.getAvailablePaths(obj[key], currentPath));
      } else {
        paths.push(currentPath);
      }
    });

    return paths;
  }
}

// Export singleton instance
export const tokenResolver = new TokenResolver();
export default tokenResolver;
