/**
 * ECHO//TRACE Dedicated Analysis Web Worker
 * Executes heavy DSP and forensic computations off the main UI thread.
 */
import { analyzeHumM2 } from '../dsp/hum/enf';
import { analyzeUltrasonicBeaconsM3 } from '../dsp/beacons/cfar';
import { analyzeRoomAcousticsM4 } from '../dsp/room/acoustics';
import { analyzeAudioTamperM5 } from '../dsp/tamper/audioTamper';
import { scanAndValidateIdentifiers } from '../dsp/id/checksums';

export type WorkerTaskType =
  | 'HUM_ENF'
  | 'ULTRASONIC_CFAR'
  | 'ROOM_TAMPER'
  | 'VIDEO_FORENSICS'
  | 'SPECTROGRAM_TILE';

export interface WorkerTaskPayload {
  taskId: string;
  type: WorkerTaskType;
  audioBuffer?: ArrayBuffer;
  sampleRate?: number;
  imageDataArray?: ImageData[];
  textPayload?: string;
}

export interface WorkerTaskResponse {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
}

self.onmessage = (event: MessageEvent<WorkerTaskPayload>) => {
  const { taskId, type, audioBuffer, sampleRate = 48000, textPayload } = event.data;
  const start = performance.now();

  try {
    let result: any = null;

    if (type === 'HUM_ENF') {
      const samples = audioBuffer ? new Float32Array(audioBuffer) : new Float32Array(0);
      result = analyzeHumM2(samples, sampleRate);
    } else if (type === 'ULTRASONIC_CFAR') {
      const samples = audioBuffer ? new Float32Array(audioBuffer) : new Float32Array(0);
      result = analyzeUltrasonicBeaconsM3(samples, sampleRate);
    } else if (type === 'ROOM_TAMPER') {
      const samples = audioBuffer ? new Float32Array(audioBuffer) : new Float32Array(0);
      const room = analyzeRoomAcousticsM4(samples, sampleRate);
      const tamper = analyzeAudioTamperM5(samples, sampleRate);
      result = { room, tamper };
    } else if (type === 'VIDEO_FORENSICS') {
      const idMatches = textPayload ? scanAndValidateIdentifiers(textPayload) : null;
      result = { idMatches };
    }

    const durationMs = performance.now() - start;
    const response: WorkerTaskResponse = {
      taskId,
      success: true,
      result,
      durationMs,
    };

    self.postMessage(response);
  } catch (err: any) {
    const durationMs = performance.now() - start;
    self.postMessage({
      taskId,
      success: false,
      error: err?.message || String(err),
      durationMs,
    });
  }
};
