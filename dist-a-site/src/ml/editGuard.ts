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
  finalEnsembleConfidence: number;
  conformalSet95: string[];
  conformalInterval95: [number, number];
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

  // Split Conformal Prediction (95% statistical coverage guarantee)
  const q95 = (weightsData as any).conformalQuantile95 || 0.1065;
  const inSet1 = (1.0 - calibrated) <= q95;
  const inSet0 = calibrated <= q95;
  const conformalSet: string[] = [];
  if (inSet1) conformalSet.push('Splice / Edit Discontinuity');
  if (inSet0) conformalSet.push('Smooth Continuous Audio');

  const lowerBound = Number(Math.max(0.0, calibrated - q95).toFixed(3));
  const upperBound = Number(Math.min(1.0, calibrated + q95).toFixed(3));

  // Ensemble rule: math + model agreement raises confidence; disagreement lowers confidence
  let finalConfidence = Math.max(calibrated, 1 - calibrated);
  let agreement = 'Math-Only';

  if (mathDetected && isSplice) {
    agreement = 'Math (CUSUM) + EditGuard ML agree: Confirmed Splice';
    finalConfidence = Math.min(0.99, finalConfidence + 0.08);
  } else if (!mathDetected && !isSplice) {
    agreement = 'Math + EditGuard ML both confirm smooth signal';
    finalConfidence = Math.min(0.99, finalConfidence + 0.05);
  } else if (mathDetected && !isSplice) {
    agreement = 'Disagreement: CUSUM step flagged, EditGuard ML judged natural variation. Confidence lowered.';
    finalConfidence = Math.max(0.40, finalConfidence - 0.25);
  } else if (!mathDetected && isSplice) {
    agreement = 'Disagreement: CUSUM smooth, EditGuard ML flagged discontinuity. Confidence lowered.';
    finalConfidence = Math.max(0.40, finalConfidence - 0.25);
  }

  return {
    probability: Number(calibrated.toFixed(4)),
    isSplice,
    modelConfidence: Number(Math.max(calibrated, 1 - calibrated).toFixed(3)),
    finalEnsembleConfidence: Number(finalConfidence.toFixed(3)),
    conformalSet95: conformalSet.length > 0 ? conformalSet : ['Uncertain'],
    conformalInterval95: [lowerBound, upperBound],
    ensembleAgreement: agreement,
  };
}
