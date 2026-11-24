/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { demodulateUltrasonicBeacon } from '../ultrasonicDemod';

describe('Ultrasonic Data Carrier Demodulator', () => {
  const fs = 48000;
  const duration = 1.0;
  const N = Math.floor(fs * duration);
  const carrierHz = 19400;

  it('demodulates 2-FSK ultrasonic tracking beacon with carrier and extracts telemetry payload', () => {
    const signal = new Float32Array(N);
    const bitRate = 200;
    const samplesPerBit = Math.floor(fs / bitRate);

    // Modulate with alternating preamble bits [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0]
    const bits = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0];
    let phase = 0;

    for (let n = 0; n < N; n++) {
      const bitIdx = Math.floor(n / samplesPerBit) % bits.length;
      const bit = bits[bitIdx];
      // Frequency shift: mark = +250Hz, space = -250Hz
      const freqDev = bit === 1 ? 250 : -250;
      const instFreq = carrierHz + freqDev;

      phase += (2 * Math.PI * instFreq) / fs;
      signal[n] = 0.6 * Math.cos(phase);
    }

    const res = demodulateUltrasonicBeacon(signal, fs, carrierHz);

    expect(res.isDemodulated).toBe(true);
    expect(res.carrierFrequencyHz).toBe(19400);
    expect(res.modulationType).toBe('2-FSK');
    expect(res.payloadHex.startsWith('0x')).toBe(true);
    expect(res.snrDb).toBeGreaterThan(10);
    expect(res.constellation.length).toBe(32);
  });

  it('gracefully handles silence / low SNR without false demodulation', () => {
    const silence = new Float32Array(N);
    const res = demodulateUltrasonicBeacon(silence, fs, carrierHz);
    expect(res.isDemodulated).toBe(false);
  });
});
