import tokenResolver from "./token-resolver";

/**
 * Generate CSS custom properties that maintain compatibility with existing system
 */
export function generateCompatibleCSS(): string {
  let css = ":root {\n";

  // Map our existing CSS variables to modular tokens
  const tokenMappings = [
    // Existing theme tokens (maintain backwards compatibility)
    ["--background", "hsl(222, 84%, 4.9%)"],
    ["--foreground", "hsl(210, 40%, 98%)"],
    ["--card", "hsl(222, 84%, 4.9%)"],
    ["--card-foreground", "hsl(210, 40%, 98%)"],
    ["--popover", "hsl(222, 84%, 4.9%)"],
    ["--popover-foreground", "hsl(210, 40%, 98%)"],
    ["--primary", "hsl(262, 83%, 58%)"],
    ["--primary-foreground", "hsl(210, 40%, 98%)"],
    ["--secondary", "hsl(217, 32%, 17%)"],
    ["--secondary-foreground", "hsl(210, 40%, 98%)"],
    ["--muted", "hsl(217, 32%, 17%)"],
    ["--muted-foreground", "hsl(215, 20%, 65%)"],
    ["--accent", "hsl(45, 93%, 47%)"],
    ["--accent-foreground", "hsl(222, 84%, 4.9%)"],
    ["--destructive", "hsl(0, 84%, 60%)"],
    ["--destructive-foreground", "hsl(210, 40%, 98%)"],

    // New semantic status tokens (our modular system)
    [
      "--success",
      tokenResolver.resolve("{semantic.status.success.background}"),
    ],
    [
      "--success-foreground",
      tokenResolver.resolve("{semantic.status.success.foreground}"),
    ],
    [
      "--warning",
      tokenResolver.resolve("{semantic.status.warning.background}"),
    ],
    [
      "--warning-foreground",
      tokenResolver.resolve("{semantic.status.warning.foreground}"),
    ],
    ["--info", tokenResolver.resolve("{semantic.status.info.background}")],
    [
      "--info-foreground",
      tokenResolver.resolve("{semantic.status.info.foreground}"),
    ],
    [
      "--processing",
      tokenResolver.resolve("{semantic.status.processing.background}"),
    ],
    [
      "--processing-foreground",
      tokenResolver.resolve("{semantic.status.processing.foreground}"),
    ],

    // Borders and inputs
    ["--border", "hsl(217, 32%, 17%)"],
    ["--input", "hsl(217, 32%, 17%)"],
    ["--ring", "hsl(262, 83%, 58%)"],

    // Chart colors (maintain existing)
    ["--chart-1", "hsl(262, 83%, 58%)"],
    ["--chart-2", "hsl(159, 100%, 36%)"],
    ["--chart-3", "hsl(45, 93%, 47%)"],
    ["--chart-4", "hsl(147, 78%, 42%)"],
    ["--chart-5", "hsl(341, 75%, 51%)"],

    // Sidebar tokens
    ["--sidebar", "hsl(222, 84%, 4.9%)"],
    ["--sidebar-foreground", "hsl(210, 40%, 98%)"],
    ["--sidebar-primary", "hsl(262, 83%, 58%)"],
    ["--sidebar-primary-foreground", "hsl(210, 40%, 98%)"],
    ["--sidebar-accent", "hsl(217, 32%, 17%)"],
    ["--sidebar-accent-foreground", "hsl(262, 83%, 58%)"],
    ["--sidebar-border", "hsl(217, 32%, 17%)"],
    ["--sidebar-ring", "hsl(262, 83%, 58%)"],

    // Typography
    ["--font-sans", '"Inter", sans-serif'],
    ["--font-serif", "Georgia, serif"],
    ["--font-mono", "Menlo, monospace"],

    // Modular typography tokens (new)
    [
      "--font-size-xs",
      tokenResolver.resolve("{primitive.typography.fontSize.xs}"),
    ],
    [
      "--font-size-sm",
      tokenResolver.resolve("{primitive.typography.fontSize.sm}"),
    ],
    [
      "--font-size-base",
      tokenResolver.resolve("{primitive.typography.fontSize.base}"),
    ],
    [
      "--font-size-lg",
      tokenResolver.resolve("{primitive.typography.fontSize.lg}"),
    ],
    [
      "--font-size-xl",
      tokenResolver.resolve("{primitive.typography.fontSize.xl}"),
    ],
    [
      "--font-size-2xl",
      tokenResolver.resolve("{primitive.typography.fontSize.2xl}"),
    ],
    [
      "--font-size-3xl",
      tokenResolver.resolve("{primitive.typography.fontSize.3xl}"),
    ],

    // Line heights
    [
      "--line-height-tight",
      tokenResolver.resolve("{primitive.typography.lineHeight.tight}"),
    ],
    [
      "--line-height-normal",
      tokenResolver.resolve("{primitive.typography.lineHeight.normal}"),
    ],
    [
      "--line-height-relaxed",
      tokenResolver.resolve("{primitive.typography.lineHeight.relaxed}"),
    ],

    // Modular spacing tokens (new)
    ["--space-1", tokenResolver.resolve("{primitive.spacing.1}")],
    ["--space-2", tokenResolver.resolve("{primitive.spacing.2}")],
    ["--space-3", tokenResolver.resolve("{primitive.spacing.3}")],
    ["--space-4", tokenResolver.resolve("{primitive.spacing.4}")],
    ["--space-5", tokenResolver.resolve("{primitive.spacing.5}")],
    ["--space-6", tokenResolver.resolve("{primitive.spacing.6}")],
    ["--space-8", tokenResolver.resolve("{primitive.spacing.8}")],
    ["--space-10", tokenResolver.resolve("{primitive.spacing.10}")],
    ["--space-12", tokenResolver.resolve("{primitive.spacing.12}")],

    // Radius and shadows (maintain existing)
    ["--radius", "0.75rem"],
  ];

  // Add all token mappings to CSS
  tokenMappings.forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });

  css += "}\n\n";

  // Dark theme (maintain existing structure)
  css += ".dark {\n";
  const darkTokenMappings = [
    ["--background", "hsl(0, 0%, 0%)"],
    ["--foreground", "hsl(200, 6.6667%, 91.1765%)"],
    ["--card", "hsl(228, 9.8039%, 10%)"],
    ["--card-foreground", "hsl(0, 0%, 85.0980%)"],
    ["--popover", "hsl(0, 0%, 0%)"],
    ["--popover-foreground", "hsl(200, 6.6667%, 91.1765%)"],
    ["--primary", "hsl(262, 83%, 58%)"],
    ["--primary-foreground", "hsl(0, 0%, 100%)"],
    ["--secondary", "hsl(195, 15.3846%, 94.9020%)"],
    ["--secondary-foreground", "hsl(210, 25%, 7.8431%)"],
    ["--muted", "hsl(0, 0%, 9.4118%)"],
    ["--muted-foreground", "hsl(210, 3.3898%, 46.2745%)"],
    ["--accent", "hsl(45, 93%, 47%)"],
    ["--accent-foreground", "hsl(222, 84%, 4.9%)"],
    ["--destructive", "hsl(0, 84%, 60%)"],
    ["--destructive-foreground", "hsl(0, 0%, 100%)"],

    // New semantic status tokens for dark theme
    [
      "--success",
      tokenResolver.resolve("{semantic.status.success.background}"),
    ],
    ["--success-foreground", "hsl(0, 0%, 100%)"],
    [
      "--warning",
      tokenResolver.resolve("{semantic.status.warning.background}"),
    ],
    ["--warning-foreground", "hsl(0, 0%, 0%)"],
    ["--info", tokenResolver.resolve("{semantic.status.info.background}")],
    ["--info-foreground", "hsl(0, 0%, 100%)"],
    [
      "--processing",
      tokenResolver.resolve("{semantic.status.processing.background}"),
    ],
    ["--processing-foreground", "hsl(0, 0%, 100%)"],

    ["--border", "hsl(210, 5.2632%, 14.9020%)"],
    ["--input", "hsl(207, 27.6596%, 18.4314%)"],
    ["--ring", "hsl(262, 83%, 58%)"],
  ];

  darkTokenMappings.forEach(([variable, value]) => {
    css += `  ${variable}: ${value};\n`;
  });

  css += "}\n";

  return css;
}

