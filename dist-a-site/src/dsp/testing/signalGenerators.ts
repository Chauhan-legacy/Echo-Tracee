import { designKaiserLowpass, applyFirFilter } from '../../fixer/kaiserFir';

export interface TestSignal {
  id: number;
  name: string;
  description: string;
  sampleRate: number;
  durationSec: number;
  audio: Float32Array;
  expected: {
    humDetected?: boolean;
    humFreqHz?: number;
    humToleranceHz?: number;
    humGridFamily?: string;
    humEditDetected?: boolean;
    humEditTimeSec?: number;
    ultrasonicDetected?: boolean;
    ultrasonicFreqHz?: number;
    ultrasonicToleranceHz?: number;
    codecCutoffDetected?: boolean;
    rt60Sec?: number;
    rt60TolerancePct?: number;
    criticalFindingsExpected?: boolean;
  };
}

export function generate11TestSignals(): TestSignal[] {
  const fs = 48000;
  const signals: TestSignal[] = [];

  // 1. Silence 10s -> no hum, no tone, no critical findings, score ~0
  {
    const dur = 10;
    const audio = new Float32Array(fs * dur); // all zeros
    signals.push({
      id: 1,
      name: 'Pure Silence (10s)',
      description: 'Zero-amplitude silence. Must yield zero false alarms and 0 critical findings.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: false,
        ultrasonicDetected: false,
        criticalFindingsExpected: false,
      },
    });
  }

  // 2. White noise -> no hum, no tone, no critical findings
  {
    const dur = 5;
    const len = fs * dur;
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      audio[i] = (Math.random() - 0.5) * 0.15;
    }
    signals.push({
      id: 2,
      name: 'High-Level White Noise (5s)',
      description: 'Broadband stochastic noise (-16 dBFS). CFAR and zero-crossing guards must reject.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: false,
        ultrasonicDetected: false,
        criticalFindingsExpected: false,
      },
    });
  }

  // 3. Hum 50.00 Hz (+100/150 Hz) -> 50 Hz family, 50.00 +- 0.02, no edit
  {
    const dur = 8;
    const len = fs * dur;
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / fs;
      audio[i] =
        0.25 * Math.sin(2 * Math.PI * 50.00 * t) +
        0.10 * Math.sin(2 * Math.PI * 100.00 * t) +
        0.05 * Math.sin(2 * Math.PI * 150.00 * t) +
        (Math.random() - 0.5) * 0.01;
    }
    signals.push({
      id: 3,
      name: 'Mains Hum 50.00 Hz Fundamental + Harmonics',
      description: 'Clean continuous 50.00 Hz power grid hum. Must identify 50 Hz family without edits.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: true,
        humFreqHz: 50.00,
        humToleranceHz: 0.02,
        humGridFamily: '50Hz',
        humEditDetected: false,
      },
    });
  }

  // 4. Hum 60.01 Hz + keyed tone 20.1 kHz (2-8s) -> 60 Hz family, tone at 20.1 kHz (+-20 Hz); labels must NOT show 50.02 Hz or 19.4 kHz
  {
    const dur = 10;
    const len = fs * dur;
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / fs;
      // 60.01 Hz hum
      let s = 0.22 * Math.sin(2 * Math.PI * 60.01 * t) + 0.07 * Math.sin(2 * Math.PI * 120.02 * t);
      // Keyed tone at 20.1 kHz active between 2.0s and 8.0s
      if (t >= 2.0 && t <= 8.0) {
        s += 0.18 * Math.sin(2 * Math.PI * 20100 * t);
      }
      audio[i] = s + (Math.random() - 0.5) * 0.005;
    }
    signals.push({
      id: 4,
      name: 'Hum 60.01 Hz + Keyed Tone 20.1 kHz (2-8s)',
      description: 'North American 60 Hz hum with 20.1 kHz ultrasonic tone. Must NOT report 50 Hz or 19.4 kHz.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: true,
        humFreqHz: 60.01,
        humToleranceHz: 0.02,
        humGridFamily: '60Hz',
        ultrasonicDetected: true,
        ultrasonicFreqHz: 20100,
        ultrasonicToleranceHz: 20,
      },
    });
  }

  // 5. Hum 49.98 Hz stepping to 50.10 Hz with phase break at 6.0s -> edit flagged near 6.0s
  {
    const dur = 10;
    const len = fs * dur;
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / fs;
      if (t < 6.0) {
        audio[i] = 0.25 * Math.sin(2 * Math.PI * 49.98 * t);
      } else {
        // Phase jump + 0.12 Hz step
        audio[i] = 0.25 * Math.sin(2 * Math.PI * 50.10 * (t - 6.0) + Math.PI / 2);
      }
    }
    signals.push({
      id: 5,
      name: 'ENF Step Jump & Phase Discontinuity (6.0s)',
      description: '49.98 Hz jumps to 50.10 Hz with 90° phase shift at 6.0s. CUSUM must flag edit near 6s.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: true,
        humEditDetected: true,
        humEditTimeSec: 6.0,
      },
    });
  }

  // 6. Clicks with decay 0.2s -> RT 0.2s +-15%, dry
  {
    const dur = 4;
    const len = fs * dur;
    const audio = new Float32Array(len);
    const decayConst = Math.log(1000) / 0.20; // 60 dB drop in 0.20s
    for (let c = 0; c < 3; c++) {
      const clickIdx = Math.floor(fs * (0.5 + c * 1.0));
      for (let j = 0; j < fs * 0.4 && clickIdx + j < len; j++) {
        const dt = j / fs;
        audio[clickIdx + j] += (Math.random() - 0.5) * Math.exp(-decayConst * dt) * 0.8;
      }
    }
    signals.push({
      id: 6,
      name: 'Impulse Decay 0.20s (Dry Room)',
      description: 'Exponential click decays with 0.20s RT60. Must estimate 0.20s ±15% (dry room).',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        rt60Sec: 0.20,
        rt60TolerancePct: 0.15,
      },
    });
  }

  // 7. Clicks with decay 0.9s -> RT 0.9s +-15%, echoey
  {
    const dur = 6;
    const len = fs * dur;
    const audio = new Float32Array(len);
    const decayConst = Math.log(1000) / 0.90; // 60 dB drop in 0.90s
    const clickIdx = Math.floor(fs * 0.5);
    for (let j = 0; j < fs * 3.0 && clickIdx + j < len; j++) {
      const dt = j / fs;
      audio[clickIdx + j] += (Math.random() - 0.5) * Math.exp(-decayConst * dt) * 0.8;
    }
    signals.push({
      id: 7,
      name: 'Impulse Decay 0.90s (Echoey Hall)',
      description: 'Long acoustic reverberation decay. Must estimate 0.90s ±15% (echoey).',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        rt60Sec: 0.90,
        rt60TolerancePct: 0.15,
      },
    });
  }

  // 8. Noise + hum + 19.4 kHz tone, steep low-pass at 16.5 kHz -> 'cannot check above ~16 kHz', NO tone reported, NOT 'clean'
  {
    const dur = 6;
    const len = fs * dur;
    const raw = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / fs;
      raw[i] =
        0.2 * Math.sin(2 * Math.PI * 50.02 * t) +
        0.15 * Math.sin(2 * Math.PI * 19400 * t) +
        (Math.random() - 0.5) * 0.05;
    }
    const kaiserTaps = designKaiserLowpass(16000, fs, 90, 1000);
    const audio = applyFirFilter(raw, kaiserTaps);

    signals.push({
      id: 8,
      name: '16.5 kHz Codec Cutoff (Low-Pass Filtered)',
      description: 'Audio truncated at 16.5 kHz. Must honestly report "cannot check above ~16 kHz", NOT claim clean.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        codecCutoffDetected: true,
        ultrasonicDetected: false,
      },
    });
  }

  // 9. Speech-like synthetic voice -> no critical findings
  {
    const dur = 6;
    const len = fs * dur;
    const audio = new Float32Array(len);
    // Synthetic formant speech (f0 = 130 Hz, formants at 700, 1220, 2600 Hz)
    const f0 = 130;
    for (let i = 0; i < len; i++) {
      const t = i / fs;
      audio[i] =
        0.3 * Math.sin(2 * Math.PI * 700 * t) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 3 * t)) +
        0.2 * Math.sin(2 * Math.PI * 1220 * t) +
        0.1 * Math.sin(2 * Math.PI * 2600 * t) +
        0.08 * Math.sin(2 * Math.PI * f0 * t);
    }
    signals.push({
      id: 9,
      name: 'Synthetic Human Voice (Formant Speech)',
      description: 'Natural speech harmonics without hum or beacon. Must yield ZERO critical findings.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: false,
        ultrasonicDetected: false,
        criticalFindingsExpected: false,
      },
    });
  }

  // 10. Hum 50.02 Hz, edit at 11s, keyed tone 19.4 kHz (3-9s), clicks with decay 0.38s, 15s long -> all 4 findings
  {
    const dur = 15;
    const len = fs * dur;
    const audio = new Float32Array(len);
    const decayConst = Math.log(1000) / 0.38;

    for (let i = 0; i < len; i++) {
      const t = i / fs;
      // 50.02 Hz hum with edit at 11.0s
      let humF = 50.02;
      let humPhase = 0;
      if (t >= 11.0) {
        humF = 50.14;
        humPhase = Math.PI / 3;
      }
      let s = 0.25 * Math.sin(2 * Math.PI * humF * t + humPhase);

      // Keyed tone 19.4 kHz between 3s and 9s
      if (t >= 3.0 && t <= 9.0) {
        s += 0.20 * Math.sin(2 * Math.PI * 19400 * t);
      }

      // Room clicks at 1.0s and 5.0s with 0.38s decay
      if (t >= 1.0 && t < 2.5) {
        s += (Math.random() - 0.5) * Math.exp(-decayConst * (t - 1.0)) * 0.4;
      }
      if (t >= 5.0 && t < 6.5) {
        s += (Math.random() - 0.5) * Math.exp(-decayConst * (t - 5.0)) * 0.4;
      }

      audio[i] = s + (Math.random() - 0.5) * 0.005;
    }

    signals.push({
      id: 10,
      name: 'Multi-Threat INCIDENT-001 Synthetic Composite (15s)',
      description: 'Hum 50.02 Hz + Edit at 11s + Keyed 19.4 kHz Tone + 0.38s Room RT60. All 4 findings must trigger.',
      sampleRate: fs,
      durationSec: dur,
      audio,
      expected: {
        humDetected: true,
        humFreqHz: 50.02,
        humEditDetected: true,
        ultrasonicDetected: true,
        ultrasonicFreqHz: 19400,
        rt60Sec: 0.38,
        rt60TolerancePct: 0.15,
      },
    });
  }

  // 11. Mono 8 kHz sample rate with hum 50 Hz -> hum found, tone check says cannot run, no crash
  {
    const fs8k = 8000;
    const dur = 5;
    const len = fs8k * dur;
    const audio = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / fs8k;
      audio[i] = 0.3 * Math.sin(2 * Math.PI * 50.00 * t) + (Math.random() - 0.5) * 0.01;
    }
    signals.push({
      id: 11,
      name: 'Low Sample Rate 8 kHz Telephony Audio',
      description: '8 kHz audio (Nyquist 4 kHz). Hum detected, ultrasonic gracefully reports cannot check.',
      sampleRate: fs8k,
      durationSec: dur,
      audio,
      expected: {
        humDetected: true,
        humFreqHz: 50.00,
        humToleranceHz: 0.05,
        ultrasonicDetected: false,
      },
    });
  }

  return signals;
}
