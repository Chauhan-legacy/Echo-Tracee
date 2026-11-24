# ECHO//TRACE — Production Deployment Checklist (Embarko V2)

This document outlines the exact, step-by-step instructions for deploying ECHO//TRACE to the Embarko platform, confirming permanent hosting, and completing post-deployment validation.

---

## 📋 Pre-Deployment Verification

Before executing any deployment commands, verify local build health:

```bash
# 1. Run strict TypeScript check and Vite production build
npm run build

# 2. Run unit and adversarial DSP tests
npm test

# 3. Run analytical SciPy validation and sensitivity test suite
cd python
python validate.py
pytest test_signals.py
cd ..
```

All commands must exit with code `0`. Static assets will be generated in `dist/` with relative base paths (`./`), zero server dependencies, and zero third-party API keys required.

---

## 🚀 Exact Steps to Deploy with Embarko

Follow these steps in your terminal or cloud console:

### Step 1: Open Project Root
Open PowerShell or your system terminal in the project directory:
```powershell
cd c:\Users\Priyansh\Desktop\NEW_PROJECTS
```

### Step 2: Trigger the Embarko Deployment
Run your designated Embarko CLI deployment command or paste the prompt into the Embarko runner:
```bash
# Typical Embarko publish command:
embarko deploy --dir dist
```
*(Or use your challenge dashboard / Git hook if deploying via GitHub repository push).*

### Step 3: THE CRITICAL STEP — "Say YES to Keep the App"
> ⚠️ **IMPORTANT: DO NOT SKIP OR CLOSE THE TERMINAL EARLY.**
> 
> By default, Embarko creates an ephemeral 24-hour sandbox URL. When the deployment finishes uploading, the Embarko CLI will display an interactive retention prompt:
> 
> ```text
> Deployment published to preview URL.
> ? Retain this deployment permanently for student challenge judging? (yes/no): 
> ```
> 
> Type **`yes`** (or **`y`**) and press **Enter**.
> 
> If you do not type YES or close the window, your app will be automatically destroyed after 24 hours and the judges will see a 404 page.

### Step 4: Record Production URLs
Copy and save the final assigned production URLs:
- **Production URL:** `https://echo-trace.embarko.app` (or your assigned subdomain)
- **Status:** Permanent Active

---

## ✅ 5-Item Post-Deployment Verification Checklist

Perform these 5 tests on a live mobile phone (iOS Safari or Android Chrome) and desktop browser:

- [ ] **Check 1: 3-Second First-Screen Hook & Privacy Proof**
  - Open the live URL.
  - Verify that the animated boot line, glowing headline (*“This 15-second reel leaked my room, my voice and a tracker”*), and the green **"Nothing leaves your device"** badge render immediately without layout shift.
  - Tap **[Prove it]** in the top navigation bar. Confirm that the runtime network log shows `0 Network Requests carrying user data`.

- [ ] **Check 2: One-Tap Ingest of INCIDENT-001**
  - Tap the large glowing button: **[Test INCIDENT-001 (15s Reel)]**.
  - Verify that the procedural generator loads in $<200$ ms, the forensic sweep animation plays smoothly, and the Leak Score computes to **82/100 (CRITICAL LEAK)**.
  - Confirm all 4 leaks are flagged: 19.4 kHz ultrasonic beacon, 50.02 Hz mains hum, QuickTime GPS location (Gujarat, India), and face/ID card.

- [ ] **Check 3: Manual Blur Box & Frame Optical X-Ray**
  - Scroll to the **Frame Optical X-Ray** card.
  - Tap **[+ Draw Blur Box]**.
  - Click and drag a rectangle over any portion of the video frame.
  - Verify that the cyan dashed outline appears and a new item labeled **`Manual Blur Area (User Defined)`** is added to the active visual boxes.

- [ ] **Check 4: Fixer Hero & Interactive Spectrogram Split-Slider**
  - Tap the bright cyan **[⚡ Fix Leaks in 1 Tap]** button (or navigate to the **Fixer Hero** tab).
  - Click **[Sanitize & Fix All Leaks]**.
  - Once sanitization finishes, drag the interactive before/after split slider back and forth. Verify the 19.4 kHz tracker beacon physically vanishes from the spectrogram.
  - Verify that the Leak Score smoothly counts down from **82** to **8/100**.

- [ ] **Check 5: Media Export & Cryptographic Proof Receipt**
  - In the Fixer tab, click **[Download Sanitized Video (WebM)]** and **[Download Clean Audio (WAV)]**.
  - Verify that the exported video is playable and contains no tracker tone or GPS metadata.
  - Scroll down to the **Cryptographic Proof Receipt** section and click **[Verify Signature In-Browser]**. Confirm that Web Crypto validates the ECDSA P-256 signature with a green badge: `ECDSA P-256 Signature VALID`.

---

## 🔒 Honesty & Limitations Disclosure for Judges

1. **Continental Grid Estimates:** Mains hum frequency analysis identifies the electrical grid family ($50\text{ Hz}$ vs $60\text{ Hz}$) and continental interconnect; it never claims to identify a specific municipal street or city.
2. **Acoustic Volume:** Schroeder decay ($RT_{60}$) classifies room reverberance as small, medium, or large; it does not report exact room volume in cubic meters.
3. **Model Disclosure:** Sound scene, frame bounding boxes, and vocal formant checks use deterministic mathematical signal/image processing labeled "Quick Scan (signal analysis)" and "Quick Scan (image analysis)"; no unverified neural network claims are made.
4. **Speech Privacy:** Without a locally loaded Whisper model, speech presence is detected via formant energy and labeled "speech detected, content not read".
5. **Compressed Codecs:** If user media cuts off high frequencies (e.g. low-bitrate MP3 or WhatsApp audio), the app states "cannot check above X kHz" rather than falsely marking the file clean.
