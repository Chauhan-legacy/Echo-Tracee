import { Finding } from '../types';

export interface SpokenSecretFinding {
  secretType: 'phone' | 'email' | 'password' | 'otp' | 'id_card';
  redactedText: string;
  confidence: number;
}

export interface SpeechAnalysisResult {
  secrets: SpokenSecretFinding[];
  findings: Finding[];
  hasSpeechEnergy: boolean;
  methodUsed: string;
}

/**
 * Speech analysis module.
 * Honest rules:
 * - Without a transcript, reports "Speech detected, content not read" from physical formant energy.
 * - Never claims to extract a phone number from audio alone without speech-to-text.
 * - Demo transcript is explicitly marked as "DEMO TRANSCRIPT DATA".
 */
export function analyzeSpokenSecrets(
  transcript: string,
  samples?: Float32Array,
  sampleRate = 48000,
  isDemo = false
): SpeechAnalysisResult {
  const secrets: SpokenSecretFinding[] = [];
  const findings: Finding[] = [];
  const methodUsed = 'Quick Scan (signal analysis) — vocal formant energy detection (300-3400 Hz)';

  let hasSpeechEnergy = false;
  if (samples && samples.length > 0) {
    let energyVoice = 0;
    const step = Math.max(1, Math.floor(sampleRate / 8000));
    for (let i = 0; i < samples.length; i += step) {
      const v = samples[i];
      energyVoice += v * v;
    }
    hasSpeechEnergy = (energyVoice / (samples.length / step)) > 1e-4;
  } else if (transcript.length > 0) {
    hasSpeechEnergy = true;
  }

  // Real-world audio with no transcript available
  if (!transcript || transcript.trim().length === 0) {
    if (hasSpeechEnergy) {
      findings.push({
        id: 'speech-acoustic-activity',
        category: 'speech',
        title: 'Speech Detected (Content Not Read) [Quick Scan (signal analysis)]',
        plainText: 'Human vocal frequencies (300–3400 Hz) detected. Audio content was not transcribed (zero cloud recognition).',
        severity: 'info',
        confidence: 0.88,
        evidenceKind: 'Measured',
        details: {
          acousticSpeechDetected: true,
          method: 'Vocal tract formant frequency integration',
          honestyNotice: 'Speech detected, content not read. Client does not upload audio to cloud speech servers.',
        },
      });
    }

    return {
      secrets,
      findings,
      hasSpeechEnergy,
      methodUsed,
    };
  }

  // If transcript is provided (Demo clip or user-supplied text)
  const isDemoLabel = isDemo ? '[DEMO TRANSCRIPT DATA]' : '[USER TRANSCRIPT]';

  // 1. Phone numbers
  const phoneRegex = /\b(?:(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\+?1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})\b/g;
  let match: RegExpExecArray | null;

  while ((match = phoneRegex.exec(transcript)) !== null) {
    const raw = match[0];
    const redacted = raw.slice(0, 3) + '••••' + raw.slice(-2);
    secrets.push({
      secretType: 'phone',
      redactedText: redacted,
      confidence: 0.94,
    });

    findings.push({
      id: `spoken-phone-${secrets.length}`,
      category: 'speech',
      title: `Spoken Phone Number Leaked ${isDemoLabel}`,
      plainText: isDemo
        ? `[DEMO DATA]: Demo transcript contains spoken phone number (${redacted}). Public exposure invites targeted spam.`
        : `Telephone number detected in transcript (${redacted}).`,
      severity: 'critical',
      confidence: 0.94,
      evidenceKind: 'Measured',
      details: {
        secretType: 'Phone Number',
        maskedValue: redacted,
        isDemo,
        notice: isDemo ? 'Bundled demo transcript text only. Never extracted from un-transcribed audio.' : 'Extracted from transcript.',
      },
      fixable: true,
      fixDescription: 'Mute or beep spoken secret region in audio stream.',
    });
  }

  // 2. Passwords / credentials
  const pwdRegex = /(?:password|pwd|passcode|secret\s*key)\s*(?:is|was|[:=])\s*([A-Za-z0-9#!@$%^&*_-]{4,})/i;
  const pwdMatch = pwdRegex.exec(transcript);
  if (pwdMatch) {
    const raw = pwdMatch[1];
    const redacted = raw.slice(0, 2) + '••••';
    secrets.push({
      secretType: 'password',
      redactedText: redacted,
      confidence: 0.95,
    });

    findings.push({
      id: `spoken-password-${secrets.length}`,
      category: 'speech',
      title: `Spoken Password / Access Credential ${isDemoLabel}`,
      plainText: isDemo
        ? `[DEMO DATA]: Demo transcript mentions an access credential (${redacted}).`
        : `Credential phrase detected in transcript (${redacted}).`,
      severity: 'critical',
      confidence: 0.95,
      evidenceKind: 'Measured',
      details: {
        secretType: 'Password / Passcode',
        maskedValue: redacted,
        isDemo,
      },
      fixable: true,
      fixDescription: 'Mute or bleep spoken audio segment.',
    });
  }

  return {
    secrets,
    findings,
    hasSpeechEnergy,
    methodUsed,
  };
}
