/**
 * Fast Fourier Transform & Spectral Analysis Tools
 * Pure TypeScript implementation, 100% client-side, zero dependencies.
 */

export class FFT {
  private n: number;
  private m: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private reverseTable: Uint32Array;

  constructor(size: number) {
    if ((size & (size - 1)) !== 0) {
      throw new Error(`FFT size must be a power of 2, received ${size}`);
    }
    this.n = size;
    this.m = Math.log2(size);

    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      const angle = (-2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }

    // Precalculate bit reversal table
    this.reverseTable = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      let temp = i;
      for (let j = 0; j < this.m; j++) {
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
      }
      this.reverseTable[i] = rev;
    }
  }

  /**
   * In-place Radix-2 Cooley-Tukey FFT.
   * Takes real & imaginary Float32Arrays of length `size`.
   */
  public transform(real: Float32Array, imag: Float32Array): void {
    const n = this.n;

    // Bit reversal permutation
    for (let i = 0; i < n; i++) {
      const j = this.reverseTable[i];
      if (j > i) {
        const tempR = real[i];
        real[i] = real[j];
        real[j] = tempR;

        const tempI = imag[i];
        imag[i] = imag[j];
        imag[j] = tempI;
      }
    }

    // Cooley-Tukey butterfly
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        let k = 0;
        for (let j = 0; j < halfLen; j++) {
          const cos = this.cosTable[k];
          const sin = this.sinTable[k];

          const tR = real[i + j + halfLen] * cos - imag[i + j + halfLen] * sin;
          const tI = real[i + j + halfLen] * sin + imag[i + j + halfLen] * cos;

          const uR = real[i + j];
          const uI = imag[i + j];

          real[i + j] = uR + tR;
          imag[i + j] = uI + tI;
          real[i + j + halfLen] = uR - tR;
          imag[i + j + halfLen] = uI - tI;

          k += step;
        }
      }
    }
  }

  /**
   * Calculates magnitude spectrum from real and imaginary parts.
   */
  public magnitudeSpectrum(real: Float32Array, imag: Float32Array): Float32Array {
    const half = this.n / 2;
    const mag = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return mag;
  }
}

/**
 * Window functions for spectral analysis.
 */
export function hannWindow(length: number): Float32Array {
  const win = new Float32Array(length);
  const factor = (2 * Math.PI) / (length - 1);
  for (let i = 0; i < length; i++) {
    win[i] = 0.5 * (1 - Math.cos(factor * i));
  }
  return win;
}

export function blackmanHarrisWindow(length: number): Float32Array {
  const win = new Float32Array(length);
  const a0 = 0.35875;
  const a1 = 0.48829;
  const a2 = 0.14128;
  const a3 = 0.01168;
  const f = (2 * Math.PI) / (length - 1);

  for (let i = 0; i < length; i++) {
    win[i] =
      a0 -
      a1 * Math.cos(f * i) +
      a2 * Math.cos(2 * f * i) -
      a3 * Math.cos(3 * f * i);
  }
  return win;
}

/**
 * Parabolic / Quadratic Peak Interpolation
 * Given peak bin k and neighbor magnitudes alpha (k-1), beta (k), gamma (k+1),
 * returns the fractional bin offset p in range [-0.5, +0.5] and interpolated peak value.
 */
export function quadraticInterpolation(alpha: number, beta: number, gamma: number): {
  fractionalOffset: number;
  interpolatedValue: number;
} {
  const denom = alpha - 2 * beta + gamma;
  if (Math.abs(denom) < 1e-12) {
    return { fractionalOffset: 0, interpolatedValue: beta };
  }
  const p = 0.5 * (alpha - gamma) / denom;
  const clampedP = Math.max(-0.5, Math.min(0.5, p));
  const interpolatedValue = beta - 0.25 * (alpha - gamma) * clampedP;
  return { fractionalOffset: clampedP, interpolatedValue };
}
