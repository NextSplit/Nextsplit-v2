/**
 * Shared wellness utilities — used by StatsClient (WellnessTrend)
 * and WellnessCheckIn component.
 */

/**
 * Compute a readiness score from raw wellness inputs.
 * sleep: 1–5 (5=great), soreness: 1–5 (1=very sore, 5=fresh), mood: 1–5 (5=great)
 * Returns: weighted score 0–10 (approximate)
 * Weights: sleep 40%, mood 35%, freshness (inverted soreness) 25%
 */
export function readinessScore(
  sleep: number,
  soreness: number,
  mood: number
): number {
  return Math.round((sleep * 0.4 + mood * 0.35 + (6 - soreness) * 0.25) * 2)
}
