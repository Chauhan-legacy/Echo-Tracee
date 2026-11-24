/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * In-browser Video Re-encoder using HTML5 Canvas captureStream and MediaRecorder.
 * Strips all EXIF, QuickTime location atoms, and camera metadata.
 */

export async function exportSanitizedVideo(
  frames: HTMLCanvasElement[],
  cleanAudio: Float32Array,
  sampleRate: number,
  fps = 15
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No video frames available to encode.');
  }

  const width = frames[0].width;
  const height = frames[0].height;

  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;
  const ctx = renderCanvas.getContext('2d')!;

  // 1. Setup Canvas Stream
  const canvasStream = renderCanvas.captureStream(fps);

  // 2. Setup Web Audio Stream Destination
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const audioBuffer = audioCtx.createBuffer(1, cleanAudio.length, sampleRate);
  audioBuffer.getChannelData(0).set(cleanAudio);

  const sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = audioBuffer;

  const destNode = audioCtx.createMediaStreamDestination();
  sourceNode.connect(destNode);

  // Combine video track + audio track
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  // Determine supported mimeType
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6000000, // 6 Mbps high-fidelity bitrate
    audioBitsPerSecond: 192000,
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      audioCtx.close();
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve(finalBlob);
    };
    recorder.onerror = e => reject(e);
  });

  recorder.start();
  sourceNode.start(0);

  // Render every available frame sequentially with high quality smoothing
  const totalFrames = frames.length;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let f = 0; f < totalFrames; f++) {
    const frameIdx = f % frames.length;
    ctx.drawImage(frames[frameIdx], 0, 0, width, height);
    // Draw subtle forensic clean badge in corner
    ctx.fillStyle = '#174D35';
    ctx.fillRect(10, 10, 160, 22);
    ctx.fillStyle = '#8BCF55';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SANITIZED // ECHO-TRACE', 14, 25);

    await new Promise(r => setTimeout(r, Math.max(10, Math.floor(1000 / fps))));
  }

  recorder.stop();
  sourceNode.stop();

  return await recordingPromise;
}
