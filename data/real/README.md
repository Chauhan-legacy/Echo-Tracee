# Real-World Forensic Dataset Directory (`data/real/`)

This directory supports user-supplied real-world audio and video recordings for empirical verification in ECHO//TRACE.

## How to Add Your Own Real Recordings
1. Place your `.mp4`, `.mov`, `.wav`, or `.mp3` file into this folder (`data/real/`).
2. Add an entry to `data/real/manifest.json` specifying:
   - `id`: unique identifier (e.g. `REAL-MYROOM-01`)
   - `filename`: filename in this directory
   - `status`: `"evaluated on real data"`
   - `groundTruthFindings`: known physical properties (e.g. `detectedHumHz: 50.0`, `knownUltrasonicBeacon: false`)
   - `license`: user-specified license
3. Run `npm test` or open the browser app to ingest the real recording.

## Forensic Evaluation Status Disclosure
In adherence to the strict empirical rules of ECHO//TRACE:
- **Unit Tests (`UNIT`):** Exact mathematical identities with known mathematical closed-form answers (e.g., Parseval theorem, naive DFT vs Bluestein FFT, Kahan summation precision).
- **Simulated Tests (`SIMULATED`):** Deterministic synthetic test signals generated with known physical parameters (e.g., 19.4 kHz CA-CFAR beacons, injected phase shifts, Schroeder synthetic RIR).
- **Real-World Tests (`REAL`):** Evaluations conducted on real recordings. If a dataset was not tested locally on physical recordings, it is explicitly marked:
  > **`not evaluated on real data`**
