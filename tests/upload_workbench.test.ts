/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseWavStreaming } from '../src/dsp/wavStreamParser';
import { computeRealSpectrogram } from '../src/dsp/spectrogram';
import { createWavBlob } from '../src/utils/wavHelper';
import { analyzeHum } from '../src/dsp/hum';
import { analyzeUltrasonicTones } from '../src/dsp/ultrasonic';
import { calculateLeakScore } from '../src/dsp/scoring';

describe('WAV Upload Analysis Workbench & Readability Verification', () => {
  it('parses an uploaded WAV file and computes real STFT matrix immediately', async () => {
    const filePath = path.join(__dirname, '../test-media/mono_16bit_44k.wav');
    const buffer = fs.readFileSync(filePath);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const parsed = await parseWavStreaming(ab);
    expect(parsed.sampleRate).toBe(44100);
    expect(parsed.channels).toBe(1);
    expect(parsed.duration).toBeCloseTo(5.0, 1);
    expect(parsed.channelData.length).toBeGreaterThan(0);

    // Compute real spectrogram
    const spec = computeRealSpectrogram(parsed.channelData, parsed.sampleRate, 360, 160);
    expect(spec.numCols).toBe(360);
    expect(spec.numRows).toBe(160);
    expect(spec.duration).toBeCloseTo(5.0, 1);
    expect(spec.matrix.length).toBe(360 * 160);

    // Verify matrix values are normalized valid numbers between 0 and 1
    let nonZeroCount = 0;
    for (let i = 0; i < spec.matrix.length; i++) {
      expect(Number.isNaN(spec.matrix[i])).toBe(false);
      expect(spec.matrix[i]).toBeGreaterThanOrEqual(0.0);
      expect(spec.matrix[i]).toBeLessThanOrEqual(1.0);
      if (spec.matrix[i] > 0.05) nonZeroCount++;
    }
    expect(nonZeroCount).toBeGreaterThan(100);
  });

  it('runs DSP analyzers and scores uploaded WAV file without stub values', async () => {
    const filePath = path.join(__dirname, '../test-media/mono_16bit_44k.wav');
    const buffer = fs.readFileSync(filePath);
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const parsed = await parseWavStreaming(ab);

    const humRes = analyzeHum(parsed.channelData, parsed.sampleRate);
    const ultraRes = analyzeUltrasonicTones(parsed.channelData, parsed.sampleRate);
    const allFindings = [...humRes.findings, ...ultraRes.findings];
    const score = calculateLeakScore(allFindings);

    expect(typeof score.totalScore).toBe('number');
    expect(score.totalScore).toBeGreaterThanOrEqual(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
  });

  it('generates a valid RIFF WAV Blob for browser audio playback from samples', () => {
    const sampleRate = 44100;
    const samples = new Float32Array(sampleRate * 2); // 2 seconds
    for (let i = 0; i < samples.length; i++) {
      samples[i] = 0.5 * Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    }

    const blob = createWavBlob(samples, sampleRate);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);
  });
});
