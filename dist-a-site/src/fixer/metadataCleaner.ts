/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Metadata Byte Scanner & Verification (S3)
 * Byte-scans the output file buffer for GPS (ISO 6709), QuickTime keys, camera model strings, and timestamps.
 */

export interface MetadataScanResult {
  isClean: boolean;
  totalHits: number;
  hits: { category: string; match: string; offset: number }[];
}

const FORBIDDEN_METADATA_PATTERNS = [
  // QuickTime metadata keys
  { category: 'QuickTime Location Key', regex: /com\.apple\.quicktime\.location/gi },
  { category: 'QuickTime Model Key', regex: /com\.apple\.quicktime\.model/gi },
  { category: 'QuickTime Software Key', regex: /com\.apple\.quicktime\.software/gi },
  { category: 'ISO 6709 Geolocation String', regex: /[+-][0-9]{2,3}\.[0-9]{4,}[+-][0-9]{2,3}\.[0-9]{4,}/g },
  { category: 'Camera Hardware Brand', regex: /\b(iPhone\d*|Pixel\s?\d*|Galaxy\s?S\d*|GoPro|Sony\s?A7)\b/gi },
  { category: 'EXIF GPS Atom', regex: /(©xyz|GPSInfo|GPSLatitude)/g },
  { category: 'Creation Timestamp Atom', regex: /(creation_time|encoded_date)\b/gi },
];

/**
 * Scans an ArrayBuffer or Uint8Array for sensitive metadata strings and atoms.
 */
export function byteScanOutputFile(fileBuffer: ArrayBuffer | Uint8Array): MetadataScanResult {
  const bytes = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
  // Decode ASCII/UTF-8 representation
  const decoder = new TextDecoder('latin1'); // latin1 maps 1-to-1 byte values
  const text = decoder.decode(bytes);

  const hits: { category: string; match: string; offset: number }[] = [];

  for (const pat of FORBIDDEN_METADATA_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pat.regex.source, pat.regex.flags);
    while ((match = re.exec(text)) !== null) {
      hits.push({
        category: pat.category,
        match: match[0],
        offset: match.index,
      });
      if (hits.length > 50) break; // early exit
    }
  }

  return {
    isClean: hits.length === 0,
    totalHits: hits.length,
    hits,
  };
}
