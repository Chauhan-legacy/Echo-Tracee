/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { MetadataReport, Finding } from '../types';
import { APP_COPY } from '../constants/copy';
import exifr from 'exifr';
import { createFile } from 'mp4box';

/**
 * Deep async metadata parser leveraging exifr and mp4box.
 * Extracts EXIF, XMP, QuickTime, and MP4 container atoms 100% client-side.
 */
export async function parseMetadataAsync(buffer: ArrayBuffer, fileName: string): Promise<{
  report: MetadataReport;
  findings: Finding[];
}> {
  // Run fast synchronous QuickTime probe first
  const syncResult = parseMetadataFromBuffer(buffer, fileName);
  const rawTags = { ...syncResult.report.rawTags };
  let gps = syncResult.report.gps;
  let creationTime = syncResult.report.creationTime;
  let deviceModel = syncResult.report.deviceModel;

  // 1. Deep EXIF / XMP / TIFF / QuickTime parsing via exifr
  try {
    const parsed = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      xmp: true,
      iptc: true,
      jfif: true,
      icc: false,
    });
    if (parsed) {
      if (parsed.latitude && parsed.longitude && !isNaN(parsed.latitude) && !isNaN(parsed.longitude)) {
        gps = gps || {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          locationName: 'Extracted from EXIF / QuickTime container',
        };
        rawTags['EXIF:GPSLatitude'] = String(parsed.latitude);
        rawTags['EXIF:GPSLongitude'] = String(parsed.longitude);
      }
      if (parsed.Make || parsed.Model) {
        deviceModel = deviceModel || [parsed.Make, parsed.Model].filter(Boolean).join(' ');
        rawTags['EXIF:DeviceModel'] = [parsed.Make, parsed.Model].filter(Boolean).join(' ');
      }
      if (parsed.DateTimeOriginal || parsed.CreateDate) {
        creationTime = creationTime || String(parsed.DateTimeOriginal || parsed.CreateDate);
        rawTags['EXIF:CreationTime'] = String(parsed.DateTimeOriginal || parsed.CreateDate);
      }
      if (parsed.Software) {
        rawTags['EXIF:Software'] = String(parsed.Software);
      }
    }
  } catch {
    // Non-fatal fallback
  }

  // 2. Deep ISO box parsing via mp4box
  try {
    const mp4boxfile = createFile();
    mp4boxfile.onReady = (info: any) => {
      if (info.created && !creationTime) {
        creationTime = String(info.created);
        rawTags['MP4:CreationTime'] = String(info.created);
      }
      if (info.tracks && info.tracks.length > 0) {
        rawTags['MP4:TrackCount'] = String(info.tracks.length);
        const codecs = info.tracks.map((t: any) => t.codec).filter(Boolean).join(', ');
        if (codecs) rawTags['MP4:Codecs'] = codecs;
      }
    };
    mp4boxfile.onError = () => {};

    const sliceLen = Math.min(buffer.byteLength, 4 * 1024 * 1024);
    const sliceBuf = buffer.slice(0, sliceLen);
    (sliceBuf as any).fileStart = 0;
    mp4boxfile.appendBuffer(sliceBuf as any);
    mp4boxfile.flush();
  } catch {
    // Non-fatal fallback
  }

  // Rebuild findings if new GPS or device was uncovered
  const findings: Finding[] = [];
  if (gps) {
    findings.push({
      id: 'metadata-gps-location',
      category: 'metadata',
      title: 'GPS Coordinates Embedded in File',
      plainText: `Exact geographic coordinates found in container: ${gps.latitude.toFixed(4)}° N, ${gps.longitude.toFixed(4)}° E. Anyone downloading this file can see your physical location.`,
      severity: 'critical',
      confidence: 1.0,
      evidenceKind: 'Measured',
      details: {
        latitude: gps.latitude,
        longitude: gps.longitude,
        locationName: gps.locationName || 'Extracted from QuickTime / EXIF Atom',
        deviceModel: deviceModel || 'Embedded in file headers',
      },
      fixable: true,
      fixDescription: 'Strip container metadata and re-encode clean file streams.',
    });
  } else {
    findings.push({
      id: 'metadata-clean-notice',
      category: 'metadata',
      title: 'No Embedded Geolocation Metadata Found',
      plainText: 'Container headers contain no GPS pins. Note: messaging apps (WhatsApp, Instagram, Telegram) routinely strip metadata on upload.',
      severity: 'info',
      confidence: 0.95,
      evidenceKind: 'Measured',
      details: {
        fileName,
        containerTagsFound: Object.keys(rawTags).length,
      },
    });
  }

  const report: MetadataReport = {
    gps,
    creationTime,
    deviceModel,
    rawTags,
    isDemo: false,
  };

  return { report, findings };
}

