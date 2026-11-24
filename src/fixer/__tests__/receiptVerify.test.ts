import { describe, it, expect } from 'vitest';
import {
  createCompleteProofReceipt,
  verifyCompleteProofReceipt,
  buildMerkleTree,
  chunkAudioPerSecond,
  sha256Hex,
  TransformationManifest,
  CompleteProofReceipt,
} from '../merkleProof';
import { getOrCreateDeviceKeyPair, resetDeviceKey } from '../deviceKey';

describe('Phase A: Sanitization Receipt & Tamper Verification Suite', () => {
  it('generates persistent device keypair and human-readable fingerprint', async () => {
    const keyPair1 = await getOrCreateDeviceKeyPair();
    expect(keyPair1.fingerprint).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

    // Second call retrieves the same persistent key
    const keyPair2 = await getOrCreateDeviceKeyPair();
    expect(keyPair2.fingerprint).toBe(keyPair1.fingerprint);

    // Resetting device key produces a fresh new fingerprint
    const newFp = await resetDeviceKey();
    expect(newFp).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(newFp).not.toBe(keyPair1.fingerprint);
  });

  it('valid file + authentic receipt matches with 100% cryptographic integrity', async () => {
    const sampleRate = 32000;
    const durSec = 10;
    const cleanMedia = new Float32Array(sampleRate * durSec);
    for (let i = 0; i < cleanMedia.length; i++) cleanMedia[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);

    // Build chunks & Merkle tree
    const chunks = chunkAudioPerSecond(cleanMedia, sampleRate);
    const merkleTree = await buildMerkleTree(chunks);
    const mediaUint8 = new Uint8Array(cleanMedia.buffer, cleanMedia.byteOffset, cleanMedia.byteLength);
    const mediaSha256 = await sha256Hex(mediaUint8);

    const manifest: TransformationManifest = {
      timestamp: new Date().toISOString(),
      inputSha256: await sha256Hex('raw-input-data'),
      outputSha256: mediaSha256,
      inputMerkleRoot: await sha256Hex('raw-merkle-root'),
      outputMerkleRoot: merkleTree.rootHash,
      outputChunkHashes: merkleTree.leafHashes,
      actions: [
        {
          type: 'Ultrasonic Notch Filter',
          description: '19.4 kHz tracker tone stripped (-58.2 dB)',
          parameters: { frequencyHz: 19400, depthDb: 58.2 },
        },
      ],
    };

    const receipt = await createCompleteProofReceipt(manifest);

    // Verify receipt ID format ET-XXXX-XXXX
    expect(receipt.receiptId).toMatch(/^ET-[0-9A-F]{4}-[0-9A-F]{4}$/);

    // Verify ECDSA signature validity
    const isSigValid = await verifyCompleteProofReceipt(receipt);
    expect(isSigValid).toBe(true);

    // Verify media hash matches receipt
    expect(mediaSha256).toBe(receipt.manifest.outputSha256);
    expect(merkleTree.rootHash).toBe(receipt.manifest.outputMerkleRoot);
  });

  it('detects single changed byte in media and identifies differing second chunk', async () => {
    const sampleRate = 32000;
    const durSec = 8;
    const cleanMedia = new Float32Array(sampleRate * durSec);
    for (let i = 0; i < cleanMedia.length; i++) cleanMedia[i] = 0.1 * (i % 100);

    const chunks = chunkAudioPerSecond(cleanMedia, sampleRate);
    const origMerkle = await buildMerkleTree(chunks);
    const origSha = await sha256Hex(new Uint8Array(cleanMedia.buffer));

    const manifest: TransformationManifest = {
      timestamp: new Date().toISOString(),
      inputSha256: 'orig-input-hash',
      outputSha256: origSha,
      inputMerkleRoot: 'orig-in-root',
      outputMerkleRoot: origMerkle.rootHash,
      outputChunkHashes: origMerkle.leafHashes,
      actions: [],
    };
    const receipt = await createCompleteProofReceipt(manifest);

    // Tamper: Flip 1 byte at Second 4 (between 3s and 4s)
    const tamperedMedia = new Float32Array(cleanMedia);
    const tamperIdx = Math.floor(sampleRate * 3.5);
    tamperedMedia[tamperIdx] = 0.9999; // 1 sample altered

    const tamperedSha = await sha256Hex(new Uint8Array(tamperedMedia.buffer));
    expect(tamperedSha).not.toBe(receipt.manifest.outputSha256);

    // Merkle chunk pinpointing
    const tamperedChunks = chunkAudioPerSecond(tamperedMedia, sampleRate);
    const tamperedMerkle = await buildMerkleTree(tamperedChunks);

    let differingSecond: number | null = null;
    for (let i = 0; i < tamperedMerkle.leafHashes.length; i++) {
      if (tamperedMerkle.leafHashes[i] !== origMerkle.leafHashes[i]) {
        differingSecond = i + 1;
        break;
      }
    }

    expect(differingSecond).toBe(4); // Second 4 (00:03 - 00:04) pinpointed!
  });

  it('rejects wrong file dropped against receipt', async () => {
    const manifest: TransformationManifest = {
      timestamp: new Date().toISOString(),
      inputSha256: 'expected-in-hash',
      outputSha256: 'expected-out-hash-1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      inputMerkleRoot: 'expected-in-root',
      outputMerkleRoot: 'expected-out-root',
      actions: [],
    };
    const receipt = await createCompleteProofReceipt(manifest);

    // Completely different file
    const randomFileBytes = new TextEncoder().encode('unrelated-video-data');
    const droppedFileSha = await sha256Hex(randomFileBytes);

    expect(droppedFileSha).not.toBe(receipt.manifest.outputSha256);
  });

  it('rejects edited receipt JSON with broken signature', async () => {
    const manifest: TransformationManifest = {
      timestamp: new Date().toISOString(),
      inputSha256: 'original-input-hash',
      outputSha256: 'original-output-hash',
      inputMerkleRoot: 'original-merkle-in',
      outputMerkleRoot: 'original-merkle-out',
      actions: [
        {
          type: 'Mains Hum Harmonics Notch',
          description: 'Notched 50.02 Hz grid',
          parameters: { fundamentalHz: 50.02 },
        },
      ],
    };
    const receipt = await createCompleteProofReceipt(manifest);

    // Tamper with receipt manifest (e.g. adversary modified outputSha256 or parameters)
    const tamperedReceipt: CompleteProofReceipt = {
      ...receipt,
      manifest: {
        ...receipt.manifest,
        outputSha256: 'adversary-forged-sha256-hash',
      },
    };

    const isSigValid = await verifyCompleteProofReceipt(tamperedReceipt);
    expect(isSigValid).toBe(false); // Web Crypto rejects tampered manifest!
  });
});
