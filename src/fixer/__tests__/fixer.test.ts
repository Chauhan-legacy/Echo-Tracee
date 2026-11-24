import { describe, it, expect } from 'vitest';
import { sanitizeAudio, BiquadNotchFilter } from '../audioFixer';
import { createSignedProofReceipt, verifyProofReceipt } from '../cryptoProof';

describe('Fixer & Cryptographic Proof Verification', () => {
  it('Biquad notch filter attenuates 19.4 kHz tracker tone by > 20 dB', () => {
    const sampleRate = 48000;
    const numSamples = 48000;
    const input = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      input[i] = 0.5 * Math.sin(2 * Math.PI * 19400 * t);
    }

    const { cleanAudio, dbReductions } = sanitizeAudio(input, sampleRate, [19400], 50.02);
    expect(dbReductions['Tracker Tone 19400 Hz']).toBeGreaterThanOrEqual(20);

    // Verify output amplitude is dramatically lower
    let outputPower = 0;
    for (let i = 500; i < cleanAudio.length; i++) {
      outputPower += cleanAudio[i] * cleanAudio[i];
    }
    const avgPower = outputPower / (cleanAudio.length - 500);
    expect(avgPower).toBeLessThan(0.01);
  });

  it('signs and verifies Web Crypto ECDSA proof receipt', async () => {
    const origSha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const fixSha = 'ca978112ca1bbdcafac231b39a23dc4da786081cd1e14b51fe2a3994a004240e';
    const items = ['19.4 kHz tracker tone', '50.02 Hz hum', 'Student ID card', 'Whiteboard Wi-Fi'];

    const signedReceipt = await createSignedProofReceipt(origSha, fixSha, items, '82 -> 8');
    expect(signedReceipt.signatureHex).toBeDefined();
    expect(signedReceipt.signatureHex.length).toBeGreaterThan(64);

    const isValid = await verifyProofReceipt(signedReceipt);
    expect(isValid).toBe(true);

    // Tampering test: modify original hash
    const tamperedReceipt = {
      ...signedReceipt,
      payload: {
        ...signedReceipt.payload,
        originalSha256: 'tampered-hash-00000000000000000000000000000000000000000000000000',
      },
    };
    const isTamperedValid = await verifyProofReceipt(tamperedReceipt);
    expect(isTamperedValid).toBe(false);
  });
});
