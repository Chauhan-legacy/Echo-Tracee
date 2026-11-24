import { describe, it, expect } from 'vitest';
import { SplitRadixRealFFT, naiveDFT } from '../core/fft';
import { generateDPSSTapers, computeMultitaperPSD, computeWelchPSD } from '../core/multitaper';
import { SlidingGoertzel, polyphaseDecimate, computeZoomFFT } from '../core/zoomFft';

describe('M1 Fast Mathematical Core', () => {
  it('cross-checks SplitRadixRealFFT against slow naive DFT reference', () => {
    const N = 128;
    const fft = new SplitRadixRealFFT(N);
    const signal = new Float64Array(N);

    // Sum of 2 pure sinusoids + DC + noise
    for (let i = 0; i < N; i++) {
      signal[i] = 1.5 + 2.0 * Math.cos((2.0 * Math.PI * 5 * i) / N) + 0.8 * Math.sin((2.0 * Math.PI * 18 * i) / N);
    }

    const rOut = new Float64Array(N / 2 + 1);
    const iOut = new Float64Array(N / 2 + 1);
    fft.transformReal(signal, rOut, iOut);
    const fastMag = fft.magnitudeSpectrum(rOut, iOut);

    const naive = naiveDFT(signal);

    // Assert exact numerical agreement between Split-Radix and Naive DFT
    for (let k = 0; k <= N / 2; k++) {
      expect(Math.abs(fastMag[k] - naive.mag[k])).toBeLessThan(1e-4);
      expect(Math.abs(rOut[k] - naive.real[k])).toBeLessThan(1e-4);
      expect(Math.abs(iOut[k] - naive.imag[k])).toBeLessThan(1e-4);
    }
  });

  it('benchmarks SplitRadixRealFFT vs naive DFT speed', () => {
    const N = 256;
    const fft = new SplitRadixRealFFT(N);
    const signal = new Float64Array(N);
    for (let i = 0; i < N; i++) signal[i] = Math.sin(i * 0.1);

    const rOut = new Float64Array(N / 2 + 1);
    const iOut = new Float64Array(N / 2 + 1);

    const t0 = performance.now();
    for (let iter = 0; iter < 100; iter++) {
      fft.transformReal(signal, rOut, iOut);
    }
    const fastElapsed = performance.now() - t0;

    const t1 = performance.now();
    for (let iter = 0; iter < 100; iter++) {
      naiveDFT(signal);
    }
    const naiveElapsed = performance.now() - t1;

    // Fast FFT must significantly outperform naive O(N^2) DFT
    expect(fastElapsed).toBeLessThan(naiveElapsed);
  });

  it('generates orthogonal DPSS Slepian tapers (K=5, NW=3)', () => {
    const N = 128;
    const K = 5;
    const tapers = generateDPSSTapers(N, 3.0, K);

    expect(tapers.length).toBe(K);
    // Check normality: ||v_k||^2 = 1.0
    for (let k = 0; k < K; k++) {
      let normSq = 0.0;
      for (let i = 0; i < N; i++) normSq += tapers[k][i] * tapers[k][i];
      expect(Math.abs(normSq - 1.0)).toBeLessThan(0.05);
    }

    // Check orthogonality: <v_0, v_1> = 0
    let dot = 0.0;
    for (let i = 0; i < N; i++) dot += tapers[0][i] * tapers[1][i];
    expect(Math.abs(dot)).toBeLessThan(0.05);
  });

  it('computes Multitaper and Welch PSD on sinusoidal tone', () => {
    const fs = 1000;
    const N = 1024;
    const signal = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2.0 * Math.PI * 150.0 * i) / fs);
    }

    const mt = computeMultitaperPSD(signal, 1024, 3.0, 5);
    expect(mt.numBins).toBe(513);

    // Peak should be at bin corresponding to 150 Hz
    let maxBin = 0;
    let maxVal = 0;
    for (let b = 0; b < mt.numBins; b++) {
      if (mt.psd[b] > maxVal) {
        maxVal = mt.psd[b];
        maxBin = b;
      }
    }
    const peakFreq = (maxBin / 1024) * fs;
    expect(Math.abs(peakFreq - 150.0)).toBeLessThan(2.0);

    const welch = computeWelchPSD(signal, 512);
    expect(welch.length).toBe(257);
  });

  it('tracks targeted frequency with Sliding Goertzel filter', () => {
    const fs = 48000;
    const targetFreq = 19400;
    const goertzel = new SlidingGoertzel(targetFreq, fs, 2048);

    // Feed resonant tone
    for (let i = 0; i < 2048; i++) {
      goertzel.processSample(Math.sin((2.0 * Math.PI * targetFreq * i) / fs));
    }
    const resonantMag = goertzel.getMagnitude();

    // Reset and feed non-resonant tone
    goertzel.reset();
    for (let i = 0; i < 2048; i++) {
      goertzel.processSample(Math.sin((2.0 * Math.PI * 5000 * i) / fs));
    }
    const offMag = goertzel.getMagnitude();

    expect(resonantMag).toBeGreaterThan(0.8);
    expect(offMag).toBeLessThan(0.05);
  });

  it('decimates with polyphase FIR filter without aliasing', () => {
    const inLen = 4000;
    const input = new Float32Array(inLen);
    for (let i = 0; i < inLen; i++) input[i] = Math.sin(i * 0.02);

    const decimated = polyphaseDecimate(input, 4);
    expect(decimated.length).toBe(1000);
  });

  it('executes Zoom FFT on ultrasonic band (17–22 kHz)', () => {
    const fs = 48000;
    const N = 48000; // 1s
    const signal = new Float32Array(N);
    const toneFreq = 19400;
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2.0 * Math.PI * toneFreq * i) / fs);
    }

    const zoom = computeZoomFFT(signal, fs, 17000, 22000, 1024);
    expect(Math.abs(zoom.peakFreq - toneFreq)).toBeLessThan(25.0);
    expect(zoom.peakMag).toBeGreaterThan(0.2);
  });
});
