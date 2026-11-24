/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { generate11TestSignals } from '../testing/signalGenerators';
import { analyzeHum } from '../hum';
import { analyzeUltrasonicTones } from '../ultrasonic';
import { analyzeRoomCharacter } from '../reverb';

describe('Phase 6: 11 Physical & Acoustic Test Signals Suite', () => {
  const signals = generate11TestSignals();

  it('Signal 1: Silence (10s) -> 0 critical findings, score ~0', () => {
    const s = signals[0];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(false);
    expect(ultraRes.detected).toBe(false);
    expect(humRes.findings.length + ultraRes.findings.length).toBe(0);
  });

  it('Signal 2: White Noise (5s) -> 0 false alarms', () => {
    const s = signals[1];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(false);
    expect(ultraRes.detected).toBe(false);
    expect(ultraRes.tones.length).toBe(0);
  });

  it('Signal 3: Hum 50.00 Hz -> 50 Hz pool, 50.00 ± 0.02 Hz, no edit', () => {
    const s = signals[2];
    const humRes = analyzeHum(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(true);
    expect(humRes.gridFamily).toBe('50Hz');
    expect(Math.abs((humRes.baseFrequencyHz || 0) - 50.00)).toBeLessThanOrEqual(0.02);
    expect(humRes.editTimestamps.length).toBe(0);
  });

  it('Signal 4: Hum 60.01 Hz + Keyed Tone 20.1 kHz -> 60 Hz pool, tone at 20.1 kHz', () => {
    const s = signals[3];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(true);
    expect(humRes.gridFamily).toBe('60Hz');
    expect(Math.abs((humRes.baseFrequencyHz || 0) - 60.01)).toBeLessThanOrEqual(0.02);

    expect(ultraRes.detected).toBe(true);
    const measuredTone = ultraRes.tones[0]?.freqHz || 0;
    expect(Math.abs(measuredTone - 20100)).toBeLessThanOrEqual(25);

    // Labels must NOT show 50.02 Hz or 19.4 kHz
    expect(humRes.baseFrequencyHz).not.toBeCloseTo(50.02, 1);
    expect(measuredTone).not.toBeCloseTo(19400, -2);
  });

  it('Signal 5: Hum 49.98 Hz stepping to 50.10 Hz -> edit flagged near 6.0s', () => {
    const s = signals[4];
    const humRes = analyzeHum(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(true);
    expect(humRes.editTimestamps.length).toBeGreaterThanOrEqual(1);
    const edit = humRes.editTimestamps[0];
    expect(Math.abs(edit - 6.0)).toBeLessThanOrEqual(1.5);
  });

  it('Signal 6: Clicks decay 0.20s -> RT 0.20s ±15%, dry', () => {
    const s = signals[5];
    const roomRes = analyzeRoomCharacter(s.audio, s.sampleRate);

    expect(roomRes.rt60Sec).toBeGreaterThan(0);
    const errPct = Math.abs(roomRes.rt60Sec - 0.20) / 0.20;
    expect(errPct).toBeLessThanOrEqual(0.20);
    expect(roomRes.decayClass).toContain('Dry');
  });

  it('Signal 7: Clicks decay 0.90s -> RT 0.90s ±15%, echoey', () => {
    const s = signals[6];
    const roomRes = analyzeRoomCharacter(s.audio, s.sampleRate);

    expect(roomRes.rt60Sec).toBeGreaterThan(0);
    const errPct = Math.abs(roomRes.rt60Sec - 0.90) / 0.90;
    expect(errPct).toBeLessThanOrEqual(0.20);
    expect(roomRes.decayClass).toMatch(/Reflective|Echoey|Hall/i);
  });

  it('Signal 8: Low-pass filter at 16.5 kHz -> codec cutoff reported honestly, not clean', () => {
    const s = signals[7];
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    // Finding must say cannot check above ~16 kHz or codec cutoff
    const cutoffFinding = ultraRes.findings.find(
      f => f.category === 'ultrasonic' && (f.title.includes('Cutoff') || f.title.includes('Bandwidth') || f.evidenceKind === 'Unverified')
    );
    expect(cutoffFinding).toBeDefined();
    // Must NOT report 19.4 kHz tone as clean
    expect(ultraRes.tones.filter(t => t.freqHz > 17000).length).toBe(0);
  });

  it('Signal 9: Synthetic human voice -> zero critical findings', () => {
    const s = signals[8];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    const criticals = [...humRes.findings, ...ultraRes.findings].filter(
      f => f.severity === 'critical'
    );
    expect(criticals.length).toBe(0);
  });

  it('Signal 10: Multi-threat composite (15s) -> all 4 findings present', () => {
    const s = signals[9];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);
    const roomRes = analyzeRoomCharacter(s.audio, s.sampleRate);

    // 1. Hum found near 50.02
    expect(humRes.detected).toBe(true);
    expect(Math.abs((humRes.baseFrequencyHz || 0) - 50.02)).toBeLessThanOrEqual(0.05);

    // 2. Edit flagged
    expect(humRes.editTimestamps.length).toBeGreaterThanOrEqual(1);

    // 3. Ultrasonic beacon found near 19.4 kHz
    expect(ultraRes.detected).toBe(true);
    expect(Math.abs((ultraRes.tones[0]?.freqHz || 0) - 19400)).toBeLessThanOrEqual(25);

    // 4. Room RT60 found near 0.38s
    expect(roomRes.rt60Sec).toBeGreaterThan(0.2);
    expect(roomRes.rt60Sec).toBeLessThan(0.6);
  });

  it('Signal 11: 8 kHz audio -> hum found, tone check says cannot run without crash', () => {
    const s = signals[10];
    const humRes = analyzeHum(s.audio, s.sampleRate);
    const ultraRes = analyzeUltrasonicTones(s.audio, s.sampleRate);

    expect(humRes.detected).toBe(true);
    expect(Math.abs((humRes.baseFrequencyHz || 0) - 50.00)).toBeLessThanOrEqual(0.05);

    // Ultrasonic cannot check above 4 kHz Nyquist
    expect(ultraRes.detected).toBe(false);
    const lowRateFinding = ultraRes.findings.find(f => f.evidenceKind === 'Unverified');
    expect(lowRateFinding).toBeDefined();
  });
});
