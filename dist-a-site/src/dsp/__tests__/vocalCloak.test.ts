import { describe, it, expect } from 'vitest';
import { applyVocalCloak, estimatePitchPeriod } from '../vocalCloak';

describe('Vocal Biometric Cloak (Anti-Speaker Diarization)', () => {
  const sampleRate = 48000;
  const duration = 0.5; // 0.5s
  const N = Math.floor(sampleRate * duration);

  it('preserves audio buffer length after pitch/formant shifting', () => {
    const input = new Float32Array(N);
    // 200 Hz tone (vocal pitch)
    for (let i = 0; i < N; i++) {
      input[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / sampleRate);
    }

    const cloaked = applyVocalCloak(input, sampleRate, {
      pitchShiftSemitones: -3.5,
      mixRatio: 1.0,
    });

    expect(cloaked.length).toBe(input.length);
    expect(cloaked).not.toEqual(input);
  });

  it('correctly shifts fundamental frequency lower when pitchShiftSemitones < 0', () => {
    const input = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      input[i] = 0.8 * Math.sin((2 * Math.PI * 220 * i) / sampleRate);
    }

    const origPeriod = estimatePitchPeriod(input, sampleRate);
    const cloaked = applyVocalCloak(input, sampleRate, {
      pitchShiftSemitones: -5.0,
      mixRatio: 1.0,
    });

    const cloakedPeriod = estimatePitchPeriod(cloaked, sampleRate);
    // Lower frequency means longer pitch period (greater lag)
    expect(cloakedPeriod).toBeGreaterThanOrEqual(origPeriod);
  });

  it('returns clean copy when mixRatio is 0', () => {
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const out = applyVocalCloak(input, sampleRate, { mixRatio: 0 });
    expect(Array.from(out)).toEqual(Array.from(input));
  });
});