/**
 * Parses MP4/MOV atoms or JPEG EXIF buffer for geolocation and camera metadata.
 * 100% client-side binary parsing.
 */
export function parseMetadataFromBuffer(buffer: ArrayBuffer, fileName: string): {
  report: MetadataReport;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const rawTags: Record<string, string> = {};
  const view = new DataView(buffer);
  let gps: MetadataReport['gps'] | undefined;
  let creationTime: string | undefined;
  let deviceModel: string | undefined;

  try {
    // Quick probe for MP4/MOV atoms: look for 'ftyp', 'moov', 'udta'
    const len = Math.min(buffer.byteLength, 1024 * 1024 * 4); // Check up to first 4MB
    let offset = 0;

    while (offset + 8 <= len) {
      const boxSize = view.getUint32(offset);
      const boxType = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );

      if (boxSize < 8) break;

      if (boxType === 'moov' || boxType === 'udta' || boxType === 'meta') {
        // Deep search within moov/udta for location tag '@xyz'
        const innerEnd = Math.min(buffer.byteLength, offset + boxSize);
        for (let i = offset + 8; i < innerEnd - 12; i++) {
          // Look for '@xyz' (Apple QuickTime GPS atom: +23.2156+072.6369/)
          if (
            view.getUint8(i) === 0x40 && // '@'
            view.getUint8(i + 1) === 0x78 && // 'x'
            view.getUint8(i + 2) === 0x79 && // 'y'
            view.getUint8(i + 3) === 0x7a // 'z'
          ) {
            // Read next string
            const strLen = Math.min(32, innerEnd - (i + 4));
            let coordsStr = '';
            for (let c = 0; c < strLen; c++) {
              coordsStr += String.fromCharCode(view.getUint8(i + 4 + c));
            }

            const match = coordsStr.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
            if (match) {
              const lat = parseFloat(match[1]);
              const lon = parseFloat(match[2]);
              if (!isNaN(lat) && !isNaN(lon)) {
                gps = { latitude: lat, longitude: lon };
                rawTags['QuickTime:GPSCoordinates'] = `${lat}, ${lon}`;
              }
            }
          }
        }
      }

      offset += boxSize;
    }
  } catch {
    // Fallback gracefully on corrupt or non-standard container
  }

  // Build Findings
  if (gps) {
    findings.push({
      id: 'metadata-gps-location',
      category: 'metadata',
      title: 'GPS Coordinates Embedded in File',
      plainText: `Exact geographic coordinates found in container: ${gps.latitude.toFixed(4)}° N, ${gps.longitude.toFixed(4)}° E. Anyone downloading this file can see your physical location.`,
      severity: 'critical',
      confidence: 1.0,
      evidenceKind: 'Measured',
      details: {
        latitude: gps.latitude,
        longitude: gps.longitude,
        locationName: gps.locationName || 'Extracted from QuickTime / EXIF Atom',
        deviceModel: deviceModel || 'Embedded in file headers',
      },
      fixable: true,
      fixDescription: 'Strip container metadata and re-encode clean file streams.',
    });
  } else {
    findings.push({
      id: 'metadata-clean-notice',
      category: 'metadata',
      title: 'No Embedded Geolocation Metadata Found',
      plainText: 'Container headers contain no GPS pins. Note: messaging apps (WhatsApp, Instagram, Telegram) routinely strip metadata on upload.',
      severity: 'info',
      confidence: 0.95,
      evidenceKind: 'Measured',
      details: {
        fileName,
        containerTagsFound: Object.keys(rawTags).length,
      },
    });
  }

  const report: MetadataReport = {
    gps,
    creationTime,
    deviceModel,
    rawTags,
    isDemo: false,
  };

  return { report, findings };
}

