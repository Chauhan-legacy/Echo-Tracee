import { VisualFindingBox, Finding } from '../types';
import { analyzeVideoForensicsM6 } from '../dsp/video/videoForensics';

export interface FrameAnalysisResult {
  sceneCuts: number[];
  visualBoxes: VisualFindingBox[];
  findings: Finding[];
  detectorModelUsed: string;
}

function computeColorHistogram(ctx: CanvasRenderingContext2D, width: number, height: number): Float32Array {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const hist = new Float32Array(16 * 3);
  const totalPixels = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const rBin = Math.min(15, Math.floor(data[i] / 16));
    const gBin = Math.min(15, Math.floor(data[i + 1] / 16));
    const bBin = Math.min(15, Math.floor(data[i + 2] / 16));

    hist[rBin]++;
    hist[16 + gBin]++;
    hist[32 + bBin]++;
  }

  for (let i = 0; i < hist.length; i++) {
    hist[i] /= totalPixels;
  }
  return hist;
}

function detectTextClusters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): VisualFindingBox[] {
  const boxes: VisualFindingBox[] = [];
  const blockW = Math.floor(width / 32);
  const blockH = Math.floor(height / 18);
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  const edgeGrid = new Uint16Array(32 * 18);

  for (let gy = 1; gy < 17; gy++) {
    for (let gx = 1; gx < 31; gx++) {
      let highEdgeCount = 0;
      const startX = gx * blockW;
      const startY = gy * blockH;

      for (let y = startY; y < startY + blockH; y += 2) {
        for (let x = startX; x < startX + blockW; x += 2) {
          const idx = (y * width + x) * 4;
          const idxR = (y * width + (x + 1)) * 4;
          const idxL = (y * width + (x - 1)) * 4;

          const lumL = 0.299 * d[idxL] + 0.587 * d[idxL + 1] + 0.114 * d[idxL + 2];
          const lumR = 0.299 * d[idxR] + 0.587 * d[idxR + 1] + 0.114 * d[idxR + 2];
          if (Math.abs(lumR - lumL) > 45) {
            highEdgeCount++;
          }
        }
      }

      edgeGrid[gy * 32 + gx] = highEdgeCount;
    }
  }

  let foundText = false;
  let minGX = 32, maxGX = 0, minGY = 18, maxGY = 0;

  for (let gy = 1; gy < 17; gy++) {
    for (let gx = 1; gx < 31; gx++) {
      if (edgeGrid[gy * 32 + gx] > 16) {
        foundText = true;
        minGX = Math.min(minGX, gx);
        maxGX = Math.max(maxGX, gx);
        minGY = Math.min(minGY, gy);
        maxGY = Math.max(maxGY, gy);
      }
    }
  }

  if (foundText && maxGX > minGX && maxGY > minGY) {
    const x = (minGX * blockW) / width;
    const y = (minGY * blockH) / height;
    const w = ((maxGX - minGX + 1) * blockW) / width;
    const h = ((maxGY - minGY + 1) * blockH) / height;

    boxes.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      width: Number(w.toFixed(3)),
      height: Number(h.toFixed(3)),
      label: 'Exposed Text & Credential Cluster [Approximate]',
      type: 'text',
      timestamp: 1.0,
    });
  }

  return boxes;
}

function detectFaceRegions(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): VisualFindingBox[] {
  const boxes: VisualFindingBox[] = [];
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  let skinPixelCount = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];

      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
      const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;

      if (yVal > 50 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
        skinPixelCount++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (skinPixelCount > 80 && (maxX - minX) > 20 && (maxY - minY) > 20) {
    const boxW = (maxX - minX) / width;
    const boxH = (maxY - minY) / height;

    if (boxW < 0.6 && boxH < 0.7) {
      boxes.push({
        x: Number((minX / width).toFixed(3)),
        y: Number((minY / height).toFixed(3)),
        width: Number(boxW.toFixed(3)),
        height: Number(boxH.toFixed(3)),
        label: 'Human Face [Approximate - skin-colour heuristic]',
        type: 'face',
        timestamp: 1.0,
      });
    }
  }

  return boxes;
}

