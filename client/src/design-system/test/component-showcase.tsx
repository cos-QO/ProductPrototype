import React from "react";
import {
  Badge,
  Button,
  EnhancedBadge,
  EnhancedButton,
  OriginalBadge,
  OriginalButton,
  migrationUtils,
  ThemeTokenResolver,
  tokenResolver,
} from "../components";
import { validateTokenSystem, logTokenValidation } from "./validate-tokens";

/**
 * Component Showcase for testing modular token system
 * This component verifies that:
 * 1. Enhanced components work correctly
 * 2. Backward compatibility is maintained
 * 3. Token resolution works properly
 * 4. UI remains consistent
 */
export function ComponentShowcase() {
  const tokenValidation = migrationUtils.validateTokens();
  const componentVersion = migrationUtils.getComponentVersion();

  // Run validation and log to console for debugging
  React.useEffect(() => {
    logTokenValidation();
  }, []);

  // Additional validation using our specific validation function
  const [systemValidation, setSystemValidation] = React.useState(
    validateTokenSystem(),
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Design System Component Showcase</h1>
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-1">Component System</h4>
              <p>
                Enhanced Mode:{" "}
                {migrationUtils.isEnhancedMode() ? "✅ Active" : "❌ Inactive"}
              </p>
              <p>Version: {componentVersion.tokenSystemVersion}</p>
              <p>
                Backward Compatible:{" "}
                {componentVersion.backwardCompatible ? "✅ Yes" : "❌ No"}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Token System</h4>
              <p>
                Migration Utils Validation:{" "}
                {tokenValidation.valid ? "✅ Valid" : "❌ Invalid"}
              </p>
              <p>
                Token Resolver:{" "}
                {systemValidation.tokenResolver ? "✅ Working" : "❌ Failed"}
              </p>
              <p>
                Theme Resolver:{" "}
                {systemValidation.themeResolver ? "✅ Working" : "❌ Failed"}
              </p>
              <p>
                Status Colors:{" "}
                {systemValidation.statusColorsLoaded
                  ? "✅ Loaded"
                  : "❌ Failed"}
              </p>
              <p>
                Spacing:{" "}
                {systemValidation.spacingLoaded ? "✅ Loaded" : "❌ Failed"}
              </p>
              <p>
                Typography:{" "}
                {systemValidation.typographyLoaded ? "✅ Loaded" : "❌ Failed"}
              </p>
            </div>
          </div>
          {!tokenValidation.valid && (
            <p className="text-destructive mt-2">
              Migration Utils Error: {tokenValidation.error}
            </p>
          )}
          {systemValidation.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-destructive font-medium">
                System Validation Errors:
              </p>
              {systemValidation.errors.map((error, i) => (
                <p key={i} className="text-destructive text-sm ml-2">
                  • {error}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badge Component Testing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Badge Components</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Enhanced Badges (New System)</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="processing">Processing</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>

          <h4 className="font-medium">Enhanced Variants with CSS-in-JS</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedBadge variant="success" useTokenStyles={true}>
              Success (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="warning" useTokenStyles={true}>
              Warning (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="info" useTokenStyles={true}>
              Info (CSS-in-JS)
            </EnhancedBadge>
            <EnhancedBadge variant="processing" useTokenStyles={true}>
              Processing (CSS-in-JS)
            </EnhancedBadge>
          </div>

          <h4 className="font-medium">Light Variants</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedBadge variant="success-light" useTokenStyles={true}>
              Success Light
            </EnhancedBadge>
            <EnhancedBadge variant="warning-light" useTokenStyles={true}>
              Warning Light
            </EnhancedBadge>
            <EnhancedBadge variant="info-light" useTokenStyles={true}>
              Info Light
            </EnhancedBadge>
            <EnhancedBadge variant="processing-light" useTokenStyles={true}>
              Processing Light
            </EnhancedBadge>
          </div>

          <h4 className="font-medium">Sizes</h4>
          <div className="flex flex-wrap items-center gap-2">
            <EnhancedBadge variant="success" size="sm">
              Small
            </EnhancedBadge>
            <EnhancedBadge variant="success" size="default">
              Default
            </EnhancedBadge>
            <EnhancedBadge variant="success" size="lg">
              Large
            </EnhancedBadge>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            Original Badges (Legacy System)
          </h3>
          <div className="flex flex-wrap gap-2">
            <OriginalBadge variant="default">Default</OriginalBadge>
            <OriginalBadge variant="secondary">Secondary</OriginalBadge>
            <OriginalBadge variant="success">Success</OriginalBadge>
            <OriginalBadge variant="warning">Warning</OriginalBadge>
            <OriginalBadge variant="info">Info</OriginalBadge>
            <OriginalBadge variant="processing">Processing</OriginalBadge>
            <OriginalBadge variant="destructive">Destructive</OriginalBadge>
          </div>
        </div>
      </div>

      {/* Button Component Testing */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Button Components</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Enhanced Buttons (New System)</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="info">Info</Button>
            <Button variant="processing">Processing</Button>
            <Button variant="destructive">Destructive</Button>
          </div>

          <h4 className="font-medium">Gradient Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient">Gradient Primary</Button>
            <Button variant="gradient-accent">Gradient Accent</Button>
          </div>

          <h4 className="font-medium">Outline Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="success-outline">Success Outline</Button>
            <Button variant="warning-outline">Warning Outline</Button>
            <Button variant="info-outline">Info Outline</Button>
            <Button variant="processing-outline">Processing Outline</Button>
          </div>

          <h4 className="font-medium">Ghost Variants</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="success-ghost">Success Ghost</Button>
            <Button variant="warning-ghost">Warning Ghost</Button>
            <Button variant="info-ghost">Info Ghost</Button>
            <Button variant="processing-ghost">Processing Ghost</Button>
          </div>

          <h4 className="font-medium">Sizes</h4>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm">
              Small
            </Button>
            <Button variant="default" size="default">
              Default
            </Button>
            <Button variant="default" size="lg">
              Large
            </Button>
            <Button variant="default" size="xl">
              Extra Large
            </Button>
          </div>

          <h4 className="font-medium">Special States</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedButton variant="success" loading>
              Loading
            </EnhancedButton>
            <EnhancedButton variant="info" startIcon="🔍">
              With Start Icon
            </EnhancedButton>
            <EnhancedButton variant="processing" endIcon="→">
              With End Icon
            </EnhancedButton>
            <EnhancedButton variant="warning" disabled>
              Disabled
            </EnhancedButton>
          </div>

          <h4 className="font-medium">CSS-in-JS Styles</h4>
          <div className="flex flex-wrap gap-2">
            <EnhancedButton variant="success" useTokenStyles={true}>
              Success (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="warning" useTokenStyles={true}>
              Warning (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="info" useTokenStyles={true}>
              Info (CSS-in-JS)
            </EnhancedButton>
            <EnhancedButton variant="processing" useTokenStyles={true}>
              Processing (CSS-in-JS)
            </EnhancedButton>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            Original Buttons (Legacy System)
          </h3>
          <div className="flex flex-wrap gap-2">
            <OriginalButton variant="default">Default</OriginalButton>
            <OriginalButton variant="secondary">Secondary</OriginalButton>
            <OriginalButton variant="success">Success</OriginalButton>
            <OriginalButton variant="warning">Warning</OriginalButton>
            <OriginalButton variant="info">Info</OriginalButton>
            <OriginalButton variant="processing">Processing</OriginalButton>
            <OriginalButton variant="destructive">Destructive</OriginalButton>
          </div>
        </div>
      </div>

      {/* Token System Debug Info */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Token System Debug</h2>
        <TokenDebugPanel />
      </div>
    </div>
  );
}

/**
 * Debug panel showing token resolution
 */
function TokenDebugPanel() {
  const resolver = React.useMemo(() => ThemeTokenResolver.getInstance(), []);

  const statusColors = React.useMemo(
    () => resolver.getStatusColors(),
    [resolver],
  );
  const spacing = React.useMemo(() => resolver.getSpacing(), [resolver]);
  const typography = React.useMemo(() => resolver.getTypography(), [resolver]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Status Colors</h3>
        <div className="space-y-1 text-sm font-mono">
          {Object.entries(statusColors).map(([status, colors]) => (
            <details key={status} className="cursor-pointer">
              <summary className="font-medium">{status}</summary>
              <div className="ml-4 mt-1 space-y-1">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-16">{key}:</span>
                    <span className="text-xs">{value}</span>
                    {key.includes("background") && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: value }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Spacing</h3>
        <div className="space-y-1 text-sm font-mono">
          {Object.entries(spacing).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-8">{key}:</span>
              <span className="text-xs">{value}</span>
              <div className="bg-primary h-4 border" style={{ width: value }} />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Typography</h3>
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-sm">Font Sizes</h4>
            <div className="space-y-1 text-sm font-mono">
              {Object.entries(typography.fontSize).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-8">{key}:</span>
                  <span className="text-xs">{value}</span>
                  <span style={{ fontSize: value }}>Sample</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm">Line Heights</h4>
            <div className="space-y-1 text-sm font-mono">
              {Object.entries(typography.lineHeight).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-16">{key}:</span>
                  <span className="text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
