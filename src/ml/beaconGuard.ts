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

  let agreement = 'Math-Only';
  if (mathDetected && isBeacon) {
    agreement = 'Math (CFAR) + BeaconGuard ML agree';
  } else if (!mathDetected && !isBeacon) {
    agreement = 'Math + BeaconGuard ML both reject';
  } else if (mathDetected && !isBeacon) {
    agreement = 'Disagreement: CFAR flagged, BeaconGuard ML classified as benign HF noise';
  } else if (!mathDetected && isBeacon) {
    agreement = 'Disagreement: CFAR missed, BeaconGuard ML classified as beacon';
  }

  return {
    probability: Number(calibrated.toFixed(4)),
    isBeacon,
    modelConfidence: Number(Math.max(calibrated, 1 - calibrated).toFixed(3)),
    ensembleAgreement: agreement,
  };
}
