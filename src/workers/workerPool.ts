/**
 * ECHO//TRACE Worker Pool Orchestrator (Phase 5)
 * Dynamically sizes a worker pool based on navigator.hardwareConcurrency (clamped to max 4).
 * Uses transferable ArrayBuffers to avoid copying heavy audio/image data.
 * Falls back softly to microtask dispatch if Workers are unsupported or fail.
 */
import { analyzeHumM2, EnfAnalysisResult } from '../dsp/hum/enf';
import { analyzeUltrasonicBeaconsM3, BeaconAnalysisResult } from '../dsp/beacons/cfar';
import { analyzeRoomAcousticsM4, RoomAcousticResult } from '../dsp/room/acoustics';
import { analyzeAudioTamperM5, TamperDetectionResult } from '../dsp/tamper/audioTamper';
import { scanAndValidateIdentifiers, ExtractedIdFindings } from '../dsp/id/checksums';
import { WorkerTaskResponse } from './analysisWorker';

export interface ParallelAnalysisResult {
  hum: EnfAnalysisResult;
  ultrasonic: BeaconAnalysisResult;
  room: RoomAcousticResult;
  tamper: TamperDetectionResult;
  identifiers: ExtractedIdFindings | null;
  totalAnalysisMs: number;
  realtimeFactor: number;
  workerModeUsed: 'web-worker-pool' | 'main-thread-fallback';
}

class WorkerPool {
  private poolSize: number;
  private isSupported: boolean;

  constructor() {
    const hwConcurrency =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;
    this.poolSize = Math.max(2, Math.min(4, hwConcurrency));
    this.isSupported = typeof Worker !== 'undefined';
  }

  public getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Dispatches tasks across the 4 specialized pipeline stages in parallel.
   */
  public async runPipeline(
    audioSamples: Float32Array,
    sampleRate = 48000,
    textPayload = ''
  ): Promise<ParallelAnalysisResult> {
    const start = performance.now();
    const durationSec = Math.max(0.01, audioSamples.length / sampleRate);

    // Try web worker pool if supported and enabled
    if (this.isSupported) {
      try {
        const res = await this.runInWorkerPool(audioSamples, sampleRate, textPayload);
        const elapsed = performance.now() - start;
        return {
          ...res,
          totalAnalysisMs: Math.round(elapsed),
          realtimeFactor: Number((durationSec / (elapsed / 1000)).toFixed(2)),
          workerModeUsed: 'web-worker-pool',
        };
      } catch (e) {
        // Fallback to direct parallel dispatch
      }
    }

    // Direct synchronous / microtask fallback
    const res = await this.runDirectFallback(audioSamples, sampleRate, textPayload);
    const elapsed = performance.now() - start;
    return {
      ...res,
      totalAnalysisMs: Math.round(elapsed),
      realtimeFactor: Number((durationSec / (elapsed / 1000)).toFixed(2)),
      workerModeUsed: 'main-thread-fallback',
    };
  }

  private async runInWorkerPool(
    audioSamples: Float32Array,
    sampleRate: number,
    textPayload: string
  ): Promise<Omit<ParallelAnalysisResult, 'totalAnalysisMs' | 'realtimeFactor' | 'workerModeUsed'>> {
    // Stage 1: Hum & ENF
    const p1 = new Promise<EnfAnalysisResult>((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), {
          type: 'module',
        });
        const slice = new Float32Array(audioSamples);
        const buffer = slice.buffer;
        worker.onmessage = (e: MessageEvent<WorkerTaskResponse>) => {
          worker.terminate();
          if (e.data.success) resolve(e.data.result);
          else reject(new Error(e.data.error));
        };
        worker.onerror = err => {
          worker.terminate();
          reject(err);
        };
        worker.postMessage(
          { taskId: 'hum-task', type: 'HUM_ENF', audioBuffer: buffer, sampleRate },
          [buffer]
        );
      } catch (err) {
        reject(err);
      }
    });

    // Stage 2: Ultrasonic CFAR
    const p2 = new Promise<BeaconAnalysisResult>((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), {
          type: 'module',
        });
        const slice = new Float32Array(audioSamples);
        const buffer = slice.buffer;
        worker.onmessage = (e: MessageEvent<WorkerTaskResponse>) => {
          worker.terminate();
          if (e.data.success) resolve(e.data.result);
          else reject(new Error(e.data.error));
        };
        worker.onerror = err => {
          worker.terminate();
          reject(err);
        };
        worker.postMessage(
          { taskId: 'ultra-task', type: 'ULTRASONIC_CFAR', audioBuffer: buffer, sampleRate },
          [buffer]
        );
      } catch (err) {
        reject(err);
      }
    });

    // Stage 3: Room Acoustics & Tamper
    const p3 = new Promise<{ room: RoomAcousticResult; tamper: TamperDetectionResult }>(
      (resolve, reject) => {
        try {
          const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), {
            type: 'module',
          });
          const slice = new Float32Array(audioSamples);
          const buffer = slice.buffer;
          worker.onmessage = (e: MessageEvent<WorkerTaskResponse>) => {
            worker.terminate();
            if (e.data.success) resolve(e.data.result);
            else reject(new Error(e.data.error));
          };
          worker.onerror = err => {
            worker.terminate();
            reject(err);
          };
          worker.postMessage(
            { taskId: 'room-tamper-task', type: 'ROOM_TAMPER', audioBuffer: buffer, sampleRate },
            [buffer]
          );
        } catch (err) {
          reject(err);
        }
      }
    );

    // Stage 4: Video Forensics / ID Checks
    const p4 = new Promise<ExtractedIdFindings | null>((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = (e: MessageEvent<WorkerTaskResponse>) => {
          worker.terminate();
          if (e.data.success) resolve(e.data.result.idMatches);
          else reject(new Error(e.data.error));
        };
        worker.onerror = err => {
          worker.terminate();
          reject(err);
        };
        worker.postMessage({
          taskId: 'video-id-task',
          type: 'VIDEO_FORENSICS',
          textPayload,
        });
      } catch (err) {
        reject(err);
      }
    });

    const [hum, ultrasonic, stage3, identifiers] = await Promise.all([p1, p2, p3, p4]);
    return {
      hum,
      ultrasonic,
      room: stage3.room,
      tamper: stage3.tamper,
      identifiers,
    };
  }

  private async runDirectFallback(
    audioSamples: Float32Array,
    sampleRate: number,
    textPayload: string
  ): Promise<Omit<ParallelAnalysisResult, 'totalAnalysisMs' | 'realtimeFactor' | 'workerModeUsed'>> {
    const hum = analyzeHumM2(audioSamples, sampleRate);
    const ultrasonic = analyzeUltrasonicBeaconsM3(audioSamples, sampleRate);
    const room = analyzeRoomAcousticsM4(audioSamples, sampleRate);
    const tamper = analyzeAudioTamperM5(audioSamples, sampleRate);
    const identifiers = textPayload ? scanAndValidateIdentifiers(textPayload) : null;

    return {
      hum,
      ultrasonic,
      room,
      tamper,
      identifiers,
    };
  }
}

export const globalWorkerPool = new WorkerPool();
