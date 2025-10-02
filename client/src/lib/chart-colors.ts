/**
 * Chart Colors Utilities
 * Centralized color management for analytics charts using design system tokens
 */

/**
 * Traffic source color mapping using direct HSL values
 * Maps traffic source types to design system colors
 * Using direct values since Chart.js cannot resolve CSS variables
 */
export const trafficColors = {
  ads: "hsl(0, 84%, 60%)",
  email: "hsl(217, 91%, 60%)",
  sms: "hsl(159, 100%, 36%)",
  store: "hsl(262, 83%, 58%)",
  organic: "hsl(142, 76%, 36%)",
  social: "hsl(188, 94%, 43%)",
  direct: "hsl(45, 93%, 47%)",
  referral: "hsl(335, 78%, 42%)",
} as const;

/**
 * Gauge chart segment colors for performance visualization
 * 5-tier color system: Red -> Orange -> Yellow -> Light Green -> Green
 * Using direct HSL values since Chart.js cannot resolve CSS variables
 */
export const gaugeColors = {
  segment1: "hsl(0, 84%, 60%)", // Red zone (0-20%)
  segment2: "hsl(24, 95%, 53%)", // Orange zone (20-40%)
  segment3: "hsl(45, 93%, 47%)", // Yellow zone (40-60%)
  segment4: "hsl(82, 84%, 47%)", // Light green zone (60-80%)
  segment5: "hsl(142, 76%, 36%)", // Green zone (80-100%)
  background: "hsl(210, 40%, 98%)", // Light gray background
} as const;

/**
 * Performance metric colors for different chart types
 * Each metric has its own consistent color across all visualizations
 * Using direct HSL values since Chart.js cannot resolve CSS variables
 */
export const metricColors = {
  buyRate: "hsl(262, 83%, 58%)",
  revenueMargin: "hsl(159, 100%, 36%)",
  volume: "hsl(45, 93%, 47%)",
  rebuyRate: "hsl(217, 91%, 60%)",
  conversion: "hsl(335, 78%, 42%)",
  satisfaction: "hsl(188, 94%, 43%)",
} as const;

/**
 * Get traffic source colors as an array for Chart.js
 * Maintains consistent ordering for pie/doughnut charts
 */
export function getTrafficColorsArray(): string[] {
  return [
    trafficColors.ads,
    trafficColors.email,
    trafficColors.sms,
    trafficColors.store,
    trafficColors.organic,
    trafficColors.social,
    trafficColors.direct,
    trafficColors.referral,
  ];
}

/**
 * Get gauge segment colors as an array
 * Used for creating gradient gauge visualizations
 */
export function getGaugeColorsArray(): string[] {
  return [
    gaugeColors.segment1,
    gaugeColors.segment2,
    gaugeColors.segment3,
    gaugeColors.segment4,
    gaugeColors.segment5,
  ];
}

/**
 * Calculate gauge color based on percentage value
 * Returns appropriate color from 5-tier system
 */
export function getGaugeColorForPercentage(percentage: number): string {
  const normalizedPercent = Math.max(0, Math.min(100, percentage));

  if (normalizedPercent >= 80) return gaugeColors.segment5; // Green
  if (normalizedPercent >= 60) return gaugeColors.segment4; // Light green
  if (normalizedPercent >= 40) return gaugeColors.segment3; // Yellow
  if (normalizedPercent >= 20) return gaugeColors.segment2; // Orange
  return gaugeColors.segment1; // Red
}

/**
 * Generate gradient colors for gauge chart segments
 * Creates smooth color transitions for better visual appeal
 */
export function generateGaugeGradient(
  value: number,
  max: number,
  segments: number = 5,
): Array<{ value: number; color: string }> {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const segmentValue = max / segments;
  const result: Array<{ value: number; color: string }> = [];
  const colors = getGaugeColorsArray();

  for (let i = 0; i < segments; i++) {
    const segmentStart = i * segmentValue;
    const segmentEnd = (i + 1) * segmentValue;

    if (segmentStart < normalizedValue) {
      const segmentFillValue = Math.min(
        segmentValue,
        normalizedValue - segmentStart,
      );
      result.push({
        value: segmentFillValue,
        color: colors[i],
      });
    } else {
      result.push({
        value: 0,
        color: gaugeColors.background,
      });
    }
  }

  // Add remaining empty space if needed
  const filledTotal = result.reduce((sum, segment) => sum + segment.value, 0);
  if (filledTotal < max) {
    result.push({
      value: max - filledTotal,
      color: gaugeColors.background,
    });
  }

  return result;
}

/**
 * Get metric-specific color for a given metric type
 * Used for consistent coloring across different chart components
 */
export function getMetricColor(metricType: string): string {
  switch (metricType.toLowerCase()) {
    case "buyrate":
    case "buy-rate":
      return metricColors.buyRate;
    case "revenue":
    case "margin":
    case "revenue-margin":
      return metricColors.revenueMargin;
    case "volume":
    case "units":
      return metricColors.volume;
    case "rebuy":
    case "rebuy-rate":
      return metricColors.rebuyRate;
    case "conversion":
    case "conversion-rate":
      return metricColors.conversion;
    case "satisfaction":
    case "customer-satisfaction":
      return metricColors.satisfaction;
    case "bounce-rate":
    case "bounce":
      return "hsl(24, 95%, 53%)"; // Orange - lower bounce is better
    case "engagement":
    case "pages-per-session":
    case "pages/session":
      return "hsl(173, 80%, 40%)"; // Teal - higher engagement is better
    default:
      return "hsl(215.4, 16.3%, 46.9%)"; // --muted-foreground equivalent
  }
}

/**
 * Chart.js compatible color configuration
 * Pre-configured color settings for different chart types
 * Using computed colors for Chart.js compatibility
 */
export const chartDefaults = {
  borderWidth: 2,
  borderColor: "hsl(220, 13%, 91%)", // --border equivalent
  backgroundColor: {
    traffic: getTrafficColorsArray(),
    gauge: getGaugeColorsArray(),
  },
  tooltip: {
    backgroundColor: "hsl(0, 0%, 100%)", // --popover equivalent
    titleColor: "hsl(222.2, 84%, 4.9%)", // --popover-foreground equivalent
    bodyColor: "hsl(222.2, 84%, 4.9%)", // --popover-foreground equivalent
    borderColor: "hsl(220, 13%, 91%)", // --border equivalent
    borderWidth: 1,
  },
} as const;
