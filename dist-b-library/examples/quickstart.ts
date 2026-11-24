import { evaluateGoertzelBin, kalmanENFTrack, computePCE } from '../src/index';

console.log('--- echotrace-math Quickstart Demo ---');
const signal = new Float32Array(44100).map((_, i) => Math.sin(2 * Math.PI * 19400 * (i / 44100)));
const res = evaluateGoertzelBin(signal, 19400, 44100);
console.log('19.4 kHz Goertzel magnitude:', res.magnitude, 'powerDb:', res.powerDb.toFixed(2), 'dB');
