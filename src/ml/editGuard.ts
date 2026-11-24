/**
 * EditGuard In-App Inference Engine (T3)
 * Evaluates audio change-points and ENF discontinuities using trained ML weights.
 */
import weightsData from './weights/editGuard.json';

export interface EditGuardInput {
  enfStepDeltaHz: number;
  cusumStatistic: number;
  spectralFluxJump: number;
  symKlDivergence: number;
  bhattacharyyaDist: number;
}

export interface EditGuardPrediction {
  probability: number;
  isSplice: boolean;
  modelConfidence: number;
  ensembleAgreement: string;
}

function sigmoid(z: number): number {
  return 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))));
}

export function predictEditGuard(input: EditGuardInput, mathDetected: boolean): EditGuardPrediction {
  const x = [
    input.enfStepDeltaHz,
    input.cusumStatistic,
    input.spectralFluxJump,
    input.symKlDivergence,
    input.bhattacharyyaDist,
  ];

  let rawLogit = weightsData.bias;
  for (let i = 0; i < weightsData.weights.length; i++) {
    rawLogit += weightsData.weights[i] * x[i];
  }

  const calibrated = sigmoid(weightsData.plattA * rawLogit + weightsData.plattB);
  const isSplice = calibrated >= 0.5;

  let agreement = 'Math-Only';
  if (mathDetected && isSplice) {
    agreement = 'Math (CUSUM) + EditGuard ML agree';
  } else if (!mathDetected && !isSplice) {
    agreement = 'Math + EditGuard ML both confirm smooth signal';
  } else if (mathDetected && !isSplice) {
    agreement = 'Disagreement: CUSUM step flagged, EditGuard ML judged natural variation';
  } else if (!mathDetected && isSplice) {
    agreement = 'Disagreement: CUSUM smooth, EditGuard ML flagged discontinuity';
  }

  return {
    probability: Number(calibrated.toFixed(4)),
    isSplice,
    modelConfidence: Number(Math.max(calibrated, 1 - calibrated).toFixed(3)),
    ensembleAgreement: agreement,
  };
}
