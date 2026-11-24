/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * FFT Benchmark: SplitRadixRealFFT vs. fft.js (Phase B)
 * Measures execution time over 10,000 transforms of size 1024, 2048, and 4096.
 */
import { SplitRadixRealFFT } from '../src/dsp/core/fft';
import FFT from 'fft.js';

function benchmark() {
  console.log('\n======================================================');
  console.log('BENCHMARK: SplitRadixRealFFT vs. fft.js (10,000 trials)');
  console.log('======================================================\n');

  const sizes = [1024, 2048, 4096];
  const trials = 10000;

  for (const n of sizes) {
    const input = new Float64Array(n);
    for (let i = 0; i < n; i++) input[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);

    // 1. SplitRadixRealFFT
    const sr = new SplitRadixRealFFT(n);
    const half = n / 2;
    const rOut = new Float64Array(half + 1);
    const iOut = new Float64Array(half + 1);

    const t0 = performance.now();
    for (let t = 0; t < trials; t++) {
      sr.transformReal(input, rOut, iOut);
    }
    const tSplitRadix = performance.now() - t0;

    // 2. fft.js
    const fjs = new FFT(n);
    const fjsOut = fjs.createComplexArray();

    const t1 = performance.now();
    for (let t = 0; t < trials; t++) {
      fjs.realTransform(fjsOut, input);
    }
    const tFftJs = performance.now() - t1;

    const winner = tSplitRadix < tFftJs ? 'SplitRadixRealFFT (native)' : 'fft.js (Radix-4)';
    const ratio = tSplitRadix < tFftJs ? (tFftJs / tSplitRadix).toFixed(2) : (tSplitRadix / tFftJs).toFixed(2);

    console.log(`FFT Size ${n}:`);
    console.log(`  SplitRadixRealFFT: ${tSplitRadix.toFixed(1)} ms`);
    console.log(`  fft.js:            ${tFftJs.toFixed(1)} ms`);
    console.log(`  -> Faster: ${winner} (${ratio}x faster)\n`);
  }
}

benchmark();
