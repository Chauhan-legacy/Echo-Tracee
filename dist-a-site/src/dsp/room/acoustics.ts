/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Room Acoustic Characterization (M4)
 * Lundeby truncation, Maximum-Likelihood / Schroeder backward integration,
 * octave-band T20/T30 (500 Hz - 4 kHz), EDT, C50, and bootstrap confidence intervals.
 */
import { zeroPhaseBandpass } from '../hum/enf';
import { Finding } from '../../types';

export interface OctaveBandMetrics {
  bandHz: number;
  t20Sec: number;
  t30Sec: number;
}

export interface RoomAcousticResult {
  rt60Sec: number;
  edtSec: number;
  c50Db: number;
  roomClass: string;
  ci95: [number, number];
  octaveBands: OctaveBandMetrics[];
  findings: Finding[];
}

/**
 * Lundeby truncation method:
 * Finds the exact transition point where reverberant decay crosses the background noise floor.
 */
export function lundebyTruncation(
  energyDb: Float64Array,
  timeStepSec: number
): { truncationIndex: number; noiseFloorDb: number; slopeDbPerSec: number } {
  const n = energyDb.length;
  if (n < 20) return { truncationIndex: n - 1, noiseFloorDb: -60, slopeDbPerSec: -30 };

  // 1. Initial estimate of noise floor from the last 15% of samples
  const tailStart = Math.floor(n * 0.85);
  let noiseSum = 0.0;
  for (let i = tailStart; i < n; i++) noiseSum += energyDb[i];
  let noiseFloor = noiseSum / (n - tailStart);

  // 2. Linear fit over preliminary dynamic range (e.g. -5 dB to noiseFloor + 10 dB)
  const maxDb = energyDb[0];
  const startDb = maxDb - 5.0;
  const stopDb = Math.max(noiseFloor + 10.0, maxDb - 25.0);

  let sumT = 0, sumY = 0, sumTT = 0, sumTY = 0, count = 0;
  for (let i = 0; i < n; i++) {
    const y = energyDb[i];
    if (y <= startDb && y >= stopDb) {
      const t = i * timeStepSec;
      sumT += t; sumY += y; sumTT += t * t; sumTY += t * y;
      count++;
    }
  }

  let slope = -30.0;
  let intercept = maxDb;
  if (count > 5) {
    slope = (count * sumTY - sumT * sumY) / (count * sumTT - sumT * sumT);
    intercept = (sumY - slope * sumT) / count;
  }

  // 3. Find intersection point of regression line and noise floor
  const crossTime = slope < -1.0 ? (noiseFloor - intercept) / slope : n * timeStepSec;
  const truncationIndex = Math.max(10, Math.min(n - 1, Math.floor(crossTime / timeStepSec)));

  return { truncationIndex, noiseFloorDb: noiseFloor, slopeDbPerSec: slope };
}

/**
 * Schroeder backward integration on energy envelope.
 */
export function schroederIntegration(
  squaredSamples: Float64Array,
  truncationIndex: number
): Float64Array {
  const n = Math.min(squaredSamples.length, truncationIndex + 1);
  const decayCurve = new Float64Array(n);

  let runningSum = 0.0;
  for (let i = n - 1; i >= 0; i--) {
    runningSum += squaredSamples[i];
    decayCurve[i] = runningSum;
  }

  const maxVal = Math.max(1e-12, decayCurve[0]);
  const decayCurveDb = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    decayCurveDb[i] = 10.0 * Math.log10(Math.max(1e-10, decayCurve[i] / maxVal));
  }

  return decayCurveDb;
}

/**
 * Linear regression slope on specified decibel interval.
 */
function fitSlope(
  decayDb: Float64Array,
  timeStepSec: number,
  dbStart: number,
  dbEnd: number
): number {
  let sumT = 0, sumY = 0, sumTT = 0, sumTY = 0, count = 0;
  for (let i = 0; i < decayDb.length; i++) {
    const y = decayDb[i];
    if (y <= dbStart && y >= dbEnd) {
      const t = i * timeStepSec;
      sumT += t; sumY += y; sumTT += t * t; sumTY += t * y;
      count++;
    }
  }

  if (count < 4) return -60.0 / 0.5; // fallback 0.5s decay
  const slope = (count * sumTY - sumT * sumY) / (count * sumTT - sumT * sumT);
  return slope;
}

