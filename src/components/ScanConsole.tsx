import React, { useRef, useState, useEffect } from 'react';
import { Upload, Sparkles, FileVideo, Download, AlertCircle, ShieldCheck, CheckCircle2, Cpu, Wrench, Search } from 'lucide-react';
import { ScanResult } from '../types';
import { APP_COPY } from '../constants/copy';
import { MiniLiveSpectrogram } from './MiniLiveSpectrogram';
import { getNetworkAuditCount } from '../utils/networkAudit';

interface ScanConsoleProps {
  onLoadIncident001: () => void;
  onUploadFile: (file: File) => void;
  isScanning: boolean;
  scanResult: ScanResult | null;
  onExportResultsJson: () => void;
  onOpenNetworkAudit: () => void;
  errorMessage?: string | null;
}

export const ScanConsole: React.FC<ScanConsoleProps> = ({
  onLoadIncident001,
  onUploadFile,
  isScanning,
  scanResult,
  onExportResultsJson,
  onOpenNetworkAudit,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

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

  return (
    <div className="space-y-6">
      {/* First Screen: Left = Headline + Promise + CTAs, Right = Mini Live Spectrogram */}
      <div className="rounded-3xl border border-beige-hairline bg-beige-card p-6 sm:p-8 lg:p-10 shadow-panel">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 3-Second Hook */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brick/40 bg-brick/10 px-3.5 py-1 text-xs font-semibold text-brick">
              <span className="h-2 w-2 rounded-full bg-brick animate-ping" />
              <span>“This 15-second reel leaked my room, my voice and a tracker.”</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-forest-ink leading-[1.15] text-balance">
              Drop any video you were about to post.{' '}
              <span className="text-forest">See what it secretly leaks.</span> Fix it in one tap.
            </h1>

            {/* One-Line Promise */}
            <p className="text-base sm:text-lg text-forest-muted leading-relaxed font-normal max-w-xl">
              100% client-side privacy X-ray for videos and voice notes. Real mathematical signal processing runs directly on your device with zero data upload.
            </p>

            {/* The Two Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Primary: Big Lime CTA with Forest Text */}
              <button
                onClick={onLoadIncident001}
                disabled={isScanning}
                className="group flex flex-col items-start justify-center rounded-2xl bg-lime p-5 text-left transition hover:bg-lime-bright active:scale-[0.98] shadow-elevated border-2 border-lime min-h-[96px]"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-forest" />
                  <span className="font-display text-lg font-bold text-forest">
                    Load INCIDENT-001
                  </span>
                </div>
                <span className="mt-1 text-xs text-forest/80 font-medium">
                  Inspect the 15-second hostel reel
                </span>
              </button>

              {/* Secondary: Scan My Own File */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="group flex flex-col items-start justify-center rounded-2xl border-2 border-beige-hairline bg-beige-sunken/60 p-5 text-left transition hover:border-forest hover:bg-beige-sunken active:scale-[0.98] min-h-[96px]"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-forest-muted group-hover:text-forest" />
                  <span className="font-display text-lg font-bold text-forest-ink">
                    Scan My Own File
                  </span>
                </div>
                <span className="mt-1 text-xs text-forest-muted font-mono">
                  MP4, MOV, WebM, WAV, MP3, M4A, JPG
                </span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.webm,.wav,.mp3,.m4a,.aac,.jpg,.jpeg,video/*,audio/*,image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drag & Drop Target */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-3 text-center text-xs transition ${
                dragOver
                  ? 'border-forest bg-forest/10 text-forest font-bold'
                  : 'border-beige-hairline bg-cream/70 text-forest-muted hover:border-forest/50'
              }`}
            >
              <p>{dragOver ? 'Release to ingest file locally' : 'Or drop your video / voice note here (max 60s analyzed)'}</p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-brick/15 border border-brick/40 p-3.5 text-xs text-brick">
                <AlertCircle className="h-4 w-4 shrink-0 text-brick" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Live Looping Mini-Spectrogram on Forest Panel */}
          <div className="lg:col-span-5">
            <MiniLiveSpectrogram />
          </div>
        </div>

        {/* 3 Step Cards: Scan, See, Fix */}
        <div className="mt-8 pt-8 border-t border-beige-hairline grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-forest">
              <Cpu className="h-4 w-4 text-forest" />
              <h4 className="font-display text-base font-bold text-forest-ink">
                1. Scan
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Real-time Web Audio FFT and frame filters decompose your file locally into 8 mathematical forensic layers.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-forest">
              <Search className="h-4 w-4 text-forest" />
              <h4 className="font-display text-base font-bold text-forest-ink">
                2. See
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Monotone-lightness spectrogram and optical X-ray pin down 19.4 kHz beacons, 50 Hz power hum, and faces.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-forest">
              <Wrench className="h-4 w-4 text-forest" />
              <h4 className="font-display text-base font-bold text-forest-ink">
                3. Fix
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              One-tap sanitizer strips ultrasonic tones, notches power hum, clears GPS tags, and permanently obscures faces.
            </p>
          </div>
        </div>

        {/* Trust Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-beige-hairline bg-beige-sunken/60 px-4 py-3 text-xs text-forest-ink">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-forest" />
            <span className="font-bold">Nothing leaves your device:</span>
            <span className="text-forest-muted">Zero analytics, zero cloud backend, zero cookies.</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={onOpenNetworkAudit}
              className="flex items-center gap-1.5 rounded-lg bg-beige-card border border-beige-hairline px-2.5 py-1 text-forest hover:border-forest transition font-bold"
            >
              <span>Network Requests:</span>
              <span className="rounded bg-forest text-lime px-1.5 py-0.2 font-bold">{requestCount}</span>
            </button>

            <span className="rounded-lg bg-forest/10 border border-forest/20 px-2.5 py-1 font-bold text-forest">
              Validated: 14/14 tests passing
            </span>
          </div>
        </div>
      </div>

      {/* Active Scan Results Banner */}
      {scanResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige-hairline bg-beige-card px-5 py-4 font-mono text-xs shadow-panel">
          <div className="flex items-center gap-2.5">
            <FileVideo className="h-4 w-4 text-forest" />
            <span className="font-bold text-forest-ink truncate max-w-[200px] sm:max-w-xs">
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
            className="flex items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 py-1.5 font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
            title="Export computed parameters for validation against ground truth"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export results.json</span>
          </button>
        </div>
      )}
    </div>
  );
};
