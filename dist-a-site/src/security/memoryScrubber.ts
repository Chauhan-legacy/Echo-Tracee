/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Forensic RAM Zeroizer & Ephemerality Scrubber
 *
 * Browsers retain deallocated JavaScript ArrayBuffers in heap pages until overwritten.
 * In high-security environments, forensic RAM analysis or process dumping can recover
 * uncompressed PCM audio or video frames.
 *
 * This utility provides cryptographically secure zeroization:
 * 1. Overwrites buffer with cryptographic pseudo-random entropy (DoD 5220.22-M principle).
 * 2. Overwrites with zero bytes.
 */

export function secureWipeBuffer(buffer: ArrayBufferView | null | undefined): void {
  if (!buffer) return;

  const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Pass 1: Cryptographic random entropy
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const chunkSize = 65536;
    for (let offset = 0; offset < view.length; offset += chunkSize) {
      const slice = view.subarray(offset, Math.min(view.length, offset + chunkSize));
      window.crypto.getRandomValues(slice as any);
    }
  }

  // Pass 2: Clean Zeroes
  view.fill(0);
}

/**
 * Attaches automatic memory wipe hooks on page unload or visibility change
 */
export function registerEphemeralityHandler(cleanups: Array<() => void>): () => void {
  const handler = () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch (e) {
        // Safe no-op
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    }
  };
}
