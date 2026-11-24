import { VisualFindingBox } from '../types';

/**
 * Pixelates sensitive rectangular regions on an HTML canvas.
 * 100% in-browser visual sanitization.
 */
export function pixelateCanvasRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  blockSize = 12
): void {
  const clampX = Math.max(0, Math.floor(x));
  const clampY = Math.max(0, Math.floor(y));
  const clampW = Math.min(ctx.canvas.width - clampX, Math.floor(width));
  const clampH = Math.min(ctx.canvas.height - clampY, Math.floor(height));

  if (clampW <= 0 || clampH <= 0) return;

  const imgData = ctx.getImageData(clampX, clampY, clampW, clampH);
  const data = imgData.data;

  for (let py = 0; py < clampH; py += blockSize) {
    for (let px = 0; px < clampW; px += blockSize) {
      const curBlockW = Math.min(blockSize, clampW - px);
      const curBlockH = Math.min(blockSize, clampH - py);

      // Compute average color in block
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let by = 0; by < curBlockH; by++) {
        for (let bx = 0; bx < curBlockW; bx++) {
          const idx = ((py + by) * clampW + (px + bx)) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      const rAvg = Math.round(rSum / count);
      const gAvg = Math.round(gSum / count);
      const bAvg = Math.round(bSum / count);

      // Fill block
      for (let by = 0; by < curBlockH; by++) {
        for (let bx = 0; bx < curBlockW; bx++) {
          const idx = ((py + by) * clampW + (px + bx)) * 4;
          data[idx] = rAvg;
          data[idx + 1] = gAvg;
          data[idx + 2] = bAvg;
        }
      }
    }
  }

  ctx.putImageData(imgData, clampX, clampY);

  // Forensic border and badge
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(clampX, clampY, clampW, clampH);
  ctx.setLineDash([]);

  // Tag
  ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
  ctx.fillRect(clampX, Math.max(0, clampY - 16), 72, 16);
  ctx.fillStyle = '#080B11';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('SANITIZED', clampX + 4, Math.max(11, clampY - 4));
}

/**
 * Sanitizes an array of video frames by blurring or pixelating all flagged visual boxes.
 */
export function sanitizeVideoFrames(
  frames: HTMLCanvasElement[],
  boxes: VisualFindingBox[]
): HTMLCanvasElement[] {
  const cleanFrames: HTMLCanvasElement[] = [];

  for (const frame of frames) {
    const copy = document.createElement('canvas');
    copy.width = frame.width;
    copy.height = frame.height;
    const ctx = copy.getContext('2d');
    if (!ctx) continue;

    // Draw original frame
    ctx.drawImage(frame, 0, 0);

    // Pixelate each box
    for (const b of boxes) {
      const px = b.x * frame.width;
      const py = b.y * frame.height;
      const pw = b.width * frame.width;
      const ph = b.height * frame.height;

      pixelateCanvasRegion(ctx, px, py, pw, ph, 14);
    }

    cleanFrames.push(copy);
  }

  return cleanFrames;
}
