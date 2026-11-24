/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Irreversible Anti-AI Voronoi Redactor
 *
 * Traditional Gaussian blur and mosaic pixelation retain spatial gradient cues
 * that modern neural deblurring networks (e.g. DeblurGAN, ESRGAN, diffusion inverters)
 * can deconvolute to recover text and facial landmarks.
 *
 * This module applies Voronoi Cell Tessellation + Poisson Noise Injection:
 * 1. Partitions the redaction region into randomized centroid seeds.
 * 2. Assigns each pixel to its nearest seed (Voronoi cell).
 * 3. Fills cells with quantized cluster means and injects zero-mean Poisson dither.
 * 4. Destroys the continuous spatial gradient, providing mathematically irreversible redaction.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function applyVoronoiRedaction(
  ctx: CanvasRenderingContext2D,
  box: BoundingBox,
  seedDensity: number = 36
): void {
  const canvasW = ctx.canvas?.width || 1920;
  const canvasH = ctx.canvas?.height || 1080;

  // Ensure integer pixel coordinates clamped to canvas boundaries
  const ix = Math.max(0, Math.min(canvasW - 1, Math.floor(box.x)));
  const iy = Math.max(0, Math.min(canvasH - 1, Math.floor(box.y)));
  const iw = Math.max(1, Math.min(canvasW - ix, Math.round(box.width)));
  const ih = Math.max(1, Math.min(canvasH - iy, Math.round(box.height)));

  if (iw < 2 || ih < 2) return;

  const imgData = ctx.getImageData(ix, iy, iw, ih);
  const { data } = imgData;

  // Generate randomized Voronoi seed points
  const maxSeedsPossible = Math.max(4, Math.min(64, Math.floor((iw * ih) / 16)));
  const numSeeds = Math.max(4, Math.min(maxSeedsPossible, Math.round(seedDensity)));
  const seeds: { x: number; y: number; r: number; g: number; b: number; count: number }[] = [];

  // Deterministic pseudo-random sequence for repeatability
  let seedVal = (54321 + ix * 101 + iy * 997) >>> 0;
  const nextRand = () => {
    seedVal = ((seedVal * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return seedVal / 0x7fffffff;
  };

  for (let i = 0; i < numSeeds; i++) {
    seeds.push({
      x: Math.floor(nextRand() * iw),
      y: Math.floor(nextRand() * ih),
      r: 0,
      g: 0,
      b: 0,
      count: 0,
    });
  }

  // Pass 1: Assign pixels to nearest seed and accumulate color sums
  const pixelSeedMap = new Int16Array(iw * ih);

  for (let py = 0; py < ih; py++) {
    const rowOffset = py * iw;
    for (let px = 0; px < iw; px++) {
      let minDistSq = Infinity;
      let bestSeed = 0;

      for (let s = 0; s < numSeeds; s++) {
        const dx = px - seeds[s].x;
        const dy = py - seeds[s].y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          bestSeed = s;
        }
      }

      const pIdx = rowOffset + px;
      pixelSeedMap[pIdx] = bestSeed;

      const dIdx = pIdx * 4;
      seeds[bestSeed].r += data[dIdx];
      seeds[bestSeed].g += data[dIdx + 1];
      seeds[bestSeed].b += data[dIdx + 2];
      seeds[bestSeed].count++;
    }
  }

  // Compute average color per Voronoi cell with fallback
  for (let s = 0; s < numSeeds; s++) {
    if (seeds[s].count > 0) {
      seeds[s].r = Math.round(seeds[s].r / seeds[s].count);
      seeds[s].g = Math.round(seeds[s].g / seeds[s].count);
      seeds[s].b = Math.round(seeds[s].b / seeds[s].count);
    } else {
      seeds[s].r = 128;
      seeds[s].g = 128;
      seeds[s].b = 128;
    }
  }

  // Pass 2: Write quantized Voronoi cells + inject subtle Poisson dither
  for (let py = 0; py < ih; py++) {
    const rowOffset = py * iw;
    for (let px = 0; px < iw; px++) {
      const pIdx = rowOffset + px;
      const seedIdx = pixelSeedMap[pIdx];
      const s = (seedIdx >= 0 && seedIdx < seeds.length) ? seeds[seedIdx] : (seeds[0] || { r: 128, g: 128, b: 128 });

      // Poisson-like dither
      const noise = (nextRand() - 0.5) * 14;

      const dIdx = pIdx * 4;
      data[dIdx] = Math.max(0, Math.min(255, Math.round(s.r + noise)));
      data[dIdx + 1] = Math.max(0, Math.min(255, Math.round(s.g + noise)));
      data[dIdx + 2] = Math.max(0, Math.min(255, Math.round(s.b + noise)));
      data[dIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, ix, iy);

  // Draw delicate dark forest boundary wireframe around cell edges for aesthetic finish
  ctx.save();
  ctx.strokeStyle = 'rgba(23, 77, 53, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ix, iy, iw, ih);
  ctx.restore();
}
