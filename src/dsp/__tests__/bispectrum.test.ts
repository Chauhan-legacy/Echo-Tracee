/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { computeBicoherence } from '../bispectrum';

describe('Higher-Order Spectral Analysis (HOSA) Bispectrum', () => {
  const fs = 1000; // 1 kHz sample rate
  const durationSec = 1.5;
  const N = Math.floor(fs * durationSec);

  it('detects quadratic phase coupling in physically coupled harmonic signals (50Hz + 50Hz -> 100Hz)', () => {
    // Generate signal with phase-locked harmonics: y(t) = cos(w1*t + phi) + 0.8*cos(2*w1*t + 2*phi)
    // Quadratic phase relationship: theta3 = 2 * theta1
    const signal = new Float32Array(N);
    const f1 = 50.0;
    const basePhi = 0.75;

    for (let i = 0; i < N; i++) {
      const t = i / fs;
      // Phase-coupled transformer magnetostriction distortion
      signal[i] =
        Math.cos(2 * Math.PI * f1 * t + basePhi) +
        0.7 * Math.cos(2 * Math.PI * (2 * f1) * t + 2 * basePhi) +
        0.05 * (Math.random() - 0.5); // noise floor
    }

    const res = computeBicoherence(signal, fs, { maxFreqHz: 200, segmentSize: 256, gridResolution: 16 });

    expect(res.peakBicoherence).toBeGreaterThan(0.40);
    expect(res.hasQuadraticPhaseCoupling).toBe(true);
    expect(res.isAuthenticPhysicalHum).toBe(true);
    expect(res.bicoherenceMatrix.length).toBeGreaterThan(0);
  });

  it('reports zero phase coupling on independent white noise', () => {
    const noise = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      noise[i] = (Math.random() - 0.5) * 2.0;
    }

    const res = computeBicoherence(noise, fs, { maxFreqHz: 200, segmentSize: 256, gridResolution: 16 });
    expect(res.isAuthenticPhysicalHum).toBe(false);
  });
});
