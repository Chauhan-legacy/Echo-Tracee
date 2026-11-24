/**
 * Discrete Prolate Spheroidal Sequences (DPSS) & Multitaper Spectral Analysis (M1)
 * Standard DPSS tapers (K=5, NW=3) for high-resolution, low-variance spectral density estimation.
 */
import { SplitRadixRealFFT } from './fft';

/**
 * Generates K orthogonal DPSS (Slepian) tapers of length N for time-bandwidth NW.
 * Solves the tridiagonal matrix eigenvalue problem (Slepian 1978).
 */
export function generateDPSSTapers(N: number, NW = 3.0, K = 5): Float64Array[] {
  const W = NW / N;
  const tapers: Float64Array[] = [];

  const d = new Float64Array(N);
  const e = new Float64Array(N - 1);
  const cos2piW = Math.cos(2.0 * Math.PI * W);

  for (let i = 0; i < N; i++) {
    const term = (N - 1.0 - 2.0 * i) / 2.0;
    d[i] = term * term * cos2piW;
    if (i < N - 1) {
      e[i] = 0.5 * (i + 1.0) * (N - 1.0 - i);
    }
  }

  for (let k = 0; k < K; k++) {
    const v = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      v[i] = Math.sin(((k + 1.0) * Math.PI * (i + 1.0)) / (N + 1.0));
    }

    for (let iter = 0; iter < 25; iter++) {
      for (let prev = 0; prev < k; prev++) {
        let dot = 0.0;
        for (let i = 0; i < N; i++) dot += v[i] * tapers[prev][i];
        for (let i = 0; i < N; i++) v[i] -= dot * tapers[prev][i];
      }

      const nextV = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        let val = d[i] * v[i];
        if (i > 0) val += e[i - 1] * v[i - 1];
        if (i < N - 1) val += e[i] * v[i + 1];
        nextV[i] = val;
      }

      for (let prev = 0; prev < k; prev++) {
        let dot = 0.0;
        for (let i = 0; i < N; i++) dot += nextV[i] * tapers[prev][i];
        for (let i = 0; i < N; i++) nextV[i] -= dot * tapers[prev][i];
      }

      let norm = 0.0;
      for (let i = 0; i < N; i++) norm += nextV[i] * nextV[i];
      norm = Math.sqrt(norm);
      if (norm > 1e-12) {
        for (let i = 0; i < N; i++) v[i] = nextV[i] / norm;
      }
    }

    let sum = 0.0;
    for (let i = 0; i < Math.floor(N / 2); i++) sum += v[i];
    if (sum < 0) {
      for (let i = 0; i < N; i++) v[i] = -v[i];
    }

    tapers.push(v);
  }

  return tapers;
}

/**
 * Computes Multitaper Power Spectral Density (PSD) using DPSS tapers (K=5, NW=3)
 * across the entire audio signal.
 */
export function computeMultitaperPSD(
  signal: Float32Array | Float64Array,
  fftSize = 2048,
  NW = 3.0,
  K = 5
): { psd: Float32Array; freqs: Float32Array; numBins: number } {
  const tapers = generateDPSSTapers(fftSize, NW, K);
  const fft = new SplitRadixRealFFT(fftSize);

  const half = fftSize / 2;
  const avgPsd = new Float64Array(half + 1);

  const windowedSignal = new Float64Array(fftSize);
  const realOut = new Float64Array(half + 1);
  const imagOut = new Float64Array(half + 1);

  const step = Math.max(1, Math.floor(fftSize / 2));
  let numSegments = 0;

  for (let offset = 0; offset + fftSize <= signal.length; offset += step) {
    for (let k = 0; k < K; k++) {
      const taper = tapers[k];
      for (let i = 0; i < fftSize; i++) {
        windowedSignal[i] = signal[offset + i] * taper[i];
      }

      fft.transformReal(windowedSignal, realOut, imagOut);

      for (let b = 0; b <= half; b++) {
        const r = realOut[b];
        const im = imagOut[b];
        const p = (r * r + im * im) / fftSize;
        avgPsd[b] += p;
      }
    }
    numSegments++;
  }

  if (numSegments === 0) {
    // Zero-padded fallback for very short signals
    for (let k = 0; k < K; k++) {
      const taper = tapers[k];
      for (let i = 0; i < fftSize; i++) {
        windowedSignal[i] = (i < signal.length ? signal[i] : 0.0) * taper[i];
      }
      fft.transformReal(windowedSignal, realOut, imagOut);
      for (let b = 0; b <= half; b++) {
        const r = realOut[b];
        const im = imagOut[b];
        avgPsd[b] += (r * r + im * im) / fftSize;
      }
    }
    numSegments = 1;
  }

  const outPsd = new Float32Array(half + 1);
  const freqs = new Float32Array(half + 1);
  const divisor = numSegments * K;
  for (let b = 0; b <= half; b++) {
    outPsd[b] = avgPsd[b] / divisor;
    freqs[b] = b / fftSize;
  }

  return { psd: outPsd, freqs, numBins: half + 1 };
}

/**
 * Welch PSD with 50% overlap and Hann windowing.
 */
export function computeWelchPSD(
  signal: Float32Array | Float64Array,
  segmentSize = 1024,
  overlap = 0.5
): Float32Array {
  const fft = new SplitRadixRealFFT(segmentSize);
  const half = segmentSize / 2;
  const avgPsd = new Float64Array(half + 1);

  const win = new Float64Array(segmentSize);
  let winSumSq = 0.0;
  for (let i = 0; i < segmentSize; i++) {
    win[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (segmentSize - 1)));
    winSumSq += win[i] * win[i];
  }

  const step = Math.max(1, Math.floor(segmentSize * (1.0 - overlap)));
  let count = 0;

  const segBuf = new Float64Array(segmentSize);
  const realOut = new Float64Array(half + 1);
  const imagOut = new Float64Array(half + 1);

  for (let offset = 0; offset + segmentSize <= signal.length; offset += step) {
    for (let i = 0; i < segmentSize; i++) {
      segBuf[i] = signal[offset + i] * win[i];
    }

    fft.transformReal(segBuf, realOut, imagOut);

    for (let b = 0; b <= half; b++) {
      const r = realOut[b];
      const im = imagOut[b];
      avgPsd[b] += (r * r + im * im) / winSumSq;
    }
    count++;
  }

  const result = new Float32Array(half + 1);
  if (count > 0) {
    for (let b = 0; b <= half; b++) {
      result[b] = avgPsd[b] / count;
    }
  }
  return result;
}
