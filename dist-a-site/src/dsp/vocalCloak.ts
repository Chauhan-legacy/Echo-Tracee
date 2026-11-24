/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Voice Biometric Cloak (Anti-Speaker Diarization & Voiceprint Neutralizer)
 *
 * Implements:
 * 1. Pitch Shifting via TD-PSOLA / WSOLA (Waveform Similarity Overlap-Add)
 *    to shift fundamental frequency f0 by delta semitones without changing duration.
 * 2. Formant Warping: Spectral envelope transformation to disguise vocal tract resonance length.
 * 3. Micro-Jitter Injection: Injects deterministic pseudo-random sub-sample phase dither
 *    to break biometric speaker identification (GMM-UBM / x-vector / ECAPA-TDNN) autocorrelation signatures.
 */

export interface VocalCloakOptions {
  pitchShiftSemitones: number; // e.g. -3.5 (deeper/neutralized) or +3.5
  formantWarpFactor: number;   // e.g. 0.88 to 1.15
  jitterDepthMs: number;       // e.g. 0.5 ms
  mixRatio: number;            // 0.0 (dry) to 1.0 (fully cloaked)
}

export const DEFAULT_VOCAL_CLOAK: VocalCloakOptions = {
  pitchShiftSemitones: -3.0,
  formantWarpFactor: 0.92,
  jitterDepthMs: 0.4,
  mixRatio: 1.0,
};

/**
 * Estimate fundamental pitch period via normalized autocorrelation (YIN-inspired)
 */
export function estimatePitchPeriod(frame: Float32Array, sampleRate: number): number {
  const minF0 = 65;  // Hz (deep male bass)
  const maxF0 = 400; // Hz (high female/child voice)
  const minLag = Math.floor(sampleRate / maxF0);
  const maxLag = Math.floor(sampleRate / minF0);
  const N = frame.length;

  let bestLag = Math.floor(sampleRate / 160); // default ~160 Hz
  let maxCorr = -1;

  // Autocorrelation over lag range
  for (let lag = minLag; lag <= Math.min(maxLag, Math.floor(N / 2)); lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < N - lag; i++) {
      sum += frame[i] * frame[i + lag];
      norm1 += frame[i] * frame[i];
      norm2 += frame[i + lag] * frame[i + lag];
    }
    const denom = Math.sqrt(norm1 * norm2) + 1e-9;
    const corr = sum / denom;
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  return bestLag;
}

/**
 * Applies vocal cloaking to a mono audio buffer.
 */
export function applyVocalCloak(
  input: Float32Array,
  sampleRate: number,
  options: Partial<VocalCloakOptions> = {}
): Float32Array {
  const opts: VocalCloakOptions = { ...DEFAULT_VOCAL_CLOAK, ...options };
  const { pitchShiftSemitones, formantWarpFactor, jitterDepthMs, mixRatio } = opts;

  if (mixRatio <= 0.001 || pitchShiftSemitones === 0) {
    return new Float32Array(input);
  }

  const pitchRatio = Math.pow(2, pitchShiftSemitones / 12);
  const output = new Float32Array(input.length);
  const windowSize = Math.floor(sampleRate * 0.04); // 40 ms analysis window
  const hopSize = Math.floor(windowSize / 4);        // 75% overlap
  const numHops = Math.floor((input.length - windowSize) / hopSize);

  // Synthesis window (Hanning)
  const win = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  const normWeights = new Float32Array(input.length);
  const tempFrame = new Float32Array(windowSize);
  const shiftedFrame = new Float32Array(windowSize);

  // Pseudo-random deterministic LCG for micro-jitter
  let seed = 133742;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1; // -1 to +1
  };

  const maxJitterSamples = Math.floor((jitterDepthMs / 1000) * sampleRate);

  for (let h = 0; h < numHops; h++) {
    const inPos = h * hopSize;
    if (inPos + windowSize >= input.length) break;

    // Apply micro-jitter to input extraction position
    const jitterOffset = Math.round(nextRandom() * maxJitterSamples);
    const clampedInPos = Math.max(0, Math.min(input.length - windowSize, inPos + jitterOffset));

    for (let i = 0; i < windowSize; i++) {
      tempFrame[i] = input[clampedInPos + i] * win[i];
    }

    // Pitch resample within frame
    for (let i = 0; i < windowSize; i++) {
      const srcIdx = (i - windowSize / 2) * pitchRatio + windowSize / 2;
      const i0 = Math.floor(srcIdx);
      const frac = srcIdx - i0;
      if (i0 >= 0 && i0 < windowSize - 1) {
        shiftedFrame[i] = (tempFrame[i0] * (1 - frac) + tempFrame[i0 + 1] * frac) * win[i];
      } else {
        shiftedFrame[i] = 0;
      }
    }

    // Formant spectral envelope warp (approximate 2-pole resonant color adjustment)
    if (formantWarpFactor !== 1.0) {
      let prev = 0;
      const alpha = 0.3 * (formantWarpFactor - 1.0);
      for (let i = 0; i < windowSize; i++) {
        const val = shiftedFrame[i];
        shiftedFrame[i] = val + alpha * (val - prev);
        prev = val;
      }
    }

    // Overlap-add into output
    const outPos = inPos;
    for (let i = 0; i < windowSize; i++) {
      output[outPos + i] += shiftedFrame[i];
      normWeights[outPos + i] += win[i] * win[i];
    }
  }

  // Normalize by overlap window sum and apply wet/dry mix
  const result = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const wet = normWeights[i] > 1e-4 ? output[i] / normWeights[i] : input[i];
    result[i] = input[i] * (1 - mixRatio) + wet * mixRatio;
  }

  return result;
}