/**
 * Update the existing CSS file with new modular tokens
 */
export function updateCSSFile(cssFilePath: string): string {
  const newCSS = generateCompatibleCSS();

  // Keep existing utility classes
  const additionalCSS = `
@layer base {
  * {
    border-color: var(--border);
  }

  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: var(--background);
    color: var(--foreground);
  }
}

.gradient-primary {
  background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(252, 83%, 68%) 100%);
}

.gradient-accent {
  background: linear-gradient(135deg, hsl(45, 93%, 47%) 0%, hsl(35, 93%, 57%) 100%);
}

.text-gradient {
  background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(45, 93%, 47%) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
`;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${newCSS}${additionalCSS}`;
}

// Utility functions for runtime token access
export const tokens = {
  get: (path: string) => tokenResolver.resolve(path),
  status: {
    success: () =>
      tokenResolver.resolve("{semantic.status.success.background}"),
    warning: () =>
      tokenResolver.resolve("{semantic.status.warning.background}"),
    error: () => tokenResolver.resolve("{semantic.status.error.background}"),
    info: () => tokenResolver.resolve("{semantic.status.info.background}"),
    processing: () =>
      tokenResolver.resolve("{semantic.status.processing.background}"),
  },
  colors: {
    primary: () => "hsl(262, 83%, 58%)",
    secondary: () => "hsl(217, 32%, 17%)",
    accent: () => "hsl(45, 93%, 47%)",
  },
};
