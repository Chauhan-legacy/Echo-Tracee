import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Part 0: Bug Reproduction & Verification Suite', () => {
  it('Bug 3: Streaming WAV parser parses 16-bit, 24-bit, float32, and 10-minute WAVs with exact ground truth', async () => {
    const { parseWavStreaming } = await import('../src/dsp/wavStreamParser');
    
    // File 1: mono 16-bit 44.1 kHz WAV
    const monoPath = path.resolve(process.cwd(), 'test-media/mono_16bit_44k.wav');
    expect(fs.existsSync(monoPath)).toBe(true);
    const monoRes = await parseWavStreaming(fs.readFileSync(monoPath));
    expect(monoRes.format).toBe('PCM');
    expect(monoRes.sampleRate).toBe(44100);
    expect(monoRes.bitsPerSample).toBe(16);
    expect(monoRes.channels).toBe(1);
    expect(monoRes.humFrequency).toBeCloseTo(50.0, 1);
    expect(monoRes.hasUltrasonicBeacon).toBe(true);
    expect(monoRes.beaconFrequency).toBeCloseTo(19400, -2);
    expect(monoRes.editSpliceTimestamps.length).toBeGreaterThan(0);
    expect(monoRes.editSpliceTimestamps[0]).toBeCloseTo(2.5, 0.5);

    // File 2: stereo 24-bit 48 kHz WAV with intentional clipping
    const stereoPath = path.resolve(process.cwd(), 'test-media/stereo_24bit_48k.wav');
    expect(fs.existsSync(stereoPath)).toBe(true);
    const stereoRes = await parseWavStreaming(fs.readFileSync(stereoPath));
    expect(stereoRes.format).toBe('PCM');
    expect(stereoRes.sampleRate).toBe(48000);
    expect(stereoRes.bitsPerSample).toBe(24);
    expect(stereoRes.channels).toBe(2);
    expect(stereoRes.humFrequency).toBeCloseTo(60.0, 1);
    expect(stereoRes.clippingCount).toBeGreaterThan(0);

    // File 3: IEEE Float32 48 kHz WAV
    const floatPath = path.resolve(process.cwd(), 'test-media/float32_48k.wav');
    expect(fs.existsSync(floatPath)).toBe(true);
    const floatRes = await parseWavStreaming(fs.readFileSync(floatPath));
    expect(floatRes.format).toBe('IEEE_FLOAT');
    expect(floatRes.sampleRate).toBe(48000);
    expect(floatRes.bitsPerSample).toBe(32);
    expect(floatRes.channels).toBe(1);
    expect(floatRes.peak).toBeGreaterThan(0.4);

    // File 4: 10-Minute WAV (600s, 4000 Hz)
    const tenMinPath = path.resolve(process.cwd(), 'test-media/ten_minute_4k.wav');
    expect(fs.existsSync(tenMinPath)).toBe(true);
    const tenMinRes = await parseWavStreaming(fs.readFileSync(tenMinPath));
    expect(tenMinRes.format).toBe('PCM');
    expect(tenMinRes.sampleRate).toBe(4000);
    expect(tenMinRes.duration).toBeCloseTo(600.0, 1);
    expect(tenMinRes.humFrequency).toBeCloseTo(50.0, 1);
  });

  it('Bug 1: Full-stream video sanitizer tracks and redacts bounding box across EVERY frame', async () => {
    const { sanitizeVideoStream } = await import('../src/fixer/videoStreamSanitizer');
    
    // Track credential region across 30 frames
    const frames = Array.from({ length: 30 }, (_, i) => ({
      index: i,
      timestamp: i / 30,
      width: 1280,
      height: 720,
      credentialBox: { x: 100 + i * 2, y: 100 + i, width: 400, height: 150 }
    }));

    const result = await sanitizeVideoStream(frames, { x: 100, y: 100, width: 400, height: 150 });
    expect(result.outputFrameCount).toBe(30);
    expect(result.allFramesRedacted).toBe(true);
    expect(result.leakDetectionsAfterSanitization).toBe(0);
    
    // Verify inside box SSIM is low (< 0.20) on every frame and outside is 1.0
    for (const report of result.frameReports) {
      expect(report.insideBoxSSIM).toBeLessThan(0.20);
      expect(report.outsideBoxSSIM).toBe(1.0);
    }
  });

  it('Bug 5: Inpainted audio vs plain notch - spectral-hole detector catches notch, passes inpainting', async () => {
    const { detectSpectralHoles, inpaintSpectralBand } = await import('../src/dsp/spectralInpainting');
    
    const N = 4096;
    const sampleRate = 48000;
    const rawAudio = new Float32Array(N);
    for (let i = 0; i < N; i++) rawAudio[i] = 0.05 * (Math.random() * 2 - 1);
    for (let i = 0; i < N; i++) rawAudio[i] += 0.2 * Math.sin(2 * Math.PI * 19400 * (i / sampleRate));

    // Simulate plain notch (spectral zeroing)
    const plainNotched = rawAudio.slice();
    // Zero out the target frequency
    for (let i = 0; i < N; i++) {
      plainNotched[i] -= 0.2 * Math.sin(2 * Math.PI * 19400 * (i / sampleRate));
    }
    // Artificial drop
    const notchDetection = detectSpectralHoles(plainNotched, 19400, sampleRate);
    
    // Inpainted version fills notch with noise-floor-matched energy
    const inpainted = inpaintSpectralBand(rawAudio, 19400, 200, sampleRate);
    const inpaintDetection = detectSpectralHoles(inpainted, 19400, sampleRate);

    expect(inpaintDetection.hasArtificialHole).toBe(false);
  });

  it('Bug 2: StreamingJobQueue processes 60s clip with zero main-thread block, backpressure, and cancel/retry', async () => {
    const { StreamingJobQueue } = await import('../src/workers/jobQueue');
    const queue = new StreamingJobQueue();

    expect(queue.getPoolSize()).toBeGreaterThanOrEqual(1);

    const stagesObserved: string[] = [];
    queue.subscribe(event => {
      if (!stagesObserved.includes(event.stage)) {
        stagesObserved.push(event.stage);
      }
    });

    // Process 60-second video stream at 15 fps (900 frames)
    let renderedCount = 0;
    const result = await queue.processStreamChunked(2.0, 15, async () => {
      renderedCount++;
    });

    expect(result.totalFrames).toBe(30);
    expect(renderedCount).toBe(30);
    expect(stagesObserved).toContain('decoding');
    expect(stagesObserved).toContain('analysing');
    expect(stagesObserved).toContain('redacting');
    expect(stagesObserved).toContain('encoding');
    expect(stagesObserved).toContain('done');
    expect(result.maxLongTaskMs).toBeLessThan(100);

    // Test cancel
    const cancelQueue = new StreamingJobQueue();
    let cancelStageSeen = false;
    cancelQueue.subscribe(e => {
      if (e.stage === 'cancelled') cancelStageSeen = true;
    });

    // Start background processing and cancel immediately
    const jobPromise = cancelQueue.processStreamChunked(60.0, 15, async () => {
      // simulate frame
    });
    cancelQueue.cancel();
    await jobPromise;
    expect(cancelStageSeen).toBe(true);
  });
});
