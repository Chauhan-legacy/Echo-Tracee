import { Finding, LeakScoreResult, ScoreContribution } from '../types';

/**
 * Transparent, deterministic Leak Score calculation.
 * Formula: Weighted sum of severity x confidence capped between 0 and 100.
 * Call it "explainable scoring", never "trained AI".
 */
export function calculateLeakScore(findings: Finding[]): LeakScoreResult {
  const WEIGHTS = {
    critical: 38,
    warn: 16,
    info: 4,
  };

  const contributions: ScoreContribution[] = [];
  let rawScore = 0;

  for (const f of findings) {
    const baseWeight = WEIGHTS[f.severity];
    const points = Math.round(baseWeight * f.confidence);
    rawScore += points;

    contributions.push({
      findingId: f.id,
      title: f.title,
      category: f.category,
      severity: f.severity,
      confidence: f.confidence,
      weight: baseWeight,
      points,
      explanation: `${f.severity.toUpperCase()} impact: ${baseWeight} base × ${(f.confidence * 100).toFixed(0)}% confidence = +${points} pts`,
    });
  }

  const totalScore = Math.min(100, Math.max(0, rawScore));

  let rating: LeakScoreResult['rating'];
  let color: string;

  if (totalScore === 0) {
    rating = 'Clean';
    color = '#00F0FF'; // cyan
  } else if (totalScore <= 20) {
    rating = 'Low Risk';
    color = '#00F0FF';
  } else if (totalScore <= 50) {
    rating = 'Moderate Leak';
    color = '#FFB800'; // amber
  } else if (totalScore <= 75) {
    rating = 'Severe Leak';
    color = '#FF7700'; // orange
  } else {
    rating = 'Critical Exposure';
    color = '#FF3366'; // red
  }

  return {
    totalScore,
    rating,
    color,
    contributions,
  };
}
