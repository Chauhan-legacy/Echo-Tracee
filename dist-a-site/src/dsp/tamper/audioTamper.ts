/**
 * Audio Tamper & Signal Integrity Forensics (M5)
 * Log-mel segment fingerprints, symmetric KL / Bhattacharyya distance,
 * spectral flux with Median+4*MAD, digital silence, clipping, and DC offset checks.
 */
import { SplitRadixRealFFT } from '../core/fft';
import { Finding } from '../../types';

export interface TamperDetectionResult {
  hasTampering: boolean;
  hasClipping: boolean;
  hasDigitalSilence: boolean;
  hasDcOffset: boolean;
  dcOffsetValue: number;
  clippedSampleCount: number;
  splicePointsSec: number[];
  findings: Finding[];
}

/**
 * Creates triangular Mel-scale filterbank matrices.
 */
export function createMelFilterbank(
  numFilters = 26,
  fftSize = 1024,
  sampleRate = 48000,
  lowFreq = 100,
  highFreq = 8000
): Float32Array[] {
  const hzToMel = (hz: number) => 2595.0 * Math.log10(1.0 + hz / 700.0);
  const melToHz = (mel: number) => 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);

  const lowMel = hzToMel(lowFreq);
  const highMel = hzToMel(highFreq);
  const melPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = lowMel + (i * (highMel - lowMel)) / (numFilters + 1);
  }

  const binStep = sampleRate / fftSize;
  const filterbank: Float32Array[] = [];
  const half = fftSize / 2;

  for (let m = 1; m <= numFilters; m++) {
    const fPrev = melToHz(melPoints[m - 1]);
    const fCurr = melToHz(melPoints[m]);
    const fNext = melToHz(melPoints[m + 1]);

    const filter = new Float32Array(half + 1);
    for (let k = 0; k <= half; k++) {
      const f = k * binStep;
      if (f >= fPrev && f <= fCurr) {
        filter[k] = (f - fPrev) / Math.max(1e-6, fCurr - fPrev);
      } else if (f >= fCurr && f <= fNext) {
        filter[k] = (fNext - f) / Math.max(1e-6, fNext - fCurr);
      }
    }
    filterbank.push(filter);
  }

  return filterbank;
}

/**
 * Symmetric Kullback-Leibler & Bhattacharyya distance between two probability vectors.
 */
export function computeSegmentDistances(
  p: Float32Array,
  q: Float32Array
): { symKl: number; bhattacharyya: number } {
  let kl1 = 0.0, kl2 = 0.0, bc = 0.0;
  const n = p.length;

  for (let i = 0; i < n; i++) {
    const pi = Math.max(1e-12, p[i]);
    const qi = Math.max(1e-12, q[i]);

    kl1 += pi * Math.log(pi / qi);
    kl2 += qi * Math.log(qi / pi);
    bc += Math.sqrt(pi * qi);
  }

  const symKl = 0.5 * (kl1 + kl2);
  const bhattacharyya = -Math.log(Math.max(1e-12, Math.min(1.0, bc)));

  return { symKl, bhattacharyya };
}

/**
 * Computes Median and Median Absolute Deviation (MAD).
 */
