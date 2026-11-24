import { describe, it, expect } from 'vitest';
import { scrubSensorPRNU } from '../prnuSensor';

describe('PRNU Camera Sensor Scrambler', () => {
  it('decorrelates high-frequency silicon wafer noise across image pixels', () => {
    const width = 64;
    const height = 64;
    const imgData = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    } as ImageData;

    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 160 + ((i % 5) - 2);
      imgData.data[i + 1] = 160 + ((i % 5) - 2);
      imgData.data[i + 2] = 160 + ((i % 5) - 2);
      imgData.data[i + 3] = 255;
    }

    const { sanitized, suppressionDb } = scrubSensorPRNU(imgData, 0.85);

    expect(suppressionDb).toBeGreaterThan(12);
    expect(sanitized.data.length).toBe(imgData.data.length);
  });
});
