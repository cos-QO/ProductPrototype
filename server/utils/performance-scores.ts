/**
 * Server-side performance score calculations
 * Mirrors the client-side calculations for consistency
 */

const MAX_SCORE = 88888;

export interface PerformanceScore {
  score: number;
  originalValue: string;
}

export interface PerformanceScores {
  rebuyRate: PerformanceScore;
  avgSession: PerformanceScore;
  bounceRate: PerformanceScore;
  pagesPerSession: PerformanceScore;
}

/**
 * Calculate performance scores for analytics data
 * Used when storing analytics in the database
 */
export function calculatePerformanceScores(analytics: {
  rebuyRate: number;
  avgSessionDuration: number; // in seconds
  bounceRate: number;
  pageViews: number;
  trafficSessions: number;
}): PerformanceScores {
  // Rebuy Rate Score (higher is better)
  const rebuyRateScore = Math.max(
    1,
    Math.round(analytics.rebuyRate * MAX_SCORE),
  );

  // Average Session Score (normalized to 30 minutes optimal)
  const avgSessionMinutes = analytics.avgSessionDuration / 60;
  const normalizedSessionMinutes = Math.min(avgSessionMinutes, 30);
  const avgSessionScore = Math.max(
    1,
    Math.round((normalizedSessionMinutes / 30) * MAX_SCORE),
  );

  // Bounce Rate Score (inverted - lower bounce rate = higher score)
  const bounceRateScore = Math.max(
    1,
    Math.round((1 - analytics.bounceRate) * MAX_SCORE),
  );

  // Pages per Session Score (normalized to 10 pages optimal)
  const pagesPerSession =
    analytics.trafficSessions > 0
      ? analytics.pageViews / analytics.trafficSessions
      : 0;
  const normalizedPagesPerSession = Math.min(pagesPerSession, 10);
  const pagesPerSessionScore = Math.max(
    1,
    Math.round((normalizedPagesPerSession / 10) * MAX_SCORE),
  );

  return {
    rebuyRate: {
      score: rebuyRateScore,
      originalValue: `${(analytics.rebuyRate * 100).toFixed(1)}%`,
    },
    avgSession: {
      score: avgSessionScore,
      originalValue: `${Math.round(avgSessionMinutes)}m`,
    },
    bounceRate: {
      score: bounceRateScore,
      originalValue: `${(analytics.bounceRate * 100).toFixed(1)}% bounce`,
    },
    pagesPerSession: {
      score: pagesPerSessionScore,
      originalValue: `${pagesPerSession.toFixed(1)} pages`,
    },
  };
}

/**
 * Generate SQL fragment for updating performance scores
 * Used in UPDATE queries
 */
export function generatePerformanceScoresSQL(): string {
  return `
    jsonb_build_object(
      'rebuyRate', jsonb_build_object(
        'score', GREATEST(1, ROUND(rebuy_rate * ${MAX_SCORE})),
        'originalValue', CONCAT(ROUND(rebuy_rate * 100, 1), '%')
      ),
      'avgSession', jsonb_build_object(
        'score', GREATEST(1, ROUND(LEAST(avg_session_duration / 60.0, 30) / 30 * ${MAX_SCORE})),
        'originalValue', CONCAT(ROUND(avg_session_duration / 60), 'm')
      ),
      'bounceRate', jsonb_build_object(
        'score', GREATEST(1, ROUND((1 - bounce_rate) * ${MAX_SCORE})),
        'originalValue', CONCAT(ROUND(bounce_rate * 100, 1), '% bounce')
      ),
      'pagesPerSession', jsonb_build_object(
        'score', CASE 
          WHEN traffic_sessions > 0 THEN GREATEST(1, ROUND(LEAST(page_views::numeric / traffic_sessions, 10) / 10 * ${MAX_SCORE}))
          ELSE 1
        END,
        'originalValue', CASE
          WHEN traffic_sessions > 0 THEN CONCAT(ROUND(page_views::numeric / traffic_sessions, 1), ' pages')
          ELSE '0.0 pages'
        END
      )
    )
  `;
}

/**
 * Get score quality level based on percentage
 */
export function getScoreQuality(score: number): string {
  const percentage = (score / MAX_SCORE) * 100;

  if (percentage >= 90) return "exceptional";
  if (percentage >= 75) return "excellent";
  if (percentage >= 60) return "good";
  if (percentage >= 40) return "average";
  if (percentage >= 25) return "below-average";
  if (percentage >= 10) return "poor";
  return "critical";
}

/**
 * Format score with thousand separators
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}
