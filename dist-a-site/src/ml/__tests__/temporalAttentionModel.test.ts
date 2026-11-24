/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { runTemporalAttentionInference, FeatureVectorFrame } from '../temporalAttentionModel';

describe('Custom 1D TCN + Multi-Head Self-Attention Model', () => {
  it('executes client-side forward pass in < 25ms and produces calibrated probabilities', () => {
    // Generate synthetic 16-frame sequence with an ultrasonic tracking beacon threat
    const sequence: FeatureVectorFrame[] = Array.from({ length: 16 }, (_, i) => ({
      enfEnergyNorm: 0.15,
      ultrasonicBeaconPowerNorm: i >= 4 && i <= 10 ? 0.92 : 0.05, // Burst beacon at frames 4-10
      highFreqKurtosisNorm: 0.85,
      spectralCentroidNorm: 0.72,
      spectralFluxNorm: 0.44,
      reverbDecayNorm: 0.25,
      frameLuminanceVarNorm: 0.1,
      opticalModulationNorm: 0.05,
    }));

    const result = runTemporalAttentionInference(sequence);

    expect(result.inferenceTimeMs).toBeLessThan(25);
    expect(result.probabilities.beaconProb).toBeGreaterThan(0.5);
    expect(result.overallThreatScore).toBeGreaterThan(40);
    expect(result.attentionWeights.length).toBe(4); // 4 heads
    expect(result.attentionWeights[0].length).toBe(16); // 16 queries
    expect(result.attentionWeights[0][0].length).toBe(16); // 16 keys

    // Check softmax property: attention weights sum to ~1.0
    const head0Row0Sum = result.attentionWeights[0][0].reduce((a, b) => a + b, 0);
    expect(head0Row0Sum).toBeCloseTo(1.0, 2);

    expect(result.temporalAnomalyCurve.length).toBe(16);
    // Peak anomaly should occur in the beacon burst region (frames 4-10)
    const peakAnomalyFrame = result.temporalAnomalyCurve.indexOf(Math.max(...result.temporalAnomalyCurve));
    expect(peakAnomalyFrame).toBeGreaterThanOrEqual(3);
    expect(peakAnomalyFrame).toBeLessThanOrEqual(11);
  });

  it('correctly handles clean silence / low-energy inputs with near-zero leak score', () => {
    const cleanSeq: FeatureVectorFrame[] = Array.from({ length: 8 }, () => ({
      enfEnergyNorm: 0.0,
      ultrasonicBeaconPowerNorm: 0.0,
      highFreqKurtosisNorm: 0.0,
      spectralCentroidNorm: 0.1,
      spectralFluxNorm: 0.0,
      reverbDecayNorm: 0.1,
      frameLuminanceVarNorm: 0.0,
      opticalModulationNorm: 0.0,
    }));

    const result = runTemporalAttentionInference(cleanSeq);
    expect(result.overallThreatScore).toBeLessThan(35);
  });
});
