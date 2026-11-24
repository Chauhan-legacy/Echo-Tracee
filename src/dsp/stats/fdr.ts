/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Benjamini-Hochberg False Discovery Rate (FDR) & Statistical Calibration (M7)
 */
import { Finding, LeakScoreResult, ScoreContribution } from '../../types';

/**
 * Benjamini-Hochberg procedure controlling FDR at level Q (default Q = 0.05).
 * Converts raw p-values into adjusted q-values.
 */
export function benjaminiHochbergCorrection(
  pValues: number[],
  fdrQ = 0.05
): { qValues: number[]; isSignificant: boolean[] } {
  const m = pValues.length;
  if (m === 0) return { qValues: [], isSignificant: [] };

  // Track original indices
  const indexed = pValues.map((p, idx) => ({ p, idx }));
  indexed.sort((a, b) => a.p - b.p);

  const qValues = new Float64Array(m);
  let minQ = 1.0;

  // Step-up adjustment from largest to smallest
  for (let i = m - 1; i >= 0; i--) {
    const rank = i + 1;
    const rawP = indexed[i].p;
    const adjusted = (rawP * m) / rank;
    minQ = Math.min(minQ, Math.min(1.0, adjusted));
    qValues[indexed[i].idx] = minQ;
  }

  const isSignificant = Array.from(qValues).map(q => q <= fdrQ);
  return { qValues: Array.from(qValues), isSignificant };
}

/**
 * Transparent Leak Score Weights (Sum to 100 max ceiling)
 */
export const LEAK_SCORE_WEIGHTS: Record<string, { weight: number; basePoints: number }> = {
  ultrasonic: { weight: 0.35, basePoints: 35 },
  metadata: { weight: 0.30, basePoints: 30 },
  tamper: { weight: 0.25, basePoints: 25 },
  visual_text: { weight: 0.25, basePoints: 25 },
  visual_face: { weight: 0.20, basePoints: 20 },
  hum: { weight: 0.15, basePoints: 15 },
  room: { weight: 0.10, basePoints: 10 },
  speech: { weight: 0.10, basePoints: 10 },
  doppler: { weight: 0.05, basePoints: 5 },
};

/**
 * Transparent Leak Score Calculation with 95% Confidence Bounds (M7)
 */
export function calculateTransparentLeakScore(findings: Finding[]): LeakScoreResult {
  const contributions: ScoreContribution[] = [];
  let rawScore = 0.0;
  let varianceSum = 0.0;

  // Deduplicate points per category to prevent runaway artificial inflation
  const categoryMax: Record<string, number> = {};

  for (const f of findings) {
    let basePts = 10;
    let weight = 0.1;

    if (f.category === 'ultrasonic') {
      basePts = 35; weight = 0.35;
    } else if (f.category === 'metadata') {
      basePts = 30; weight = 0.30;
    } else if (f.category === 'tamper') {
      basePts = 25; weight = 0.25;
    } else if (f.category === 'visual') {
      basePts = f.title.toLowerCase().includes('credential') || f.title.toLowerCase().includes('text') ? 25 : 20;
      weight = 0.20;
    } else if (f.category === 'hum') {
      basePts = 15; weight = 0.15;
    } else if (f.category === 'room') {
      basePts = 10; weight = 0.10;
    } else if (f.category === 'speech') {
      basePts = 10; weight = 0.10;
    }

    const conf = Math.max(0.1, Math.min(1.0, f.confidence));
    const points = Math.round(basePts * conf);

    // Track variance for statistical CI bounds
    const pVar = Math.pow(basePts * 0.15, 2);
    varianceSum += pVar;

    contributions.push({
      findingId: f.id,
      title: f.title,
      category: f.category,
      severity: f.severity,
      confidence: conf,
      weight,
      points,
      explanation: `${f.title}: Base ${basePts} pts × ${Math.round(conf * 100)}% confidence = ${points} pts`,
    });

    categoryMax[f.category] = Math.max(categoryMax[f.category] || 0, points);
  }

  // Combined score is capped smoothly at 100
  let totalPoints = 0;
  for (const pts of Object.values(categoryMax)) {
    totalPoints += pts;
  }
  const totalScore = Math.min(100, Math.max(0, totalPoints));

  // 95% Confidence Interval
  const stdError = Math.sqrt(varianceSum);
  const scoreLow = Math.max(0, Math.round(totalScore - 1.96 * Math.min(4, stdError)));
  const scoreHigh = Math.min(100, Math.round(totalScore + 1.96 * Math.min(4, stdError)));

  let rating: LeakScoreResult['rating'] = 'Clean';
  let color = '#174D35';

  if (totalScore >= 75) {
    rating = 'Critical Exposure';
    color = '#A32A1F';
  } else if (totalScore >= 50) {
    rating = 'Severe Leak';
    color = '#A32A1F';
  } else if (totalScore >= 25) {
    rating = 'Moderate Leak';
    color = '#7A4E00';
  } else if (totalScore >= 10) {
    rating = 'Low Risk';
    color = '#7A4E00';
  }

  return {
    totalScore,
    scoreLow,
    scoreHigh,
    rating,
    color,
    contributions,
    weightsExplanation: {
      'Ultrasonic Tracker': 35,
      'GPS Location': 30,
      'Audio Splice / Tamper': 25,
      'Visual Credentials': 25,
      'Visual Faces': 20,
      'Power Grid Hum': 15,
      'Room Acoustics': 10,
      'Voice Formants': 10,
    },
  };
}