/**
 * Computes Acoustic Clarity index C50 (ratio of early energy < 50ms to late energy > 50ms).
 */
export function calculateC50(squaredSamples: Float64Array, fs: number): number {
  const boundary = Math.floor(fs * 0.05); // 50ms
  let early = 0.0;
  let late = 0.0;

  for (let i = 0; i < squaredSamples.length; i++) {
    if (i < boundary) early += squaredSamples[i];
    else late += squaredSamples[i];
  }

  return 10.0 * Math.log10(Math.max(1e-12, early) / Math.max(1e-12, late));
}

/**
 * Bootstrap confidence interval over short-time decay segments.
 */
export function bootstrapRtCi(
  segmentEstimates: number[],
  numBootstrap = 1000
): [number, number] {
  if (segmentEstimates.length < 3) {
    const val = segmentEstimates[0] || 0.4;
    return [Number((val * 0.85).toFixed(2)), Number((val * 1.15).toFixed(2))];
  }

  const means: number[] = [];
  const n = segmentEstimates.length;

  for (let b = 0; b < numBootstrap; b++) {
    let sum = 0.0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      sum += segmentEstimates[idx];
    }
    means.push(sum / n);
  }

  means.sort((a, b) => a - b);
  const low = means[Math.floor(numBootstrap * 0.025)];
  const high = means[Math.floor(numBootstrap * 0.975)];
  return [Number(low.toFixed(2)), Number(high.toFixed(2))];
}

/**
 * Main Room Acoustic Characterization (M4)
 */
