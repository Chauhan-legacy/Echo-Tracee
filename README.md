# ECHO//TRACE — Client-Side Privacy X-Ray (V3.1 Production Release)

> **"Drop any video you were about to post. See what it secretly leaks. Fix it in one tap."**
> 
> *“This 15-second reel leaked my room, my voice and a tracker.”*
>
> 100% Client-Side. Zero Cloud Uploads. Real Physical DSP, Machine Learning, Computer Vision & Cryptographic Proof.
> Built for the **Embarko Student Challenge** (Judged on: Looks, Originality, Works on a Phone, 3-Second Hook).

---

## ⚡ 3-Second First-Screen Hook
- **Live Looping Mini-Spectrogram:** 48 kHz STFT looping on a deep forest data panel.
- **Cinematic One-Line Hook:** `“This 15-second reel leaked my room, my voice and a tracker.”`
- **Instant Demo:** Tap `[Load INCIDENT-001]` for a sub-200ms in-browser procedural benchmark clip containing real 50.02 Hz mains hum, an inaudible 19.4 kHz beacon tone, whiteboard credentials, and embedded Gujarat GPS atoms — zero network uploads.
- **Trust Assurance:** Live network request counter permanently at **0**, with `Nothing leaves your device` guarantee.

---

## 🌟 New in V3.1: Features, Models & Verification

### 1. 📜 Cryptographic Sanitization Receipt & In-App Verifier (Phase A)
- **Sanitization Receipt Modal:** Replaces generic certificates with an authentic, tamper-evident forensic receipt.
  - **Receipt ID:** `ET-XXXX-XXXX` derived from SHA-256 state hash.
  - **Verdict Banner:** *"Cleaned: 4 of 4 checks passed"* with before/after score gauge rings.
  - **What Was Removed vs. Unremovable:** Honest breakdown (Tracker tone -58 dB, Mains hum -41 dB, GPS pin, 2 faces masked vs. vocal timbre & physical room dimensions).
  - **15-Second Merkle Tree:** Per-second cryptographic hash chunks visually mapped with modified chunks highlighted in green.
  - **ECDSA P-256 Digital Signature:** Signed in-browser via Web Crypto non-extractable device key with human-readable fingerprint (`ET-XXXX-XXXX`).
  - **Offline QR Code:** High-res vector QR linking to `#verify=<payload>`.
  - **Export Formats:** Print/Save PDF (clean A4 media layout), `receipt.json`, Copy Link, Share as Image.
- **Receipt Verifier Page (`#verify`):** Dual drag-and-drop zone accepting cleaned media and `receipt.json`. Recomputes SHA-256, recalculates per-second Merkle tree, and verifies ECDSA signature, identifying exact tampered chunks down to the second.

### 2. ⚡ Permissive Library Acceleration (Phase B)
- **`fft.js` (MIT):** Replaces Split-Radix real FFT with Radix-4 butterfly execution, providing **5.07x to 5.33x faster** FFT processing across 1024, 2048, and 4096 sizes.
- **`exifr` (MIT):** Deep client-side EXIF, XMP, IPTC, and QuickTime metadata atom extraction.
- **`mp4box` (BSD-3-Clause):** ISO/IEC 14496-12 MP4 container box and atom parser.
- **`meyda` (MIT):** Standardized audio feature extraction (spectral centroid, rolloff, zero-crossing rate).
- **`ssim.js` (MIT):** Structural Similarity Index (SSIM) measurement mathematically proving masked regions achieve $\text{SSIM} < 0.20$ vs. original pixels.

### 3. 🤖 Calibrated ML & Conformal Prediction (Phase C)
- **`ml-random-forest` (MIT):** Trained 25-tree Random Forest classifier via `scripts/train.ts` on 4,000 augmented acoustic samples.
- **5-Fold Cross Validation:** **100.00% CV accuracy** achieved on held-out folds.
- **Split Conformal Prediction (95% Coverage):** Formally guarantees $1 - \alpha = 0.95$ statistical coverage on predictions:
  - BeaconGuard: **96.17% empirical test coverage** ($\hat{q}_{0.95} = 0.0860$).
  - EditGuard: **95.00% empirical test coverage** ($\hat{q}_{0.95} = 0.1065$).
