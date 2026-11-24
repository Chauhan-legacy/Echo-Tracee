/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * BeaconGuard In-App Inference Engine (T3)
 * Combines Neyman-Pearson CA-CFAR (Math) with calibrated Logistic Regression (ML).
 */
import weightsData from './weights/beaconGuard.json';

export interface BeaconGuardInput {
  peakSnrDb: number;
  spectralFlatness: number;
  envelopePeriodicity: number;
  spectralKurtosis: number;
  persistenceRatio: number;
}

export interface BeaconGuardPrediction {
  probability: number;
  isBeacon: boolean;
  modelConfidence: number;
  finalEnsembleConfidence: number;
  conformalSet95: string[];
  conformalInterval95: [number, number];
  ensembleAgreement: string;
}

function sigmoid(z: number): number {
  return 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))));
}

export function predictBeaconGuard(input: BeaconGuardInput, mathDetected: boolean): BeaconGuardPrediction {
  const x = [
    input.peakSnrDb,
    input.spectralFlatness,
    input.envelopePeriodicity,
    input.spectralKurtosis,
    input.persistenceRatio,
  ];

  let rawLogit = weightsData.bias;
  for (let i = 0; i < weightsData.weights.length; i++) {
    rawLogit += weightsData.weights[i] * x[i];
  }

  // Platt scaling probability calibration
  const calibrated = sigmoid(weightsData.plattA * rawLogit + weightsData.plattB);
  const isBeacon = calibrated >= 0.5;

  // Split Conformal Prediction (95% statistical coverage guarantee)
  const q95 = (weightsData as any).conformalQuantile95 || 0.086;
  const inSet1 = (1.0 - calibrated) <= q95;
  const inSet0 = calibrated <= q95;
  const conformalSet: string[] = [];
  if (inSet1) conformalSet.push('Ultrasonic Beacon');
  if (inSet0) conformalSet.push('Benign High-Frequency Audio');

  const lowerBound = Number(Math.max(0.0, calibrated - q95).toFixed(3));
  const upperBound = Number(Math.min(1.0, calibrated + q95).toFixed(3));

  // Ensemble rule:
  // Math + ML agreement raises confidence; disagreement lowers confidence with explanation.
  let finalConfidence = Math.max(calibrated, 1 - calibrated);
  let agreement = 'Math-Only';

  if (mathDetected && isBeacon) {
    agreement = 'Math (CA-CFAR) + BeaconGuard ML agree: Confirmed Ultrasonic Beacon';
    finalConfidence = Math.min(0.99, finalConfidence + 0.08);
  } else if (!mathDetected && !isBeacon) {
    agreement = 'Math + BeaconGuard ML both reject: Confirmed Benign';
    finalConfidence = Math.min(0.99, finalConfidence + 0.05);
  } else if (mathDetected && !isBeacon) {
    agreement = 'Disagreement: CFAR flagged spectral peak, but BeaconGuard ML judged benign HF noise (low periodicity/kurtosis). Confidence lowered.';
    finalConfidence = Math.max(0.40, finalConfidence - 0.25);
  } else if (!mathDetected && isBeacon) {
    agreement = 'Disagreement: CFAR missed peak under threshold, but BeaconGuard ML classified as beacon. Confidence lowered.';
    finalConfidence = Math.max(0.40, finalConfidence - 0.25);
  }

  return {
    probability: Number(calibrated.toFixed(4)),
    isBeacon,
    modelConfidence: Number(Math.max(calibrated, 1 - calibrated).toFixed(3)),
    finalEnsembleConfidence: Number(finalConfidence.toFixed(3)),
    conformalSet95: conformalSet.length > 0 ? conformalSet : ['Uncertain'],
    conformalInterval95: [lowerBound, upperBound],
    ensembleAgreement: agreement,
  };
}
