import FFT from 'fft.js';
import Meyda from 'meyda';
import * as ssimModule from 'ssim.js';
import exifr from 'exifr';
import { createFile } from 'mp4box';

console.log('Testing adopted libraries:');

// 1. FFT
const N = 128;
const f = new FFT(N);
const out = f.createComplexArray();
const signal = new Float64Array(N);
for (let i = 0; i < N; i++) {
  signal[i] = 1.5 + 2.0 * Math.cos((2.0 * Math.PI * 5 * i) / N) + 0.8 * Math.sin((2.0 * Math.PI * 18 * i) / N);
}
f.realTransform(out, signal);
console.log('FFT.js: DC real =', out[0], 'imag =', out[1]);
console.log('FFT.js: bin 5 real =', out[10], 'imag =', out[11]);
console.log('FFT.js: bin 18 real =', out[36], 'imag =', out[37]);

// 2. Meyda
const audioFrame = new Float32Array(512);
for (let i = 0; i < 512; i++) audioFrame[i] = Math.sin((2 * Math.PI * 440 * i) / 44100);
const features = Meyda.extract(['spectralCentroid', 'spectralRolloff', 'zcr', 'spectralFlatness'], audioFrame);
console.log('Meyda extracted features:', features);

// 3. SSIM
const ssimFn = (ssimModule as any).default || (ssimModule as any).ssim || ssimModule;
const img1 = { data: new Uint8ClampedArray(64 * 64 * 4).fill(128), width: 64, height: 64 };
const img2 = { data: new Uint8ClampedArray(64 * 64 * 4).fill(128), width: 64, height: 64 };
const ssimRes = ssimFn(img1, img2);
console.log('SSIM identical mssim =', ssimRes.mssim);

// 4. exifr
console.log('exifr parse type:', typeof exifr.parse);

// 5. MP4Box createFile
const mp4 = createFile();
console.log('MP4Box createFile ok:', typeof mp4.appendBuffer);