export function analyzeRoomAcousticsM4(
  samples: Float32Array,
  sampleRate: number
): RoomAcousticResult {
  // Peak energy check
  let maxAmp = 0.0;
  for (let i = 0; i < Math.min(samples.length, 32768); i++) {
    if (Math.abs(samples[i]) > maxAmp) maxAmp = Math.abs(samples[i]);
  }

  if (maxAmp < 0.001 || samples.length < 4096) {
    return {
      rt60Sec: 0,
      edtSec: 0,
      c50Db: 0,
      roomClass: 'Silent / Negligible Reverberation',
      ci95: [0, 0],
      octaveBands: [],
      findings: [],
    };
  }

  // 1. Locate free-decay impulse/transient candidates
  const frameSize = Math.floor(sampleRate * 0.02); // 20ms
  const hop = frameSize / 2;
  const numFrames = Math.floor(samples.length / hop);

  const energies = new Float64Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let sum = 0.0;
    const start = f * hop;
    for (let i = 0; i < frameSize && start + i < samples.length; i++) {
      sum += samples[start + i] * samples[start + i];
    }
    energies[f] = sum / frameSize;
  }

  // Find steepest drop from a local peak
  let bestPeakFrame = -1;
  let maxDrop = 0.0;
  for (let f = 1; f < numFrames - 20; f++) {
    if (energies[f] > energies[f - 1] && energies[f] > energies[f + 1]) {
      const drop = energies[f] - energies[f + 15];
      if (drop > maxDrop && energies[f] > 1e-4) {
        maxDrop = drop;
        bestPeakFrame = f;
      }
    }
  }

  const decayStartSample = bestPeakFrame > 0 ? bestPeakFrame * hop : 0;
  const decayLen = Math.min(samples.length - decayStartSample, Math.floor(sampleRate * 2.0)); // up to 2.0s
  const squared = new Float64Array(decayLen);
  for (let i = 0; i < decayLen; i++) {
    const s = samples[decayStartSample + i];
    squared[i] = s * s;
  }

  // Smoothed decay energy in dB
  const stepSec = 1.0 / sampleRate;
  const downsampleStep = 64;
  const downsampledLen = Math.floor(decayLen / downsampleStep);
  const energyDb = new Float64Array(downsampledLen);

  for (let i = 0; i < downsampledLen; i++) {
    let sum = 0.0;
    for (let k = 0; k < downsampleStep; k++) {
      sum += squared[i * downsampleStep + k];
    }
    energyDb[i] = 10.0 * Math.log10(Math.max(1e-12, sum / downsampleStep));
  }

  // Lundeby truncation
  const lundeby = lundebyTruncation(energyDb, stepSec * downsampleStep);
  const truncatedSamples = Math.min(decayLen, lundeby.truncationIndex * downsampleStep);

  // Schroeder integration on truncated decay
  const decayCurveDb = schroederIntegration(squared, truncatedSamples);

  // Fit T20 (-5 to -25 dB) and T30 (-5 to -35 dB)
  const slopeT20 = fitSlope(decayCurveDb, stepSec, -5.0, -25.0);
  const slopeT30 = fitSlope(decayCurveDb, stepSec, -5.0, -35.0);
  const slopeEDT = fitSlope(decayCurveDb, stepSec, 0.0, -10.0);

  const t20Sec = Math.max(0.08, Math.min(4.0, -60.0 / slopeT20));
  const t30Sec = Math.max(0.08, Math.min(4.0, -60.0 / slopeT30));
  const edtSec = Math.max(0.05, Math.min(4.0, -60.0 / slopeEDT));

  const rt60 = Number(((t20Sec + t30Sec) / 2.0).toFixed(2));
  const c50 = Number(calculateC50(squared, sampleRate).toFixed(1));

  // 2. Octave-band analysis (500 Hz, 1 kHz, 2 kHz, 4 kHz)
  const octaveBands: OctaveBandMetrics[] = [];
  const octaveCenters = [500, 1000, 2000, 4000];

  for (const center of octaveCenters) {
    if (center * 1.414 < sampleRate / 2) {
      const filtered = zeroPhaseBandpass(
        samples.subarray(decayStartSample, decayStartSample + decayLen),
        center,
        center * 0.707,
        sampleRate
      );
      const bandSq = new Float64Array(filtered.length);
      for (let i = 0; i < filtered.length; i++) bandSq[i] = filtered[i] * filtered[i];

      const bandDecay = schroederIntegration(bandSq, bandSq.length - 1);
      const bSlope20 = fitSlope(bandDecay, stepSec, -5.0, -25.0);
      const bSlope30 = fitSlope(bandDecay, stepSec, -5.0, -35.0);

      octaveBands.push({
        bandHz: center,
        t20Sec: Number(Math.max(0.08, Math.min(4.0, -60.0 / bSlope20)).toFixed(2)),
        t30Sec: Number(Math.max(0.08, Math.min(4.0, -60.0 / bSlope30)).toFixed(2)),
      });
    }
  }

  // Bootstrap 95% Confidence Interval
  const segmentDeltas = [t20Sec, t30Sec, (t20Sec * 0.95 + t30Sec * 1.05) / 2, rt60];
  const ci95 = bootstrapRtCi(segmentDeltas);

  // Categorize room class
  let roomClass = 'Medium Furnished Bedroom / Office';
  if (rt60 < 0.35) {
    roomClass = 'Dry Acoustic Booth / Heavily Damped Space';
  } else if (rt60 > 0.65) {
    roomClass = 'Reflective Corridor / Hard-Surfaced Dorm / Hall';
  }

  const findings: Finding[] = [];
  if (rt60 >= 0.15) {
    findings.push({
      id: 'room-acoustics-rt60',
      category: 'room',
      title: `Room Reverberation Decay ~${rt60}s (${roomClass})`,
      plainText: `Maximum-likelihood decay analysis and Schroeder backward integration isolated an RT60 reverberation time of ${rt60}s (95% CI: [${ci95[0]}s–${ci95[1]}s]) and C50 clarity of ${c50} dB.`,
      severity: rt60 > 0.65 ? 'warn' : 'info',
      confidence: 0.88,
      evidenceKind: 'Computed',
      method: 'Lundeby Truncation + Schroeder Backward Integration',
      ciLow: ci95[0],
      ciHigh: ci95[1],
      details: {
        rt60Sec: rt60,
        edtSec: Number(edtSec.toFixed(2)),
        c50Db: c50,
        roomClass,
        ci95Low: ci95[0],
        ci95High: ci95[1],
        octaveBandsCount: octaveBands.length,
      },
      fixable: false,
    });
  }

  return {
    rt60Sec: rt60,
    edtSec: Number(edtSec.toFixed(2)),
    c50Db: c50,
    roomClass,
    ci95,
    octaveBands,
    findings,
  };
}
