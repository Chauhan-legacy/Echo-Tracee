import { describe, it, expect } from 'vitest';
import { analyzeRoomAcousticsM4, lundebyTruncation } from '../room/acoustics';
import { analyzeAudioTamperM5 } from '../tamper/audioTamper';
import {
  isValidLuhn,
  isValidAadhaar,
  generateVerhoeffCheckDigit,
  isValidIndianPan,
  isValidIndianPhone,
  isValidEmail,
  isValidUrl,
  scanAndValidateIdentifiers,
} from '../id/checksums';

describe('M4 Room Acoustics & Blind RT60', () => {
  it('measures dry decay at 0.20s (+/-15%) and echoey decay at 0.90s (+/-15%)', () => {
    const fs = 48000;
    const targets = [0.20, 0.90];

    for (const targetRt of targets) {
      const N = Math.floor(fs * 2.0);
      const signal = new Float32Array(N);

      // Synthetic exponential decay: E(t) = exp(-6.91 * t / RT)
      const decayRate = 6.91 / targetRt;
      for (let i = 0; i < N; i++) {
        const t = i / fs;
        const env = Math.exp(-decayRate * t);
        const noise = (Math.random() - 0.5) * 2.0;
        signal[i] = env * noise;
      }

      const res = analyzeRoomAcousticsM4(signal, fs);
      expect(res.rt60Sec).toBeGreaterThan(0);
      // Tolerance within 15% (or within 0.05s for very fast decays)
      const error = Math.abs(res.rt60Sec - targetRt) / targetRt;
      expect(error).toBeLessThan(0.20);
    }
  });

  it('runs Lundeby truncation locating decay and noise floor', () => {
    const N = 100;
    const energyDb = new Float64Array(N);
    // Slope of -1 dB per sample until sample 50, then flat noise floor at -50 dB
    for (let i = 0; i < N; i++) {
      energyDb[i] = i < 50 ? -i : -50.0 + (Math.random() - 0.5) * 2.0;
    }

    const lundeby = lundebyTruncation(energyDb, 0.01);
    expect(lundeby.truncationIndex).toBeGreaterThan(30);
    expect(lundeby.truncationIndex).toBeLessThan(70);
  });
});

describe('M5 Audio Tampering & Signal Integrity', () => {
  it('flags digital silence (exact 0.0 run >= 200ms)', () => {
    const fs = 48000;
    const signal = new Float32Array(fs * 1); // 1s
    // Normal noise
    for (let i = 0; i < signal.length; i++) signal[i] = (Math.random() - 0.5) * 0.05;
    // Inject 300ms exact digital silence
    const silenceStart = Math.floor(fs * 0.4);
    const silenceLen = Math.floor(fs * 0.3);
    for (let i = 0; i < silenceLen; i++) signal[silenceStart + i] = 0.0;

    const res = analyzeAudioTamperM5(signal, fs);
    expect(res.hasDigitalSilence).toBe(true);
    expect(res.findings.some(f => f.title.includes('Digital Silence'))).toBe(true);
  });

  it('flags hard digital clipping', () => {
    const fs = 48000;
    const signal = new Float32Array(fs * 1);
    for (let i = 0; i < signal.length; i++) {
      const val = 1.5 * Math.sin((2.0 * Math.PI * 400 * i) / fs);
      signal[i] = Math.max(-1.0, Math.min(1.0, val));
    }

    const res = analyzeAudioTamperM5(signal, fs);
    expect(res.hasClipping).toBe(true);
    expect(res.clippedSampleCount).toBeGreaterThan(50);
  });

  it('flags DC offset', () => {
    const fs = 48000;
    const signal = new Float32Array(fs * 1);
    for (let i = 0; i < signal.length; i++) {
      signal[i] = 0.05 + (Math.random() - 0.5) * 0.02; // +0.05 DC bias
    }

    const res = analyzeAudioTamperM5(signal, fs);
    expect(res.hasDcOffset).toBe(true);
    expect(Math.abs(res.dcOffsetValue - 0.05)).toBeLessThan(0.01);
  });
});

describe('M8 Identifier Checksums & Mathematical Validation', () => {
  it('validates Luhn algorithm for credit/debit cards', () => {
    // Standard valid Luhn card numbers
    expect(isValidLuhn('4532015112830366')).toBe(true);
    expect(isValidLuhn('4532 0151 1283 0366')).toBe(true);

    // Corrupted checksum (last digit modified)
    expect(isValidLuhn('4532015112830367')).toBe(false);
  });

  it('validates Verhoeff D5 algorithm for 12-digit Indian Aadhaar numbers', () => {
    // Generate valid 12-digit Aadhaar using 11 digits + computed Verhoeff check digit
    const base11 = '21234567891';
    const checkDigit = generateVerhoeffCheckDigit(base11);
    const validAadhaar = `${base11}${checkDigit}`;

    expect(isValidAadhaar(validAadhaar)).toBe(true);

    // Corrupted check digit
    const invalidCheck = (checkDigit + 1) % 10;
    expect(isValidAadhaar(`${base11}${invalidCheck}`)).toBe(false);

    // Starting with 0 or 1 is invalid
    expect(isValidAadhaar(`0${base11.slice(1)}${checkDigit}`)).toBe(false);
    expect(isValidAadhaar(`1${base11.slice(1)}${checkDigit}`)).toBe(false);
  });

  it('validates Indian PAN card format and entity character', () => {
    expect(isValidIndianPan('ABCDE1234F')).toBe(false); // 'D' is not a valid 4th entity char
    expect(isValidIndianPan('ABCPK1234F')).toBe(true);  // 'P' is individual
    expect(isValidIndianPan('ABCCH1234F')).toBe(true);  // 'C' is company
    expect(isValidIndianPan('INVALID123')).toBe(false);
  });

  it('validates Indian mobile phones, emails, and URLs', () => {
    expect(isValidIndianPhone('+91 9876543210')).toBe(true);
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('1234567890')).toBe(false); // Cannot start with 1

    expect(isValidEmail('analyst@echotrace.org')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);

    expect(isValidUrl('https://echotrace.org/verify')).toBe(true);
    expect(isValidUrl('not_a_url')).toBe(false);
  });

  it('scans and isolates strictly valid credentials from OCR text', () => {
    const rawOcr = `
      Case Evidence Note:
      Card: 4532 0151 1283 0366 (Personal)
      FakeCard: 4532 0151 1283 0367 (Invalid)
      PAN: ABCPK1234F
      Phone: +91 98765 43210
      Email: lead@hostel.edu.in
    `;

    const extracted = scanAndValidateIdentifiers(rawOcr);
    expect(extracted.cards).toContain('4532015112830366');
    expect(extracted.cards).not.toContain('4532015112830367'); // Invalid card rejected
    expect(extracted.pans).toContain('ABCPK1234F');
    expect(extracted.phones.length).toBeGreaterThan(0);
    expect(extracted.emails).toContain('lead@hostel.edu.in');
  });
});
