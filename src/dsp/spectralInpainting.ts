/**
 * Forensic Noise-Floor-Matched Spectral Inpainting & Spectral Hole Detector (Bug 5 Fix)
 * Ensures sanitized audio does not leave an artificial, detectable null notch.
 */

import { evaluateGoertzelBin } from '../../packages/echotrace-math/src/spectral/goertzel';
import { inpaintSpectralNotch } from '../../packages/echotrace-math/src/privacy/spectralInpainting';

export interface SpectralHoleDetectionResult {
  hasArtificialHole: boolean;
  dropDb: number;
  confidence: number;
}

/**
 * Detects unnatural spectral holes (plain notch filter artifacts) at a target frequency.
 */
export function detectSpectralHoles(
  signal: Float32Array,
  centerFreq: number,
  sampleRate: number
): SpectralHoleDetectionResult {
  const targetBin = evaluateGoertzelBin(signal, sampleRate, centerFreq);
  const leftNeighbor = evaluateGoertzelBin(signal, sampleRate, Math.max(10, centerFreq - 250));
  const rightNeighbor = evaluateGoertzelBin(signal, sampleRate, Math.min(sampleRate / 2 - 10, centerFreq + 250));

  const ambientMagnitude = (leftNeighbor.magnitude + rightNeighbor.magnitude) / 2;
  const targetMagnitude = Math.max(1e-9, targetBin.magnitude);

  // Measure relative drop
  const dropDb = 20 * Math.log10(Math.max(1e-9, ambientMagnitude) / targetMagnitude);

  // A drop greater than 20 dB indicates an artificial zeroed-out notch hole
  const hasArtificialHole = dropDb > 20.0;
  const confidence = Math.min(1.0, Math.max(0.0, (dropDb - 10.0) / 20.0));

  return {
    hasArtificialHole,
    dropDb: Number(dropDb.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
  };
}

/**
 * Inpaints a spectral band by removing a discrete sinusoidal tone/hum and replacing
 * it with phase-randomized, noise-floor-matched ambient energy.
 */
export function inpaintSpectralBand(
  signal: Float32Array,
  centerFreq: number,
  bandwidth: number,
  sampleRate: number
): Float32Array {
  const f64 = new Float64Array(signal.length);
  for (let i = 0; i < signal.length; i++) f64[i] = signal[i]!;

  const res64 = inpaintSpectralNotch(f64, {
    sampleRate,
    centerFrequencyHz: centerFreq,
    bandwidthHz: bandwidth,
  });

  const out = new Float32Array(res64.length);
  for (let i = 0; i < res64.length; i++) out[i] = Number(res64[i]!);
  return out;
}
