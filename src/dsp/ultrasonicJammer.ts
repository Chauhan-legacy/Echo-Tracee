/**
 * Ultrasonic Anti-Surveillance Jammer (Psychoacoustic Masking Shield)
 *
 * Generates band-limited ultrasonic noise dither (18.5 kHz - 21.5 kHz)
 * at controlled amplitude (-42 dBFS). Inaudible to adult humans, but
 * overwhelms CFAR detectors and FSK/Manchester demodulators of cross-device
 * ultrasonic tracking SDKs (e.g., SilverPush, Shopkick, Lisnr).
 */

export interface UltrasonicShieldOptions {
  centerFreqHz: number; // e.g. 19,500 Hz
  bandwidthHz: number;  // e.g. 2,000 Hz (18.5 - 20.5 kHz)
  amplitudeDb: number;  // e.g. -42 dBFS (inaudible dither)
}

export const DEFAULT_SHIELD_OPTIONS: UltrasonicShieldOptions = {
  centerFreqHz: 19500,
  bandwidthHz: 2200,
  amplitudeDb: -42,
};

/**
 * Injects ultrasonic anti-tracking noise into an audio buffer if sample rate supports it (fs >= 44100).
 */
export function injectUltrasonicShield(
  input: Float32Array,
  sampleRate: number,
  options: Partial<UltrasonicShieldOptions> = {}
): Float32Array {
  // If sample rate cannot represent ultrasonic frequencies without aliasing, return clean copy
  if (sampleRate < 44100) {
    return new Float32Array(input);
  }

  const opts = { ...DEFAULT_SHIELD_OPTIONS, ...options };
  const nyquist = sampleRate / 2;
  const fLow = Math.max(18000, opts.centerFreqHz - opts.bandwidthHz / 2);
  const fHigh = Math.min(nyquist - 200, opts.centerFreqHz + opts.bandwidthHz / 2);

  if (fHigh <= fLow) {
    return new Float32Array(input);
  }

  const output = new Float32Array(input.length);
  const linearGain = Math.pow(10, opts.amplitudeDb / 20);

  // 2nd-order Biquad Bandpass Filter coefficients (Cookbook formulae)
  const f0 = (fLow + fHigh) / 2;
  const bw = fHigh - fLow;
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const Q = f0 / bw;
  const alpha = Math.sin(w0) / (2 * Q);

  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  // LCG pseudo-random generator
  let seed = 987654321;
  const nextNoise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1;
  };

  for (let i = 0; i < input.length; i++) {
    const rawNoise = nextNoise();
    const filteredNoise = nb0 * rawNoise + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1;
    x1 = rawNoise;
    y2 = y1;
    y1 = filteredNoise;

    output[i] = input[i] + filteredNoise * linearGain;
  }

  return output;
}
