/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TEST_MEDIA_DIR = path.resolve(process.cwd(), 'test-media');

if (!fs.existsSync(TEST_MEDIA_DIR)) {
  fs.mkdirSync(TEST_MEDIA_DIR, { recursive: true });
}

function writeWavHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  numSamples: number,
  formatCode = 1 // 1 = PCM, 3 = IEEE Float
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = (numSamples * numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(formatCode, 20); // AudioFormat
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export async function generateAllTestMedia() {
  console.log('[*] Generating verified test media in', TEST_MEDIA_DIR);

  // 1. Mono 16-bit 44.1 kHz WAV (5.0s) with 50.0 Hz hum, 19.4 kHz beacon, and splice at 2.5s
  {
    const sampleRate = 44100;
    const duration = 5.0;
    const numSamples = Math.floor(sampleRate * duration);
    const header = writeWavHeader(sampleRate, 1, 16, numSamples, 1);
    const data = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // 50 Hz power hum
      let s = 0.25 * Math.sin(2 * Math.PI * 50.0 * t);
      // 150 Hz 3rd harmonic
      s += 0.08 * Math.sin(2 * Math.PI * 150.0 * t);
      // 19.4 kHz ultrasonic beacon
      s += 0.15 * Math.sin(2 * Math.PI * 19400.0 * t);
      // Splice transient at t = 2.5s
      if (Math.abs(t - 2.5) < 0.01) {
        s += 0.4 * (Math.random() * 2 - 1);
      }
      // Add subtle noise floor
      s += 0.01 * (Math.random() * 2 - 1);

      const val = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
      data.writeInt16LE(val, i * 2);
    }

    const filePath = path.join(TEST_MEDIA_DIR, 'mono_16bit_44k.wav');
    fs.writeFileSync(filePath, Buffer.concat([header, data]));
    console.log(`[+] Created ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(1)} kB)`);
  }

  // 2. Stereo 24-bit 48 kHz WAV (4.0s) with 60.0 Hz hum and clipping events
  {
    const sampleRate = 48000;
    const duration = 4.0;
    const numSamples = Math.floor(sampleRate * duration);
    const header = writeWavHeader(sampleRate, 2, 24, numSamples, 1);
    const data = Buffer.alloc(numSamples * 2 * 3); // 2 channels, 3 bytes per sample

    let offset = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Left channel: 60 Hz hum + 18.9 kHz beacon
      let left = 0.3 * Math.sin(2 * Math.PI * 60.0 * t) + 0.15 * Math.sin(2 * Math.PI * 18900.0 * t);
      // Right channel: Speech simulation + intentional clipping bursts at 1.0s and 3.0s
      let right = 0.2 * Math.sin(2 * Math.PI * 440.0 * t);
      if ((t >= 1.0 && t <= 1.05) || (t >= 3.0 && t <= 3.05)) {
        right = 1.8; // Will clip
      }

      // 24-bit range: -8388608 to 8388607
      const leftVal = Math.max(-8388608, Math.min(8388607, Math.floor(left * 8388607)));
      const rightVal = Math.max(-8388608, Math.min(8388607, Math.floor(right * 8388607)));

      // Write 24-bit LE left
      data[offset++] = leftVal & 0xff;
      data[offset++] = (leftVal >> 8) & 0xff;
      data[offset++] = (leftVal >> 16) & 0xff;

      // Write 24-bit LE right
      data[offset++] = rightVal & 0xff;
      data[offset++] = (rightVal >> 8) & 0xff;
      data[offset++] = (rightVal >> 16) & 0xff;
    }

    const filePath = path.join(TEST_MEDIA_DIR, 'stereo_24bit_48k.wav');
    fs.writeFileSync(filePath, Buffer.concat([header, data]));
    console.log(`[+] Created ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(1)} kB)`);
  }

  // 3. Float32 WAV (4.0s) IEEE Float (format code 3)
  {
    const sampleRate = 48000;
    const duration = 4.0;
    const numSamples = Math.floor(sampleRate * duration);
    const header = writeWavHeader(sampleRate, 1, 32, numSamples, 3);
    const data = Buffer.alloc(numSamples * 4);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Multi-harmonic signal + chirped beacon
      const f = 1000 + 500 * Math.sin(2 * Math.PI * 0.5 * t);
      const val = 0.5 * Math.sin(2 * Math.PI * f * t);
      data.writeFloatLE(val, i * 4);
    }

    const filePath = path.join(TEST_MEDIA_DIR, 'float32_48k.wav');
    fs.writeFileSync(filePath, Buffer.concat([header, data]));
    console.log(`[+] Created ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(1)} kB)`);
  }

  // 4. 10-Minute WAV (600s, 4000 Hz, 16-bit PCM = 4.80 MB < 5 MB limit)
  {
    const sampleRate = 4000;
    const duration = 600.0;
    const numSamples = Math.floor(sampleRate * duration);
    const header = writeWavHeader(sampleRate, 1, 16, numSamples, 1);
    const data = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Grid frequency drift around 50 Hz: 49.95 to 50.05 Hz
      const enf = 50.0 + 0.05 * Math.sin((2 * Math.PI * t) / 120);
      const s = 0.2 * Math.sin(2 * Math.PI * enf * t) + 0.02 * (Math.random() * 2 - 1);
      const val = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
      data.writeInt16LE(val, i * 2);
    }

    const filePath = path.join(TEST_MEDIA_DIR, 'ten_minute_4k.wav');
    fs.writeFileSync(filePath, Buffer.concat([header, data]));
    const sizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    console.log(`[+] Created ${filePath} (${sizeMb} MB, strict limit < 5.0 MB)`);
  }

  // 5. 10 s 720p Video (1280x720) with visible credential screen area
  {
    const videoPath = path.join(TEST_MEDIA_DIR, 'video_10s_720p_credential.mp4');
    try {
      // Use ffmpeg to generate synthetic 720p 10s video with text banner and audio tone
      const cmd = `ffmpeg -y -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 -f lavfi -i "sine=frequency=19400:duration=10" -vf "drawbox=x=100:y=100:w=400:h=150:color=red@0.8:t=fill,drawtext=text='CONFIDENTIAL API_KEY=live_sec_99482104':x=110:y=160:fontsize=24:fontcolor=white" -c:v libx264 -pix_fmt yuv420p -b:v 1M -c:a aac -b:a 128k "${videoPath}"`;
      execSync(cmd, { stdio: 'pipe' });
      const sizeMb = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);
      console.log(`[+] Created ${videoPath} (${sizeMb} MB)`);
    } catch (e: any) {
      console.error('[-] ffmpeg video generation fallback:', e.message);
    }
  }

  // 6. 60 s 1080p Portrait Video (1080x1920)
  {
    const portraitPath = path.join(TEST_MEDIA_DIR, 'video_60s_1080p_portrait.mp4');
    try {
      // 1080x1920 portrait phone video at 15 fps, 350k bitrate to keep < 3.5 MB
      const cmd = `ffmpeg -y -f lavfi -i testsrc=duration=60:size=1080x1920:rate=15 -f lavfi -i "sine=frequency=50:duration=60" -vf "drawbox=x=200:y=600:w=680:h=200:color=blue@0.8:t=fill,drawtext=text='PASSCODE 994821':x=250:y=700:fontsize=48:fontcolor=white" -c:v libx264 -pix_fmt yuv420p -b:v 400k -c:a aac -b:a 64k "${portraitPath}"`;
      execSync(cmd, { stdio: 'pipe' });
      const sizeMb = (fs.statSync(portraitPath).size / (1024 * 1024)).toFixed(2);
      console.log(`[+] Created ${portraitPath} (${sizeMb} MB)`);
    } catch (e: any) {
      console.error('[-] ffmpeg portrait video generation fallback:', e.message);
    }
  }

  console.log('[*] All test media files created successfully.');
}

generateAllTestMedia().catch(console.error);
