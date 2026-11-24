import { FFT, blackmanHarrisWindow, quadraticInterpolation } from './fft';
import { Finding } from '../types';
import { APP_COPY } from '../constants/copy';

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
 * Low-pass anti-aliasing FIR filter and downsampler to target ~1000 Hz.
 */
function downsampleTo1kHz(samples: Float32Array, inputRate: number): {
  downsampled: Float32Array;
  downRate: number;
} {
  const decimation = Math.max(1, Math.round(inputRate / 1000));
  const downRate = inputRate / decimation;
  const outLength = Math.floor(samples.length / decimation);
  const out = new Float32Array(outLength);

  // Simple, robust moving average / low-pass kernel of length = decimation
  const filterLen = decimation;
  let runningSum = 0;
  for (let i = 0; i < filterLen && i < samples.length; i++) {
    runningSum += samples[i];
  }

  for (let i = 0; i < outLength; i++) {
    const centerIdx = i * decimation;
    // Windowed average around centerIdx
    let sum = 0;
    let count = 0;
    const start = Math.max(0, centerIdx - Math.floor(filterLen / 2));
    const end = Math.min(samples.length, start + filterLen);
    for (let j = start; j < end; j++) {
      sum += samples[j];
      count++;
    }
    out[i] = count > 0 ? sum / count : 0;
  }

  return { downsampled: out, downRate };
}

/**
 * Extracts peak frequency and local SNR within a frequency band [minFreq, maxFreq].
 */
function findPeakInBand(
  mag: Float32Array,
  fftSize: number,
  sampleRate: number,
  minFreq: number,
  maxFreq: number
): { freq: number; snrDb: number; peakMag: number } | null {
  const binWidth = sampleRate / fftSize;
  const minBin = Math.max(1, Math.floor(minFreq / binWidth));
  const maxBin = Math.min(mag.length - 2, Math.ceil(maxFreq / binWidth));

  if (minBin >= maxBin) return null;

  let peakBin = minBin;
  let maxVal = -1;

  for (let k = minBin; k <= maxBin; k++) {
    if (mag[k] > maxVal) {
      maxVal = mag[k];
      peakBin = k;
    }
  }

  // Guard: peak must have physical energy above quantization floor (-46 dBFS)
  const normalizedPeak = maxVal / (fftSize / 2);
  if (normalizedPeak < 0.005 || peakBin <= 0 || peakBin >= mag.length - 1) {
    return null;
  }

  // Calculate local noise floor (excluding peak and 2 neighbor bins on each side)
  let noiseSum = 0;
  let noiseCount = 0;
  for (let k = Math.max(1, minBin - 8); k <= Math.min(mag.length - 1, maxBin + 8); k++) {
    if (Math.abs(k - peakBin) > 2) {
      noiseSum += mag[k];
      noiseCount++;
    }
  }

  const noiseFloor = noiseCount > 0 ? noiseSum / noiseCount : 1e-9;
  const snr = maxVal / Math.max(1e-9, noiseFloor);
  const snrDb = 20 * Math.log10(Math.max(1e-6, snr));

  // Parabolic interpolation for sub-bin precision
  const alpha = mag[peakBin - 1];
  const beta = mag[peakBin];
  const gamma = mag[peakBin + 1];
  const { fractionalOffset } = quadraticInterpolation(alpha, beta, gamma);

  const interpolatedFreq = (peakBin + fractionalOffset) * binWidth;

  return {
    freq: interpolatedFreq,
    snrDb,
    peakMag: maxVal,
  };
}

/**
 * Analyzes audio for mains electricity hum and frequency jump edit splices.
 */
