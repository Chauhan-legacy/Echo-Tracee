/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
declare module 'fft.js' {
  export default class FFT {
    constructor(size: number);
    size: number;
    createComplexArray(): Float64Array | number[];
    toComplexArray(input: number[] | Float32Array | Float64Array, storage?: number[] | Float64Array): Float64Array;
    fromComplexArray(complex: number[] | Float64Array, storage?: number[] | Float32Array): Float64Array;
    transform(out: number[] | Float64Array, input: number[] | Float64Array): void;
    realTransform(out: number[] | Float64Array, input: number[] | Float64Array): void;
    completeSpectrum(out: number[] | Float64Array): void;
  }
}
