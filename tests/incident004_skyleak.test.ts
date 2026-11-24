/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { generateIncident004 } from '../src/demo/incident001';
import { estimateDoppler } from '../src/dsp/doppler';
import { sanitizeAudio } from '../src/fixer/audioFixer';

describe('INCIDENT-004: SkyLeak Acoustic ADS-B Aircraft Doppler & Geolocation', () => {
  it('generates INCIDENT-004 with kinematic turbofan Doppler S-curve and realistic flight corridor', async () => {
    const incident = await generateIncident004();
    expect(incident.duration).toBe(15.0);
    expect(incident.sampleRate).toBe(48000);
    expect(incident.audioBuffer.length).toBe(15 * 48000);
    expect(incident.metadata.gps?.locationName).toContain('Frankfurt Airway Approach Corridor');
    expect(incident.metadata.gps?.latitude).toBeCloseTo(50.0379, 2);
  });

  it('detects aircraft Doppler S-curve and matches ADS-B flight corridor', async () => {
    const incident = await generateIncident004();
    const dopplerRes = estimateDoppler(incident.audioBuffer, incident.sampleRate);

    expect(dopplerRes.detected).toBe(true);
    const flightFinding = dopplerRes.findings.find(f => f.id === 'skyleak-aircraft-doppler');
    expect(flightFinding).toBeDefined();

    expect(flightFinding?.category).toBe('doppler');
    expect(flightFinding?.severity).toBe('critical');
    expect(flightFinding?.title).toContain('Aircraft Acoustic Doppler S-Curve');
    expect(flightFinding?.fixable).toBe(true);

    const details = flightFinding?.details;
    expect(details?.speedKmh).toBeGreaterThan(600);
    expect(details?.speedKmh).toBeLessThan(900);
    expect(details?.goodnessOfFitR2).toBeGreaterThan(0.90);
    expect(details?.geolocationConfidenceRadiusM).toBeLessThanOrEqual(100);
    expect(details?.matchedFlightCallsign).toBe('DLH412');
  });

  it('neutralizes Doppler trajectory via dynamic notch filter in audioFixer', async () => {
    const incident = await generateIncident004();
    const dopplerRes = estimateDoppler(incident.audioBuffer, incident.sampleRate);
    const flightFinding = dopplerRes.findings.find(f => f.id === 'skyleak-aircraft-doppler');
    expect(flightFinding).toBeDefined();

    const dopplerParams = {
      f0: flightFinding?.details?.bladePassFrequencyHz as number,
      v: ((flightFinding?.details?.speedKmh as number) / 3.6),
      dMin: flightFinding?.details?.closestApproachMeters as number,
      t0: flightFinding?.details?.inflectionTimeSec as number,
    };

    // Sanitize audio using dynamic Doppler notch
    const { cleanAudio, cleanSampleRate, actionsTaken } = sanitizeAudio(
      incident.audioBuffer,
      incident.sampleRate,
      [],
      undefined,
      dopplerParams
    );

    expect(cleanSampleRate).toBe(32000);
    expect(cleanAudio.length / cleanSampleRate).toBeCloseTo(incident.duration, 2);
    expect(actionsTaken.some(a => a.includes('Doppler'))).toBe(true);

    // Re-analyzing the sanitized audio should eliminate the aircraft Doppler signature
    const postRes = estimateDoppler(cleanAudio, cleanSampleRate);
    const remainingFlightFinding = postRes.findings.find(f => f.id === 'skyleak-aircraft-doppler');
    expect(remainingFlightFinding).toBeUndefined();
  });
});
