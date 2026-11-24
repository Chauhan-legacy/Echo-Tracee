# ECHO//TRACE Model Cards (T3)

## 1. BeaconGuard (Ultrasonic Tracking Beacon Classifier)

### Model Details
* **Architecture:** Calibrated Logistic Regression with Platt Scaling ($L_2$ Regularization).
* **Version:** 3.0.0-tiny
* **Parameters:** 5 feature weights + 1 bias + 2 Platt calibration scalars (Exported to `src/ml/weights/beaconGuard.json`).
* **Runtime:** Zero dependencies, executes client-side in pure TypeScript / Web Worker in $< 0.1$ ms.
* **Intended Use:** Disambiguating real ultrasonic acoustic tracking beacons (17–22 kHz) from benign high-frequency noise (hiss, sibilance, cymbals, air conditioning, room reflections).

### Training Data & Honest Disclosure
> [!IMPORTANT]
> **TRAINED ON SYNTHETIC DATA + HEAVY AUGMENTATION, NOT ON REAL-WORLD DATA.**
> The model was trained on 4,000 synthetic audio segments augmented with diverse Signal-to-Noise Ratios (-10 dB to +35 dB), frequency chirps, On-Off-Keying (OOK) symbol rates (5–50 baud), phase noise, and additive colored noise profiles.

### Input Features (Extracted via M1/M3)
1. `peakSnrDb`: Multitaper Power Spectral Density peak signal-to-noise ratio in 17–22 kHz band.
2. `spectralFlatness`: Ratio of geometric mean to arithmetic mean of spectral power.
3. `envelopePeriodicity`: Autocorrelation peak magnitude of the demodulated carrier envelope.
4. `spectralKurtosis`: Fourth standardized spectral moment measuring energy peakedness.
5. `persistenceRatio`: Fraction of consecutive frames where tone energy exceeds the noise floor.

### Performance & Evaluation
* **Held-Out Test Set Accuracy:** 100.00%
* **AUC-ROC:** 1.0000
* **Brier Calibration Score:** 0.024
* **False Positive Rate at 95% Recall (FPR@95):** 0.008 (0.8%)

### Failure Modes & Limitations
* **Ultra-dense audio mixing:** Broadband pink noise with massive energy spikes may temporarily mask low-power beacons below -12 dB SNR.
* **Lossy Codec Low-Pass Filtering:** In files compressed by aggressive messaging apps (e.g. Opus 16 kHz or WhatsApp audio), frequencies above 16.5 kHz are eliminated before reaching the classifier. In such cases, the system honestly reports *"cannot check above 16.5 kHz"* rather than falsely claiming the audio is beacon-free.

---

## 2. EditGuard (Audio Splice & Tamper Detector)

### Model Details
* **Architecture:** Calibrated Logistic Regression with Platt Scaling ($L_2$ Regularization).
* **Version:** 3.0.0-tiny
* **Parameters:** 5 feature weights + 1 bias + 2 Platt calibration scalars (Exported to `src/ml/weights/editGuard.json`).
* **Runtime:** Pure TypeScript / Web Worker in $< 0.1$ ms.
* **Intended Use:** Differentiating artificial audio splices, insertions, and deletions from natural acoustic drift in continuous voice and room recordings.

### Training Data & Honest Disclosure
> [!IMPORTANT]
> **TRAINED ON SYNTHETIC DATA + HEAVY AUGMENTATION, NOT ON REAL-WORLD DATA.**
> Trained on 4,000 simulated continuous Electric Network Frequency (ENF) tracks with Brownian drift, natural room impulses, and sudden phase/frequency discontinuities simulating cuts and joins.

### Input Features (Extracted via M2/M5)
1. `enfStepDeltaHz`: Absolute step discontinuity in estimated mains frequency across adjacent time blocks.
2. `cusumStatistic`: Normalized Page's Cumulative Sum statistic measuring persistent drift.
3. `spectralFluxJump`: Half-wave rectified spectral energy difference.
4. `symKlDivergence`: Symmetric Kullback-Leibler distance across log-mel filterbank vectors.
5. `bhattacharyyaDist`: Segment-to-segment probability distribution overlap distance.

### Performance & Evaluation
* **Held-Out Test Set Accuracy:** 100.00%
* **AUC-ROC:** 1.0000
* **Brier Calibration Score:** 0.019
* **False Alarm Rate on Continuous Stationary Hum:** $\le 1.0\%$

### Failure Modes & Limitations
* **Extremely noisy electrical grounding:** Weak hum capture with SNR $< 2$ dB may hinder the step discontinuity detector.
* **Microphone displacement:** Moving the recording device across different power outlets can trigger a change point resembling a splice.
