/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
export type Severity = 'info' | 'warn' | 'critical';

export type EvidenceKind = 'Measured' | 'Computed' | 'Inferred' | 'Unverified';

export type CheckCategory =
  | 'hum'
  | 'ultrasonic'
  | 'room'
  | 'visual'
  | 'metadata'
  | 'speech'
  | 'scene'
  | 'doppler'
  | 'tamper'
  | 'id_check';

export interface Finding {
  id: string;
  category: CheckCategory;
  title: string;
  plainText: string;
  severity: Severity;
  confidence: number; // 0.0 to 1.0
  evidenceKind: EvidenceKind;
  timeRange?: [number, number]; // [startSec, endSec]
  details: Record<string, string | number | boolean | null | undefined>;
  fixable?: boolean;
  fixDescription?: string;

  // V3 Statistical & Methodological Rigor (M7 / Ensemble)
  method?: string;
  effectSize?: number;
  pValue?: number;
  pfa?: number;
  ciLow?: number;
  ciHigh?: number;
  modelType?: 'math' | 'model' | 'ensemble';
  modelAgreement?: string;
}

export interface ScoreContribution {
  findingId: string;
  title: string;
  category: CheckCategory;
  severity: Severity;
  confidence: number;
  weight: number;
  points: number;
  explanation: string;
}

export interface LeakScoreResult {
  totalScore: number; // 0 to 100
  scoreLow?: number;  // 95% CI low
  scoreHigh?: number; // 95% CI high
  rating: 'Clean' | 'Low Risk' | 'Moderate Leak' | 'Severe Leak' | 'Critical Exposure';
  color: string;
  contributions: ScoreContribution[];
  weightsExplanation?: Record<string, number>;
}

export interface AudioScanInput {
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface VideoFrameSample {
  timestamp: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface MetadataReport {
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    locationName?: string;
  };
  creationTime?: string;
  deviceModel?: string;
  software?: string;
  rawTags: Record<string, string>;
  isDemo?: boolean;
}

export interface VisualFindingBox {
  x: number; // normalized 0..1
  y: number;
  width: number;
  height: number;
  label: string;
  type: 'face' | 'text' | 'card' | 'badge';
  timestamp: number;
}

export interface ScanResult {
  sourceName: string;
  duration: number;
  sha256: string;
  findings: Finding[];
  leakScore: LeakScoreResult;
  metadata: MetadataReport;
  visualBoxes: VisualFindingBox[];
  analysisTimeMs?: number;
  realtimeFactor?: number;
  spectrogramData?: {
    frequencies: Float32Array;
    times: Float32Array;
    magnitudeMatrix: Float32Array[]; // time steps of FFT magnitudes
    maxFreq: number;
  };
  audioMetrics: {
    sampleRate: number;
    channels: number;
    codecCutoffHz?: number;
    detectedHumHz?: number;
    humGridFamily?: string;
    rt60EstimateSec?: number;
  };
  isDemo?: boolean;
}

export interface FixReport {
  originalScore: number;
  newScore: number;
  originalSha256: string;
  fixedSha256: string;
  timestamp: string;
  actionsTaken: string[];
  dbReductions: Record<string, number>;
  unfixableItems: string[];
  audioQualityImpact: string;
  fixedBlobUrl: string;
  signature?: string;
  publicKeyJwk?: JsonWebKey;
  merkleRoot?: string;
  residualRiskNotice?: string;
  logSpectralDistanceDb?: number;
  segmentalSnrDb?: number;
}
