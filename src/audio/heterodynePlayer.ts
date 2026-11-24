/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Heterodyne Down-Conversion Audio Player (F1)
 * Takes inaudible ultrasonic acoustic beacon tones (e.g. 19.4 kHz, 18.9 kHz, 20.1 kHz)
 * and down-converts them to ~1.5 kHz using mathematical local oscillator mixing:
 *
 * x_audible(t) = LowPass[ x(t) * cos(2 * pi * (f_beacon - 1500) * t) ]
 *
 * Human ears can clearly hear the 1.5 kHz whistle and the exact On-Off-Keying (OOK)
 * modulation pattern that was secretly tracking them!
 */

export class HeterodyneAudioPlayer {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isCurrentlyPlaying = false;

  /**
   * Generates a down-converted 1.5 kHz audible audio buffer from ultrasonic recording.
   */
  public generateAudibleBuffer(
    samples: Float32Array,
    sampleRate: number,
    beaconFreqHz: number,
    targetAudibleFreqHz = 1500
  ): AudioBuffer {
    const audioCtx = this.getAudioContext();
    const duration = samples.length / sampleRate;
    const buffer = audioCtx.createBuffer(1, samples.length, sampleRate);
    const channel = buffer.getChannelData(0);

    const loFreq = Math.max(1000, beaconFreqHz - targetAudibleFreqHz);
    const twoPi = 2.0 * Math.PI;

    // 1. Heterodyne multiplication (mixer)
    const mixed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const lo = Math.cos(twoPi * loFreq * t);
      mixed[i] = samples[i] * lo;
    }

    // 2. 2-pole lowpass filter at 3.0 kHz to eliminate sum frequency (2*fb - 1500)
    const cutoff = 3000;
    const rc = 1.0 / (twoPi * cutoff);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);

    let filtered = 0;
    let maxAmp = 1e-6;
    for (let i = 0; i < samples.length; i++) {
      filtered = filtered + alpha * (mixed[i] - filtered);
      channel[i] = filtered;
      const a = Math.abs(filtered);
      if (a > maxAmp) maxAmp = a;
    }

    // 3. Normalize gain
    const normGain = maxAmp > 0 ? 0.7 / maxAmp : 1.0;
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.max(-0.95, Math.min(0.95, channel[i] * normGain));
    }

    return buffer;
  }

  /**
   * Plays the down-converted audio buffer with limiter and safe default volume.
   */
  public play(
    samples: Float32Array,
    sampleRate: number,
    beaconFreqHz: number,
    onEnded?: () => void
  ): void {
    this.stop();

    const audioCtx = this.getAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const audibleBuffer = this.generateAudibleBuffer(samples, sampleRate, beaconFreqHz);

    // Audio graph: Source -> Gain (safe 0.20) -> DynamicsCompressor (limiter) -> Destination
    const source = audioCtx.createBufferSource();
    source.buffer = audibleBuffer;

    const gain = audioCtx.createGain();
    gain.gain.value = 0.20; // Safe default volume

    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -12.0;
    limiter.knee.value = 4.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.05;

    source.connect(gain);
    gain.connect(limiter);
    limiter.connect(audioCtx.destination);

    source.onended = () => {
      this.isCurrentlyPlaying = false;
      if (onEnded) onEnded();
    };

    source.start(0);
    this.sourceNode = source;
    this.gainNode = gain;
    this.isCurrentlyPlaying = true;
  }

  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignored
      }
      this.sourceNode = null;
    }
    this.isCurrentlyPlaying = false;
  }

  public isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  public setVolume(vol: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0.0, Math.min(1.0, vol));
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }
}
