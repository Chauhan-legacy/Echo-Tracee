import { describe, it, expect } from 'vitest';
import { extractRPPGFromFrames, scrambleRPPGInCanvas } from '../rppgPulse';

describe('Remote Photoplethysmography (rPPG) Cardiac Pulse Extraction', () => {
  it('extracts physiological heart rate (BPM) from synthetic skin frames with blood volume modulation', () => {
    const fps = 30;
    const durationSec = 2.0;
    const numFrames = Math.floor(fps * durationSec);
    const targetBpm = 75; // 1.25 Hz
    const pulseFreq = targetBpm / 60;

    const frames: ImageData[] = [];
    const width = 64;
    const height = 64;

    for (let t = 0; t < numFrames; t++) {
      const data = new Uint8ClampedArray(width * height * 4);
      // Cardiac pulse amplitude modulation on the green channel
      const pulseMod = 1.0 + 0.035 * Math.sin(2 * Math.PI * pulseFreq * (t / fps));

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Skin tones: R ~ 160, G ~ 110 * pulseMod, B ~ 85
          data[idx] = 160;
          data[idx + 1] = Math.round(110 * pulseMod);
          data[idx + 2] = 85;
          data[idx + 3] = 255;
        }
      }
      frames.push({ data, width, height, colorSpace: 'srgb' });
    }

    const res = extractRPPGFromFrames(frames, fps);

    expect(res.heartRateDetected).toBe(true);
    expect(res.estimatedBpm).toBeGreaterThanOrEqual(70);
    expect(res.estimatedBpm).toBeLessThanOrEqual(80);
    expect(res.confidence).toBeGreaterThan(0.4);
    expect(res.snrDb).toBeGreaterThan(4.0);
    expect(res.pulseWaveform.length).toBeGreaterThan(0);
  });

  it('scrambles rPPG in canvas without throwing or out-of-bounds error', () => {
    // Mock minimal 2D canvas context
    const width = 80;
    const height = 80;
    const imgData = {
      data: new Uint8ClampedArray(width * height * 4).fill(120),
      width,
      height,
    };

    const mockCtx = {
      canvas: { width, height },
      getImageData: () => imgData,
      putImageData: () => {},
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      scrambleRPPGInCanvas(mockCtx, { x: 10, y: 10, width: 50, height: 50 }, 0.9);
    }).not.toThrow();
  });
});
