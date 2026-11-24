import { FFT, blackmanHarrisWindow, quadraticInterpolation } from './fft';
import { Finding } from '../types';
import { APP_COPY } from '../constants/copy';

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
 */
export function analyzeUltrasonicTones(
  channelData: Float32Array,
  sampleRate: number
): UltrasonicAnalysisResult {
  const findings: Finding[] = [];

  // 1. Guard: Nyquist frequency check
  const nyquist = sampleRate / 2;
  if (sampleRate < 44100) {
    const cannotReason = `Sample rate is ${sampleRate} Hz (Nyquist limit ${nyquist} Hz). Ultrasonic analysis requires at least 44.1 kHz.`;
    findings.push({
      id: 'ultrasonic-low-sample-rate',
      category: 'ultrasonic',
      title: 'Ultrasonic Spectrum Unverifiable',
      plainText: cannotReason,
      severity: 'info',
      confidence: 1.0,
      evidenceKind: 'Unverified',
      details: {
        sampleRateHz: sampleRate,
        nyquistLimitHz: nyquist,
        requiredMinRateHz: 44100,
        honestyNotice: APP_COPY.honesty.codecCutoffNotice,
      },
    });

    return {
      detected: false,
      tones: [],
      cannotCheckReason: cannotReason,
      findings,
    };
  }

  // 2. Guard: Audio duration and silence check
  if (channelData.length < sampleRate * 1.0) {
    return { detected: false, tones: [], findings };
  }

  let totalEnergy = 0;
  for (let i = 0; i < channelData.length; i++) {
    totalEnergy += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(totalEnergy / channelData.length);
  if (rms < 1e-5) {
    return { detected: false, tones: [], findings };
  }

  // 3. Codec cutoff check
  // Compare energy in 10-14 kHz vs 18-21 kHz. If high frequency energy drops by >45 dB or is virtually 0,
  // the file was compressed by an MP3/AAC encoder with a low-pass cutoff.
  const fftSize = 4096;
  const fft = new FFT(fftSize);
  const win = blackmanHarrisWindow(fftSize);
  const binWidth = sampleRate / fftSize;

  const testFrames = Math.min(10, Math.floor(channelData.length / fftSize));
  let energyMid = 0;
  let energyHigh = 0;

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let f = 0; f < testFrames; f++) {
    const offset = f * fftSize;
    for (let i = 0; i < fftSize; i++) {
      real[i] = channelData[offset + i] * win[i];
      imag[i] = 0;
    }
    fft.transform(real, imag);
    const mag = fft.magnitudeSpectrum(real, imag);

    for (let k = 0; k < mag.length; k++) {
      const freq = k * binWidth;
      const power = mag[k] * mag[k];
      if (freq >= 8000 && freq <= 14000) energyMid += power;
      if (freq >= 18500 && freq <= 21500) energyHigh += power;
    }
  }

  if (energyMid > 1e-4 && energyHigh / energyMid < 1e-5) {
    // Sharp codec cutoff detected
    const cutoffEst = 16000;
    findings.push({
      id: 'ultrasonic-codec-cutoff',
      category: 'ultrasonic',
      title: 'High Frequencies Stripped by Audio Codec',
      plainText: `Audio compression cut off frequencies above ~${(cutoffEst / 1000).toFixed(0)} kHz. Ultrasonic beacon presence cannot be verified.`,
      severity: 'info',
      confidence: 0.95,
      evidenceKind: 'Measured',
      details: {
        estimatedCutoffHz: cutoffEst,
        midEnergy: energyMid,
        highEnergy: energyHigh,
        honestyNotice: APP_COPY.honesty.codecCutoffNotice,
      },
    });

    return {
      detected: false,
      tones: [],
      cannotCheckReason: `Audio compressed with cutoff near ${(cutoffEst / 1000).toFixed(0)} kHz`,
      codecCutoffHz: cutoffEst,
      findings,
    };
  }

  // 4. CFAR High-Resolution Tone Detection (17 kHz - 22 kHz)
  // Use sliding window of size 16384 (resolution ~2.69 Hz at 44.1 kHz, ~2.93 Hz at 48 kHz)
  const analysisFftSize = channelData.length >= 16384 ? 16384 : 8192;
  const analysisFft = new FFT(analysisFftSize);
  const analysisWin = blackmanHarrisWindow(analysisFftSize);
  const step = Math.floor(sampleRate * 0.5); // 0.5s step
  const aBinWidth = sampleRate / analysisFftSize;

  const minSearchBin = Math.floor(17000 / aBinWidth);
  const maxSearchBin = Math.min(analysisFftSize / 2 - 20, Math.floor(22000 / aBinWidth));

  const candidateTracker: Map<number, { times: number[]; snrs: number[]; exactFreqs: number[] }> = new Map();

  const rBuf = new Float32Array(analysisFftSize);
  const iBuf = new Float32Array(analysisFftSize);

  for (let offset = 0; offset + analysisFftSize <= channelData.length; offset += step) {
    for (let i = 0; i < analysisFftSize; i++) {
      rBuf[i] = channelData[offset + i] * analysisWin[i];
      iBuf[i] = 0;
    }
    analysisFft.transform(rBuf, iBuf);
    const mag = analysisFft.magnitudeSpectrum(rBuf, iBuf);

    const currentTime = (offset + analysisFftSize / 2) / sampleRate;

    // CFAR with Guard cells = 4, Training cells = 16
    const G = 4;
    const T = 16;
    const alphaThreshold = 3.8; // ~11.5 dB peak-to-noise ratio

    const normFactor = analysisFftSize / 2;

    for (let k = minSearchBin + G + T; k <= maxSearchBin - G - T; k++) {
      const cellVal = mag[k] / normFactor;
      // Guard: must have real physical acoustic energy (at least -46 dBFS)
      if (cellVal < 0.005) continue;

      // Local noise estimate from leading and trailing training cells
      let trainSum = 0;
      for (let t = 1; t <= T; t++) {
        trainSum += (mag[k - G - t] + mag[k + G + t]) / normFactor;
      }
      const noiseEst = Math.max(1e-6, trainSum / (2 * T));

      if (cellVal > noiseEst * alphaThreshold && cellVal > (mag[k - 1] / normFactor) && cellVal > (mag[k + 1] / normFactor)) {
        // Peak confirmed
        const { fractionalOffset } = quadraticInterpolation(mag[k - 1], mag[k], mag[k + 1]);
        const exactFreq = (k + fractionalOffset) * aBinWidth;
        const snrDb = 20 * Math.log10(cellVal / noiseEst);

        // Group into ~20 Hz bins for time tracking
        const clusterKey = Math.round(exactFreq / 25) * 25;
        if (!candidateTracker.has(clusterKey)) {
          candidateTracker.set(clusterKey, { times: [], snrs: [], exactFreqs: [] });
        }
        const record = candidateTracker.get(clusterKey)!;
        record.times.push(currentTime);
        record.snrs.push(snrDb);
        record.exactFreqs.push(exactFreq);
      }
    }
  }

  // 5. Evaluate detected candidates: must persist for >= 1.5 s
  const detectedTones: UltrasonicTone[] = [];

  for (const [, track] of candidateTracker.entries()) {
    if (track.times.length >= 3) {
      // At least 3 detections (1.5 seconds)
      const minTime = Math.min(...track.times);
      const maxTime = Math.max(...track.times);
      const duration = maxTime - minTime;

      // Average exact frequency
      const avgFreq = track.exactFreqs.reduce((a, b) => a + b, 0) / track.exactFreqs.length;
      const avgSnr = track.snrs.reduce((a, b) => a + b, 0) / track.snrs.length;

      // Check for keying / modulation (OOK): gaps in detection or amplitude variation
      const timeSpan = maxTime - minTime;
      const isKeyed = timeSpan > 3.0 && track.times.length < (timeSpan / 0.5) * 0.85;

      detectedTones.push({
        freqHz: Number(avgFreq.toFixed(1)),
        snrDb: Number(avgSnr.toFixed(1)),
        durationSec: Number(duration.toFixed(1)),
        isKeyed,
        timeRange: [Number(minTime.toFixed(1)), Number(maxTime.toFixed(1))],
      });
    }
  }

  // 6. Build Findings
  for (const tone of detectedTones) {
    findings.push({
      id: `ultrasonic-beacon-${tone.freqHz}`,
      category: 'ultrasonic',
      title: `Ultrasonic Tracking Beacon (${tone.freqHz} Hz)`,
      plainText: `Inaudible acoustic tracker detected at ${tone.freqHz} Hz (active ${tone.timeRange[0]}s–${tone.timeRange[1]}s). Used for silent cross-device advertising and TV tracking.`,
      severity: 'critical',
      confidence: Math.min(0.99, Math.max(0.85, tone.snrDb / 30)),
      evidenceKind: 'Measured',
      timeRange: tone.timeRange,
      details: {
        frequencyHz: tone.freqHz,
        snrDb: tone.snrDb,
        durationSec: tone.durationSec,
        modulationType: tone.isKeyed ? 'Keyed / Modulated Payload' : 'Continuous Carrier Tone',
        threat: 'Cross-Device Acoustic Tracking (SilverPush/Shopkick profile)',
      },
      fixable: true,
      fixDescription: `Apply narrow biquad notch filter (Q=30) centered at ${tone.freqHz} Hz to strip the tracker.`,
    });
  }

  return {
    detected: detectedTones.length > 0,
    tones: detectedTones,
    findings,
  };
}