/**
 * Renders an offline dark forensic world map with continental landmasses
 * and an animated pulsing radar pin. 100% Canvas, ZERO tile servers!
 */
export function drawForensicWorldMap(
  canvas: HTMLCanvasElement,
  lat: number,
  lon: number,
  pulseTick = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Background dark grid
  ctx.fillStyle = '#080B11';
  ctx.fillRect(0, 0, w, h);

  // Subtle coordinate grid lines
  ctx.strokeStyle = '#151D2A';
  ctx.lineWidth = 1;

  for (let x = 0; x < w; x += w / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += h / 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Simplified continental silhouettes (Equirectangular projection)
  // [minLon, minLat, maxLon, maxLat]
  const continents = [
    // North America
    [-140, 15, -60, 65],
    // South America
    [-80, -55, -35, 12],
    // Europe
    [-10, 36, 40, 68],
    // Africa
    [-18, -34, 50, 36],
    // Asia
    [40, 5, 140, 70],
    // India Subcontinent
    [68, 8, 90, 35],
    // Australia
    [113, -43, 153, -10],
  ];

  ctx.fillStyle = '#172233';
  for (const [cMinLon, cMinLat, cMaxLon, cMaxLat] of continents) {
    const x1 = ((cMinLon + 180) / 360) * w;
    const x2 = ((cMaxLon + 180) / 360) * w;
    const y1 = ((90 - cMaxLat) / 180) * h;
    const y2 = ((90 - cMinLat) / 180) * h;

    ctx.beginPath();
    ctx.roundRect(x1, y1, Math.max(8, x2 - x1), Math.max(8, y2 - y1), 4);
    ctx.fill();
  }

  // Convert target latitude and longitude to canvas coordinates
  const pinX = ((lon + 180) / 360) * w;
  const pinY = ((90 - lat) / 180) * h;

  // Pulsing radar rings
  const pulseR1 = 6 + (pulseTick % 30);
  const pulseAlpha = Math.max(0, 1 - pulseR1 / 36);

  ctx.strokeStyle = `rgba(255, 51, 102, ${pulseAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pinX, pinY, pulseR1, 0, Math.PI * 2);
  ctx.stroke();

  // Pin point
  ctx.fillStyle = '#FF3366';
  ctx.beginPath();
  ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Crosshair
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pinX - 12, pinY);
  ctx.lineTo(pinX + 12, pinY);
  ctx.moveTo(pinX, pinY - 12);
  ctx.lineTo(pinX, pinY + 12);
  ctx.stroke();

  // Coordinates label tag
  ctx.fillStyle = 'rgba(15, 20, 32, 0.9)';
  ctx.fillRect(Math.min(w - 150, Math.max(10, pinX + 10)), Math.min(h - 35, Math.max(10, pinY - 24)), 140, 24);
  ctx.strokeStyle = '#FF3366';
  ctx.strokeRect(Math.min(w - 150, Math.max(10, pinX + 10)), Math.min(h - 35, Math.max(10, pinY - 24)), 140, 24);

  ctx.fillStyle = '#00F0FF';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`, Math.min(w - 145, Math.max(15, pinX + 15)), Math.min(h - 20, Math.max(25, pinY - 8)));
}
