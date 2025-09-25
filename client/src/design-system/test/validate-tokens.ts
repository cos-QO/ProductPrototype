import { tokenResolver } from "../utils/token-resolver";
import { ThemeTokenResolver } from "../components/component-factory";

/**
 * Validate that our token system is working correctly
 */
export function validateTokenSystem() {
  const results = {
    tokenResolver: false,
    themeResolver: false,
    statusColorsLoaded: false,
    spacingLoaded: false,
    typographyLoaded: false,
    tokenResolution: false,
    errors: [] as string[],
  };

  try {
    // Test basic token resolver
    const basicToken = tokenResolver.resolve(
      "{semantic.status.success.background}",
    );
    if (basicToken && basicToken !== "semantic.status.success.background") {
      results.tokenResolver = true;
    } else {
      results.errors.push("Basic token resolver failed");
    }
  } catch (error) {
    results.errors.push(
      `Token resolver error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }

  try {
    // Test theme resolver
    const themeResolver = ThemeTokenResolver.getInstance();
    results.themeResolver = true;

    // Test status colors
    const statusColors = themeResolver.getStatusColors();
    if (statusColors && Object.keys(statusColors).length > 0) {
      results.statusColorsLoaded = true;
    } else {
      results.errors.push("Status colors not loaded");
    }

    // Test spacing
    const spacing = themeResolver.getSpacing();
    if (spacing && Object.keys(spacing).length > 0) {
      results.spacingLoaded = true;
    } else {
      results.errors.push("Spacing tokens not loaded");
    }

    // Test typography
    const typography = themeResolver.getTypography();
    if (
      typography &&
      typography.fontSize &&
      Object.keys(typography.fontSize).length > 0
    ) {
      results.typographyLoaded = true;
    } else {
      results.errors.push("Typography tokens not loaded");
    }

    // Test token resolution consistency
    const successBg1 = themeResolver.getStatusColors().success.background;
    const successBg2 = tokenResolver.resolve(
      "{semantic.status.success.background}",
    );
    if (successBg1 === successBg2) {
      results.tokenResolution = true;
    } else {
      results.errors.push(
        `Token resolution inconsistent: ${successBg1} !== ${successBg2}`,
      );
    }
  } catch (error) {
    results.errors.push(
      `Theme resolver error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  }

  return results;
}

// Console testing function
export function logTokenValidation() {
  const validation = validateTokenSystem();

  console.log("=== Token System Validation ===");
  console.log("Token Resolver:", validation.tokenResolver ? "✅" : "❌");
  console.log("Theme Resolver:", validation.themeResolver ? "✅" : "❌");
  console.log("Status Colors:", validation.statusColorsLoaded ? "✅" : "❌");
  console.log("Spacing:", validation.spacingLoaded ? "✅" : "❌");
  console.log("Typography:", validation.typographyLoaded ? "✅" : "❌");
  console.log("Token Resolution:", validation.tokenResolution ? "✅" : "❌");

  if (validation.errors.length > 0) {
    console.log("Errors:");
    validation.errors.forEach((error) => console.log("  ❌", error));
  }

  const allGood =
    validation.tokenResolver &&
    validation.themeResolver &&
    validation.statusColorsLoaded &&
    validation.spacingLoaded &&
    validation.typographyLoaded &&
    validation.tokenResolution;

  // Debug token loading
  try {
    console.log("\n=== Token Debug Info ===");
    tokenResolver.debug();

    const availablePaths = tokenResolver.getAvailablePaths();
    console.log("\n=== Available Token Paths ===");
    availablePaths.slice(0, 10).forEach((path) => console.log(`  ${path}`));
    if (availablePaths.length > 10) {
      console.log(`  ... and ${availablePaths.length - 10} more paths`);
    }

    // Test specific token paths
    console.log("\n=== Token Resolution Tests ===");
    const testPaths = [
      "{semantic.status.success.background}",
      "{primitive.colors.green.500}",
      "{primitive.spacing.4}",
      "{primitive.typography.fontSize.base}",
    ];

    testPaths.forEach((path) => {
      const resolved = tokenResolver.resolve(path);
      console.log(`  ${path} -> ${resolved}`);
    });
  } catch (error) {
    console.log("Debug error:", error);
  }

  console.log(
    "\nOverall Status:",
    allGood ? "✅ All systems working" : "❌ Issues detected",
  );

  return validation;
}
