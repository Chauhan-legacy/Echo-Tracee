/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Web Crypto ECDSA Receipt Signing & Verification
 * Generates an in-browser P-256 ECDSA keypair, signs the sanitization receipt
 * containing (original SHA-256, fixed SHA-256, changes, timestamp), and verifies it.
 */

export interface ProofReceiptPayload {
  app: string;
  version: string;
  originalSha256: string;
  fixedSha256: string;
  timestamp: string;
  sanitizedItems: string[];
  scoreDrop: string;
}

export interface SignedReceipt {
  payload: ProofReceiptPayload;
  signatureHex: string;
  publicKeyJwk: JsonWebKey;
}

/**
 * Generates a volatile ECDSA keypair in the browser.
 */
export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );
}

/**
 * Signs the sanitization receipt with ECDSA P-256 + SHA-256.
 */
export async function createSignedProofReceipt(
  originalSha256: string,
  fixedSha256: string,
  sanitizedItems: string[],
  scoreDrop: string,
  keyPair?: CryptoKeyPair
): Promise<SignedReceipt> {
  const kp = keyPair || (await generateSigningKeyPair());

  const payload: ProofReceiptPayload = {
    app: 'ECHO//TRACE Privacy X-Ray',
    version: '1.0.0-student-challenge',
    originalSha256,
    fixedSha256,
    timestamp: new Date().toISOString(),
    sanitizedItems,
    scoreDrop,
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));

  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    kp.privateKey,
    data
  );

  const sigBytes = new Uint8Array(signature);
  const signatureHex = Array.from(sigBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);

  return {
    payload,
    signatureHex,
    publicKeyJwk,
  };
}

/**
 * Cryptographically verifies an ECDSA signed receipt.
 */
export async function verifyProofReceipt(receipt: SignedReceipt): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      receipt.publicKeyJwk,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['verify']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(receipt.payload));

    // Convert hex signature back to ArrayBuffer
    const sigBytes = new Uint8Array(
      receipt.signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      key,
      sigBytes,
      data
    );
  } catch {
    return false;
  }
}
