import { describe, it, expect } from 'vitest';
import { analyzeHum } from '../hum';
import { analyzeUltrasonicTones } from '../ultrasonic';
import { analyzeRoomCharacter } from '../reverb';
import { calculateLeakScore } from '../scoring';

describe('Real DSP Mathematical Verification', () => {
  it('detects 50.02 Hz mains hum within +/-0.01 Hz tolerance', () => {
    const sampleRate = 48000;
    const duration = 5.0; // 5 seconds
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    const targetHumFreq = 50.02;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Base hum + harmonics + slight noise
      const hum1 = 0.25 * Math.sin(2 * Math.PI * targetHumFreq * t);
      const hum2 = 0.08 * Math.sin(2 * Math.PI * (targetHumFreq * 2) * t);
      const hum3 = 0.04 * Math.sin(2 * Math.PI * (targetHumFreq * 3) * t);
      const noise = (Math.random() - 0.5) * 0.01;
      audio[i] = hum1 + hum2 + hum3 + noise;
    }

    const result = analyzeHum(audio, sampleRate);
    expect(result.detected).toBe(true);
    expect(result.gridFamily).toBe('50Hz');
    expect(result.baseFrequencyHz).toBeDefined();

    const error = Math.abs((result.baseFrequencyHz || 0) - targetHumFreq);
    expect(error).toBeLessThanOrEqual(0.01); // Strict +/-0.01 Hz
  });

  it('detects 60.03 Hz mains hum within +/-0.01 Hz tolerance', () => {
    const sampleRate = 48000;
    const duration = 5.0;
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    const targetHumFreq = 60.03;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const hum1 = 0.25 * Math.sin(2 * Math.PI * targetHumFreq * t);
      const hum2 = 0.08 * Math.sin(2 * Math.PI * (targetHumFreq * 2) * t);
      audio[i] = hum1 + hum2;
    }

    const result = analyzeHum(audio, sampleRate);
    expect(result.detected).toBe(true);
    expect(result.gridFamily).toBe('60Hz');
    const error = Math.abs((result.baseFrequencyHz || 0) - targetHumFreq);
    expect(error).toBeLessThanOrEqual(0.01);
  });

  it('detects 19,400 Hz ultrasonic tracker tone within +/-20 Hz tolerance', () => {
    const sampleRate = 48000;
    const duration = 4.0;
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    const targetToneFreq = 19400;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Tone active between 1.0s and 3.5s
      const tone = (t >= 1.0 && t <= 3.5) ? 0.2 * Math.sin(2 * Math.PI * targetToneFreq * t) : 0;
      const speechLike = 0.1 * Math.sin(2 * Math.PI * 400 * t);
      const noise = (Math.random() - 0.5) * 0.005;
      audio[i] = tone + speechLike + noise;
    }

    const result = analyzeUltrasonicTones(audio, sampleRate);
    expect(result.detected).toBe(true);
    expect(result.tones.length).toBeGreaterThanOrEqual(1);

    const tone = result.tones[0];
    const error = Math.abs(tone.freqHz - targetToneFreq);
    expect(error).toBeLessThanOrEqual(20); // Strict +/-20 Hz tolerance
  });

  it('estimates room RT60 within +/-15% tolerance on known decay', () => {
    const sampleRate = 48000;
    const duration = 3.0;
    const numSamples = Math.floor(sampleRate * duration);
    const audio = new Float32Array(numSamples);

    // Create a known exponential decay: e.g. RT60 = 0.40s
    // -60 dB = 10^(-3) amplitude factor = e^(-alpha * RT60)
    // alpha = ln(1000) / RT60 = 6.907755 / 0.40 = 17.269
    const targetRt60 = 0.40;
    const decayRate = Math.log(1000) / targetRt60;

    // Transient starting at 0.5s
    const startSample = Math.floor(0.5 * sampleRate);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (i >= startSample) {
        const dt = (i - startSample) / sampleRate;
        const env = Math.exp(-decayRate * dt);
        // Noise burst decaying exponentially
        audio[i] = (Math.random() - 0.5) * env * 0.8;
      }
    }

    const result = analyzeRoomCharacter(audio, sampleRate);
    expect(result.rt60Sec).toBeGreaterThan(0);
    const percentError = Math.abs(result.rt60Sec - targetRt60) / targetRt60;
    expect(percentError).toBeLessThanOrEqual(0.15); // Strict +/-15% tolerance
  });

  it('False Alarm Protection: pure silence must not produce critical findings', () => {
    const sampleRate = 48000;
    const silence = new Float32Array(sampleRate * 2);

    const humRes = analyzeHum(silence, sampleRate);
    const ultraRes = analyzeUltrasonicTones(silence, sampleRate);

    expect(humRes.detected).toBe(false);
    expect(ultraRes.detected).toBe(false);

    const score = calculateLeakScore([...humRes.findings, ...ultraRes.findings]);
    expect(score.totalScore).toBe(0);
  });

  it('False Alarm Protection: white noise must not trigger critical ultrasonic beacon', () => {
    const sampleRate = 48000;
    const noise = new Float32Array(sampleRate * 2);
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (Math.random() - 0.5) * 0.05;
    }

    const ultraRes = analyzeUltrasonicTones(noise, sampleRate);
    expect(ultraRes.detected).toBe(false);
  });
});