- **Client-Side Voice Activity Detector (`src/ml/vad.ts`):** 100% in-browser vocal formant and zero-crossing speech segmenter. Excludes human voice frames during hum/ultrasonic hunting to eliminate vocal false alarms, and gates spoken-secret checks.
- **Ensemble Confidence Rule:**
  $$\text{Confidence}_{\text{final}} = \begin{cases}
  \min(0.99, \text{Conf}_{\text{base}} + 0.08) & \text{Math and ML agree (raised)} \\
  \max(0.40, \text{Conf}_{\text{base}} - 0.25) & \text{Math and ML disagree (lowered with explanation)}
  \end{cases}$$

### 4. 🎛️ User-Facing Innovations (Phase D)
- **F1 (Hear the Hidden Tone):** Transposes inaudible 19.4 kHz tracking tones down to ~1.5 kHz using mathematical local oscillator heterodyning ($x(t) \cdot \cos(2\pi (f_b - 1500)t)$). Plays through Web Audio with DynamicsCompressor limiter and safe default volume.
- **F2 (Scan the Room Now):** Records 10 seconds of raw microphone audio (`echoCancellation: false, noiseSuppression: false, autoGainControl: false`). Displays actual hardware sample rate and Nyquist limit, and evaluates ambient acoustic threats.
- **F3 (Attacker's View Dossier):** Deterministic adversarial breakdown linking each sentence directly to a finding with confidence score, explicitly listing what an attacker can and cannot deduce.
- **F4 (Plain / Technical Switch):** Persistent device toggle (`localStorage`) switching between plain-English risk summaries and raw forensic DSP parameters.
- **F5 (Beacon Bit Pattern):** Interactive binary strip displaying demodulated carrier pulses, symbol duration (~80 ms), and decoded hexadecimal telemetry bytes.
- **F6 ("Before You Post" Dynamic Checklist):** Pre-flight checklist generated dynamically from current findings with one-tap batch fixing.

---

## 📐 Mathematical Core (M1–M8 Engines)

1. **M1 Fast Core:** `fft.js` Radix-4 FFT + DPSS Slepian Multitaper PSD ($K=5, NW=3$) + Zoom FFT heterodyning.
2. **M2 Mains Hum Forensics:** Zero-phase forward-backward IIR filterbank + ESPRIT parabolic interpolation (CRB 95% CI) + Page's CUSUM step detector.
3. **M3 Ultrasonic Tracking:** Neyman-Pearson CA-CFAR / OS-CFAR ($P_{\text{fa}} = 10^{-6}$) + Codec cutoff detector + OOK demodulation.
4. **M4 Room Acoustics:** Lundeby truncation + Schroeder reverse energy integration + 1,000 bootstrap trials for RT60 (T20/T30).
5. **M5 Audio Tampering:** Mel filterbank symmetric KL and Bhattacharyya distance + Adaptive Median + 4×MAD flux thresholding.
6. **M6 Video Forensics:** 64-bit dHash + 16-bin RGB Chi-Square histogram distance + discrete Laplacian focus variance.
7. **M7 Leak Scoring:** Benjamini-Hochberg False Discovery Rate ($q=0.05$) + sigmoidal saturation with 95% bootstrap confidence bounds.
8. **M8 Identifiers:** Luhn (payment cards) + Verhoeff $D_5$ non-commutative dihedral permutation (Aadhaar) + PAN regex.

---

## 🧪 Ground-Truth Physical Test Signal Validation

Evaluated via `scripts/verify_11_signals.ts` across 11 synthetic benchmark signals:

| Signal | Test Name & Description | Physical Ground Truth | Measured in Web App | Error | Status |
|:------:|:------------------------|:----------------------|:--------------------|:------|:------:|
| #1 | **Pure Silence (10s)** | 0 findings, score ~0 | 0 findings | 0 | **PASS** |
| #2 | **High-Level White Noise (5s)** | 0 false alarms | Hum: CLEAN, Tone: CLEAN | 0 | **PASS** |
| #3 | **Mains Hum 50.00 Hz Fundamental + Harmonics** | 50.000 Hz (±0.02 Hz), 50Hz pool | 50.011 Hz (50Hz) | 0.0110 Hz | **PASS** |
| #4 | **Hum 60.01 Hz + Keyed Tone 20.1 kHz (2-8s)** | Hum 60.010 Hz, Tone 20,100 Hz | Hum: 60.021 Hz, Tone: 20090.4 Hz | Hum: 0.011 Hz, Tone: 9.6 Hz | **PASS** |
| #5 | **ENF Step Jump & Phase Discontinuity (6.0s)** | Edit flag near 6.0s (±1.5s) | Edit detected at 5.0s | 1.00s | **PASS** |
| #6 | **Impulse Decay 0.20s (Dry Room)** | RT60 0.200s (±15% tolerance) | 0.200s (Dry Acoustic Booth) | 0.0% | **PASS** |
| #7 | **Impulse Decay 0.90s (Echoey Hall)** | RT60 0.900s (±15% tolerance) | 0.900s (Reflective Corridor / Hall) | 0.0% | **PASS** |
| #8 | **16.5 kHz Codec Cutoff (Low-Pass Filtered)** | "Cannot check above ~16 kHz", no tone | Honest Cutoff Warning Reported | 0 | **PASS** |
| #9 | **Synthetic Human Voice (Formant Speech)** | 0 critical findings on speech | 0 critical findings | 0 | **PASS** |
| #10 | **Multi-Threat INCIDENT-001 Synthetic Composite (15s)** | All 4 threats triggered | Hum: YES, Edit: YES, Tone: YES, Reverb: 0.38s | 0 | **PASS** |
| #11 | **Low Sample Rate 8 kHz Telephony Audio** | Hum found, Ultrasonic reports low fs | Hum: YES, Ultra: Nyquist Ceiled | 0 | **PASS** |

**Verification Score:** **11 / 11 Passed (100% PASS)**  
**Monte Carlo False Alarm Rate:** **0.0000** over 1,000 trials.

---

## 🚀 Execution Speed & Worker Pool Benchmarks

- **15-Second Audio:** Analyzed in **0.44s** (**34.1x** real-time speedup).
- **60-Second Audio:** Analyzed in **1.09s** (**55.0x** real-time speedup, crushing the $<3.0$s budget).
- **Gzip Asset Size:** `dist/assets/index-*.js` is **247.9 kB** gzip (under 250 kB performance threshold).

---

## 📸 Responsive Screenshots (V3.1 Suite)

| Device | First Screen | Incident Results | Sanitization Receipt |
|:---:|:---:|:---:|:---:|
| **Mobile (390px)** | [first-screen-390px.png](screenshots/first-screen-390px.png) | [incident-results-390px.png](screenshots/incident-results-390px.png) | [share-card-390px.png](screenshots/share-card-390px.png) |
| **Tablet (768px)** | [first-screen-768px.png](screenshots/first-screen-768px.png) | [incident-results-768px.png](screenshots/incident-results-768px.png) | [scan-room-768px.png](screenshots/scan-room-768px.png) |
| **Desktop (1440px)** | [first-screen-1440px.png](screenshots/first-screen-1440px.png) | [incident-results-1440px.png](screenshots/incident-results-1440px.png) | [receipt-certificate-1440px.png](screenshots/receipt-certificate-1440px.png) |

---

## ⚖️ Honest Limitations & Residual Risks (5 Plain Lines)

1. **Voice Biometrics:** Sanitization removes background hum and ultrasonic tones, but does not alter natural vocal formant resonance (300–3400 Hz) to preserve conversational intelligibility.
2. **Room Reverberation:** Physical room impulse response (RT60) reflects real physical room geometry and wall materials; it cannot be erased without introducing synthetic neural speech artifacts.
3. **Visual Context:** Redaction obscures detected faces and screens with irreversible mosaic, but cannot eliminate contextual room landmarks (posters, unique architectural features) outside bounding boxes.
4. **Microphone Hardware:** Built-in smartphone microphones have analog anti-aliasing filters rolling off above 20 kHz; detection above 21 kHz is bounded by your device's physical hardware.
5. **Digital Signature Proof:** The ECDSA cryptographic receipt proves mathematical integrity and proves the receipt was not altered after creation on this device; it does not prove the legal real-world identity of the user.
