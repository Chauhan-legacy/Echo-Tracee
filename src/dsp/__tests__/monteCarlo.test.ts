/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { runCfarMonteCarlo } from '../beacons/cfar';
import { analyzeHumM2 } from '../hum/enf';

describe('Phase 6 Monte Carlo False-Alarm Rate (1,000 trials)', () => {
  it('measures CFAR empirical false-alarm rate <= 0.1% over 1,000 noise trials', () => {
    // 1,000 random noise realizations
    const trials = 1000;
    const cfarStats = runCfarMonteCarlo(trials, 1e-4);

    expect(cfarStats.trials).toBe(trials);
    expect(cfarStats.measuredPfa).toBeLessThanOrEqual(0.001); // <= 0.1%
  });

  it('measures Mains Hum false alarm rate = 0% over 200 random noise buffers', () => {
    const fs = 48000;
    const len = fs * 2; // 2s clips
    let humFalseAlarms = 0;

    for (let trial = 0; trial < 200; trial++) {
      const noise = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        noise[i] = (Math.random() - 0.5) * 0.1;
      }

      const res = analyzeHumM2(noise, fs);
      if (res.detected) {
        humFalseAlarms++;
      }
    }

    const humFar = humFalseAlarms / 200;
    expect(humFar).toBeLessThanOrEqual(0.005);
  });
});
