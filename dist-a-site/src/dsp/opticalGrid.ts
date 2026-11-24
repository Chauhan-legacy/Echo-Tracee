/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Optical Rolling Shutter Mains Frequency Analyzer (Optical ENF)
 *
 * Indoor AC lighting flickers at twice the mains frequency (100 Hz on 50 Hz grids,
 * 120 Hz on 60 Hz grids). On CMOS rolling-shutter sensors, each row is exposed at a
 * slightly different time offset, transforming temporal light intensity oscillation into
 * spatial luminance banding across video rows.
 *
 * This detects geographic location from indoor lighting even when audio is muted.
 */

export interface OpticalGridReport {
  hasOpticalFlicker: boolean;
  detectedMainsHz?: 50 | 60;
  flickerFreqHz: number;
  snrDb: number;
  confidence: number;
  geographicClue?: string;
  bandingBandsCount: number;
}

/**
 * Analyzes an array of video frame ImageData or luminance row buffers.
 * @param frameRowLuminances Array of Float32Array where each array is the vertical row-average luminance of a frame
 * @param frameRate Video FPS (typically 24, 30, or 60)
 */
export function analyzeOpticalFlicker(
  frameRowLuminances: Float32Array[],
  frameRate: number = 30
): OpticalGridReport {
  if (frameRowLuminances.length < 2) {
    return {
      hasOpticalFlicker: false,
      flickerFreqHz: 0,
      snrDb: 0,
      confidence: 0,
      bandingBandsCount: 0,
    };
  }

  const height = frameRowLuminances[0].length;
  // Compute frame-to-frame temporal difference to eliminate static background geometry
  const diffs: Float32Array[] = [];
  for (let f = 1; f < frameRowLuminances.length; f++) {
    const prev = frameRowLuminances[f - 1];
    const curr = frameRowLuminances[f];
    const d = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      d[y] = curr[y] - prev[y];
    }
    diffs.push(d);
  }

  // Compute average vertical autocorrelation / power spectrum
  // Rolling shutter read-out time is typically ~85-95% of frame interval (1/fps)
  // Bands per frame = f_flicker / fps
  // For 30 fps:
  // 100 Hz flicker (50 Hz grid) => 100 / 30 = 3.33 horizontal bands per frame
  // 120 Hz flicker (60 Hz grid) => 120 / 30 = 4.0 horizontal bands per frame
  // For 60 fps:
  // 100 Hz => 1.67 bands/frame; 120 Hz => 2.0 bands/frame

  const targetBands50 = 100 / frameRate;
  const targetBands60 = 120 / frameRate;

  // Discrete Fourier Transform of row differential for spatial harmonics
  let power50 = 0;
  let power60 = 0;
  let noiseFloor = 0;
  let totalBins = 0;

  for (const diff of diffs) {
    // Zero-mean the differential
    let mean = 0;
    for (let y = 0; y < height; y++) mean += diff[y];
    mean /= height;

    const zeroMean = new Float32Array(height);
    for (let y = 0; y < height; y++) zeroMean[y] = diff[y] - mean;

    // Evaluate DFT at target spatial frequency multiples
    const evalFreq = (cyclesPerFrame: number) => {
      let re = 0;
      let im = 0;
      for (let y = 0; y < height; y++) {
        const phi = (2 * Math.PI * cyclesPerFrame * y) / height;
        re += zeroMean[y] * Math.cos(phi);
        im -= zeroMean[y] * Math.sin(phi);
      }
      return (re * re + im * im) / (height * height);
    };

    const p50 = evalFreq(targetBands50);
    const p60 = evalFreq(targetBands60);
    power50 += p50;
    power60 += p60;

    // Sample adjacent non-harmonic bins for noise baseline
    const pNoise1 = evalFreq(targetBands50 * 0.7);
    const pNoise2 = evalFreq(targetBands60 * 1.3);
    noiseFloor += (pNoise1 + pNoise2) / 2;
    totalBins++;
  }

  power50 /= diffs.length;
  power60 /= diffs.length;
  noiseFloor = (noiseFloor / diffs.length) + 1e-12;

  const snr50 = 10 * Math.log10(power50 / noiseFloor);
  const snr60 = 10 * Math.log10(power60 / noiseFloor);

  const bestSnr = Math.max(snr50, snr60);
  const detected50 = snr50 > 9.0 && snr50 > snr60 + 2.0;
  const detected60 = snr60 > 9.0 && snr60 > snr50 + 2.0;

  if (detected50) {
    return {
      hasOpticalFlicker: true,
      detectedMainsHz: 50,
      flickerFreqHz: 100,
      snrDb: Math.round(snr50 * 10) / 10,
      confidence: Math.min(0.96, 0.6 + snr50 / 30),
      geographicClue: '50 Hz AC Grid (Europe, Asia, Africa, Australia)',
      bandingBandsCount: Math.round(targetBands50 * 10) / 10,
    };
  }

  if (detected60) {
    return {
      hasOpticalFlicker: true,
      detectedMainsHz: 60,
      flickerFreqHz: 120,
      snrDb: Math.round(snr60 * 10) / 10,
      confidence: Math.min(0.96, 0.6 + snr60 / 30),
      geographicClue: '60 Hz AC Grid (North America, parts of South America/Japan)',
      bandingBandsCount: Math.round(targetBands60 * 10) / 10,
    };
  }

  return {
    hasOpticalFlicker: false,
    flickerFreqHz: 0,
    snrDb: Math.round(bestSnr * 10) / 10,
    confidence: 0,
    bandingBandsCount: 0,
  };
}
