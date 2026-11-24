import { describe, it, expect } from 'vitest';
import { globalWorkerPool } from '../workerPool';

describe('Phase 5 Speed & Worker Pool', () => {
  it('initializes worker pool with size between 2 and 4', () => {
    const size = globalWorkerPool.getPoolSize();
    expect(size).toBeGreaterThanOrEqual(2);
    expect(size).toBeLessThanOrEqual(4);
  });

  it('runs parallel pipeline on 15s synthetic input and measures real-time factor', async () => {
    const sampleRate = 48000;
    const numSamples = sampleRate * 15; // 15 seconds
    const audio = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      audio[i] =
        0.2 * Math.sin(2 * Math.PI * 50.02 * t) +
        0.15 * Math.sin(2 * Math.PI * 19400 * t);
    }

    const t0 = performance.now();
    const result = await globalWorkerPool.runPipeline(audio, sampleRate, 'Contact: test@gmail.com');
    const elapsed = performance.now() - t0;

    expect(result.hum).toBeDefined();
    expect(result.ultrasonic).toBeDefined();
    expect(result.room).toBeDefined();
    expect(result.tamper).toBeDefined();
    expect(result.identifiers).toBeDefined();

    // Verify detection results
    expect(result.hum.detected).toBe(true);
    expect(result.hum.gridFamily).toBe('50Hz');
    expect(result.ultrasonic.detected).toBe(true);
    expect(result.identifiers?.emails?.length).toBeGreaterThan(0);

    // Verify Real-time factor is positive and high-speed
    expect(result.totalAnalysisMs).toBeGreaterThan(0);
    expect(result.realtimeFactor).toBeGreaterThan(1.0); // much faster than 1x real-time!
    expect(elapsed).toBeLessThan(3000); // 15s analyzed well within 3s
  });

  it('analyzes 60s input within 3.0s budget', async () => {
    const sampleRate = 48000;
    const numSamples = sampleRate * 60; // 60 seconds
    const audio = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      audio[i] = 0.2 * Math.sin(2 * Math.PI * 50.02 * t);
    }

    const t0 = performance.now();
    const result = await globalWorkerPool.runPipeline(audio, sampleRate);
    const elapsed = performance.now() - t0;

    expect(result.hum.detected).toBe(true);
    expect(elapsed).toBeLessThan(3000); // 60s in under 3s!
    expect(result.realtimeFactor).toBeGreaterThan(15.0);
  });
});
