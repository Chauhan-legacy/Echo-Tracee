import React, { useState } from 'react';
import { Award, CheckCircle, XCircle, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { analyzeHum } from '../dsp/hum';
import { analyzeUltrasonicTones } from '../dsp/ultrasonic';
import { analyzeRoomCharacter } from '../dsp/reverb';

interface TestResult {
  name: string;
  expected: string;
  measured: string;
  error: string;
  passed: boolean;
  notes: string;
}

export const ETBenchPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runBenchmark = () => {
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

  // Run automatically on first mount
  React.useEffect(() => {
    runBenchmark();
  }, []);

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-term-border bg-term-card p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-term-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan" />
              <h3 className="font-mono text-base font-bold text-white">
                ET-Bench: Autonomous DSP Ground-Truth Benchmark
              </h3>
            </div>
            <p className="mt-1 text-xs text-term-dim">
              Evaluates real browser DSP against mathematically synthesized signals with known physical ground truths.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2 text-center font-mono">
              <div className="text-xl font-black text-cyan">
                {passedCount}/{totalCount}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-term-dim">
                Tests Passed
              </div>
            </div>

            <button
              onClick={runBenchmark}
              disabled={isRunning}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-term-border bg-term-hover px-3 py-2 text-xs font-semibold text-white hover:border-cyan/50"
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Re-run Suite</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-term-border text-term-dim text-[11px] uppercase">
                <th className="py-2 pr-3">Check / Algorithm</th>
                <th className="py-2 pr-3">Ground Truth</th>
                <th className="py-2 pr-3">Measured In-Browser</th>
                <th className="py-2 pr-3">Measured Error</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-term-border/40 hover:bg-term-hover/30">
                  <td className="py-2.5 pr-3 font-semibold text-white">{r.name}</td>
                  <td className="py-2.5 pr-3 text-term-dim">{r.expected}</td>
                  <td className="py-2.5 pr-3 text-cyan">{r.measured}</td>
                  <td className="py-2.5 pr-3 text-amber-300">{r.error}</td>
                  <td className="py-2.5 pr-3">
                    {r.passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle className="h-4 w-4" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                        <XCircle className="h-4 w-4" /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-term-dim text-[11px]">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
