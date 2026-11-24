/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import Meyda from 'meyda';
import { ssim } from 'ssim.js';

console.log('--- Meyda Test ---');
const sampleRate = 48000;
const frameSize = 1024;
Meyda.sampleRate = sampleRate;
Meyda.bufferSize = frameSize;

const frame = new Float32Array(frameSize);
for (let i = 0; i < frameSize; i++) {
  frame[i] = Math.sin((2 * Math.PI * 1000 * i) / sampleRate);
}
const feat = Meyda.extract(['spectralCentroid', 'spectralRolloff', 'zcr', 'spectralFlatness'], frame);
console.log('Meyda 1kHz sine:', feat);

console.log('--- ssim.js Test ---');
const w = 32, h = 32;
const d1 = new Uint8ClampedArray(w * h * 4);
const d2 = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < d1.length; i += 4) {
  d1[i] = 100; d1[i+1] = 100; d1[i+2] = 100; d1[i+3] = 255;
  // d2 is heavily blurred/pixelated
  d2[i] = 20; d2[i+1] = 20; d2[i+2] = 20; d2[i+3] = 255;
}
const r1 = ssim({ data: d1, width: w, height: h }, { data: d1, width: w, height: h });
console.log('SSIM identical:', r1.mssim);
const r2 = ssim({ data: d1, width: w, height: h }, { data: d2, width: w, height: h });
console.log('SSIM perturbed:', r2.mssim);
