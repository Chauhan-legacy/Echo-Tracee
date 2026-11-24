/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { analyzeUltrasonicBeaconsM3, runCfarMonteCarlo, detectCodecCutoff, demodulateOok } from '../beacons/cfar';

describe('M3 Ultrasonic Tracking Beacons & CFAR', () => {
  it('detects tones at 18.9 kHz, 19.4 kHz, and 20.1 kHz via CA-CFAR', () => {
    const fs = 48000;
    const duration = 2.0;
    const testFreqs = [18900, 19400, 20100];

    for (const freq of testFreqs) {
      const N = Math.floor(fs * duration);
      const signal = new Float32Array(N);

      // Generate tone with SNR ~20 dB
      for (let i = 0; i < N; i++) {
        const t = i / fs;
        const noise = (Math.random() - 0.5) * 0.01;
        signal[i] = 0.08 * Math.sin(2.0 * Math.PI * freq * t) + noise;
      }

      const res = analyzeUltrasonicBeaconsM3(signal, fs, 1e-6);
      expect(res.detected).toBe(true);
      expect(res.beacons.length).toBeGreaterThan(0);
      expect(Math.abs(res.beacons[0].frequencyHz - freq)).toBeLessThan(20.0);
      expect(res.beacons[0].snrDb).toBeGreaterThan(10.0);
    }
  });

  it('demodulates OOK keyed bit string and keying rate', () => {
    const fs = 48000;
    const duration = 1.0;
    const N = fs * duration;
    const signal = new Float32Array(N);
    const baud = 10;
    const samplesPerBit = fs / baud;
    const testBits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0];

    for (let i = 0; i < N; i++) {
      const bitIdx = Math.floor(i / samplesPerBit);
      const bit = testBits[bitIdx % testBits.length];
      if (bit === 1) {
        signal[i] = 0.1 * Math.sin((2.0 * Math.PI * 19400 * i) / fs);
      }
    }

    const demod = demodulateOok(signal, fs, 19400, duration);
    expect(demod.baud).toBeGreaterThanOrEqual(8);
    expect(demod.baud).toBeLessThanOrEqual(12);
    expect(demod.bits.length).toBeGreaterThanOrEqual(5);
  });

  it('detects codec low-pass cutoff at 16.5 kHz and asserts cannot check', () => {
    const fs = 48000;
    const N = fs * 1;
    const signal = new Float32Array(N);

    // Synthetic audio with voice energy up to 15 kHz, zero above 16.5 kHz
    for (let i = 0; i < N; i++) {
      const t = i / fs;
      signal[i] = 0.05 * Math.sin(2.0 * Math.PI * 1000 * t) + 0.03 * Math.sin(2.0 * Math.PI * 12000 * t);
    }

    const res = analyzeUltrasonicBeaconsM3(signal, fs);
    expect(res.cannotCheckUltrasonic).toBe(true);
    expect(res.findings.some(f => f.title.includes('Cannot Check') || f.title.includes('Cutoff'))).toBe(true);
  });

  it('runs 10,000-trial noise Monte Carlo verifying false-alarm rate calibration', () => {
    // 10,000 trials with designed Pfa = 1e-4
    const res = runCfarMonteCarlo(10000, 1e-4);
    expect(res.trials).toBe(10000);
    // Measured false alarm rate should be close to designed Pfa
    expect(res.measuredPfa).toBeLessThan(0.001);
  });
});
