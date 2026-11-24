import { parseMetadataFromBuffer, parseMetadataAsync } from '../analyzers/metadata';
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

const SUPPORTED_EXTENSIONS = new Set([
  'mp4', 'mov', 'webm', 'wav', 'mp3', 'm4a', 'aac', 'ogg', 'jpg', 'jpeg', 'png'
]);

/**
 * Robust, client-side media ingest pipeline with hardened failure injection guards.
 * Handles: 0-byte file, 300MB file (>100MB), unsupported format, audio-only, video-only, corrupted MP4.
 */
export async function ingestUserFile(file: File): Promise<IngestedMedia> {
  // 1. Guard: Empty / 0-byte file
  if (!file || file.size === 0) {
    throw new Error('This file is empty (0 bytes). Please choose a valid video or audio recording.');
  }

  // 2. Guard: File size limit (>100 MB)
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('This file is larger than 100 MB. To protect your phone’s memory, files are limited to 100 MB.');
  }

  // 3. Guard: Unsupported format check
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImageMime = file.type.startsWith('image/');
  const isVideoMime = file.type.startsWith('video/');
  const isAudioMime = file.type.startsWith('audio/');

  if (!SUPPORTED_EXTENSIONS.has(ext) && !isImageMime && !isVideoMime && !isAudioMime) {
    throw new Error('This file format is not supported. Please choose an MP4, MOV, WebM, WAV, MP3, or M4A file.');
  }

  // 4. Compute SHA-256 fingerprint
  const fileBuffer = await file.arrayBuffer();
  const sha256 = await computeSha256(fileBuffer.slice(0, 1024 * 1024 * 4));

  // 5. Parse container metadata (QuickTime atoms / EXIF via exifr & mp4box)
  let metaResult: { report: MetadataReport; hasMoov?: boolean };
  try {
    metaResult = await parseMetadataAsync(fileBuffer, file.name);
  } catch {
    metaResult = { report: { deviceModel: ext.toUpperCase(), rawTags: {} }, hasMoov: false };
  }

  const isImage = isImageMime || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
  const isAudioOnly = isAudioMime || ['wav', 'mp3', 'm4a', 'aac', 'ogg'].includes(ext);

  // 6. Handle Image Files (JPEG/PNG)
  if (isImage) {
    try {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Could not decode image file format.'));
        img.src = blobUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(1280, img.width || 640);
      canvas.height = Math.round((canvas.width / (img.width || 1)) * (img.height || 480));
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
    } catch {
      throw new Error('Could not decode image. The file may be damaged or not a valid image.');
    }
  }

  // 7. Decode Audio Streams
  let channelData = new Float32Array(0);
  let sampleRate = 48000;
  let duration = 0;
  let hasAudio = false;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
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
    }
  } catch (audioErr) {
    // Graceful soft handling: container might be video-only without audio track
    hasAudio = false;
  }

  // 8. Handle 60s length cap
  const originalDuration = duration;
  let isOverLength = false;
  if (duration > 60.0) {
    isOverLength = true;
    const maxSamples = Math.floor(sampleRate * 60.0);
    channelData = channelData.slice(0, maxSamples);
    duration = 60.0;
  }

  // 9. Extract Video Frames (if video file)
  const videoFrames: HTMLCanvasElement[] = [];
  let hasVideo = !isAudioOnly;

  if (hasVideo) {
    try {
      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.playsInline = true;
      const videoBlobUrl = URL.createObjectURL(file);
      videoEl.src = videoBlobUrl;

      await new Promise<void>((resolve) => {
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
        // Native video resolution without artificial 640px clamping
        const nativeW = videoEl.videoWidth;
        const nativeH = videoEl.videoHeight;
        const vidDuration = Math.min(60, videoEl.duration || 10);
        // Extract smooth sequence of frames (15 fps sampling, up to 60 frames)
        const frameCount = Math.min(60, Math.max(15, Math.floor(vidDuration * 2)));
        const stepSec = vidDuration / frameCount;

        for (let i = 0; i < frameCount; i++) {
          videoEl.currentTime = i * stepSec;
          await new Promise<void>(r => {
            const t = setTimeout(r, 120);
            videoEl.onseeked = () => {
              clearTimeout(t);
              r();
            };
          });

          const canvas = document.createElement('canvas');
          canvas.width = nativeW;
          canvas.height = nativeH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(videoEl, 0, 0, nativeW, nativeH);
          }
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

  // 10. Check if file is completely corrupt (neither audio nor video could be parsed)
  if (!hasAudio && !hasVideo) {
    throw new Error('This media file appears damaged or incomplete. Could not read container headers.');
  }

  let statusMessage = '';
  if (!hasAudio && hasVideo) {
    statusMessage = 'Video-only recording loaded (no audio track). Visual frame and container metadata analyzed.';
  } else if (hasAudio && !hasVideo) {
    statusMessage = 'Audio-only recording loaded. Acoustic frequency spectrum and metadata analyzed.';
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
