/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { injectUltrasonicShield } from '../ultrasonicJammer';

describe('Ultrasonic Anti-Surveillance Jammer', () => {
  it('injects inaudible dither into ultrasonic band on 48 kHz audio', () => {
    const fs = 48000;
    const input = new Float32Array(fs); // 1 second silence
    const shielded = injectUltrasonicShield(input, fs, {
      centerFreqHz: 19500,
      bandwidthHz: 2000,
      amplitudeDb: -42,
    });

    expect(shielded.length).toBe(input.length);
    let maxAmp = 0;
    for (let i = 0; i < shielded.length; i++) {
      if (Math.abs(shielded[i]) > maxAmp) maxAmp = Math.abs(shielded[i]);
    }

    // -42 dB is ~0.0079 amplitude
    expect(maxAmp).toBeGreaterThan(0.001);
    expect(maxAmp).toBeLessThan(0.03); // inaudible
  });

  it('safely skips injection when sample rate is below 44.1 kHz (Nyquist protection)', () => {
    const fs = 16000;
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const shielded = injectUltrasonicShield(input, fs);
    expect(Array.from(shielded)).toEqual(Array.from(input));
  });
});
