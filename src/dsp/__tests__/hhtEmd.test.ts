/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { performHHTAnalysis, computeAnalyticSignal } from '../hhtEmd';

describe('Hilbert-Huang Transform (HHT) with Empirical Mode Decomposition', () => {
  it('computes discrete analytic signal and instantaneous amplitude accurately', () => {
    const N = 256;
    const signal = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      signal[i] = 2.0 * Math.cos((2 * Math.PI * 8 * i) / N);
    }

    const analytic = computeAnalyticSignal(signal);
    expect(analytic.real.length).toBe(N);
    expect(analytic.imag.length).toBe(N);

    // Instantaneous amplitude for cosine of amplitude 2.0 should be ~2.0
    const midAmp = analytic.instantaneousAmplitude[Math.floor(N / 2)];
    expect(midAmp).toBeCloseTo(2.0, 1);
  });

  it('detects step splice discontinuities via Hilbert energy jumps', () => {
    const fs = 1000;
    const duration = 2.0;
    const N = Math.floor(fs * duration);
    const signal = new Float32Array(N);

    // Segment 1 (0 to 1.0s): Low amplitude hum
    for (let i = 0; i < fs; i++) {
      signal[i] = 0.1 * Math.sin((2 * Math.PI * 50 * i) / fs);
    }
    // Segment 2 (1.0 to 2.0s): Sharp splice jump into high amplitude room audio
    for (let i = fs; i < N; i++) {
      signal[i] = 1.2 * Math.sin((2 * Math.PI * 180 * i) / fs);
    }

    const res = performHHTAnalysis(signal, fs, 2);

    expect(res.numIMFs).toBeGreaterThan(0);
    expect(res.instantaneousHilbertEnergy.length).toBe(64);
    expect(res.detectedSplices.length).toBeGreaterThan(0);

    // Splice detected near 1.0s
    const spliceNear1s = res.detectedSplices.find((s) => Math.abs(s.timeSec - 1.0) < 0.25);
    expect(spliceNear1s).toBeDefined();
  });
});
