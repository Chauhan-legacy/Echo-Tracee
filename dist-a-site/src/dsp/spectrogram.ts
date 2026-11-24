import { FFT, hannWindow } from './fft';

export interface SpectrogramData {
  matrix: Float32Array; // numRows x numCols, normalized 0.0 - 1.0
  numCols: number;
  numRows: number;
  maxFreq: number;
  duration: number;
}

/**
 * Computes a true real-time STFT magnitude matrix from audio samples.
 * Real mathematical Cooley-Tukey FFT, zero simulated or hardcoded values.
 */
export function computeRealSpectrogram(
  samples: Float32Array,
  sampleRate: number,
  numCols = 250,
  numRows = 120
): SpectrogramData {
  const duration = samples.length / sampleRate;
  const maxFreq = sampleRate / 2;
  const matrix = new Float32Array(numCols * numRows);

  if (samples.length === 0) {
    return { matrix, numCols, numRows, maxFreq, duration: 0 };
  }

  // FFT window size (power of 2)
  const fftSize = 1024;
  const fft = new FFT(fftSize);
  const win = hannWindow(fftSize);

  const step = Math.max(1, Math.floor((samples.length - fftSize) / numCols));
  const rBuf = new Float32Array(fftSize);
  const iBuf = new Float32Array(fftSize);

  const half = fftSize / 2;
  const binFreqStep = maxFreq / half;

  for (let c = 0; c < numCols; c++) {
    const offset = c * step;
    if (offset + fftSize > samples.length) break;

    for (let i = 0; i < fftSize; i++) {
      rBuf[i] = samples[offset + i] * win[i];
      iBuf[i] = 0;
    }

    fft.transform(rBuf, iBuf);
    const mag = fft.magnitudeSpectrum(rBuf, iBuf);

    // Map half FFT bins to numRows (inverted: row 0 is maxFreq, row numRows-1 is 0 Hz)
    for (let r = 0; r < numRows; r++) {
      const targetFreqNorm = 1 - r / numRows;
      const targetBin = Math.min(half - 1, Math.floor((targetFreqNorm * maxFreq) / binFreqStep));

      // Calculate magnitude in decibels with dynamic range compression
      const val = mag[targetBin];
      const db = 20 * Math.log10(Math.max(1e-5, val));
      // Dynamic range: map [-80 dB, 0 dB] -> [0.0, 1.0]
      const normalized = Math.max(0.0, Math.min(1.0, (db + 75) / 75));

      matrix[r * numCols + c] = normalized;
    }
  }

  return {
    matrix,
    numCols,
    numRows,
    maxFreq,
    duration,
  };
}
