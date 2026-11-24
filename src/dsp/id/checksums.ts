/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Checksum & Mathematical Validation of Identifiers (M8)
 * Luhn (cards), Verhoeff (12-digit Aadhaar), Indian PAN, Indian Phone, Email, and URL.
 * Strictly requires mathematical checksum validity before flagging.
 */

/**
 * Luhn Algorithm (mod 10) for Credit/Debit Card Number Validation.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits.charAt(i), 10);
    if (alternate) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Verhoeff Algorithm Tables (Dihedral group D5 multiplication & permutations)
 * Used for strict mathematical validation of 12-digit Indian Aadhaar numbers.
 */
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Computes Verhoeff check digit for an input string of digits.
 */
export function generateVerhoeffCheckDigit(input: string): number {
  let c = 0;
  const digits = input.replace(/\D/g, '').split('').map(d => parseInt(d, 10));

  for (let i = 0; i < digits.length; i++) {
    const digit = digits[digits.length - 1 - i];
    const pRow = (i + 1) % 8;
    c = VERHOEFF_D[c][VERHOEFF_P[pRow][digit]];
  }

  return VERHOEFF_INV[c];
}

/**
 * Validates 12-digit Indian Aadhaar number using Verhoeff D5 checksum.
 */
export function isValidAadhaar(aadhaarStr: string): boolean {
  const clean = aadhaarStr.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) return false;

  // Cannot start with 0 or 1 per UIDAI specification
  if (clean[0] === '0' || clean[0] === '1') return false;

  let c = 0;
  const digits = clean.split('').map(d => parseInt(d, 10));

  for (let i = 0; i < digits.length; i++) {
    const digit = digits[digits.length - 1 - i];
    const pRow = i % 8;
    c = VERHOEFF_D[c][VERHOEFF_P[pRow][digit]];
  }

  return c === 0;
}

/**
 * Validates Indian Income Tax Permanent Account Number (PAN).
 * Structure: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).
 * 4th character must be a valid entity indicator (P, C, H, F, A, T, B, L, J, G).
 */
export function isValidIndianPan(pan: string): boolean {
  const clean = pan.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) return false;

  const validEntityChars = new Set(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);
  return validEntityChars.has(clean[3]);
}

/**
 * Validates 10-digit Indian Mobile Phone Number.
 * Starts with 6, 7, 8, or 9 (with optional +91 or 0 prefix).
 */
export function isValidIndianPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(clean);
}

/**
 * Validates Email Address structure.
 */
export function isValidEmail(email: string): boolean {
  const clean = email.trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
}

/**
 * Validates Web URL structure.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ExtractedIdFindings {
  cards: string[];
  aadhaar: string[];
  pans: string[];
  phones: string[];
  emails: string[];
  urls: string[];
}

/**
 * Extracts and strictly validates all identifiers from OCR / text input.
 */
export function scanAndValidateIdentifiers(text: string): ExtractedIdFindings {
  const result: ExtractedIdFindings = {
    cards: [],
    aadhaar: [],
    pans: [],
    phones: [],
    emails: [],
    urls: [],
  };

  if (!text || text.length === 0) return result;

  // 1. Credit Card scan
  const cardCandidates = text.match(/\b(?:\d[ -]*?){13,19}\b/g) || [];
  for (const cand of cardCandidates) {
    const digits = cand.replace(/\D/g, '');
    if (isValidLuhn(digits) && !result.cards.includes(digits)) {
      result.cards.push(digits);
    }
  }

  // 2. Aadhaar scan
  const aadhaarCandidates = text.match(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g) || [];
  for (const cand of aadhaarCandidates) {
    const clean = cand.replace(/[\s-]/g, '');
    if (isValidAadhaar(clean) && !result.aadhaar.includes(clean)) {
      result.aadhaar.push(clean);
    }
  }

  // 3. PAN scan
  const panCandidates = text.match(/\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g) || [];
  for (const cand of panCandidates) {
    const clean = cand.toUpperCase();
    if (isValidIndianPan(clean) && !result.pans.includes(clean)) {
      result.pans.push(clean);
    }
  }

  // 4. Indian Phone scan
  const phoneCandidates = text.match(/\b(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b/g) || [];
  for (const cand of phoneCandidates) {
    if (isValidIndianPhone(cand) && !result.phones.includes(cand)) {
      result.phones.push(cand);
    }
  }

  // 5. Email scan
  const emailCandidates = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [];
  for (const cand of emailCandidates) {
    if (isValidEmail(cand) && !result.emails.includes(cand)) {
      result.emails.push(cand);
    }
  }

  // 6. URL scan
  const urlCandidates = text.match(/\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g) || [];
  for (const cand of urlCandidates) {
    if (isValidUrl(cand) && !result.urls.includes(cand)) {
      result.urls.push(cand);
    }
  }

  return result;
}
