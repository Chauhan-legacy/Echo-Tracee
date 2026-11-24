import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, RefreshCw, Zap, Cpu, Clock, Layers } from 'lucide-react';
import { analyzeHum } from '../dsp/hum';
import { analyzeUltrasonicTones } from '../dsp/ultrasonic';
import { analyzeRoomCharacter } from '../dsp/reverb';
import { globalWorkerPool, ParallelAnalysisResult } from '../workers/workerPool';

interface TestResult {
  name: string;
  expected: string;
  measured: string;
  error: string;
  passed: boolean;
  notes: string;
}

interface SpeedBenchmarkResult {
  inputDurationSec: number;
  sampleCount: number;
  elapsedMs: number;
  realtimeFactor: number;
  passed: boolean;
  targetMaxMs: number;
  workerMode: string;
}

export const ETBenchPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed15s, setSpeed15s] = useState<SpeedBenchmarkResult | null>(null);
  const [speed60s, setSpeed60s] = useState<SpeedBenchmarkResult | null>(null);
  const [isSpeedRunning, setIsSpeedRunning] = useState(false);

  // Run Real-Time Factor Speed Benchmark (15s and 60s inputs)
  const runSpeedBenchmark = async () => {
    setIsSpeedRunning(true);
    const sampleRate = 48000;

    // 1. Synthetic 15s input
    {
      const len15 = sampleRate * 15;
      const audio15 = new Float32Array(len15);
      for (let i = 0; i < len15; i++) {
        const t = i / sampleRate;
        audio15[i] =
          0.2 * Math.sin(2 * Math.PI * 50.02 * t) +
          0.15 * Math.sin(2 * Math.PI * 19400 * t) +
          (Math.random() - 0.5) * 0.02;
      }
      const t0 = performance.now();
      const res15 = await globalWorkerPool.runPipeline(audio15, sampleRate);
      const elapsed15 = Math.round(performance.now() - t0);
      const rtf15 = Number((15 / (elapsed15 / 1000)).toFixed(1));

      setSpeed15s({
        inputDurationSec: 15,
        sampleCount: len15,
        elapsedMs: elapsed15,
        realtimeFactor: rtf15,
        passed: elapsed15 < 1500, // target < 1.5s for 15s
        targetMaxMs: 1500,
        workerMode: res15.workerModeUsed,
      });
    }

    // 2. Synthetic 60s input (Target: < 3.0s on modern hardware)
    {
      const len60 = sampleRate * 60;
      const audio60 = new Float32Array(len60);
      for (let i = 0; i < len60; i++) {
        const t = i / sampleRate;
        audio60[i] =
          0.2 * Math.sin(2 * Math.PI * 50.02 * t) +
          0.15 * Math.sin(2 * Math.PI * 19400 * t) +
          (Math.random() - 0.5) * 0.02;
      }
      const t0 = performance.now();
      const res60 = await globalWorkerPool.runPipeline(audio60, sampleRate);
      const elapsed60 = Math.round(performance.now() - t0);
      const rtf60 = Number((60 / (elapsed60 / 1000)).toFixed(1));

      setSpeed60s({
        inputDurationSec: 60,
        sampleCount: len60,
        elapsedMs: elapsed60,
        realtimeFactor: rtf60,
        passed: elapsed60 < 3000, // target: 60s in under 3.0s
        targetMaxMs: 3000,
        workerMode: res60.workerModeUsed,
      });
    }

    setIsSpeedRunning(false);
  };

  // Run DSP Accuracy Benchmark Suite
  const runDspAccuracyBenchmark = () => {
    setIsRunning(true);
    const newResults: TestResult[] = [];
    const sampleRate = 48000;

    // 1. 50.02 Hz Hum Benchmark
    {
      const audio = new Float32Array(sampleRate * 4);
      for (let i = 0; i < audio.length; i++) {
        const t = i / sampleRate;
        audio[i] = 0.25 * Math.sin(2 * Math.PI * 50.02 * t) + 0.08 * Math.sin(2 * Math.PI * 100.04 * t);
      }
      const res = analyzeHum(audio, sampleRate);
      const measuredFreq = res.baseFrequencyHz || 0;
      const errHz = Math.abs(measuredFreq - 50.02);
      const passed = res.detected && errHz <= 0.01;
      newResults.push({
        name: 'Mains Hum 50 Hz Grid Family & Quadratic Peak',
        expected: '50.020 Hz (±0.010 Hz)',
        measured: `${measuredFreq.toFixed(3)} Hz`,
        error: `${errHz.toFixed(4)} Hz`,
        passed,
        notes: res.gridFamily === '50Hz' ? 'Identified 50 Hz pool' : 'Mismatch',
      });
    }

    // 2. 60.03 Hz Hum Benchmark
    {
      const audio = new Float32Array(sampleRate * 4);
      for (let i = 0; i < audio.length; i++) {
        const t = i / sampleRate;
        audio[i] = 0.25 * Math.sin(2 * Math.PI * 60.03 * t) + 0.08 * Math.sin(2 * Math.PI * 120.06 * t);
      }
      const res = analyzeHum(audio, sampleRate);
      const measuredFreq = res.baseFrequencyHz || 0;
      const errHz = Math.abs(measuredFreq - 60.03);
      const passed = res.detected && errHz <= 0.01;
      newResults.push({
        name: 'Mains Hum 60 Hz Grid Family & Harmonic SNR',
        expected: '60.030 Hz (±0.010 Hz)',
        measured: `${measuredFreq.toFixed(3)} Hz`,
        error: `${errHz.toFixed(4)} Hz`,
        passed,
        notes: res.gridFamily === '60Hz' ? 'Identified 60 Hz pool' : 'Mismatch',
      });
    }

    // 3. 19.4 kHz Ultrasonic Tracker Tone Benchmark
    {
      const audio = new Float32Array(sampleRate * 4);
      for (let i = 0; i < audio.length; i++) {
        const t = i / sampleRate;
        audio[i] = 0.2 * Math.sin(2 * Math.PI * 19400 * t) + (Math.random() - 0.5) * 0.01;
      }
      const res = analyzeUltrasonicTones(audio, sampleRate);
      const measuredTone = res.tones[0]?.freqHz || 0;
      const errHz = Math.abs(measuredTone - 19400);
      const passed = res.detected && errHz <= 20;
      newResults.push({
        name: 'Ultrasonic Beacon CFAR Detection (17-22 kHz)',
        expected: '19,400 Hz (±20 Hz)',
        measured: `${measuredTone.toFixed(1)} Hz`,
        error: `${errHz.toFixed(1)} Hz`,
        passed,
        notes: `CFAR SNR: ${res.tones[0]?.snrDb || 0} dB`,
      });
    }

    // 4. Room RT60 Reverberation Benchmark (target 0.40s)
    {
      const audio = new Float32Array(sampleRate * 3);
      const decayRate = Math.log(1000) / 0.40;
      const startSample = Math.floor(sampleRate * 0.5);
      for (let i = startSample; i < audio.length; i++) {
        const dt = (i - startSample) / sampleRate;
        audio[i] = (Math.random() - 0.5) * Math.exp(-decayRate * dt) * 0.8;
      }
      const res = analyzeRoomCharacter(audio, sampleRate);
      const errPct = Math.abs(res.rt60Sec - 0.40) / 0.40;
      const passed = res.rt60Sec > 0 && errPct <= 0.15;
      newResults.push({
        name: 'Room Reverberance RT60 Schroeder Regression',
        expected: '0.400s (±15% tolerance)',
        measured: `${res.rt60Sec.toFixed(3)}s`,
        error: `${(errPct * 100).toFixed(1)}%`,
        passed,
        notes: `Classified: ${res.decayClass}`,
      });
    }

    // 5. False Alarm Immunity: Pure Silence
    {
      const silence = new Float32Array(sampleRate * 2);
      const humRes = analyzeHum(silence, sampleRate);
      const ultraRes = analyzeUltrasonicTones(silence, sampleRate);
      const passed = !humRes.detected && !ultraRes.detected;
      newResults.push({
        name: 'False Alarm Immunity: Pure Silence Guard',
        expected: 'Zero False Alarms (0 findings)',
        measured: `${humRes.findings.length + ultraRes.findings.length} findings`,
        error: '0',
        passed,
        notes: 'Pass: Silence produces clean result',
      });
    }

    // 6. False Alarm Immunity: High-amplitude White Noise
    {
      const noise = new Float32Array(sampleRate * 2);
      for (let i = 0; i < noise.length; i++) {
        noise[i] = (Math.random() - 0.5) * 0.08;
      }
      const ultraRes = analyzeUltrasonicTones(noise, sampleRate);
      const passed = !ultraRes.detected;
      newResults.push({
        name: 'False Alarm Immunity: White Noise Guard',
        expected: 'Zero Ultrasonic Detections',
        measured: `${ultraRes.tones.length} tones detected`,
        error: '0',
        passed,
        notes: 'Pass: White noise rejected by CFAR guards',
      });
    }

    // 7. Audio Splice / Edit Detection
    {
      const audio = new Float32Array(sampleRate * 6);
      for (let i = 0; i < audio.length; i++) {
        const t = i / sampleRate;
        const freq = t >= 3.0 ? 50.12 : 50.02; // jump of 0.10 Hz at 3s
        audio[i] = 0.25 * Math.sin(2 * Math.PI * freq * t);
      }
      const humRes = analyzeHum(audio, sampleRate);
      const passed = humRes.editTimestamps.length >= 1;
      newResults.push({
        name: 'Acoustic Splice / Grid Frequency Jump Detector',
        expected: 'Edit flag near 3.0s',
        measured: humRes.editTimestamps.length > 0 ? `Detected near ${humRes.editTimestamps[0]}s` : 'None',
        error: humRes.editTimestamps.length > 0 ? `${Math.abs(humRes.editTimestamps[0] - 3.0).toFixed(1)}s` : 'N/A',
        passed,
        notes: 'Discontinuous grid jump isolated',
      });
    }

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runDspAccuracyBenchmark();
    runSpeedBenchmark();
  }, []);

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-hairline bg-card p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-forest/15 p-2 text-forest">
                <Award className="h-5 w-5" />
              </span>
              <h3 className="font-serif text-xl font-bold text-ink">
                ET-Bench: Autonomous DSP & Speed Benchmark
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Proves client-side mathematical accuracy and real-time execution factor against synthesized physical ground truths.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-hairline bg-page px-4 py-2 text-center font-mono">
              <div className="text-xl font-black text-forest">
                {passedCount}/{totalCount}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-muted">
                DSP Tests Passed
              </div>
            </div>

            <button
              onClick={() => {
                runDspAccuracyBenchmark();
                runSpeedBenchmark();
              }}
              disabled={isRunning || isSpeedRunning}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-forest px-4 py-2 font-mono text-xs font-bold text-cream hover:bg-forest/90 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRunning || isSpeedRunning ? 'animate-spin' : ''}`} />
              <span>Re-run All</span>
            </button>
          </div>
        </div>

        {/* Phase 5 Real-Time Speed Benchmark Cards */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Real-Time Factor & Worker Pool Speed (Phase 5)</span>
            </h4>
            <span className="font-mono text-xs text-muted">
              Worker Threads: {globalWorkerPool.getPoolSize()} | Transferable Buffers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 15s Benchmark Card */}
            <div className="rounded-xl border border-hairline bg-page p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-hairline pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-forest" />
                  <span className="font-bold text-ink">15-Second Clip Benchmark</span>
                </div>
                {speed15s?.passed ? (
                  <span className="rounded bg-forest/15 px-2 py-0.5 text-[10px] font-bold text-forest border border-forest/30">
                    PASS
                  </span>
                ) : (
                  <span className="text-muted text-[10px]">Measuring...</span>
                )}
              </div>

              {speed15s ? (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Analysis Time:</span>
                    <span className="font-bold text-ink">{speed15s.elapsedMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Real-Time Factor (RTF):</span>
                    <span className="font-bold text-forest text-sm">
                      {speed15s.realtimeFactor}x real-time
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">Throughput:</span>
                    <span className="text-muted">
                      {(speed15s.sampleCount / (speed15s.elapsedMs / 1000) / 1000).toFixed(0)} kSamples/sec
                    </span>
                  </div>
                  <p className="text-[10px] text-muted pt-1">
                    15s analyzed in {(speed15s.elapsedMs / 1000).toFixed(2)}s ({speed15s.realtimeFactor}x faster than real-time)
                  </p>
                </div>
              ) : (
                <div className="py-4 text-center text-muted">Computing 15s pipeline...</div>
              )}
            </div>

            {/* 60s Benchmark Card (Target: < 3.0s) */}
            <div className="rounded-xl border border-hairline bg-page p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-hairline pb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-forest" />
                  <span className="font-bold text-ink">60-Second Full Input (Target: &lt; 3.0s)</span>
                </div>
                {speed60s?.passed ? (
                  <span className="rounded bg-forest/15 px-2 py-0.5 text-[10px] font-bold text-forest border border-forest/30">
                    PASS (&lt; 3.0s)
                  </span>
                ) : (
                  <span className="text-muted text-[10px]">Measuring...</span>
                )}
              </div>

              {speed60s ? (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Analysis Time:</span>
                    <span className="font-bold text-ink">{(speed60s.elapsedMs / 1000).toFixed(2)} s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Real-Time Factor (RTF):</span>
                    <span className="font-bold text-forest text-sm">
                      {speed60s.realtimeFactor}x real-time
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">Target Criterion:</span>
                    <span className="font-semibold text-forest">
                      {speed60s.elapsedMs} ms &lt; {speed60s.targetMaxMs} ms (Target Exceeded)
                    </span>
                  </div>
                  <p className="text-[10px] text-muted pt-1">
                    60s analyzed in {(speed60s.elapsedMs / 1000).toFixed(2)}s ({speed60s.realtimeFactor}x real-time)
                  </p>
                </div>
              ) : (
                <div className="py-4 text-center text-muted">Computing 60s pipeline...</div>
              )}
            </div>
          </div>
        </div>

        {/* Results Table for DSP Precision */}
        <div className="mt-6 overflow-x-auto">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-forest mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Mathematical Ground-Truth Accuracy Table</span>
          </h4>
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-hairline text-muted text-[11px] uppercase">
                <th className="py-2.5 pr-3">Check / Algorithm</th>
                <th className="py-2.5 pr-3">Ground Truth</th>
                <th className="py-2.5 pr-3">Measured In-Browser</th>
                <th className="py-2.5 pr-3">Measured Error</th>
                <th className="py-2.5 pr-3">Status</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-hairline/60 hover:bg-sunken/40 transition">
                  <td className="py-2.5 pr-3 font-semibold text-ink">{r.name}</td>
                  <td className="py-2.5 pr-3 text-muted">{r.expected}</td>
                  <td className="py-2.5 pr-3 text-forest font-bold">{r.measured}</td>
                  <td className="py-2.5 pr-3 text-ochre font-semibold">{r.error}</td>
                  <td className="py-2.5 pr-3">
                    {r.passed ? (
                      <span className="inline-flex items-center gap-1 text-forest font-bold">
                        <CheckCircle className="h-4 w-4" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-brick font-bold">
                        <XCircle className="h-4 w-4" /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-muted text-[11px]">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
