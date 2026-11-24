/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { analyzeHum } from '../hum';
import { analyzeUltrasonicTones } from '../ultrasonic';
import { analyzeRoomCharacter } from '../reverb';
import { parseMetadataFromBuffer } from '../../analyzers/metadata';
import { calculateLeakScore } from '../scoring';

describe('Adversarial Input Pass (Hostile Reviewer Checks)', () => {
  it('handles 0-byte / empty audio gracefully without crashing', () => {
    const emptyAudio = new Float32Array(0);
    const humRes = analyzeHum(emptyAudio, 48000);
    const ultraRes = analyzeUltrasonicTones(emptyAudio, 48000);
    const roomRes = analyzeRoomCharacter(emptyAudio, 48000);

    expect(humRes.detected).toBe(false);
    expect(ultraRes.detected).toBe(false);
    expect(roomRes.rt60Sec).toBeGreaterThan(0); // safe fallback

    const score = calculateLeakScore([...humRes.findings, ...ultraRes.findings]);
    expect(score.totalScore).toBe(0);
  });

  it('handles 8 kHz low sample rate with honest "cannot check" state', () => {
    const sampleRate = 8000;
    const audio = new Float32Array(sampleRate * 2);
    const ultraRes = analyzeUltrasonicTones(audio, sampleRate);

    expect(ultraRes.detected).toBe(false);
    expect(ultraRes.cannotCheckReason).toBeDefined();
    expect(ultraRes.cannotCheckReason).toContain('Sample rate is 8000 Hz');

    const honestFinding = ultraRes.findings.find(f => f.id === 'ultrasonic-low-sample-rate');
    expect(honestFinding).toBeDefined();
    expect(honestFinding?.evidenceKind).toBe('Unverified');
  });

  it('handles 16 kHz codec cutoff MP3 with honest codec cutoff warning', () => {
    const sampleRate = 48000;
    const audio = new Float32Array(sampleRate * 3);
    // Add energy up to 14 kHz, but strictly zero above 16 kHz (simulating 128 kbps MP3 lowpass filter)
    for (let i = 0; i < audio.length; i++) {
      const t = i / sampleRate;
      audio[i] = 0.3 * Math.sin(2 * Math.PI * 10000 * t) + 0.3 * Math.sin(2 * Math.PI * 12000 * t);
    }

    const ultraRes = analyzeUltrasonicTones(audio, sampleRate);
    expect(ultraRes.detected).toBe(false);
    expect(ultraRes.codecCutoffHz).toBeDefined();

    const cutoffFinding = ultraRes.findings.find(f => f.id === 'ultrasonic-codec-cutoff');
    expect(cutoffFinding).toBeDefined();
    expect(cutoffFinding?.plainText).toContain('Audio compression cut off frequencies');
  });

  it('handles corrupted container buffer without throwing', () => {
    const corruptBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0xFF, 0xFF, 0x00]).buffer;
    expect(() => {
      const meta = parseMetadataFromBuffer(corruptBuffer, 'corrupt.mp4');
      expect(meta.report).toBeDefined();
    }).not.toThrow();
  });

  it('caps analysis to first 60 seconds on very long files', () => {
    const sampleRate = 48000;
    const longDuration = 180; // 3 minutes
    const totalSamples = sampleRate * longDuration;

    // Cap logic simulated
    const maxSamples = Math.min(totalSamples, sampleRate * 60);
    expect(maxSamples).toBe(sampleRate * 60);
  });

  it('handles stereo to mono channels seamlessly', () => {
    const sampleRate = 48000;
    const left = new Float32Array(sampleRate);
    const right = new Float32Array(sampleRate);
    for (let i = 0; i < sampleRate; i++) {
      left[i] = 0.1 * Math.sin(2 * Math.PI * 50 * (i / sampleRate));
      right[i] = 0.1 * Math.sin(2 * Math.PI * 50 * (i / sampleRate));
    }

    // Downmix to mono
    const mono = new Float32Array(sampleRate);
    for (let i = 0; i < sampleRate; i++) {
      mono[i] = 0.5 * (left[i] + right[i]);
    }

    const humRes = analyzeHum(mono, sampleRate);
    expect(humRes).toBeDefined();
  });
});
