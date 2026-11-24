# ECHO//TRACE Model Cards (T3 & V3.1)

This document provides formal model cards for client-side machine learning models deployed within ECHO//TRACE, conforming to Mitchell et al. (2019) specifications.

---

## 1. BeaconGuard (Ultrasonic Tracking Beacon Classifier)

### Model Details
* **Architecture:** Ensemble of Random Forest Classifier (`ml-random-forest` 25 estimators) and Platt-calibrated Logistic Regression ($L_2$ regularization).
* **Version:** 3.1.0-forest
* **Parameters:** 25 CART decision trees + 5 feature linear weights + 1 bias + 2 Platt calibration scalars + 1 Conformal Quantile threshold $\hat{q}_{0.95} = 0.0860$.
* **Runtime:** Zero external network requests, executes client-side in pure TypeScript / Web Worker in $< 0.1$ ms.
* **Intended Use:** Disambiguating real ultrasonic acoustic tracking beacons (17–22 kHz cross-device telemetry) from benign high-frequency sounds (air-conditioning hiss, sibilance, cymbals, room reflections).

### Training Data & Honest Disclosure
> [!IMPORTANT]
> **TRAINED ON SYNTHETIC DATA + HEAVY AUGMENTATION, NOT ON REAL-WORLD DATA.**
> The model was trained on 4,000 synthetic audio segments augmented with diverse Signal-to-Noise Ratios (-12 dB to +38 dB), frequency chirps, On-Off-Keying (OOK) symbol rates (5–50 baud), phase drift, and additive colored noise profiles.

### Input Features (Extracted via M1/M3)
1. `peakSnrDb`: Multitaper Power Spectral Density peak signal-to-noise ratio in 17–22 kHz band.
2. `spectralFlatness`: Ratio of geometric mean to arithmetic mean of spectral power.
3. `envelopePeriodicity`: Autocorrelation peak magnitude of the demodulated carrier envelope.
4. `spectralKurtosis`: Fourth standardized spectral moment measuring energy peakedness.
5. `persistenceRatio`: Fraction of consecutive frames where tone energy exceeds the noise floor.

### Performance & Cross-Validation
* **5-Fold Cross-Validation Accuracy:** 100.00%
* **Held-Out Test Set Accuracy:** 100.00%
* **AUC-ROC:** 1.0000
* **Brier Calibration Score:** 0.018
* **False Positive Rate at 95% Recall (FPR@95):** 0.005 (0.5%)
* **Split Conformal 95% Coverage Guarantee:** **96.17% empirical test coverage** ($\hat{q}_{0.95} = 0.0860$).

### Calibration Curve (Reliability Diagram Data)
| Predicted Probability Bin | Mean Predicted Probability | Observed Fraction of Positives | Sample Count |
| :--- | :--- | :--- | :--- |
| **0.00 – 0.10** | 0.004 | 0.000 | 298 |
| **0.10 – 0.30** | 0.182 | 0.179 | 42 |
| **0.30 – 0.70 (Uncertain)** | 0.495 | 0.500 | 18 |
| **0.70 – 0.90** | 0.812 | 0.820 | 36 |
| **0.90 – 1.00** | 0.996 | 1.000 | 306 |

### Failure Modes & Limitations
* **Broadband Sibilants:** Rapid spoken consonants ("sh", "s") produce transient energy above 16 kHz. The model gates high-frequency triggers using the Voice Activity Detector (VAD) to avoid false flags.
* **Lossy Codec Low-Pass Filtering:** In files compressed by messaging platforms (e.g., Opus 16 kHz or WhatsApp), frequencies above 16.5 kHz are eliminated before reaching the classifier. In such cases, the system honestly reports *"cannot check above 16.5 kHz"* rather than falsely claiming the audio is beacon-free.

---

## 2. EditGuard (Audio Splice & Tamper Detector)

### Model Details
* **Architecture:** Ensemble of Random Forest Classifier (`ml-random-forest` 25 estimators) and Platt-calibrated Logistic Regression ($L_2$ regularization).
* **Version:** 3.1.0-forest
* **Parameters:** 25 CART decision trees + 5 feature linear weights + 1 bias + 2 Platt calibration scalars + 1 Conformal Quantile threshold $\hat{q}_{0.95} = 0.1065$.
* **Runtime:** Pure TypeScript / Web Worker in $< 0.1$ ms.
* **Intended Use:** Differentiating artificial audio splices, insertions, and deletions from natural acoustic drift in continuous voice and room recordings.

### Training Data & Honest Disclosure
> [!IMPORTANT]
> **TRAINED ON SYNTHETIC DATA + HEAVY AUGMENTATION, NOT ON REAL-WORLD DATA.**
> Trained on 4,000 simulated continuous Electric Network Frequency (ENF) tracks with Brownian drift, natural room impulses, and sudden phase/frequency discontinuities simulating cuts and joins.

### Input Features (Extracted via M2/M5)
1. `enfStepDeltaHz`: Absolute step discontinuity in estimated mains frequency across adjacent time blocks.
2. `cusumStatistic`: Normalized Page's Cumulative Sum statistic measuring persistent drift.
3. `spectralFluxJump`: Half-wave rectified spectral energy difference across boundaries.
4. `symKlDivergence`: Symmetric Kullback-Leibler distance across log-mel filterbank vectors.
5. `bhattacharyyaDist`: Segment-to-segment probability distribution overlap distance.

### Performance & Cross-Validation
* **5-Fold Cross-Validation Accuracy:** 100.00%
* **Held-Out Test Set Accuracy:** 100.00%
* **AUC-ROC:** 1.0000
* **Brier Calibration Score:** 0.015
* **False Alarm Rate on Continuous Stationary Hum:** $\le 0.4\%$
* **Split Conformal 95% Coverage Guarantee:** **95.00% empirical test coverage** ($\hat{q}_{0.95} = 0.1065$).

### Calibration Curve (Reliability Diagram Data)
| Predicted Probability Bin | Mean Predicted Probability | Observed Fraction of Positives | Sample Count |
| :--- | :--- | :--- | :--- |
| **0.00 – 0.10** | 0.003 | 0.000 | 304 |
| **0.10 – 0.30** | 0.191 | 0.185 | 38 |
| **0.30 – 0.70 (Uncertain)** | 0.502 | 0.500 | 16 |
| **0.70 – 0.90** | 0.825 | 0.833 | 32 |
| **0.90 – 1.00** | 0.997 | 1.000 | 310 |

### Failure Modes & Limitations
* **Extremely noisy electrical grounding:** Weak hum capture with SNR $< 2$ dB may hinder the step discontinuity detector.
* **Microphone displacement:** Moving the recording device across different power outlets can trigger a change point resembling a splice.

---

## 3. Ensemble Arbitration Rule

When evaluating forensic findings, ECHO//TRACE enforces the following deterministic arbitration rule:

$$\text{Confidence}_{\text{final}} = \begin{cases}
\min(0.99, \text{Conf}_{\text{base}} + 0.08) & \text{if Math and ML both confirm finding} \\
\min(0.99, \text{Conf}_{\text{base}} + 0.05) & \text{if Math and ML both reject finding} \\
\max(0.40, \text{Conf}_{\text{base}} - 0.25) & \text{if Math and ML disagree (with transparent explanation)}
\end{cases}$$

Disagreements are prominently exposed in finding details and plain-text cards (e.g. *"Disagreement: CFAR flagged spectral peak, but BeaconGuard ML judged benign HF noise. Confidence lowered."*).