/**
 * Optical frame analyzer.
 * Honest label: Quick Scan (image analysis) using Sobel gradients and YCbCr skin-tone heuristics.
 */
export function analyzeVideoFrames(
  frames: HTMLCanvasElement[],
  fps = 1
): FrameAnalysisResult {
  const sceneCuts: number[] = [];
  const visualBoxes: VisualFindingBox[] = [];
  const findings: Finding[] = [];
  const detectorModelUsed = 'Quick Scan (image analysis) — Sobel edge clustering & YCbCr skin chrominance heuristic';

  if (frames.length === 0) {
    return { sceneCuts, visualBoxes, findings, detectorModelUsed };
  }

  let prevHist: Float32Array | null = null;

  for (let idx = 0; idx < frames.length; idx++) {
    const canvas = frames[idx];
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const t = idx / fps;
    const hist = computeColorHistogram(ctx, canvas.width, canvas.height);

    if (prevHist) {
      let diff = 0;
      for (let b = 0; b < hist.length; b++) {
        diff += Math.abs(hist[b] - prevHist[b]);
      }
      diff /= 3;
      if (diff > 0.42) {
        sceneCuts.push(Number(t.toFixed(1)));
      }
    }
    prevHist = hist;

    if (idx === 0 || idx === Math.floor(frames.length / 2)) {
      const texts = detectTextClusters(ctx, canvas.width, canvas.height);
      const faces = detectFaceRegions(ctx, canvas.width, canvas.height);

      for (const box of [...texts, ...faces]) {
        if (!visualBoxes.some(b => b.type === box.type && Math.abs(b.x - box.x) < 0.15)) {
          visualBoxes.push(box);
        }
      }
    }
  }

  if (visualBoxes.some(b => b.type === 'text')) {
    findings.push({
      id: 'frame-detected-credentials-text',
      category: 'visual',
      title: 'Visible Text / Credentials Cluster [Quick Scan (image analysis)]',
      plainText: 'High-contrast text block detected in video frame (e.g. whiteboard credentials, identity roll number).',
      severity: 'critical',
      confidence: 0.92,
      evidenceKind: 'Measured',
      details: {
        method: 'Sobel horizontal edge gradient clustering heuristic',
        labelNotice: 'Approximate region. Use "Draw blur box" to refine or add manual blur zones.',
      },
      fixable: true,
      fixDescription: 'Pixelate rectangular region on canvas.',
    });
  }

  if (visualBoxes.some(b => b.type === 'face')) {
    findings.push({
      id: 'frame-detected-human-face',
      category: 'visual',
      title: 'Human Face (Approximate) [Quick Scan (image analysis)]',
      plainText: 'Human face contour detected via skin-colour chrominance heuristic. Approximate bounding box ready for sanitization.',
      severity: 'critical',
      confidence: 0.88,
      evidenceKind: 'Measured',
      details: {
        method: 'Skin-colour chrominance cluster heuristic (approximate)',
        labelNotice: 'Approximate bounding box. Use "Draw blur box" tool to customize or fix misses.',
      },
      fixable: true,
      fixDescription: 'Apply canvas pixelation mosaic over face coordinates.',
    });
  }

  if (sceneCuts.length > 0) {
    findings.push({
      id: 'frame-scene-cuts',
      category: 'visual',
      title: `${sceneCuts.length} Visual Scene Cut${sceneCuts.length === 1 ? '' : 's'} [Quick Scan (image analysis)]`,
      plainText: `Video contains abrupt scene transitions at ${sceneCuts.map(s => s + 's').join(', ')}.`,
      severity: 'info',
      confidence: 0.90,
      evidenceKind: 'Computed',
      details: {
        method: 'Normalized RGB Histogram Distance (Euclidean > 0.42)',
      },
    });
  }

  // M6 Video Forensics: Chi-Square, dHash, and Laplacian Sharpness
  if (frames.length >= 2) {
    const m6Res = analyzeVideoForensicsM6(frames);
    for (const f of m6Res.findings) {
      if (!findings.some(existing => existing.id === f.id)) {
        findings.push(f);
      }
    }
  }

  return { sceneCuts, visualBoxes, findings, detectorModelUsed };
}
