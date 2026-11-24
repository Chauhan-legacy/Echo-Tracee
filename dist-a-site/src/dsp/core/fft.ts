import FFT from 'fft.js';

/**
 * ECHO//TRACE Fast Mathematical Core (M1)
 * Radix-4 Real-valued FFT engine (powered by fft.js with zero heap allocations during transforms).
 * Includes slow reference naive DFT for exact mathematical cross-checking.
 */

export class SplitRadixRealFFT {
  public readonly n: number;
  private readonly fftCore: FFT;
  private readonly complexOut: Float64Array;

  constructor(size: number) {
    if ((size & (size - 1)) !== 0 || size < 8) {
      throw new Error(`FFT size must be a power of 2 (>= 8), received ${size}`);
    }
    this.n = size;
    this.fftCore = new FFT(size);
    this.complexOut = new Float64Array(size * 2);
  }

  /**
   * Real-to-complex FFT transform.
   * Takes real input samples of length N and fills realOut & imagOut (length N/2 + 1).
   */
  public transformReal(
    input: Float32Array | Float64Array,
    realOut: Float32Array | Float64Array,
    imagOut: Float32Array | Float64Array
  ): void {
    const n = this.n;
    this.fftCore.realTransform(this.complexOut, input as unknown as number[]);
    const half = n / 2;
    for (let i = 0; i <= half; i++) {
      const idx = i * 2;
      realOut[i] = this.complexOut[idx];
      imagOut[i] = this.complexOut[idx + 1];
    }
  }

  /**
   * Computes normalized magnitude spectrum: |X[k]| / (N/2)
   */
  public magnitudeSpectrum(
    realOut: Float32Array | Float64Array,
    imagOut: Float32Array | Float64Array
  ): Float32Array {
    const half = this.n / 2;
    const mag = new Float32Array(half + 1);
    const norm = half > 0 ? 1.0 / half : 1.0;

    // DC bin normalized by N
    mag[0] = Math.abs(realOut[0]) / this.n;

    for (let i = 1; i < half; i++) {
      const r = realOut[i];
      const im = imagOut[i];
      mag[i] = Math.sqrt(r * r + im * im) * norm;
    }

    // Nyquist bin normalized by N
    mag[half] = Math.abs(realOut[half]) / this.n;

    return mag;
  }
}

/**
 * Slow naive O(N^2) Discrete Fourier Transform for exact cross-validation.
 * Strictly calculates the closed-form algebraic summation:
 * X[k] = sum_{n=0}^{N-1} x[n] * e^{-j 2 pi k n / N}
 */
export function naiveDFT(input: Float32Array | Float64Array): {
  real: Float64Array;
  imag: Float64Array;
  mag: Float32Array;
} {
  const n = input.length;
  const half = Math.floor(n / 2);
  const real = new Float64Array(half + 1);
  const imag = new Float64Array(half + 1);
  const mag = new Float32Array(half + 1);
  const norm = half > 0 ? 1.0 / half : 1.0;

  for (let k = 0; k <= half; k++) {
    let sumR = 0.0;
    let sumI = 0.0;
    for (let t = 0; t < n; t++) {
      const angle = (-2.0 * Math.PI * k * t) / n;
      sumR += input[t] * Math.cos(angle);
      sumI += input[t] * Math.sin(angle);
    }
    real[k] = sumR;
    imag[k] = sumI;

    if (k === 0 || k === half) {
      mag[k] = Math.sqrt(sumR * sumR + sumI * sumI) / n;
    } else {
      mag[k] = Math.sqrt(sumR * sumR + sumI * sumI) * norm;
    }
  }

  return { real, imag, mag };
}
