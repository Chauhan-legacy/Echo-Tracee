/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { Finding } from '../types';
import { analyzeUltrasonicBeaconsM3 } from './beacons/cfar';

export interface UltrasonicTone {
  freqHz: number;
  snrDb: number;
  durationSec: number;
  isKeyed: boolean;
  timeRange: [number, number];
}

export interface UltrasonicAnalysisResult {
  detected: boolean;
  tones: UltrasonicTone[];
  cannotCheckReason?: string;
  codecCutoffHz?: number;
  findings: Finding[];
}

/**
 * Analyzes audio for ultrasonic acoustic tracking beacons (17 kHz - 22 kHz).
 * Delegates to M3 Neyman-Pearson CA-CFAR/OS-CFAR and Multitaper PSD engine.
 */
export function analyzeUltrasonicTones(
  channelData: Float32Array,
  sampleRate: number
): UltrasonicAnalysisResult {
  const m3Res = analyzeUltrasonicBeaconsM3(channelData, sampleRate, 1e-6);

  const tones: UltrasonicTone[] = m3Res.beacons.map(b => ({
    freqHz: b.frequencyHz,
    snrDb: b.snrDb,
    durationSec: b.durationSec,
    isKeyed: Boolean(b.keyingRateBaud && b.keyingRateBaud > 0),
    timeRange: [3.0, Math.min(15.0, b.durationSec)],
  }));

  return {
    detected: m3Res.detected,
    tones,
    cannotCheckReason: m3Res.cannotCheckUltrasonic
      ? `Sample rate is ${sampleRate} Hz (Nyquist limit ${sampleRate / 2} Hz). Ultrasonic analysis requires at least 44.1 kHz.`
      : undefined,
    codecCutoffHz: m3Res.codecCutoffHz ?? undefined,
    findings: m3Res.findings,
  };
}
