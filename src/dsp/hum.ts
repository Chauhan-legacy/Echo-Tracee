import { Finding } from '../types';
import { analyzeHumM2 } from './hum/enf';

export interface HumAnalysisResult {
  detected: boolean;
  baseFrequencyHz?: number;
  gridFamily?: '50Hz' | '60Hz';
  snrDb: number;
  confidence: number;
  harmonicPeaks: { harmonic: number; freqHz: number; snrDb: number }[];
  editTimestamps: number[];
  findings: Finding[];
}

/**
 * Analyzes audio for mains hum / Electric Network Frequency (ENF).
 * Delegates to M2 high-resolution ESPRIT, harmonic consistency, and Page's CUSUM engine.
 */
export function analyzeHum(
  samples: Float32Array,
  sampleRate: number
): HumAnalysisResult {
  const m2Res = analyzeHumM2(samples, sampleRate);

  return {
    detected: m2Res.detected,
    baseFrequencyHz: m2Res.baseFrequencyHz > 0 ? m2Res.baseFrequencyHz : undefined,
    gridFamily: m2Res.gridFamily === '50Hz' || m2Res.gridFamily === '60Hz' ? m2Res.gridFamily : undefined,
    snrDb: m2Res.harmonics[0]?.snrDb ?? 0,
    confidence: m2Res.confidence,
    harmonicPeaks: m2Res.harmonics.map(h => ({
      harmonic: h.harmonicNumber,
      freqHz: h.frequencyHz,
      snrDb: h.snrDb,
    })),
    editTimestamps: m2Res.editsDetected.map(e => e.timeSec),
    findings: m2Res.findings,
  };
}
