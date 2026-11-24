/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { analyzeOpticalFlicker } from '../opticalGrid';

describe('Optical Rolling Shutter Mains Frequency Analyzer', () => {
  it('detects 100 Hz rolling shutter flicker (50 Hz European/Asian AC Grid)', () => {
    const rows = 120;
    const frames: Float32Array[] = [];
    const fps = 30;

    // 100 Hz at 30 fps = 3.33 horizontal bands per frame
    for (let f = 0; f < 12; f++) {
      const rowLum = new Float32Array(rows);
      for (let y = 0; y < rows; y++) {
        rowLum[y] = 120 + 30 * Math.sin((2 * Math.PI * 3.33 * y) / rows + f * 0.4);
      }
      frames.push(rowLum);
    }

    const report = analyzeOpticalFlicker(frames, fps);
    expect(report.hasOpticalFlicker).toBe(true);
    expect(report.detectedMainsHz).toBe(50);
    expect(report.flickerFreqHz).toBe(100);
    expect(report.snrDb).toBeGreaterThan(9.0);
  });

  it('detects 120 Hz rolling shutter flicker (60 Hz American AC Grid)', () => {
    const rows = 120;
    const frames: Float32Array[] = [];
    const fps = 30;

    // 120 Hz at 30 fps = 4.0 horizontal bands per frame
    for (let f = 0; f < 12; f++) {
      const rowLum = new Float32Array(rows);
      for (let y = 0; y < rows; y++) {
        rowLum[y] = 120 + 30 * Math.sin((2 * Math.PI * 4.0 * y) / rows + f * 0.3);
      }
      frames.push(rowLum);
    }

    const report = analyzeOpticalFlicker(frames, fps);
    expect(report.hasOpticalFlicker).toBe(true);
    expect(report.detectedMainsHz).toBe(60);
    expect(report.flickerFreqHz).toBe(120);
    expect(report.snrDb).toBeGreaterThan(9.0);
  });

  it('reports no flicker on uniform static video frames', () => {
    const rows = 100;
    const frames: Float32Array[] = [];
    for (let f = 0; f < 6; f++) {
      const rowLum = new Float32Array(rows);
      rowLum.fill(128);
      frames.push(rowLum);
    }

    const report = analyzeOpticalFlicker(frames, 30);
    expect(report.hasOpticalFlicker).toBe(false);
  });
});
