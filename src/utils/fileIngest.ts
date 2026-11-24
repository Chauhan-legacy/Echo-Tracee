import { parseMetadataFromBuffer } from '../analyzers/metadata';
import { computeSha256 } from '../demo/incident001';
import { MetadataReport } from '../types';

export interface IngestedMedia {
  sourceName: string;
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
  hasAudio: boolean;
  hasVideo: boolean;
  videoFrames: HTMLCanvasElement[];
  metadata: MetadataReport;
  sha256: string;
  isOverLength: boolean;
  originalDuration: number;
  statusMessage?: string;
}

/**
 * Robust, client-side media ingest pipeline.
 * Accepts MP4, MOV, WebM, WAV, MP3, M4A, JPG.
 * Gracefully handles 0-byte, corrupt, audio-only, no-audio, and long files.
 */
export async function ingestUserFile(file: File): Promise<IngestedMedia> {
  // 1. Guard: Empty / 0-byte file
  if (!file || file.size === 0) {
    throw new Error('Selected file is empty (0 bytes). Please provide a valid video or audio recording.');
  }

  // 2. Compute SHA-256 fingerprint
  const fileBuffer = await file.arrayBuffer();
  const sha256 = await computeSha256(fileBuffer.slice(0, 1024 * 1024 * 4));

  // 3. Parse container metadata (QuickTime atoms / EXIF)
  const metaResult = parseMetadataFromBuffer(fileBuffer, file.name);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = file.type.startsWith('image/') || ext === 'jpg' || ext === 'jpeg';
  const isAudioOnly = file.type.startsWith('audio/') || ['wav', 'mp3', 'm4a', 'aac', 'ogg'].includes(ext);

  // 4. Handle Image Files (JPEG/JPG)
  if (isImage) {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode image file format.'));
      img.src = blobUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1280, img.width);
    canvas.height = Math.round((canvas.width / img.width) * img.height);
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(blobUrl);

    return {
      sourceName: file.name,
      channelData: new Float32Array(0),
      sampleRate: 48000,
      duration: 1.0,
      hasAudio: false,
      hasVideo: true,
      videoFrames: [canvas],
      metadata: metaResult.report,
      sha256,
      isOverLength: false,
      originalDuration: 1.0,
      statusMessage: 'Image file ingested. Optical visual checks and EXIF metadata analyzed.',
    };
  }

  // 5. Decode Audio Streams
  let channelData = new Float32Array(0);
  let sampleRate = 48000;
  let duration = 0;
  let hasAudio = false;

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Copy buffer as decodeAudioData detaches
    const audioBufferCopy = fileBuffer.slice(0);
    const decoded = await audioCtx.decodeAudioData(audioBufferCopy);

    sampleRate = decoded.sampleRate;
    hasAudio = true;

    // Stereo to Mono mixdown if needed
    if (decoded.numberOfChannels >= 2) {
      const left = decoded.getChannelData(0);
      const right = decoded.getChannelData(1);
      channelData = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        channelData[i] = 0.5 * (left[i] + right[i]);
      }
    } else {
      channelData = decoded.getChannelData(0);
    }

    duration = channelData.length / sampleRate;
    await audioCtx.close();
  } catch (audioErr) {
    // Graceful soft handling: container might be video-only without audio track
    hasAudio = false;
  }

  // 6. Handle 60s length cap
  const originalDuration = duration;
  let isOverLength = false;
  if (duration > 60.0) {
    isOverLength = true;
    const maxSamples = Math.floor(sampleRate * 60.0);
    channelData = channelData.slice(0, maxSamples);
    duration = 60.0;
  }

  // 7. Extract Video Frames (if video file)
  const videoFrames: HTMLCanvasElement[] = [];
  let hasVideo = !isAudioOnly;

  if (hasVideo) {
    try {
      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.playsInline = true;
      const videoBlobUrl = URL.createObjectURL(file);
      videoEl.src = videoBlobUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), 3000); // 3s max wait
        videoEl.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        videoEl.onerror = () => {
          clearTimeout(timeout);
          hasVideo = false;
          resolve();
        };
      });

      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        // Sample up to 8 frames across the first 60 seconds
        const frameCount = Math.min(8, Math.max(1, Math.floor(Math.min(60, videoEl.duration || 10))));
        const stepSec = (Math.min(60, videoEl.duration || 10)) / frameCount;

        for (let i = 0; i < frameCount; i++) {
          videoEl.currentTime = i * stepSec;
          await new Promise<void>(r => {
            const t = setTimeout(r, 200);
            videoEl.onseeked = () => {
              clearTimeout(t);
              r();
            };
          });

          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, videoEl.videoWidth);
          canvas.height = Math.round((canvas.width / videoEl.videoWidth) * videoEl.videoHeight);
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          videoFrames.push(canvas);
        }
      } else {
        hasVideo = false;
      }

      URL.revokeObjectURL(videoBlobUrl);
    } catch {
      hasVideo = false;
    }
  }

  let statusMessage = '';
  if (!hasAudio && hasVideo) {
    statusMessage = 'Video recording has no audio track. Visual and metadata checks executed.';
  } else if (hasAudio && !hasVideo) {
    statusMessage = 'Voice note / audio file ingested. Acoustic spectrum and metadata analyzed.';
  } else if (isOverLength) {
    statusMessage = `File duration (${originalDuration.toFixed(0)}s) capped to first 60 seconds.`;
  }

  return {
    sourceName: file.name,
    channelData,
    sampleRate,
    duration: duration || 1.0,
    hasAudio,
    hasVideo,
    videoFrames,
    metadata: metaResult.report,
    sha256,
    isOverLength,
    originalDuration,
    statusMessage,
  };
}