export function computeMedianAndMad(arr: number[]): { median: number; mad: number } {
  if (arr.length === 0) return { median: 0, mad: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const diffs = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = diffs.length % 2 === 0 ? (diffs[mid - 1] + diffs[mid]) / 2 : diffs[mid];

  return { median, mad: Math.max(1e-6, mad) };
}

/**
 * Main Audio Tamper & Forensic Integrity Analyzer (M5)
 */
export function analyzeAudioTamperM5(
  samples: Float32Array,
  sampleRate: number
): TamperDetectionResult {
  const findings: Finding[] = [];
  const splicePoints: number[] = [];

  if (samples.length < 2048) {
    return {
      hasTampering: false,
      hasClipping: false,
      hasDigitalSilence: false,
      hasDcOffset: false,
      dcOffsetValue: 0,
      clippedSampleCount: 0,
      splicePointsSec: [],
      findings: [],
    };
  }

  // 1. Digital Silence Check (consecutive zeros >= 200ms)
  const minZeroSamples = Math.floor(sampleRate * 0.2); // 200ms
  let zeroRun = 0;
  let maxZeroRun = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) === 0) {
      zeroRun++;
      if (zeroRun > maxZeroRun) maxZeroRun = zeroRun;
    } else {
      zeroRun = 0;
    }
  }
  const hasDigitalSilence = maxZeroRun >= minZeroSamples;

  if (hasDigitalSilence) {
    const durationMs = Math.round((maxZeroRun / sampleRate) * 1000);
    findings.push({
      id: 'audio-digital-silence',
      category: 'tamper',
      title: `Digital Silence Detected (${durationMs}ms exact zero run)`,
      plainText: `Found ${durationMs}ms of consecutive bit-exact 0.0 values. Natural acoustic microphones always capture thermal noise floor; digital silence indicates artificial muting or splice insertion.`,
      severity: 'warn',
      confidence: 0.99,
      evidenceKind: 'Measured',
      method: 'Bit-Exact Zero Run-Length Analysis',
      details: { zeroDurationMs: durationMs, maxZeroSamples: maxZeroRun },
      fixable: false,
    });
  }

  // 2. Hardware / Acoustic Clipping Check
  let clippedCount = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= 0.9995) {
      clippedCount++;
    }
  }
  const hasClipping = clippedCount > 20;

  if (hasClipping) {
    findings.push({
      id: 'audio-clipping-saturated',
      category: 'tamper',
      title: `Acoustic Saturation / Peak Clipping (${clippedCount} samples)`,
      plainText: `Audio stream hits hard digital limits at 0 dBFS (${clippedCount} saturated samples), introducing harmonic distortion and spectral splatter.`,
      severity: 'warn',
      confidence: 0.95,
      evidenceKind: 'Measured',
      method: 'Full-Scale Peak Saturation Counting',
      details: { clippedSampleCount: clippedCount },
      fixable: false,
    });
  }

  // 3. DC Offset Check
  let sumSamples = 0.0;
  for (let i = 0; i < samples.length; i++) sumSamples += samples[i];
  const dcOffset = sumSamples / samples.length;
  const hasDcOffset = Math.abs(dcOffset) > 0.015;

  if (hasDcOffset) {
    findings.push({
      id: 'audio-dc-offset',
      category: 'tamper',
      title: `DC Bias / Ground Loop Offset (${(dcOffset * 100).toFixed(2)}%)`,
      plainText: `Static DC voltage bias detected in recording (${(dcOffset * 100).toFixed(2)}% full scale), indicating asymmetric ADC capture or ungrounded audio hardware.`,
      severity: 'info',
      confidence: 0.92,
      evidenceKind: 'Measured',
      method: 'First Moment Statistical Expectation E[X]',
      details: { dcOffsetValue: Number(dcOffset.toFixed(4)) },
      fixable: true,
      fixDescription: 'High-pass filter DC blocker (< 15 Hz).',
    });
  }

  // 4. Spectral Flux & Median + 4*MAD Splice Detection
  const fftSize = 1024;
  const step = fftSize / 2;
  const fft = new SplitRadixRealFFT(fftSize);
  const half = fftSize / 2;

  const fluxValues: number[] = [];
  const fluxTimes: number[] = [];
  let prevMag = new Float32Array(half + 1);

  const rBuf = new Float64Array(half + 1);
  const iBuf = new Float64Array(half + 1);
  const inBuf = new Float64Array(fftSize);

  for (let offset = 0; offset + fftSize <= samples.length; offset += step) {
    for (let i = 0; i < fftSize; i++) inBuf[i] = samples[offset + i];
    fft.transformReal(inBuf, rBuf, iBuf);
    const currMag = fft.magnitudeSpectrum(rBuf, iBuf);

    if (offset > 0) {
      let flux = 0.0;
      for (let k = 0; k <= half; k++) {
        const diff = currMag[k] - prevMag[k];
        if (diff > 0) flux += diff * diff; // Half-wave rectification
      }
      fluxValues.push(flux);
      fluxTimes.push(offset / sampleRate);
    }

    prevMag = new Float32Array(currMag);
  }

  if (fluxValues.length > 10) {
    const { median, mad } = computeMedianAndMad(fluxValues);
    const threshold = median + 4.0 * mad;

    for (let i = 0; i < fluxValues.length; i++) {
      if (fluxValues[i] > threshold) {
        const timeSec = Number(fluxTimes[i].toFixed(2));
        if (!splicePoints.some(t => Math.abs(t - timeSec) < 0.4)) {
          splicePoints.push(timeSec);
        }
      }
    }
  }

  if (splicePoints.length > 0) {
    findings.push({
      id: 'spectral-flux-splice-points',
      category: 'tamper',
      title: `Acoustic Change-Point / Discontinuity (${splicePoints.length} points)`,
      plainText: `Spectral flux exceeded Median + 4*MAD statistical threshold near ${splicePoints.map(t => `${t}s`).join(', ')}, signaling abrupt room or background edits.`,
      severity: 'warn',
      confidence: 0.89,
      evidenceKind: 'Computed',
      method: 'Half-Wave Spectral Flux with Median + 4*MAD Outlier Detection',
      details: {
        spliceCount: splicePoints.length,
        splicePointsSec: splicePoints.join(', '),
      },
      fixable: false,
    });
  }

  return {
    hasTampering: splicePoints.length > 0 || hasDigitalSilence,
    hasClipping,
    hasDigitalSilence,
    hasDcOffset,
    dcOffsetValue: Number(dcOffset.toFixed(4)),
    clippedSampleCount: clippedCount,
    splicePointsSec: splicePoints,
    findings,
  };
}
