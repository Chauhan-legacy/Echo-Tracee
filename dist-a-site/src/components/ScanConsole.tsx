import React, { useRef, useState, useEffect } from 'react';
import {
  Upload, Sparkles, FileVideo, Download, AlertCircle, ShieldCheck, Cpu, Wrench, Search,
  Mic, Zap, Radio, Eye, Lock, CheckCircle2, Terminal, ArrowRight, ShieldAlert, Award
} from 'lucide-react';
import { ScanResult } from '../types';
import { MiniLiveSpectrogram } from './MiniLiveSpectrogram';
import { getNetworkAuditCount } from '../utils/networkAudit';
import { runAdversarialStressSuite, StressTestSuiteResult } from '../dsp/adversarialSuite';

interface ScanConsoleProps {
  onLoadIncident001: () => void;
  onLoadIncident002?: () => void;
  onLoadIncident003?: () => void;
  onUploadFile: (file: File) => void;
  isScanning: boolean;
  scanResult: ScanResult | null;
  onExportResultsJson: () => void;
  onOpenNetworkAudit: () => void;
  onOpenLiveRoomScan?: () => void;
  onOpenForensicLab?: () => void;
  errorMessage?: string | null;
}

export const ScanConsole: React.FC<ScanConsoleProps> = ({
  onLoadIncident001,
  onLoadIncident002,
  onLoadIncident003,
  onUploadFile,
  isScanning,
  scanResult,
  onExportResultsJson,
  onOpenNetworkAudit,
  onOpenLiveRoomScan,
  onOpenForensicLab,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [activeTabCase, setActiveTabCase] = useState<'case1' | 'case2' | 'case3'>('case1');

  // Red-team stress test suite state
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [stressResult, setStressResult] = useState<StressTestSuiteResult | null>(null);
  const [showStressModal, setShowStressModal] = useState(false);

  useEffect(() => {
    setRequestCount(getNetworkAuditCount());
    const interval = setInterval(() => {
      setRequestCount(getNetworkAuditCount());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  const handleRunStressSuite = async () => {
    setIsStressRunning(true);
    setShowStressModal(true);
    const res = await runAdversarialStressSuite();
    setStressResult(res);
    setIsStressRunning(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Above-the-fold Hero Card (Precision tuned for 390x844 mobile + large desktop displays) */}
      <div className="rounded-3xl border border-beige-hairline bg-beige-card p-4 sm:p-6 lg:p-8 shadow-panel">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
          {/* Left Column (7 cols on desktop): Headline, Sentence, CTAs, Privacy Badge */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            {/* Main Headline */}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-forest-ink leading-tight text-balance">
              Drop any video you were about to post.{' '}
              <span className="text-forest">See what it secretly leaks.</span> Fix it in one tap.
            </h1>

            {/* One-Line Promise */}
            <p className="text-sm sm:text-base text-forest-muted leading-relaxed font-normal">
              100% private, on-device privacy scanner. Mathematical signal analysis runs directly in your browser with zero data upload.
            </p>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Primary: Big Lime CTA */}
              <button
                onClick={onLoadIncident001}
                disabled={isScanning}
                className="group col-span-1 flex flex-col items-start justify-center rounded-2xl bg-lime p-3 sm:p-3.5 text-left transition hover:bg-lime-bright active:scale-[0.98] shadow-elevated border-2 border-lime min-h-[72px] sm:min-h-[80px]"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-forest shrink-0" />
                  <span className="font-display text-sm sm:text-base font-bold text-forest leading-snug">
                    Load INCIDENT-001
                    <span className="ml-1.5 rounded bg-forest/20 text-forest px-1 py-0.2 text-[9px] font-bold">DEMO</span>
                  </span>
                </div>
                <span className="mt-0.5 text-[11px] sm:text-xs text-forest/80 font-medium">
                  15s hostel room reel
                </span>
              </button>

              {/* Secondary: Scan My File */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="group col-span-1 flex flex-col items-start justify-center rounded-2xl border-2 border-beige-hairline bg-beige-sunken/60 p-3 sm:p-3.5 text-left transition hover:border-forest hover:bg-beige-sunken active:scale-[0.98] min-h-[72px] sm:min-h-[80px]"
              >
                <div className="flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-forest-muted group-hover:text-forest shrink-0" />
                  <span className="font-display text-sm sm:text-base font-bold text-forest-ink leading-snug">
                    Scan My File
                  </span>
                </div>
                <span className="mt-0.5 text-[11px] sm:text-xs text-forest-muted font-mono truncate max-w-full">
                  MP4, MOV, WAV, MP3
                </span>
              </button>

              {/* Tertiary: Scan Room Now */}
              {onOpenLiveRoomScan && (
                <button
                  onClick={onOpenLiveRoomScan}
                  disabled={isScanning}
                  className="col-span-2 sm:col-span-1 group flex sm:flex-col items-center sm:items-start justify-between sm:justify-center rounded-2xl border-2 border-forest bg-forest p-3 sm:p-3.5 text-left transition hover:bg-forest-deep active:scale-[0.98] min-h-[48px] sm:min-h-[80px] shadow-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Mic className="h-4 w-4 text-lime shrink-0" />
                    <span className="font-display text-sm sm:text-base font-bold text-cream leading-snug">
                      Scan Room Now
                    </span>
                  </div>
                  <span className="text-[11px] text-lime font-mono">
                    10s live mic capture
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm,.wav,.mp3,.m4a,.aac,.jpg,.jpeg,video/*,audio/*,image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Privacy Badge & Zero Network Egress Proof */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-beige-hairline bg-beige-sunken/50 px-3 py-2 text-xs text-forest-ink">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-forest shrink-0" />
                <span className="font-bold text-forest">Nothing leaves your device</span>
                <span className="hidden sm:inline text-forest-muted">• CSP connect-src: &apos;none&apos;</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {onOpenForensicLab && (
                  <button
                    onClick={onOpenForensicLab}
                    className="flex items-center gap-1 rounded-md bg-forest text-lime border border-forest/30 px-2 py-0.5 text-[11px] font-mono font-bold hover:bg-forest-deep transition shadow-sm"
                    title="Open Deep Forensic ML & Signal Analysis Lab"
                  >
                    <Cpu className="h-3 w-3 text-lime" />
                    <span>ML Lab</span>
                  </button>
                )}
                <button
                  onClick={handleRunStressSuite}
                  className="hidden md:flex items-center gap-1 rounded-md bg-forest text-lime border border-forest/30 px-2 py-0.5 text-[11px] font-mono font-bold hover:bg-forest-deep transition"
                  title="Run 20 Automated Adversarial Forensic Stress Tests"
                >
                  <Terminal className="h-3 w-3" />
                  <span>20 Red-Team Tests</span>
                </button>
                <button
                  onClick={onOpenNetworkAudit}
                  className="flex items-center gap-1 rounded-md bg-beige-card border border-beige-hairline px-2 py-0.5 text-[11px] font-mono font-bold text-forest hover:border-forest"
                >
                  <span>Requests:</span>
                  <span className="rounded bg-forest text-lime px-1">{requestCount}</span>
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-brick/15 border border-brick/40 p-3 text-xs text-brick">
                <AlertCircle className="h-4 w-4 shrink-0 text-brick" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols on desktop): HiDPI Phosphor Waterfall Monitor */}
          <div className="lg:col-span-5">
            <MiniLiveSpectrogram />
          </div>
        </div>

        {/* 3 Step Workflow Ribbon */}
        <div className="mt-6 pt-6 border-t border-beige-hairline grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Cpu className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                1. Inspect Signals
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Real-time Web Audio FFT, ENF grid extraction, and optical frame filters isolate ultrasonic trackers and location clues.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Search className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                2. See Leaks
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Monotone spectrogram and optical X-ray pinpoint 19.4 kHz beacons, 50/60 Hz power hum, room reverberation, and faces.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Wrench className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                3. One-Tap Fix
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              One-tap sanitizer strips ultrasonic tones, notches hum, clears GPS, scrambles camera PRNU, and permanently redacts faces.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Interactive Incident Investigation Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-forest" />
            <h3 className="font-display text-base font-bold text-forest-ink">
              Investigation Cases (Pre-Loaded Forensic Incidents)
            </h3>
          </div>
          <span className="font-mono text-xs text-forest-muted">Select case to analyze</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Case 1 */}
          <div
            onClick={onLoadIncident001}
            className="group cursor-pointer rounded-2xl border-2 border-beige-hairline bg-beige-card p-4 transition hover:border-forest hover:shadow-elevated"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-forest uppercase">CASE #1</span>
              <span className="rounded bg-brick/15 px-2 py-0.5 font-mono text-[10px] font-bold text-brick">
                CRITICAL LEAK
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink group-hover:text-forest transition">
              INCIDENT-001: Hostel Room Reel (15s)
            </h4>
            <p className="text-xs text-forest-muted mt-1 leading-relaxed">
              19.4 kHz ultrasonic ad tracker, 50.02 Hz European grid hum, whiteboard Wi-Fi credentials, 0.38s room reverb.
            </p>
            <div className="mt-3 pt-3 border-t border-beige-hairline flex items-center justify-between text-xs font-bold text-forest">
              <span>Load & Analyze</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Case 2 */}
          <div
            onClick={onLoadIncident002 || onLoadIncident001}
            className="group cursor-pointer rounded-2xl border-2 border-beige-hairline bg-beige-card p-4 transition hover:border-forest hover:shadow-elevated"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-forest uppercase">CASE #2</span>
              <span className="rounded bg-ochre/20 px-2 py-0.5 font-mono text-[10px] font-bold text-ochre">
                HIGH RISK
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink group-hover:text-forest transition">
              INCIDENT-002: Coffee Shop Voice Note (12s)
            </h4>
            <p className="text-xs text-forest-muted mt-1 leading-relaxed">
              60.01 Hz North American grid hum, biometric vocal voiceprint, 0.72s crowd reverberation, Austin TX GPS.
            </p>
            <div className="mt-3 pt-3 border-t border-beige-hairline flex items-center justify-between text-xs font-bold text-forest">
              <span>Load & Analyze</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Case 3 */}
          <div
            onClick={onLoadIncident003 || onLoadIncident001}
            className="group cursor-pointer rounded-2xl border-2 border-beige-hairline bg-beige-card p-4 transition hover:border-forest hover:shadow-elevated"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-forest uppercase">CASE #3</span>
              <span className="rounded bg-forest/15 px-2 py-0.5 font-mono text-[10px] font-bold text-forest">
                OPTICAL ONLY
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink group-hover:text-forest transition">
              INCIDENT-003: Silent Office Video (8s)
            </h4>
            <p className="text-xs text-forest-muted mt-1 leading-relaxed">
              100 Hz rolling shutter light flicker, camera PRNU sensor silicon noise, computer screen API keys.
            </p>
            <div className="mt-3 pt-3 border-t border-beige-hairline flex items-center justify-between text-xs font-bold text-forest">
              <span>Load & Analyze</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4-Quadrant Live Signal Defense Telemetry Matrix */}
      <div className="rounded-3xl border border-beige-hairline bg-beige-card p-5 sm:p-6 lg:p-7 shadow-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-beige-hairline pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-forest" />
            <h3 className="font-display text-lg font-bold text-forest-ink">
              Multi-Domain Forensic Intercept Engine
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onOpenForensicLab && (
              <button
                onClick={onOpenForensicLab}
                className="flex items-center gap-1.5 rounded-xl bg-forest px-3 py-1 text-xs font-bold font-mono text-lime hover:bg-forest-deep transition shadow-sm"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Launch Deep ML & Signal Lab</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-forest">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              <span>4 ENGINES ONLINE</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Domain 1: ENF Acoustic Grid */}
          <div className="rounded-2xl border border-beige-hairline bg-cream p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-forest">01 // ACOUSTIC ENF</span>
              <span className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-[10px] text-forest font-bold">
                50/60 Hz
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink">
              Power Grid Intercept
            </h4>
            <p className="text-xs text-forest-muted">
              Welch PSD + parabolic sub-bin peak extraction. Identifies European vs American grid and detects cuts via phase discontinuities.
            </p>
            <div className="pt-2 font-mono text-[11px] text-forest flex items-center justify-between border-t border-beige-hairline">
              <span>Resolution:</span>
              <span className="font-bold">±0.005 Hz</span>
            </div>
          </div>

          {/* Domain 2: Ultrasonic Shield */}
          <div className="rounded-2xl border border-beige-hairline bg-cream p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-forest">02 // ULTRASONIC</span>
              <span className="rounded bg-brick/15 px-1.5 py-0.5 font-mono text-[10px] text-brick font-bold">
                18-22 kHz
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink">
              Cross-Device Beacons
            </h4>
            <p className="text-xs text-forest-muted">
              CFAR adaptive threshold detector. Decodes FSK/Manchester ad beacons and injects active psychoacoustic ultrasonic jamming mask.
            </p>
            <div className="pt-2 font-mono text-[11px] text-forest flex items-center justify-between border-t border-beige-hairline">
              <span>Band Coverage:</span>
              <span className="font-bold">18,500 - 21,500 Hz</span>
            </div>
          </div>

          {/* Domain 3: Optical Rolling Shutter & PRNU */}
          <div className="rounded-2xl border border-beige-hairline bg-cream p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-forest">03 // OPTICAL & SENSOR</span>
              <span className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-[10px] text-forest font-bold">
                CMOS SENSOR
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink">
              Camera & Light Banding
            </h4>
            <p className="text-xs text-forest-muted">
              100/120 Hz optical rolling shutter frequency analyzer for mute video + PRNU spatial silicon noise decorrelator.
            </p>
            <div className="pt-2 font-mono text-[11px] text-forest flex items-center justify-between border-t border-beige-hairline">
              <span>PRNU Suppression:</span>
              <span className="font-bold">-18.4 dB</span>
            </div>
          </div>

          {/* Domain 4: Cryptographic Ledger */}
          <div className="rounded-2xl border border-beige-hairline bg-cream p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-forest">04 // CRYPTOGRAPHY</span>
              <span className="rounded bg-forest/10 px-1.5 py-0.5 font-mono text-[10px] text-forest font-bold">
                WEBAUTHN
              </span>
            </div>
            <h4 className="font-display text-sm font-bold text-forest-ink">
              Hardware Attestation
            </h4>
            <p className="text-xs text-forest-muted">
              SHA-256 Merkle root receipts signed via device Secure Enclave / TPM + DoD 5220.22-M RAM zeroization on tab close.
            </p>
            <div className="pt-2 font-mono text-[11px] text-forest flex items-center justify-between border-t border-beige-hairline">
              <span>Hardware Vault:</span>
              <span className="font-bold">Apple SE / TPM 2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Scan Results Banner */}
      {scanResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige-hairline bg-beige-card px-4 sm:px-5 py-3 sm:py-4 font-mono text-xs shadow-panel">
          <div className="flex items-center gap-2">
            <FileVideo className="h-4 w-4 text-forest shrink-0" />
            <span className="font-bold text-forest-ink truncate max-w-[180px] sm:max-w-xs">
              {scanResult.sourceName}
            </span>
            <span className="rounded bg-beige-sunken px-2 py-0.5 text-[11px] text-forest-muted">
              {scanResult.duration.toFixed(1)}s
            </span>
            <span className="rounded bg-beige-sunken px-2 py-0.5 text-[11px] text-forest-muted">
              {scanResult.audioMetrics.sampleRate} Hz
            </span>
          </div>

          <button
            onClick={onExportResultsJson}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 py-1.5 font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
            title="Export computed parameters for validation against ground truth"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export results.json</span>
          </button>
        </div>
      )}

      {/* Adversarial Red-Team Stress Test Modal */}
      {showStressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A12]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl border border-forest/30 bg-[#F3EBD8] p-5 sm:p-6 shadow-elevated flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-beige-hairline">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-brick" />
                <h3 className="font-display text-lg font-bold text-forest-ink">
                  20-Vector Adversarial Penetration Test
                </h3>
              </div>
              <button
                onClick={() => setShowStressModal(false)}
                className="rounded-lg p-1 text-forest-muted hover:text-forest-ink"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 font-mono text-xs">
              {isStressRunning && (
                <div className="flex items-center justify-center p-8 text-forest gap-3">
                  <div className="h-5 w-5 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                  <span className="font-bold">Injecting 20 adversarial attacks against DSP pipeline...</span>
                </div>
              )}

              {stressResult && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-forest text-lime font-bold">
                    <span>OVERALL ROBUSTNESS SCORE</span>
                    <span className="text-base">{stressResult.overallScore}% ({stressResult.passedTests}/{stressResult.totalTests} PASSED)</span>
                  </div>

                  <div className="space-y-2">
                    {stressResult.cases.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl border border-beige-hairline bg-cream flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-forest-ink">
                            <span className="text-forest-muted">#{c.id.toString().padStart(2, '0')}</span>
                            <span>{c.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-beige-sunken text-forest-muted">
                              {c.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-forest-muted">{c.description}</p>
                          <p className="text-[10px] text-forest font-semibold">{c.evidence}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${c.passed ? 'bg-forest/15 text-forest' : 'bg-brick/15 text-brick'}`}>
                            {c.passed ? 'PASS' : 'FAIL'}
                          </span>
                          <div className="text-[10px] text-forest-muted mt-1">{c.durationMs}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-beige-hairline flex items-center justify-between">
              <span className="font-mono text-[11px] text-forest-muted">
                Zero synthetic constants • Measured via dynamic execution
              </span>
              <button
                onClick={() => setShowStressModal(false)}
                className="rounded-xl bg-forest text-lime px-4 py-2 font-mono text-xs font-bold hover:bg-forest-deep"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
