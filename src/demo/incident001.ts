import { MetadataReport, VisualFindingBox } from '../types';

export interface Incident001Data {
  audioBuffer: Float32Array;
  sampleRate: number;
  duration: number;
  metadata: MetadataReport;
  visualBoxes: VisualFindingBox[];
  videoFrames: HTMLCanvasElement[];
  transcriptDemo: {
    text: string;
    speaker: string;
    isDemo: boolean;
  };
  sha256: string;
}

/**
 * Computes SHA-256 hash using Web Crypto API.
 */
export async function computeSha256(data: ArrayBuffer | Uint8Array | Float32Array): Promise<string> {
  let bytes: Uint8Array;
  if (data instanceof Uint8Array) {
    bytes = data;
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Procedurally generates INCIDENT-001: The Hostel Reel.
 * 15 seconds @ 48 kHz.
 * Contains:
 * - 50.02 Hz mains hum + 100/150 Hz harmonics with slow wander
 * - Audio edit / frequency jump near 0:11 (50.02 -> 50.09 Hz)
 * - Sharp clicks with ~0.38s room decay
 * - Keyed 19.4 kHz ultrasonic beacon active from 3.0s to 9.5s
 * - Canvas video frames of hostel scene with whiteboard Wi-Fi, ID card, face
 * - EXIF/GPS coordinates for Gujarat hostel
 */
export async function generateIncident001(): Promise<Incident001Data> {
  const sampleRate = 48000;
  const duration = 15.0;
  const numSamples = Math.floor(sampleRate * duration);
  const audio = new Float32Array(numSamples);

  // 1. Synthesize audio components
  let humPhase = 0;
  const targetRt60 = 0.38;
  const decayRate = Math.log(1000) / targetRt60;

  // Click transient positions (seconds)
  const clickTimes = [2.5, 6.8, 11.8];

  // Deterministic LCG pseudo-random generator for bit-exact reproducibility (zero Math.random)
  let seed = 987654321;
  const lcgRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // A. Mains hum 50.02 Hz with slow drift and jump at 11.0s
    let instantaneousHumFreq = 50.02 + 0.002 * Math.sin(0.4 * t);
    if (t >= 11.0) {
      instantaneousHumFreq = 50.09 + 0.002 * Math.cos(0.3 * t); // Jump near 0:11
    }

    humPhase += (2 * Math.PI * instantaneousHumFreq) / sampleRate;
    const humFund = 0.12 * Math.sin(humPhase);
    const humHarm2 = 0.04 * Math.sin(2 * humPhase);
    const humHarm3 = 0.02 * Math.sin(3 * humPhase);

    // B. Keyed 19.4 kHz ultrasonic tracking beacon (active 3.0s - 9.5s with on/off keying)
    let ultraTone = 0;
    if (t >= 3.0 && t <= 9.5) {
      // Keying pattern: pulses 0.6s on, 0.15s off
      const cycle = (t - 3.0) % 0.75;
      if (cycle < 0.6) {
        ultraTone = 0.12 * Math.sin(2 * Math.PI * 19400 * t);
      }
    }

    // C. Speech-like bursts (formants around 400, 1200, 2400 Hz)
    let speech = 0;
    if ((t >= 1.2 && t <= 4.0) || (t >= 7.5 && t <= 10.5)) {
      const envelope = 0.12 * Math.sin(2 * Math.PI * 3.5 * t);
      speech =
        envelope *
        (0.5 * Math.sin(2 * Math.PI * 320 * t) +
          0.3 * Math.sin(2 * Math.PI * 1150 * t) +
          0.2 * Math.sin(2 * Math.PI * 2200 * t));
    }

    // D. Room decay transients (clicks) with clean dynamic range
    let clicks = 0;
    for (const ct of clickTimes) {
      if (t >= ct && t <= ct + 0.6) {
        const dt = t - ct;
        const clickEnv = Math.exp(-decayRate * dt);
        clicks += (lcgRand() - 0.5) * 0.85 * clickEnv;
      }
    }

    // E. Soft background room ambient noise (-54 dB)
    const roomTone = (lcgRand() - 0.5) * 0.002;

    audio[i] = humFund + humHarm2 + humHarm3 + ultraTone + speech + clicks + roomTone;
  }

  // 2. Generate video frames (15 frames, 1 per second)
  const videoFrames: HTMLCanvasElement[] = [];
  const width = 640;
  const height = 360;

  for (let frameIdx = 0; frameIdx < 15; frameIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Room background (walls, flooring)
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#262D3D');
      grad.addColorStop(0.7, '#181E29');
      grad.addColorStop(1, '#0F131A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Floor line
      ctx.fillStyle = '#11151F';
      ctx.fillRect(0, height * 0.75, width, height * 0.25);

      // Desk
      ctx.fillStyle = '#402E24';
      ctx.fillRect(80, 220, 480, 70);
      ctx.fillStyle = '#2A1E17';
      ctx.fillRect(100, 290, 20, 60);
      ctx.fillRect(520, 290, 20, 60);

      // Whiteboard on back wall
      ctx.fillStyle = '#E8ECEF';
      ctx.fillRect(360, 40, 240, 140);
      ctx.strokeStyle = '#8E9BAE';
      ctx.lineWidth = 3;
      ctx.strokeRect(360, 40, 240, 140);

      // Sensitive text on whiteboard
      ctx.fillStyle = '#D92D20'; // Red marker
      ctx.font = 'bold 13px monospace';
      ctx.fillText('HOSTEL-GUEST-5G', 375, 75);
      ctx.fillStyle = '#1D2939';
      ctx.font = '12px monospace';
      ctx.fillText('Pwd: DormSecret#2026', 375, 105);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#475467';
      ctx.fillText('Warden Ext: 4091', 375, 135);

      // Mirror / Frame on left wall
      ctx.fillStyle = '#3E4756';
      ctx.fillRect(50, 40, 130, 160);
      ctx.strokeStyle = '#667085';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 40, 130, 160);

      // Reflected Student ID card
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(65, 80, 100, 60);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(65, 80, 100, 14);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText('STUDENT ID CARD', 70, 90);
      ctx.fillStyle = '#1F2937';
      ctx.font = '7px monospace';
      ctx.fillText('PRIYANSH P.', 70, 108);
      ctx.fillText('ROLL: 23BCE091', 70, 120);

      // Face silhouette / avatar of student at desk
      ctx.fillStyle = '#E2B18E'; // Face tone
      ctx.beginPath();
      ctx.arc(260, 150, 28, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#261B16';
      ctx.beginPath();
      ctx.arc(260, 140, 29, Math.PI, Math.PI * 2);
      ctx.fill();

      // Shoulders / torso
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.ellipse(260, 220, 45, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      // Timestamp watermark in corner
      ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText(`INCIDENT-001 [DEMO] // 00:${frameIdx < 10 ? '0' : ''}${frameIdx}`, 15, 25);
    }
    videoFrames.push(canvas);
  }

  // 3. Metadata with Gujarat hostel coordinates
  const metadata: MetadataReport = {
    gps: {
      latitude: 23.2156,
      longitude: 72.6369,
      altitude: 74.2,
      locationName: 'Gandhinagar, Gujarat, India (Hostel Block C)',
    },
    creationTime: '2026-11-23T20:14:08Z',
    deviceModel: 'Apple iPhone 15 Pro (A3102)',
    software: 'iOS 18.2 Camera App',
    rawTags: {
      'Make': 'Apple',
      'Model': 'iPhone 15 Pro',
      'DateTimeOriginal': '2026:11:23 20:14:08',
      'GPSLatitude': '23 deg 12\' 56.16" N',
      'GPSLongitude': '72 deg 38\' 12.84" E',
      'LensModel': 'iPhone 15 Pro back triple camera 24mm f/1.78',
      'FocalLength': '6.86 mm',
      'FNumber': '1.78',
    },
    isDemo: true,
  };

  // 4. Visual finding bounding boxes (normalized 0..1 coordinates)
  const visualBoxes: VisualFindingBox[] = [
    {
      x: 360 / width,
      y: 40 / height,
      width: 240 / width,
      height: 140 / height,
      label: 'Visible Wi-Fi Password & Network SSID',
      type: 'text',
      timestamp: 1.0,
    },
    {
      x: 65 / width,
      y: 80 / height,
      width: 100 / width,
      height: 60 / height,
      label: 'Student Identity Card (Roll: 23BCE091)',
      type: 'card',
      timestamp: 1.0,
    },
    {
      x: (260 - 32) / width,
      y: (150 - 35) / height,
      width: 64 / width,
      height: 70 / height,
      label: 'Human Face',
      type: 'face',
      timestamp: 1.0,
    },
  ];

  // 5. Transcript demo data
  const transcriptDemo = {
    text: "Hey guys, checking into the new hostel room in Gujarat. Wi-Fi password is on the whiteboard if anyone needs it, and my phone number is 98250 12345. Don't post this anywhere!",
    speaker: 'Speaker 1',
    isDemo: true,
  };

  // 6. Compute real SHA-256 of the audio bytes
  const sha256 = await computeSha256(audio);

  return {
    audioBuffer: audio,
    sampleRate,
    duration,
    metadata,
    visualBoxes,
    videoFrames,
    transcriptDemo,
    sha256,
  };
}

/**
 * Procedurally generates INCIDENT-002: The Coffee Shop Interview (12s @ 48 kHz).
 * Features:
 * - 60.01 Hz North American grid mains hum + 120/180 Hz harmonics
 * - Heavy acoustic crowd reverberation (RT60 ~ 0.72s)
 * - Formant speech voice note leaking speaker biometrics
 * - QuickTime metadata from Austin, Texas
 */
export async function generateIncident002(): Promise<Incident001Data> {
  const sampleRate = 48000;
  const duration = 12.0;
  const numSamples = Math.floor(sampleRate * duration);
  const audio = new Float32Array(numSamples);

  let humPhase = 0;
  const targetRt60 = 0.72;
  const decayRate = Math.log(1000) / targetRt60;
  const clickTimes = [3.0, 7.5];

  let seed = 777123;
  const nextLcg = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // 60.01 Hz North American Mains Hum
    const humFreq = 60.01 + 0.005 * Math.sin(t * 0.3);
    humPhase += (2 * Math.PI * humFreq) / sampleRate;
    const hum = 0.12 * Math.sin(humPhase) + 0.04 * Math.sin(humPhase * 2) + 0.02 * Math.sin(humPhase * 3);

    // Formant speech-like audio
    const speech = 0.25 * Math.sin(2 * Math.PI * 180 * t) * Math.sin(t * 2.5) +
                   0.15 * Math.sin(2 * Math.PI * 720 * t) * Math.cos(t * 1.8);

    // Acoustic room reverb
    let room = 0;
    for (const c of clickTimes) {
      const dt = t - c;
      if (dt >= 0 && dt < 1.5) {
        room += Math.exp(-decayRate * dt) * nextLcg() * 0.45;
      }
    }

    const noise = nextLcg() * 0.02;
    audio[i] = hum + speech + room + noise;
  }

  const metadata: MetadataReport = {
    gps: {
      latitude: 30.2672,
      longitude: -97.7431,
      altitude: 149.0,
      locationName: 'Austin, Texas, United States (Downtown Coffee Roasters)',
    },
    creationTime: '2026-11-24T11:20:00Z',
    deviceModel: 'Samsung Galaxy S24 Ultra',
    software: 'Android 15 OneUI Camera',
    rawTags: {
      'Make': 'Samsung',
      'Model': 'SM-S928B',
      'GPSLatitude': '30 deg 16\' 1.92" N',
      'GPSLongitude': '97 deg 44\' 35.16" W',
    },
    isDemo: true,
  };

  const sha256 = await computeSha256(audio);

  return {
    audioBuffer: audio,
    sampleRate,
    duration,
    metadata,
    visualBoxes: [
      {
        x: 0.25,
        y: 0.15,
        width: 0.5,
        height: 0.6,
        label: 'Human Face (Speaker 1)',
        type: 'face',
        timestamp: 1.0,
      },
    ],
    videoFrames: [],
    transcriptDemo: {
      text: "Hey, we're discussing the confidential partnership at the downtown cafe in Austin. I'm leaving for the airport at 4 PM.",
      speaker: 'Speaker 1',
      isDemo: true,
    },
    sha256,
  };
}

/**
 * Procedurally generates INCIDENT-003: The Silent Office Recording (8s).
 * Features:
 * - Silent audio track (no microphones active)
 * - 100 Hz Optical rolling shutter banding from fluorescent ballast
 * - Camera PRNU sensor fingerprint
 * - Embedded device serial number and GPS in container metadata
 */
export async function generateIncident003(): Promise<Incident001Data> {
  const sampleRate = 48000;
  const duration = 8.0;
  const numSamples = Math.floor(sampleRate * duration);
  const audio = new Float32Array(numSamples); // Pure digital silence

  const width = 640;
  const height = 360;
  const videoFrames: HTMLCanvasElement[] = [];

  for (let frameIdx = 0; frameIdx < 8; frameIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Office background
      ctx.fillStyle = '#E8E8EC';
      ctx.fillRect(0, 0, width, height);

      // Optical rolling shutter 100 Hz banding (3.33 cycles per frame)
      for (let y = 0; y < height; y++) {
        const band = 18 * Math.sin((2 * Math.PI * 3.33 * y) / height + frameIdx * 0.4);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, band / 255)})`;
        ctx.fillRect(0, y, width, 1);
      }

      // Computer monitor on desk
      ctx.fillStyle = '#1A1A24';
      ctx.fillRect(180, 80, 280, 180);
      ctx.fillStyle = '#00F0FF';
      ctx.font = '12px monospace';
      ctx.fillText('CONFIDENTIAL PROJECT METRICS // RESTRICTED', 200, 140);
      ctx.fillText('API_KEY = sk_live_891048120498124', 200, 165);
    }
    videoFrames.push(canvas);
  }

  const metadata: MetadataReport = {
    gps: {
      latitude: 51.5074,
      longitude: -0.1278,
      altitude: 35.0,
      locationName: 'London, Greater London, United Kingdom (HQ Office 4B)',
    },
    creationTime: '2026-11-24T09:15:32Z',
    deviceModel: 'Sony Alpha 7 IV (ILCE-7M4)',
    software: 'Sony ILCE-7M4 v3.00',
    rawTags: {
      'Make': 'Sony',
      'Model': 'ILCE-7M4',
      'BodySerialNumber': '4819204',
      'LensModel': 'FE 24-70mm F2.8 GM II',
    },
    isDemo: true,
  };

  const sha256 = await computeSha256(audio);

  return {
    audioBuffer: audio,
    sampleRate,
    duration,
    metadata,
    visualBoxes: [
      {
        x: 180 / width,
        y: 80 / height,
        width: 280 / width,
        height: 180 / height,
        label: 'Confidential Screen API Key',
        type: 'text',
        timestamp: 1.0,
      },
    ],
    videoFrames,
    transcriptDemo: {
      text: '[Audio Track Muted / Zero Microphones Active]',
      speaker: 'None',
      isDemo: true,
    },
    sha256,
  };
}
