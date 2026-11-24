/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { analyzeHumM2, zeroPhaseBandpass, estimateFrequencyEsprit, detectEnfEdits } from '../hum/enf';

describe('M2 Power Grid Hum & ENF Forensics', () => {
  it('accurately tracks 50.00 Hz, 49.97 Hz, and 60.01 Hz mains hum', () => {
    const fs = 48000;
    const duration = 2.0;
    const testCases = [50.00, 49.97, 60.01];

    for (const targetFreq of testCases) {
      const N = Math.floor(fs * duration);
      const signal = new Float32Array(N);

      // Add target tone + 2nd harmonic + low noise
      for (let i = 0; i < N; i++) {
        const t = i / fs;
        signal[i] =
          0.05 * Math.sin(2.0 * Math.PI * targetFreq * t) +
          0.02 * Math.sin(2.0 * Math.PI * (targetFreq * 2) * t) +
          0.001 * (Math.random() - 0.5);
      }

      const res = analyzeHumM2(signal, fs);
      expect(res.detected).toBe(true);

      const expectedFamily = targetFreq > 55 ? '60Hz' : '50Hz';
      expect(res.gridFamily).toBe(expectedFamily);
      expect(Math.abs(res.baseFrequencyHz - targetFreq)).toBeLessThan(0.04);

      // Cramér-Rao 95% interval must contain target frequency
      expect(res.cramerRao95Ci[0]).toBeLessThanOrEqual(targetFreq + 0.05);
      expect(res.cramerRao95Ci[1]).toBeGreaterThanOrEqual(targetFreq - 0.05);
    }
  });

  it('validates harmonic consistency test on 50/100/150 Hz signals', () => {
    const fs = 48000;
    const N = fs * 2;
    const signal = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const t = i / fs;
      signal[i] =
        0.04 * Math.sin(2.0 * Math.PI * 50.02 * t) +
        0.02 * Math.sin(2.0 * Math.PI * 100.04 * t) +
        0.01 * Math.sin(2.0 * Math.PI * 150.06 * t);
    }

    const res = analyzeHumM2(signal, fs);
    expect(res.detected).toBe(true);
    expect(res.harmonicConsistency).toBe(true);
    expect(res.harmonics.length).toBeGreaterThanOrEqual(2);
  });

  it('detects ENF frequency step edits near 6.0s using Page CUSUM', () => {
    const enfTrack: number[] = [];
    const stepIntervalSec = 0.5;

    // First 6.0 seconds (12 samples): stable at 49.98 Hz
    for (let i = 0; i < 12; i++) {
      enfTrack.push(49.98 + 0.002 * (Math.random() - 0.5));
    }
    // Step at 6.0s to 50.10 Hz (delta +0.12 Hz)
    for (let i = 12; i < 24; i++) {
      enfTrack.push(50.10 + 0.002 * (Math.random() - 0.5));
    }

    const edits = detectEnfEdits(enfTrack, stepIntervalSec);
    expect(edits.length).toBeGreaterThan(0);
    expect(Math.abs(edits[0].timeSec - 6.0)).toBeLessThanOrEqual(1.0);
    expect(edits[0].deltaHz).toBeGreaterThan(0.08);
  });

  it('verifies calibrated false alarm rate <= 1.0% on clean continuous hum', () => {
    let falseAlarms = 0;
    const numTrials = 100;

    for (let t = 0; t < numTrials; t++) {
      const cleanTrack: number[] = [];
      // 15 seconds of stationary natural drift (Brownian noise with tiny variance)
      let curr = 50.0;
      for (let i = 0; i < 30; i++) {
        curr += 0.003 * (Math.random() - 0.5);
        cleanTrack.push(curr);
      }
      const edits = detectEnfEdits(cleanTrack, 0.5);
      if (edits.length > 0) falseAlarms++;
    }

    const falseRate = falseAlarms / numTrials;
    expect(falseRate).toBeLessThanOrEqual(0.01);
  });
});
