import { Finding, LeakScoreResult } from '../types';
import { calculateTransparentLeakScore } from './stats/fdr';

/**
 * Calculates privacy leak score (0 to 100) using transparent statistical weights and 95% confidence intervals (M7).
 */
export function calculateLeakScore(findings: Finding[]): LeakScoreResult {
  return calculateTransparentLeakScore(findings);
}
