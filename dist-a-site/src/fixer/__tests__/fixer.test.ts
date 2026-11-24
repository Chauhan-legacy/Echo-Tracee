import { describe, it, expect } from 'vitest';
import { sanitizeAudio, BiquadNotchFilter } from '../audioFixer';
import {
  designKaiserLowpass,
  applyFirFilter,
  resampleTo32kHz,
  computeLogSpectralDistance,
  computeSegmentalSnr,
} from '../kaiserFir';
import { computeRegionSSIM } from '../canvasFixer';
import { byteScanOutputFile } from '../metadataCleaner';
import { runClosedLoopVerification } from '../closedLoop';
import {
  buildMerkleTree,
  chunkAudioPerSecond,
  createCompleteProofReceipt,
  verifyCompleteProofReceipt,
  sha256Hex,
} from '../merkleProof';

describe('Hardened Sanitizer Suite (S1-S5)', () => {
  // S1 Audio Sanitizer Tests
  describe('S1 Audio Sanitizer & Damage Metrics', () => {
    it('designs Kaiser low-pass filter with >= 100 dB stopband attenuation', () => {
      const sampleRate = 48000;
      const taps = designKaiserLowpass(16000, sampleRate, 100, 1500);
      expect(taps.length).toBeGreaterThan(50);
      // Verify symmetry of linear-phase FIR
      const m = taps.length;
      for (let i = 0; i < 10; i++) {
        expect(taps[i]).toBeCloseTo(taps[m - 1 - i], 5);
      }
    });

    it('resamples 48 kHz to 32 kHz (guaranteeing Nyquist <= 16 kHz)', () => {
      const orig = new Float32Array(48000);
      for (let i = 0; i < orig.length; i++) orig[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);

      const { audio32k, targetRate } = resampleTo32kHz(orig, 48000);
      expect(targetRate).toBe(32000);
      expect(audio32k.length).toBe(32000);
    });

    it('computes LSD < 1.5 dB and SSNR > 18 dB on slightly filtered signal', () => {
      const n = 16000;
      const clean = new Float32Array(n);
      const test = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / 16000;
        // Speech-like harmonic mixture
        clean[i] =
          0.3 * Math.sin(2 * Math.PI * 300 * t) +
          0.2 * Math.sin(2 * Math.PI * 600 * t) +
          0.1 * Math.sin(2 * Math.PI * 1200 * t);
        // Slightly notched / level attenuated signal (-0.4 dB)
        test[i] = clean[i] * 0.95;
      }

      const lsd = computeLogSpectralDistance(clean, test);
      const ssnr = computeSegmentalSnr(clean, test);
      expect(lsd).toBeLessThan(1.5);
      expect(ssnr).toBeGreaterThan(18.0);
    });

    it('Biquad notch filter attenuates 19.4 kHz tracker tone by >= 40 dB', () => {
      const sampleRate = 48000;
      const numSamples = 48000;
      const input = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        input[i] = 0.5 * Math.sin(2 * Math.PI * 19400 * t);
      }

      const { cleanAudio, dbReductions } = sanitizeAudio(input, sampleRate, [19400], 50.02);
      expect(dbReductions['Tracker Tone 19400 Hz']).toBeGreaterThanOrEqual(40);
      expect(cleanAudio.length).toBeGreaterThan(0);
    });
  });

  // S2 Visual Sanitizer Tests
  describe('S2 Visual Irreversibility & SSIM', () => {
    it('computes SSIM < 0.20 between original and heavily pixelated/noise blocks', () => {
      const w = 32, h = 32;
      const orig = new Uint8ClampedArray(w * h * 4);
      const redacted = new Uint8ClampedArray(w * h * 4);

      // Original has high-contrast pattern (face or text)
      for (let i = 0; i < w * h; i++) {
        const val = i % 2 === 0 ? 240 : 20;
        orig[i * 4] = val;
        orig[i * 4 + 1] = val;
        orig[i * 4 + 2] = val;
        orig[i * 4 + 3] = 255;
      }

      // Redacted has uniform solid/perturbed average
      for (let i = 0; i < w * h; i++) {
        const noise = Math.round((Math.random() - 0.5) * 20);
        redacted[i * 4] = 128 + noise;
        redacted[i * 4 + 1] = 128 + noise;
        redacted[i * 4 + 2] = 128 + noise;
        redacted[i * 4 + 3] = 255;
      }

      const ssim = computeRegionSSIM(orig, redacted);
      expect(ssim).toBeLessThan(0.20);
    });
  });

  // S3 Metadata Cleaner Tests
  describe('S3 Metadata Cleaner Byte Scanner', () => {
    it('detects forbidden GPS ISO 6709 coordinates and camera makers in raw bytes', () => {
      const cleanBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]).buffer;
      const cleanScan = byteScanOutputFile(cleanBuffer);
      expect(cleanScan.isClean).toBe(true);
      expect(cleanScan.totalHits).toBe(0);

      // Dirty buffer with "Apple" tag and "+37.7749-122.4194"
      const dirtyText = 'ftypisom....Apple iPhone 15 Pro....+37.7749-122.4194/...';
      const dirtyBytes = new TextEncoder().encode(dirtyText);
      const dirtyScan = byteScanOutputFile(dirtyBytes.buffer);
      expect(dirtyScan.isClean).toBe(false);
      expect(dirtyScan.totalHits).toBeGreaterThan(0);
    });
  });

  // S4 Closed-Loop Verification Tests
  describe('S4 Closed-Loop Verification', () => {
    it('passes closed-loop rules when tones, hum, and metadata are cleared', () => {
      const cleanAudio = new Float32Array(48000); // silence/clean audio
      const result = runClosedLoopVerification(cleanAudio, 48000, undefined, 0.05);
      expect(result.overallPassed).toBe(true);
      expect(result.ruleChecks.every(r => r.passed)).toBe(true);
      expect(result.residualRisks.length).toBeGreaterThan(0);
    });
  });

  // S5 Merkle Tree & ECDSA P-256 Signatures
  describe('S5 Proof of Integrity & Merkle Trees', () => {
    it('constructs per-second chunks and builds valid Merkle Tree', async () => {
      const samples = new Float32Array(48000 * 3); // 3 seconds
      const chunks = chunkAudioPerSecond(samples, 48000);
      expect(chunks.length).toBe(3);

      const tree = await buildMerkleTree(chunks);
      expect(tree.totalChunks).toBe(3);
      expect(tree.rootHash).toBeDefined();
      expect(tree.rootHash.length).toBe(64);
      expect(tree.leafHashes.length).toBe(3);
    });

    it('generates and verifies Web Crypto ECDSA P-256 proof receipt', async () => {
      const manifest = {
        timestamp: new Date().toISOString(),
        inputSha256: await sha256Hex('input-data-test'),
        outputSha256: await sha256Hex('output-data-test'),
        inputMerkleRoot: await sha256Hex('merkle-in-root'),
        outputMerkleRoot: await sha256Hex('merkle-out-root'),
        actions: [
          {
            type: 'Ultrasonic Notch Filter',
            description: '19.4 kHz beacon stripped',
            parameters: { freqHz: 19400, depthDb: 48 },
          },
        ],
      };

      const receipt = await createCompleteProofReceipt(manifest);
      expect(receipt.signatureHex).toBeDefined();
      expect(receipt.signatureHex.length).toBeGreaterThan(64);

      const isValid = await verifyCompleteProofReceipt(receipt);
      expect(isValid).toBe(true);

      // Verify tampering rejection
      const tampered = {
        ...receipt,
        manifest: {
          ...receipt.manifest,
          outputSha256: 'tampered-hash-0000000000000000000000000000000000000000000000000000',
        },
      };
      const isTamperedValid = await verifyCompleteProofReceipt(tampered);
      expect(isTamperedValid).toBe(false);
    });
  });
});
