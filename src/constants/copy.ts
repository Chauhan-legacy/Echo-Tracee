/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
export const APP_COPY = {
  header: {
    title: 'ECHO//TRACE',
    tagline: 'Drop any video you were about to post. See what it secretly leaks. Fix it in one tap.',
    bootLine: 'ECHO//TRACE forensic kernel online // privacy x-ray active',
    privacyBadge: '100% Client-Side. Zero Server Uploads. Nothing leaves your device.',
  },
  hero: {
    loadIncident001: 'Load INCIDENT-001: The Hostel Reel',
    loadIncident001Subtitle: 'Synthetic demo clip with electrical grid hum, hidden beacon tone, and hostel clues',
    useOwnFile: 'Scan My Own Video / Audio',
    dropPrompt: 'Drop video or audio file here (MP4, MOV, WebM, WAV, MP3)',
    sizeLimitNotice: 'Analyzed locally on device. Analysis capped to first 60 seconds.',
  },
  nav: {
    scan: 'Scan',
    findings: 'Findings',
    fix: 'Fix & Sanitize',
    share: 'Proof & Share',
    bench: 'ET-Bench',
    audit: 'Self-Audit',
    evidence: 'Evidence Graph',
    timeline: 'Timeline',
  },
  honesty: {
    explainableScoreNotice: 'Scoring uses transparent deterministic physics & DSP weights, never black-box AI.',
    humFamilyNotice: 'Grid frequency indicates 50 Hz vs 60 Hz continental power pool, never an exact city or substation.',
    roomVolumeNotice: 'Acoustic reverberation indicates room reverberance class, never a laser-measured 3D volume.',
    codecCutoffNotice: 'Audio compression strips high frequencies. Spectrum above cutoff cannot be inspected.',
    demoLabel: 'DEMO DATA — Synthetic clip generated strictly inside your browser for benchmarking.',
    noPrnuNotice: 'Camera sensor PRNU and AI deepfake synthesis cannot be reliably proven client-side in browser; no unverified claims made.',
  },
  findings: {
    empty: 'No privacy leaks detected in analyzed spectrum.',
    criticalCount: (count: number) => `${count} Critical Privacy Leak${count === 1 ? '' : 's'} Detected`,
    warnCount: (count: number) => `${count} Potential Leak Indicator${count === 1 ? '' : 's'}`,
    infoCount: (count: number) => `${count} Observational Metric${count === 1 ? '' : 's'}`,
  },
  fixer: {
    title: 'Forensic Video Sanitizer',
    subtitle: 'Re-encodes video in browser, applies surgical biquad acoustic notches, and blurs flagged visual regions.',
    buttonFix: 'Sanitize Video & Strip Privacy Leaks',
    processing: 'Synthesizing clean audio & bluring sensitive frames...',
    complete: 'Sanitization complete. Re-analysis verified below.',
    beforeAfterTitle: 'Before & After Verification',
    scoreDrop: (before: number, after: number) => `Leak score lowered from ${before} to ${after} / 100`,
    downloadFixed: 'Download Cleaned Video',
    proofTitle: 'Cryptographic Proof Receipt',
    verifyReceipt: 'Verify ECDSA Signature',
  },
  tour: {
    button: 'Play Guided Tour',
    stepScan: 'Step 1: Ingesting file and computing client-side cryptographic SHA-256 fingerprint.',
    stepAnalysis: 'Step 2: Real DSP workers running Fast Fourier Transform, CFAR tone detector, and mains hum isolation.',
    stepFindings: 'Step 3: Multi-layer findings locked on: electrical grid frequency, ultrasonic tracker tone, and visual exposures.',
    stepFix: 'Step 4: Real-time client-side DSP notch filtering and canvas pixelation applied.',
    stepProof: 'Step 5: Verifying clean spectrum and generating ECDSA cryptographically signed proof receipt.',
  },
};
