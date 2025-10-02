/**
 * Performance Score System
 * Converts performance metrics to a score scale of 1 to 88,888
 *
 * This scoring system provides a more intuitive representation of performance
 * where higher scores are always better, regardless of the metric type.
 */

const MAX_SCORE = 88888;

/**
 * Calculate performance score for percentage-based metrics
 * @param value - The raw percentage value (0-1)
 * @param inverted - If true, lower values produce higher scores (e.g., bounce rate)
 * @returns Score between 1 and 88,888
 */
export function calculatePercentageScore(
  value: number,
  inverted = false,
): number {
  const normalizedValue = Math.max(0, Math.min(1, value)); // Ensure 0-1 range
  const percentage = inverted ? 1 - normalizedValue : normalizedValue;
  const score = Math.round(percentage * MAX_SCORE);
  return Math.max(1, score); // Ensure minimum score of 1
}

/**
 * Calculate performance score for duration-based metrics
 * @param durationMinutes - Duration in minutes
 * @param optimalMinutes - Optimal duration for maximum score (default: 30 minutes)
 * @returns Score between 1 and 88,888
 */
export function calculateDurationScore(
  durationMinutes: number,
  optimalMinutes = 30,
): number {
  const normalizedDuration = Math.min(durationMinutes, optimalMinutes);
  const percentage = normalizedDuration / optimalMinutes;
  const score = Math.round(percentage * MAX_SCORE);
  return Math.max(1, score);
}

/**
 * Calculate performance score for ratio-based metrics
 * @param value - The ratio value (e.g., pages per session)
 * @param optimal - Optimal value for maximum score
 * @returns Score between 1 and 88,888
 */
export function calculateRatioScore(value: number, optimal = 10): number {
  const normalizedValue = Math.min(value, optimal);
  const percentage = normalizedValue / optimal;
  const score = Math.round(percentage * MAX_SCORE);
  return Math.max(1, score);
}

/**
 * Format score with thousand separators
 * @param score - The score to format
 * @returns Formatted score string
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * Get score range descriptor
 * @param score - The score to evaluate
 * @returns Descriptor for the score range
 */
export function getScoreRange(score: number): string {
  const percentage = (score / MAX_SCORE) * 100;

  if (percentage >= 90) return "Exceptional";
  if (percentage >= 75) return "Excellent";
  if (percentage >= 60) return "Good";
  if (percentage >= 40) return "Average";
  if (percentage >= 25) return "Below Average";
  if (percentage >= 10) return "Poor";
  return "Critical";
}

/**
 * Performance metrics configuration
 */
export const PERFORMANCE_METRICS = {
  rebuyRate: {
    name: "Rebuy Rate",
    calculateScore: (value: number) => calculatePercentageScore(value),
    format: (value: number) => `${(value * 100).toFixed(1)}%`,
  },
  avgSession: {
    name: "Avg Session",
    calculateScore: (minutes: number) => calculateDurationScore(minutes),
    format: (minutes: number) => `${Math.round(minutes)}m`,
  },
  bounceRate: {
    name: "Bounce Rate",
    calculateScore: (value: number) => calculatePercentageScore(value, true), // Inverted: lower is better
    format: (value: number) => `${(value * 100).toFixed(1)}% bounce`,
  },
  pagesPerSession: {
    name: "Pages/Session",
    calculateScore: (value: number) => calculateRatioScore(value, 10),
    format: (value: number) => `${value.toFixed(1)} pages`,
  },
};

/**
 * Calculate all performance scores for a given dataset
 */
export function calculatePerformanceScores(data: {
  rebuyRate: number;
  avgSessionDuration: number; // in seconds
  bounceRate: number;
  pageViews: number;
  trafficSessions: number;
}) {
  const avgSessionMinutes = data.avgSessionDuration / 60;
  const pagesPerSession =
    data.trafficSessions > 0 ? data.pageViews / data.trafficSessions : 0;

  return {
    rebuyRate: {
      score: PERFORMANCE_METRICS.rebuyRate.calculateScore(data.rebuyRate),
      originalValue: PERFORMANCE_METRICS.rebuyRate.format(data.rebuyRate),
    },
    avgSession: {
      score: PERFORMANCE_METRICS.avgSession.calculateScore(avgSessionMinutes),
      originalValue: PERFORMANCE_METRICS.avgSession.format(avgSessionMinutes),
    },
    bounceRate: {
      score: PERFORMANCE_METRICS.bounceRate.calculateScore(data.bounceRate),
      originalValue: PERFORMANCE_METRICS.bounceRate.format(data.bounceRate),
    },
    pagesPerSession: {
      score:
        PERFORMANCE_METRICS.pagesPerSession.calculateScore(pagesPerSession),
      originalValue:
        PERFORMANCE_METRICS.pagesPerSession.format(pagesPerSession),
    },
  };
}
