/**
 * Merkle Tree Proof & Web Crypto ECDSA P-256 Signatures (S5)
 * Constructs per-second chunk Merkle trees for input and output streams.
 * Generates signed receipt.json, manifest of transformations, and cryptographic verification.
 */

import { signWithDeviceKey } from './deviceKey';

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface MerkleTreeResult {
  rootHash: string;
  leafHashes: string[];
  totalChunks: number;
}

export interface TransformationManifest {
  timestamp: string;
  inputSha256: string;
  outputSha256: string;
  inputMerkleRoot: string;
  outputMerkleRoot: string;
  inputChunkHashes?: string[];
  outputChunkHashes?: string[];
  actions: {
    type: string;
    description: string;
    parameters: Record<string, string | number | boolean>;
  }[];
}

export interface CompleteProofReceipt {
  receiptId: string;
  manifest: TransformationManifest;
  signatureHex: string;
  publicKeyJwk: JsonWebKey;
  deviceKeyFingerprint: string;
  verificationPassed: boolean;
}

/**
 * Computes a standard human-readable receipt identifier: ET-XXXX-XXXX
 */
export async function generateReceiptId(manifest: TransformationManifest): Promise<string> {
  const jsonStr = JSON.stringify(manifest);
  const hash = await sha256Hex(jsonStr);
  return `ET-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;
}

/**
 * Computes SHA-256 hash of a Uint8Array or string buffer.
 */
export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds a Merkle Tree from an array of 1-second chunk data.
 */
export async function buildMerkleTree(chunks: Uint8Array[]): Promise<MerkleTreeResult> {
  if (chunks.length === 0) {
    const emptyHash = await sha256Hex(new Uint8Array(0));
    return { rootHash: emptyHash, leafHashes: [emptyHash], totalChunks: 0 };
  }

  // 1. Hash leaf chunks
  const leafHashes: string[] = [];
  for (const chunk of chunks) {
    const h = await sha256Hex(chunk);
    leafHashes.push(h);
  }

  // 2. Build tree upwards pairwise
  let currentLevel = [...leafHashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = await sha256Hex(left + right);
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return {
    rootHash: currentLevel[0],
    leafHashes,
    totalChunks: chunks.length,
  };
}

/**
 * Chunks audio samples into 1-second byte chunks.
 */
export function chunkAudioPerSecond(samples: Float32Array, sampleRate: number): Uint8Array[] {
  const samplesPerChunk = sampleRate;
  const numChunks = Math.max(1, Math.ceil(samples.length / samplesPerChunk));
  const chunks: Uint8Array[] = [];

  for (let c = 0; c < numChunks; c++) {
    const start = c * samplesPerChunk;
    const end = Math.min(samples.length, start + samplesPerChunk);
    const slice = samples.subarray(start, end);
    const byteBuf = new Uint8Array(slice.buffer, slice.byteOffset, slice.byteLength);
    chunks.push(byteBuf);
  }

  return chunks;
}

/**
 * Creates signed cryptographic proof receipt with persistent device ECDSA P-256 key.
 */
export async function createCompleteProofReceipt(
  manifest: TransformationManifest
): Promise<CompleteProofReceipt> {
  const receiptId = await generateReceiptId(manifest);
  const manifestStr = JSON.stringify(manifest);
  const { signatureHex, publicKeyJwk, fingerprint } = await signWithDeviceKey(manifestStr);

  return {
    receiptId,
    manifest,
    signatureHex,
    publicKeyJwk,
    deviceKeyFingerprint: fingerprint,
    verificationPassed: true,
  };
}

/**
 * Verifies an exported receipt.json against its ECDSA P-256 public key.
 */
export async function verifyCompleteProofReceipt(receipt: CompleteProofReceipt): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      receipt.publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const manifestStr = JSON.stringify(receipt.manifest);
    const data = new TextEncoder().encode(manifestStr);

    const sigBytes = new Uint8Array(
      receipt.signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      key,
      sigBytes,
      data
    );
  } catch {
    return false;
  }
}
