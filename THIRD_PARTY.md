# Third-Party Notices & Scientific Citations

No third-party code was copied or bundled without explicit permissive licensing.
All core mathematical algorithms in `echotrace-math` and `ECHO//TRACE` were implemented from scratch in pure TypeScript according to published peer-reviewed mathematical literature.

---

## 1. Scientific Literature & Algorithm Origins

1. **Bluestein's Chirp-Z Transform (Arbitrary Length FFT):**
   - *Reference:* L. I. Bluestein, "A linear filtering approach to the computation of discrete Fourier transform", *IEEE Transactions on Audio and Electroacoustics*, vol. 18, no. 4, pp. 451-455, Dec. 1970.
   - *Usage:* Evaluates non-power-of-two FFTs via cyclic convolution with power-of-two FFTs.

2. **Electric Network Frequency (ENF) Forensics:**
   - *Reference:* C. Grigoras, "Digital Audio Recording Analysis: The Electric Network Frequency (ENF) Criterion", *International Journal of Speech, Language and the Law*, vol. 12, no. 1, pp. 63-76, 2005.
   - *Usage:* Mains hum grid harmonic extraction and timestamp authentication.

3. **Photo-Response Non-Uniformity (PRNU) Camera Sensor Fingerprinting:**
   - *Reference:* J. Lukas, J. Fridrich, and M. Goljan, "Digital camera identification from sensor pattern noise", *IEEE Transactions on Information Forensics and Security*, vol. 1, no. 2, pp. 205-214, June 2006.
   - *Usage:* Sensor silicon wafer noise extraction and Peak-to-Correlation Energy (PCE) matching.

4. **Remote Photoplethysmography (CHROM & POS):**
   - *Reference:* G. de Haan and V. Jeanne, "Robust pulse rate from chrominance-based rPPG", *IEEE Transactions on Biomedical Engineering*, vol. 60, no. 10, pp. 2878-2886, Oct. 2013.
   - *Reference:* W. Wang et al., "Algorithmic Principles of Remote PPG", *IEEE Transactions on Biomedical Engineering*, vol. 64, no. 7, pp. 1479-1491, July 2017.
   - *Usage:* Facial hemodynamics cardiac pulse tracking and anti-rPPG micro-dithering.

5. **Schroeder Acoustic Reverberation ($RT_{60}$):**
   - *Reference:* M. R. Schroeder, "New method of measuring reverberation time", *Journal of the Acoustical Society of America*, vol. 37, no. 3, pp. 409-412, 1965.
   - *Reference:* A. Lundeby et al., "Uncertainties of Measurements in Room Acoustics", *Applied Acoustics*, vol. 45, no. 4, pp. 281-296, 1995.
   - *Usage:* Backward energy decay integration and automated background noise truncation.

6. **Attention with Linear Biases (ALiBi):**
   - *Reference:* O. Press, N. A. Smith, and M. Lewis, "Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation", *ICLR*, 2022.
   - *Usage:* Positional encoding in temporal forensic attention networks.

7. **Kahan Compensated Summation:**
   - *Reference:* W. Kahan, "Pracniques: Further remarks on reducing truncation errors", *Communications of the ACM*, vol. 8, no. 1, p. 40, 1965.
   - *Usage:* High-precision floating-point accumulation.

---

## 2. Permissive Open-Source Dependencies (Site Only)

The following permissive dependencies are utilized exclusively within the application UI runtime:

| Package | Version | License | Upstream URL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `react` / `react-dom` | `19.3.1` | MIT | https://react.dev/ | UI Component Rendering |
| `lucide-react` | `1.78.0` | ISC | https://lucide.dev/ | UI Vector Icons |
| `qrcode` | `1.5.4` | MIT | https://github.com/soldair/node-qrcode | Cryptographic Receipt QR Rendering |
| `@noble/hashes` | `2.4.0` | MIT | https://github.com/paulmillr/noble-hashes | Browser SHA-256 Digest |
| `@fontsource/fraunces` | `5.3.0` | OFL-1.1 | https://fontsource.org/fonts/fraunces | Local Display Typography |
| `@fontsource-variable/inter` | `5.3.0` | OFL-1.1 | https://fontsource.org/fonts/inter | Local UI Typography |
| `@fontsource/jetbrains-mono`| `5.3.0` | OFL-1.1 | https://fontsource.org/fonts/jetbrains-mono | Local Monospace Typography |
