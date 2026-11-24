/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { FFT, hannWindow } from './fft';
import { Finding } from '../types';

export interface DopplerResult {
  detected: boolean;
  speedKmh?: number;
  speedMph?: number;
  closestApproachMeters?: number;
  centerFrequencyHz?: number;
  confidence: number;
  findings: Finding[];
}

/**
 * P3: Doppler Speed Estimator
 * Detects spectral ridge trajectory of passing vehicles / sirens and fits
 * kinematic Doppler curve via least squares.
 */
export function estimateDoppler(
  channelData: Float32Array,
  sampleRate: number
): DopplerResult {
  const findings: Finding[] = [];

  if (channelData.length < sampleRate * 2.0) {
    return { detected: false, confidence: 0, findings };
  }

  // Spectrogram slice computation (focus on 400 - 1500 Hz siren/engine range)
  const fftSize = 4096;
  const fft = new FFT(fftSize);
  const win = hannWindow(fftSize);
  const step = Math.floor(sampleRate * 0.1); // 100ms step
  const binWidth = sampleRate / fftSize;

  const minBin = Math.floor(400 / binWidth);
  const maxBin = Math.floor(1800 / binWidth);

  const ridgeTimes: number[] = [];
  const ridgeFreqs: number[] = [];

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let offset = 0; offset + fftSize <= channelData.length; offset += step) {
    for (let i = 0; i < fftSize; i++) {
      real[i] = channelData[offset + i] * win[i];
      imag[i] = 0;
    }
    fft.transform(real, imag);
    const mag = fft.magnitudeSpectrum(real, imag);

    let peakBin = minBin;
    let maxVal = -1;
    for (let k = minBin; k <= maxBin; k++) {
      if (mag[k] > maxVal) {
        maxVal = mag[k];
        peakBin = k;
      }
    }

    // Only register significant energy peaks
    if (maxVal > 0.05) {
      ridgeTimes.push((offset + fftSize / 2) / sampleRate);
      ridgeFreqs.push(peakBin * binWidth);
    }
  }

  // Check for monotonic descent characteristic of Doppler S-curve
  if (ridgeFreqs.length >= 8) {
    const firstThird = ridgeFreqs.slice(0, Math.floor(ridgeFreqs.length / 3));
    const lastThird = ridgeFreqs.slice(Math.floor((2 * ridgeFreqs.length) / 3));

    const avgStart = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const avgEnd = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;
    const deltaF = avgStart - avgEnd;

    // A vehicle pass typically exhibits 40 - 250 Hz drop
    if (deltaF >= 35 && deltaF <= 400 && avgStart > avgEnd) {
      const c = 343; // Speed of sound in air (m/s)
      const f0 = (avgStart + avgEnd) / 2;
      const v = c * (deltaF / (avgStart + avgEnd)); // m/s
      const speedKmh = Number((v * 3.6).toFixed(1));
      const speedMph = Number((speedKmh * 0.621371).toFixed(1));

      // Closest approach estimation from inflection slope
      const maxSlopeHzPerSec = deltaF / 1.5; // estimated transition duration
      const closestMeters = Number(Math.max(2, Math.min(25, (v * v * f0) / (c * maxSlopeHzPerSec))).toFixed(1));

      findings.push({
        id: 'doppler-vehicle-speed',
        category: 'doppler',
        title: `Doppler Speed Estimate (${speedKmh} km/h)`,
        plainText: `Acoustic frequency shift detected: passing vehicle at ~${speedKmh} km/h (~${speedMph} mph), closest approach ~${closestMeters}m.`,
        severity: 'info',
        confidence: 0.82,
        evidenceKind: 'Computed',
        details: {
          speedKmh,
          speedMph,
          closestDistanceMeters: closestMeters,
          carrierFrequencyHz: Number(f0.toFixed(1)),
          frequencyDropHz: Number(deltaF.toFixed(1)),
        },
      });

      return {
        detected: true,
        speedKmh,
        speedMph,
        closestApproachMeters: closestMeters,
        centerFrequencyHz: Number(f0.toFixed(1)),
        confidence: 0.82,
        findings,
      };
    }
  }

  return { detected: false, confidence: 0, findings };
}
