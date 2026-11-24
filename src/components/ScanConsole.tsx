import React, { useRef, useState, useEffect } from 'react';
import { Upload, Sparkles, FileVideo, Download, AlertCircle, ShieldCheck, Cpu, Wrench, Search, Mic } from 'lucide-react';
import { ScanResult } from '../types';
import { MiniLiveSpectrogram } from './MiniLiveSpectrogram';
import { getNetworkAuditCount } from '../utils/networkAudit';

interface ScanConsoleProps {
  onLoadIncident001: () => void;
  onUploadFile: (file: File) => void;
  isScanning: boolean;
  scanResult: ScanResult | null;
  onExportResultsJson: () => void;
  onOpenNetworkAudit: () => void;
  onOpenLiveRoomScan?: () => void;
  errorMessage?: string | null;
}

export const ScanConsole: React.FC<ScanConsoleProps> = ({
  onLoadIncident001,
  onUploadFile,
  isScanning,
  scanResult,
  onExportResultsJson,
  onOpenNetworkAudit,
  onOpenLiveRoomScan,
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
      {/* Above-the-fold Hero Card (strictly tuned for 390x844 mobile viewport) */}
      <div className="rounded-3xl border border-beige-hairline bg-beige-card p-4 sm:p-6 lg:p-8 shadow-panel">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
          {/* Left Column (7 cols on desktop): Headline, Sentence, CTAs, Privacy Badge */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            {/* Main Headline (One headline) */}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-forest-ink leading-tight text-balance">
              Drop any video you were about to post.{' '}
              <span className="text-forest">See what it secretly leaks.</span> Fix it in one tap.
            </h1>

            {/* One-Line Promise (One sentence) */}
            <p className="text-sm sm:text-base text-forest-muted leading-relaxed font-normal">
              100% private, on-device privacy scanner. Mathematical signal analysis runs directly in your browser with zero data upload.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Primary: Big Lime CTA with Forest Text (Touch target >= 48px) */}
              <button
                onClick={onLoadIncident001}
                disabled={isScanning}
                className="group col-span-1 flex flex-col items-start justify-center rounded-2xl bg-lime p-3 sm:p-3.5 text-left transition hover:bg-lime-bright active:scale-[0.98] shadow-elevated border-2 border-lime min-h-[72px] sm:min-h-[80px]"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-forest shrink-0" />
                  <span className="font-display text-sm sm:text-base font-bold text-forest leading-snug">
                    Load INCIDENT-001
                  </span>
                </div>
                <span className="mt-0.5 text-[11px] sm:text-xs text-forest/80 font-medium">
                  15-second hostel reel
                </span>
              </button>

              {/* Secondary: Scan My Own File (Touch target >= 48px) */}
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

            {/* Privacy Badge */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-beige-hairline bg-beige-sunken/50 px-3 py-2 text-xs text-forest-ink">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-forest shrink-0" />
                <span className="font-bold text-forest">Nothing leaves your device</span>
                <span className="hidden sm:inline text-forest-muted">• Zero server uploads</span>
              </div>
              <button
                onClick={onOpenNetworkAudit}
                className="flex items-center gap-1 rounded-md bg-beige-card border border-beige-hairline px-2 py-0.5 text-[11px] font-mono font-bold text-forest hover:border-forest"
              >
                <span>Requests:</span>
                <span className="rounded bg-forest text-lime px-1">{requestCount}</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-brick/15 border border-brick/40 p-3 text-xs text-brick">
                <AlertCircle className="h-4 w-4 shrink-0 text-brick" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Right Column (5 cols on desktop): Muted Looping Mini-Spectrogram */}
          <div className="lg:col-span-5">
            <MiniLiveSpectrogram />
          </div>
        </div>

        {/* 3 Step Cards (visible on scroll or desktop) */}
        <div className="mt-6 pt-6 border-t border-beige-hairline grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Cpu className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                1. Scan
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Real-time Web Audio FFT and frame filters isolate ultrasonic trackers and location clues.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Search className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                2. See
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              Monotone spectrogram and optical X-ray pinpoint 19.4 kHz beacons, 50 Hz power hum, and faces.
            </p>
          </div>

          <div className="rounded-2xl border border-beige-hairline bg-cream/90 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5 text-forest">
              <Wrench className="h-4 w-4 text-forest" />
              <h4 className="font-display text-sm sm:text-base font-bold text-forest-ink">
                3. Fix
              </h4>
            </div>
            <p className="text-xs text-forest-muted leading-relaxed">
              One-tap sanitizer strips ultrasonic tones, notches hum, clears GPS, and permanently blurs faces.
            </p>
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
    </div>
  );
};
