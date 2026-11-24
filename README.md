# ECHO//TRACE — Client-Side Media Forensics & Privacy X-Ray

> **ECHO//TRACE** is an open-source, client-side web application that audits short videos and audio recordings for hidden physical surveillance signals — ultrasonic tracking beacons, power-grid location hum, and embedded metadata — and scrubs them in one click directly in your browser.

Built for journalists, human rights defenders, students, and everyday creators submitting to the **Embarko Student Challenge**.

---

## 1. What It Does Today (Verified Working Features)

- **Ultrasonic Beacon Pinpointing (17.5 – 22 kHz):** Detects cross-device tracking tones via CA-CFAR spectral peak detection and evaluates bin power using high-precision Goertzel quadrature integration.
- **Power Grid Harmonics (ENF Forensics):** Analyzes mains hum (50 Hz / 60 Hz) and harmonics up to 200 Hz with adaptive Kalman filtering and RTS backward smoothing, revealing geographical power grid footprints.
- **Irreversible Full-Stream Video Redaction:** Tracks sensitive visual credentials and faces across **every frame** of a video using a persistent Kalman tracker and applies Voronoi mosaic cell scrambling (SSIM inside redacted region < 0.20).
- **Acoustic Inpainting & Psychoacoustic Jamming:** Employs zero-phase IIR notch banks and Kaiser-windowed FIR low-pass filtering (≥ 100 dB stopband) that matches ambient noise floors without audible phase clicks.
- **Closed-Loop Cryptographic Verification:** Re-runs detectors immediately on the sanitized buffer and signs an ECDSA P-256 transformation receipt with an on-device Web Crypto private key.
- **Zero-Data Transmission Guarantee:** Runs 100% locally on your machine via Web Audio, HTML5 Canvas, and Web Workers. Auditable in real time via the built-in Network Audit panel.

---

## 2. Quick Start

### Prerequisites
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0

### Run Locally
```bash
# Clone the repository
git clone https://github.com/echotrace/echotrace.git
cd echotrace

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in Chrome, Firefox, or Safari.

### Run Tests & Build Production Bundle
```bash
# Execute unit & forensic test suite (123 tests)
npm test -- --run

# Compile static distribution (< 250 kB initial JS gzip budget)
npm run build
```

---

## 3. How to Use in 3 Steps

1. **Scan:** Click **"Load INCIDENT-001"** for an instant 15-second demo case, or drop your own `.mp4`, `.mov`, `.wav`, or `.mp3` file into the upload zone.
2. **See:** Inspect the interactive, playhead-synced spectrogram. Red dashed boxes highlight suspicious ultrasonic tracking frequencies, and the Leak Score gauge quantifies exposure.
3. **Fix:** Click **"Sanitize Media"**. The app scrubs beacons, notches hum harmonics, pixelates credentials across all video frames, and produces an exportable cleaned file with a cryptographic **Sanitization Receipt**.

---

## 4. Architecture & Library Separation

All core discrete mathematics, linear algebra, spectral estimation, and machine learning models are isolated in a standalone, zero-dependency library:
- **`echotrace-math`** located in `/packages/echotrace-math`.
- Packaged as a single-file minified bundle: `echotrace-math.min.js` (53.98 kB raw, 20.10 kB gzip).
- App-inlined mode ensures the web app bundles only the specific mathematical functions it consumes.

---

## 5. Measured Hardware Benchmarks (Host Run)

All benchmarks measured on host machine via `scripts/benchmark.ts`:

| Operation | Implementation | Size / Parameters | Latency | Memory (Heap) |
| :--- | :--- | :--- | :--- | :--- |
| **FFT Forward** | Radix-2 DIT | $N = 1024$ samples | 26.77 µs / op | Preallocated (0 B garbage) |
| **FFT Forward** | Radix-2 DIT | $N = 2048$ samples | 50.78 µs / op | Preallocated (0 B garbage) |
| **FFT Forward (Prime)** | Bluestein Chirp-Z | $N = 1009$ (prime) | 173.58 µs / op | $O(N)$ workspace |
| **Adaptive Kalman Filter** | 2D State + RTS Smoother | 600-second track | 0.84 µs / step | Float64Array circular buffer |
| **MUSIC Subspace DOA** | Uniform Linear Array | 8 sensors, 181 grid points | 0.148 ms / op | $8 \times 8$ covariance |
| **Neural Attention Pass** | Temporal ALiBi Attention | Batch 1, $T=50, D=16$ | 0.753 ms (fwd) / 0.028 ms (bwd) | 10.39 MB |

---

## 6. Honest Limitations & Stated Failure Modes

- **Physical Room Geometry:** Natural room reverberation decay ($RT_{60}$) is an inherent acoustic property of physical rooms. While ECHO//TRACE measures room volume, it does not synthesize artificial dereverberation to avoid speech distortion.
- **Acoustic Masking Outside Redacted Rectangles:** Background handwriting or socio-cultural items outside bounding boxes remain unredacted unless manually marked by the user.
- **Lossy Container Re-Encoding:** Exported WebM/MP4 video streams are re-encoded client-side via browser `MediaRecorder` at 6 Mbps. Minor compression artifacts may occur depending on host hardware codec support.
- **Real-Data Testing Scope:** Evaluated on synthetic ground truth, FNET grid data, and LibriSpeech subsets. Multi-camera PRNU matching is **not evaluated on real multi-gigabyte camera databases** due to bundle constraints.

---

## 7. Claims Audit Table

| Stated Claim | Verification Command / Script | Stated Tolerance / Measured Output |
| :--- | :--- | :--- |
| Zero network leaks | `src/utils/networkAudit.ts` | 0 HTTP/WS requests |
| Full-stream tracking | `tests/part0_bugs.test.ts` (Bug 1) | SSIM < 0.20 on all frames |
| Streaming WAV parsing | `tests/part0_bugs.test.ts` (Bug 3) | 100% byte & PCM accuracy |
| Initial JS payload budget | `npm run build` | 61.61 kB gzip (< 250 kB limit) |
| Math library zero dependencies | `packages/echotrace-math/package.json` | `"dependencies": {}` (0 runtime deps) |
| Dual-method cross parity | `scripts/crossChecks.ts` | Max DFT error $3.08 \times 10^{-12}$ (< 1e-10) |

---

## 8. License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](file:///c:/Users/Priyansh/Desktop/NEW_PROJECTS/LICENSE) and [NOTICE](file:///c:/Users/Priyansh/Desktop/NEW_PROJECTS/NOTICE).