export function analyzeHum(
  channelData: Float32Array,
  sampleRate: number
): HumAnalysisResult {
  const findings: Finding[] = [];

  // Silence or very short audio guard
  if (channelData.length < sampleRate * 1.0) {
    return {
      detected: false,
      snrDb: 0,
      confidence: 0,
      harmonicPeaks: [],
      editTimestamps: [],
      findings,
    };
  }

  // Check overall RMS to avoid false alarms on pure silence
  let rmsSum = 0;
  for (let i = 0; i < channelData.length; i++) {
    rmsSum += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(rmsSum / channelData.length);
  if (rms < 1e-5) {
    // Pure silence
    return {
      detected: false,
      snrDb: 0,
      confidence: 0,
      harmonicPeaks: [],
      editTimestamps: [],
      findings,
    };
  }

  // 1. Downsample to ~1000 Hz for high spectral resolution
  const { downsampled, downRate } = downsampleTo1kHz(channelData, sampleRate);

  // 2. STFT with large FFT size (8192 or 4096)
  const fftSize = downsampled.length >= 8192 ? 8192 : 4096;
  if (downsampled.length < fftSize) {
    return {
      detected: false,
      snrDb: 0,
      confidence: 0,
      harmonicPeaks: [],
      editTimestamps: [],
      findings,
    };
  }

  const fft = new FFT(fftSize);
  const window = blackmanHarrisWindow(fftSize);

  // Analyze time slices for edit detection & accumulate long-term spectrum
  const stepSize = Math.floor(downRate * 0.5); // 0.5s step
  const timeSlices: { timeSec: number; peak50: number; peak60: number; mag50: number; mag60: number }[] = [];

  const accumMag = new Float32Array(fftSize / 2);
  let sliceCount = 0;

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);

  for (let offset = 0; offset + fftSize <= downsampled.length; offset += stepSize) {
    for (let i = 0; i < fftSize; i++) {
      real[i] = downsampled[offset + i] * window[i];
      imag[i] = 0;
    }

    fft.transform(real, imag);
    const mag = fft.magnitudeSpectrum(real, imag);

    for (let k = 0; k < accumMag.length; k++) {
      accumMag[k] += mag[k];
    }
    sliceCount++;

    const t = (offset + fftSize / 2) / downRate;
    const p50 = findPeakInBand(mag, fftSize, downRate, 48.0, 52.0);
    const p60 = findPeakInBand(mag, fftSize, downRate, 58.0, 62.0);

    timeSlices.push({
      timeSec: t,
      peak50: p50 ? p50.freq : 50,
      peak60: p60 ? p60.freq : 60,
      mag50: p50 ? p50.snrDb : 0,
      mag60: p60 ? p60.snrDb : 0,
    });
  }

  if (sliceCount > 0) {
    for (let k = 0; k < accumMag.length; k++) {
      accumMag[k] /= sliceCount;
    }
  }

  // 3. Check 50 Hz vs 60 Hz families & their harmonics (1st, 2nd, 3rd)
  // 50 Hz family: 50, 100, 150 Hz
  const p50_1 = findPeakInBand(accumMag, fftSize, downRate, 48.0, 52.0);
  const p50_2 = findPeakInBand(accumMag, fftSize, downRate, 98.0, 102.0);
  const p50_3 = findPeakInBand(accumMag, fftSize, downRate, 148.0, 152.0);

  // 60 Hz family: 60, 120, 180 Hz
  const p60_1 = findPeakInBand(accumMag, fftSize, downRate, 58.0, 62.0);
  const p60_2 = findPeakInBand(accumMag, fftSize, downRate, 118.0, 122.0);
  const p60_3 = findPeakInBand(accumMag, fftSize, downRate, 178.0, 182.0);

  // Score candidate families based on harmonic coherence & SNR (must be >= 8 dB above floor)
  const minSnrThreshold = 8.0;

  const valid50 = [p50_1, p50_2, p50_3].filter(p => p !== null && p.snrDb >= minSnrThreshold);
  const valid60 = [p60_1, p60_2, p60_3].filter(p => p !== null && p.snrDb >= minSnrThreshold);

  let detectedFamily: '50Hz' | '60Hz' | null = null;
  let baseFreq = 0;
  let bestSnr = 0;
  const harmonicPeaks: { harmonic: number; freqHz: number; snrDb: number }[] = [];

  const score50 = valid50.reduce((acc, p) => acc + (p?.snrDb || 0), 0);
  const score60 = valid60.reduce((acc, p) => acc + (p?.snrDb || 0), 0);

  if (score50 >= score60 && valid50.length >= 1 && (p50_1?.snrDb || 0) >= minSnrThreshold) {
    detectedFamily = '50Hz';
    bestSnr = p50_1!.snrDb;

    // Harmonic weighted frequency estimate
    let sumWeight = 0;
    let sumFreq = 0;

    const candidates = [
      { harmonic: 1, p: p50_1 },
      { harmonic: 2, p: p50_2 },
      { harmonic: 3, p: p50_3 },
    ];

    for (const c of candidates) {
      if (c.p && c.p.snrDb >= 6.0) {
        const weight = Math.pow(10, c.p.snrDb / 20);
        sumWeight += weight;
        sumFreq += (c.p.freq / c.harmonic) * weight;
        harmonicPeaks.push({
          harmonic: c.harmonic,
          freqHz: Number(c.p.freq.toFixed(3)),
          snrDb: Number(c.p.snrDb.toFixed(1)),
        });
      }
    }
    baseFreq = sumWeight > 0 ? sumFreq / sumWeight : p50_1!.freq;
  } else if (score60 > score50 && valid60.length >= 1 && (p60_1?.snrDb || 0) >= minSnrThreshold) {
    detectedFamily = '60Hz';
    bestSnr = p60_1!.snrDb;

    let sumWeight = 0;
    let sumFreq = 0;
    const candidates = [
      { harmonic: 1, p: p60_1 },
      { harmonic: 2, p: p60_2 },
      { harmonic: 3, p: p60_3 },
    ];

    for (const c of candidates) {
      if (c.p && c.p.snrDb >= 6.0) {
        const weight = Math.pow(10, c.p.snrDb / 20);
        sumWeight += weight;
        sumFreq += (c.p.freq / c.harmonic) * weight;
        harmonicPeaks.push({
          harmonic: c.harmonic,
          freqHz: Number(c.p.freq.toFixed(3)),
          snrDb: Number(c.p.snrDb.toFixed(1)),
        });
      }
    }
    baseFreq = sumWeight > 0 ? sumFreq / sumWeight : p60_1!.freq;
  }

  // 4. Edit detection: search for sudden frequency jumps (> 0.04 Hz) in the active family
  const editTimestamps: number[] = [];
  if (detectedFamily) {
    for (let i = 1; i < timeSlices.length; i++) {
      const prev = timeSlices[i - 1];
      const curr = timeSlices[i];
      const prevFreq = detectedFamily === '50Hz' ? prev.peak50 : prev.peak60;
      const currFreq = detectedFamily === '50Hz' ? curr.peak50 : curr.peak60;
      const prevSnr = detectedFamily === '50Hz' ? prev.mag50 : prev.mag60;
      const currSnr = detectedFamily === '50Hz' ? curr.mag50 : curr.mag60;

      // Only check if signal is reasonably strong in both slices
      if (prevSnr > 7.0 && currSnr > 7.0) {
        const jump = Math.abs(currFreq - prevFreq);
        // Grid frequency changes smoothly by <0.005 Hz/sec; a jump > 0.04 Hz signals an edit/splice
        if (jump >= 0.04 && jump <= 1.5) {
          const editTime = Number(curr.timeSec.toFixed(1));
          if (!editTimestamps.some(t => Math.abs(t - editTime) < 1.0)) {
            editTimestamps.push(editTime);
          }
        }
      }
    }
  }

  // Generate Findings compliant with Honesty Rules
  if (detectedFamily && baseFreq > 0) {
    const confidence = Math.min(0.99, Math.max(0.6, (bestSnr - 8) / 25));
    const familyDescription =
      detectedFamily === '50Hz'
        ? '50 Hz Continental Grid Family (Europe, India, UK, Australia, parts of Asia/Africa)'
        : '60 Hz Continental Grid Family (North America, South America, parts of East Asia)';

    findings.push({
      id: 'hum-grid-leak',
      category: 'hum',
      title: `Electrical Grid Hum (${baseFreq.toFixed(2)} Hz)`,
      plainText: `Mains hum detected at ${baseFreq.toFixed(2)} Hz (+harmonics). Confirms indoor recording in a ${detectedFamily} continental electrical pool.`,
      severity: 'warn',
      confidence: Number(confidence.toFixed(2)),
      evidenceKind: 'Measured',
      details: {
        baseFrequencyHz: Number(baseFreq.toFixed(3)),
        gridFamily: detectedFamily,
        gridRegions: familyDescription,
        snrDb: Number(bestSnr.toFixed(1)),
        harmonicsCount: harmonicPeaks.length,
        honestyNotice: APP_COPY.honesty.humFamilyNotice,
      },
      fixable: true,
      fixDescription: `Apply surgical biquad notch filters at ${baseFreq.toFixed(1)} Hz, ${(baseFreq * 2).toFixed(1)} Hz, and ${(baseFreq * 3).toFixed(1)} Hz.`,
    });

    if (editTimestamps.length > 0) {
      for (const editTime of editTimestamps) {
        findings.push({
          id: `hum-edit-jump-${editTime}`,
          category: 'hum',
          title: `Audio Splice / Frequency Discontinuity at 0:${editTime < 10 ? '0' : ''}${Math.round(editTime)}`,
          plainText: `Mains hum frequency jumps abruptly by >0.04 Hz near ${editTime.toFixed(1)}s. Natural power grids drift continuously; an instantaneous step indicates an audio edit or cut.`,
          severity: 'warn',
          confidence: 0.88,
          evidenceKind: 'Computed',
          timeRange: [Math.max(0, editTime - 0.5), editTime + 0.5],
          details: {
            timestampSec: editTime,
            indicator: 'Grid frequency jump or phase discontinuity',
          },
          fixable: false,
          fixDescription: 'Audio edits are permanent structural artifacts.',
        });
      }
    }
  }

  return {
    detected: detectedFamily !== null,
    baseFrequencyHz: baseFreq > 0 ? Number(baseFreq.toFixed(3)) : undefined,
    gridFamily: detectedFamily || undefined,
    snrDb: Number(bestSnr.toFixed(1)),
    confidence: detectedFamily ? Math.min(0.99, (bestSnr - 8) / 25) : 0,
    harmonicPeaks,
    editTimestamps,
    findings,
  };
}
