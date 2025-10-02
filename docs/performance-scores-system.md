# Performance Scores System Documentation

## Overview
The Performance Scores System converts traditional percentage-based metrics into an intuitive score scale from 1 to 88,888. This system provides a more engaging and meaningful representation of performance metrics where higher scores are always better, regardless of the metric type.

## Score Scale
- **Minimum Score**: 1
- **Maximum Score**: 88,888
- **Why 88,888?**: The number 8 is considered lucky in many cultures, and the repeating pattern creates a memorable maximum score.

## Metrics and Calculations

### 1. Rebuy Rate Score
- **Original Metric**: Percentage (0-100%)
- **Calculation**: `rebuyRate * 88,888`
- **Example**: 25% rebuy rate = 22,222 score
- **Interpretation**: Higher rebuy rates result in higher scores

### 2. Average Session Score
- **Original Metric**: Duration in minutes
- **Optimal Duration**: 30 minutes
- **Calculation**: `min(duration, 30) / 30 * 88,888`
- **Example**: 15 minutes = 44,444 score
- **Interpretation**: Longer sessions (up to 30 minutes) result in higher scores

### 3. Bounce Rate Score
- **Original Metric**: Percentage (0-100%)
- **Calculation**: `(1 - bounceRate) * 88,888` (inverted)
- **Example**: 40% bounce rate = 53,333 score
- **Interpretation**: Lower bounce rates result in higher scores

### 4. Pages per Session Score
- **Original Metric**: Ratio (pages/session)
- **Optimal Value**: 10 pages per session
- **Calculation**: `min(pagesPerSession, 10) / 10 * 88,888`
- **Example**: 5 pages/session = 44,444 score
- **Interpretation**: More pages per session (up to 10) result in higher scores

## Score Quality Ranges

| Score Range | Percentage | Quality Level | Description |
|-------------|------------|---------------|-------------|
| 80,000 - 88,888 | 90-100% | Exceptional | Outstanding performance |
| 66,666 - 79,999 | 75-89% | Excellent | Very strong performance |
| 53,333 - 66,665 | 60-74% | Good | Above average performance |
| 35,555 - 53,332 | 40-59% | Average | Typical performance |
| 22,222 - 35,554 | 25-39% | Below Average | Needs improvement |
| 8,889 - 22,221 | 10-24% | Poor | Significant improvement needed |
| 1 - 8,888 | 0-9% | Critical | Immediate attention required |

## Implementation

### Frontend Components
- `/client/src/lib/performance-scores.ts` - Utility functions for score calculations
- `/client/src/components/analytics/DimensionsTab.tsx` - Display implementation

### Backend Components
- `/server/utils/performance-scores.ts` - Server-side calculation utilities
- `/migrations/0011_performance_scores.sql` - Database schema updates

### Key Functions

```typescript
// Calculate a percentage-based score
calculatePercentageScore(value: number, inverted?: boolean): number

// Calculate a duration-based score
calculateDurationScore(durationMinutes: number, optimalMinutes?: number): number

// Calculate a ratio-based score
calculateRatioScore(value: number, optimal?: number): number

// Format score with thousand separators
formatScore(score: number): string

// Get quality level descriptor
getScoreRange(score: number): string
```

## Display Format

Each metric displays:
1. **Score** - Large, prominent number with thousand separators
2. **Metric Name** - Clear label for the metric
3. **Context** - Small text showing "Score: 1-88,888 (original value)"

Example:
```
22,222
Rebuy Rate
Score: 1-88,888 (25.0%)
```

## Database Storage

Performance scores are stored in the `product_analytics` table as a JSONB column:

```json
{
  "rebuyRate": {
    "score": 22222,
    "originalValue": "25.0%"
  },
  "avgSession": {
    "score": 44444,
    "originalValue": "15m"
  },
  "bounceRate": {
    "score": 53333,
    "originalValue": "40.0% bounce"
  },
  "pagesPerSession": {
    "score": 44444,
    "originalValue": "5.0 pages"
  }
}
```

## Benefits

1. **Intuitive Understanding**: Users immediately understand that higher scores are better
2. **Consistent Direction**: All metrics point in the same direction (higher = better)
3. **Gamification**: Score-based system is more engaging than percentages
4. **Clear Goals**: Maximum score of 88,888 provides a clear target
5. **Cultural Significance**: Number 8 is considered lucky in many cultures

## Future Enhancements

1. **Historical Tracking**: Track score changes over time
2. **Score Badges**: Award badges for reaching certain score thresholds
3. **Composite Score**: Calculate an overall performance score
4. **Industry Benchmarks**: Compare scores against industry averages
5. **Score Predictions**: Use ML to predict future score trends

## Migration Notes

When migrating from percentage display to score display:
1. Run the SQL migration to add the `performance_scores` column
2. Update the frontend to use the new utility functions
3. Existing data will be automatically converted to scores
4. Original percentage values are preserved for reference