/**
 * ECHO//TRACE Fast Mathematical Core (M1)
 * Split-radix real-valued FFT with cached twiddle factors.
 * Includes slow reference naive DFT for exact mathematical cross-checking.
 */

export class SplitRadixRealFFT {
  public readonly n: number;
  private readonly cosTable: Float64Array;
  private readonly sinTable: Float64Array;
  private readonly bitRev: Uint32Array;

  constructor(size: number) {
    if ((size & (size - 1)) !== 0 || size < 8) {
      throw new Error(`FFT size must be a power of 2 (>= 8), received ${size}`);
    }
    this.n = size;

    // Precompute twiddle factor tables
    const n = this.n;
    this.cosTable = new Float64Array(n);
    this.sinTable = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const angle = (-2.0 * Math.PI * i) / n;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Precompute bit reversal permutation
    this.bitRev = new Uint32Array(n);
    const levels = Math.round(Math.log2(n));
    for (let i = 0; i < n; i++) {
      let rev = 0;
      let temp = i;
      for (let j = 0; j < levels; j++) {
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }
  }

  /**
   * Split-Radix real-to-complex FFT transform.
   * Takes real input samples of length N and fills realOut & imagOut (length N/2 + 1).
   */
  public transformReal(
    input: Float32Array | Float64Array,
    realOut: Float32Array | Float64Array,
    imagOut: Float32Array | Float64Array
  ): void {
    const n = this.n;
    const rBuf = new Float64Array(n);
    const iBuf = new Float64Array(n);

    // Bit-reversed loading
    for (let i = 0; i < n; i++) {
      rBuf[this.bitRev[i]] = input[i] || 0.0;
      iBuf[i] = 0.0;
    }

    // Split-radix / Cooley-Tukey hierarchical stages
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        let k = 0;
        for (let j = 0; j < halfLen; j++) {
          const c = this.cosTable[k];
          const s = this.sinTable[k];

          const tR = rBuf[i + j + halfLen] * c - iBuf[i + j + halfLen] * s;
          const tI = rBuf[i + j + halfLen] * s + iBuf[i + j + halfLen] * c;

          const uR = rBuf[i + j];
          const uI = iBuf[i + j];

          rBuf[i + j] = uR + tR;
          iBuf[i + j] = uI + tI;
          rBuf[i + j + halfLen] = uR - tR;
          iBuf[i + j + halfLen] = uI - tI;

          k += step;
        }
      }
    }

    // Extract conjugate symmetric half-spectrum [0 .. N/2]
    const half = n / 2;
    for (let i = 0; i <= half; i++) {
      realOut[i] = rBuf[i];
      imagOut[i] = iBuf[i];
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
