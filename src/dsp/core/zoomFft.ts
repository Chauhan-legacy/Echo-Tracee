/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Heterodyne Zoom FFT, Sliding Goertzel & Polyphase Decimation (M1)
 */
import { SplitRadixRealFFT } from './fft';

/**
 * Sliding Goertzel Filter for real-time sample-by-sample tracking of a single frequency.
 * O(1) computation per input sample.
 */
export class SlidingGoertzel {
  private readonly coeff: number;
  private s1 = 0.0;
  private s2 = 0.0;
  private sampleCount = 0;
  public readonly targetFreq: number;
  public readonly sampleRate: number;
  public readonly blockLength: number;

  constructor(targetFreq: number, sampleRate: number, blockLength = 2048) {
    this.targetFreq = targetFreq;
    this.sampleRate = sampleRate;
    this.blockLength = blockLength;
    const omega = (2.0 * Math.PI * targetFreq) / sampleRate;
    this.coeff = 2.0 * Math.cos(omega);
  }

  public reset(): void {
    this.s1 = 0.0;
    this.s2 = 0.0;
    this.sampleCount = 0;
  }

  public processSample(x: number): void {
    const s0 = x + this.coeff * this.s1 - this.s2;
    this.s2 = this.s1;
    this.s1 = s0;
    this.sampleCount++;
  }

  public getMagnitudeSquared(): number {
    return this.s1 * this.s1 + this.s2 * this.s2 - this.coeff * this.s1 * this.s2;
  }

  public getMagnitude(): number {
    const norm = Math.max(1, this.sampleCount);
    return (2.0 * Math.sqrt(Math.max(0.0, this.getMagnitudeSquared()))) / norm;
  }
}

/**
 * Polyphase Decimation: Anti-aliasing FIR filter downsampled by factor M.
 */
export function polyphaseDecimate(
  input: Float32Array,
  decimationFactor: number
): Float32Array {
  if (decimationFactor <= 1) return input;

  const M = decimationFactor;
  // FIR low-pass filter design: cutoff at 0.8 * (pi / M)
  const filterTaps = 31;
  const h = new Float32Array(filterTaps);
  const cutoff = 0.8 / M;

  for (let i = 0; i < filterTaps; i++) {
    const n = i - (filterTaps - 1) / 2;
    if (n === 0) {
      h[i] = 2.0 * cutoff;
    } else {
      h[i] = Math.sin(2.0 * Math.PI * cutoff * n) / (Math.PI * n);
    }
    // Hamming window
    h[i] *= 0.54 - 0.46 * Math.cos((2.0 * Math.PI * i) / (filterTaps - 1));
  }

  const outLen = Math.floor(input.length / M);
  const output = new Float32Array(outLen);

  for (let outIdx = 0; outIdx < outLen; outIdx++) {
    const inIdx = outIdx * M;
    let sum = 0.0;
    for (let tap = 0; tap < filterTaps; tap++) {
      const src = inIdx - tap;
      if (src >= 0 && src < input.length) {
        sum += input[src] * h[tap];
      }
    }
    output[outIdx] = sum;
  }

  return output;
}

/**
 * Heterodyne Zoom FFT focused on 17 kHz – 22 kHz.
 * Heterodynes (frequency shifts) band of interest to 0 Hz baseband,
 * decimates, and executes high-resolution FFT.
 */
export function computeZoomFFT(
  signal: Float32Array,
  sampleRate: number,
  fStart = 17000,
  fEnd = 22000,
  fftSize = 1024
): {
  magnitudes: Float32Array;
  frequencies: Float32Array;
  peakFreq: number;
  peakMag: number;
} {
  const bandwidth = fEnd - fStart;
  const decimation = Math.max(1, Math.floor(sampleRate / (bandwidth * 2.2)));
  const zoomedSampleRate = sampleRate / decimation;

  const N = Math.min(signal.length, fftSize * decimation);
  const inPhase = new Float32Array(N);
  const quadPhase = new Float32Array(N);

  // Heterodyne by mixing with fStart so the zoomed band [fStart, fEnd] maps to positive baseband [0, fEnd - fStart]
  for (let i = 0; i < N; i++) {
    const t = i / sampleRate;
    const angle = -2.0 * Math.PI * fStart * t;
    inPhase[i] = signal[i] * Math.cos(angle);
    quadPhase[i] = signal[i] * Math.sin(angle);
  }

  // Decimate both I and Q streams
  const iDecimated = polyphaseDecimate(inPhase, decimation);
  const qDecimated = polyphaseDecimate(quadPhase, decimation);

  const L = Math.min(iDecimated.length, fftSize);
  const realBuf = new Float32Array(fftSize);
  const imagBuf = new Float32Array(fftSize);

  // Apply Hann window
  for (let i = 0; i < L; i++) {
    const w = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (L - 1)));
    realBuf[i] = iDecimated[i] * w;
    imagBuf[i] = qDecimated[i] * w;
  }

  const fft = new SplitRadixRealFFT(fftSize);
  const half = fftSize / 2;
  const mag = new Float32Array(half + 1);
  const freqs = new Float32Array(half + 1);

  const rOut = new Float64Array(half + 1);
  const iOut = new Float64Array(half + 1);
  fft.transformReal(realBuf, rOut, iOut);

  let peakMag = 0.0;
  let peakIdx = 0;

  const binStep = zoomedSampleRate / fftSize;
  for (let k = 0; k <= half; k++) {
    const fRel = k * binStep;
    const fAbs = fStart + fRel;
    const m = Math.sqrt(rOut[k] * rOut[k] + iOut[k] * iOut[k]) / (L / 2);
    mag[k] = m;
    freqs[k] = fAbs;

    if (fAbs >= fStart && fAbs <= fEnd && m > peakMag) {
      peakMag = m;
      peakIdx = k;
    }
  }

  return {
    magnitudes: mag,
    frequencies: freqs,
    peakFreq: freqs[peakIdx] || fStart,
    peakMag,
  };
}
