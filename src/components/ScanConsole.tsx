import React, { useRef, useState } from 'react';
import { Upload, Sparkles, FileVideo, Download, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { ScanResult } from '../types';
import { APP_COPY } from '../constants/copy';

interface ScanConsoleProps {
  onLoadIncident001: () => void;
  onUploadFile: (file: File) => void;
  isScanning: boolean;
  scanResult: ScanResult | null;
  onExportResultsJson: () => void;
  errorMessage?: string | null;
}

export const ScanConsole: React.FC<ScanConsoleProps> = ({
  onLoadIncident001,
  onUploadFile,
  isScanning,
  scanResult,
  onExportResultsJson,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
      {/* Hero Ingest Deck */}
      <div className="rounded-2xl border border-white/5 bg-[#0D121F] p-6 sm:p-8 shadow-xl">
        <div className="text-center max-w-2xl mx-auto mb-6">
          {/* Requirement C.6: Cinematic 3-Second One-Line Hook */}
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-semibold text-red-300 mb-3">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
            <span>“This 15-second reel leaked my room, my voice and a tracker.”</span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Drop any video you were about to post.{' '}
            <span className="text-cyan">See what it secretly leaks.</span> Fix it in one tap.
          </h2>
          <p className="mt-3 text-[15px] text-white/70 leading-relaxed">
            100% client-side privacy X-ray for videos and voice notes. Real acoustic DSP and visual detectors run directly on your phone.
          </p>
        </div>

        {/* The Two Big Buttons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
          {/* Button 1: Load INCIDENT-001 */}
          <button
            onClick={onLoadIncident001}
            disabled={isScanning}
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-cyan bg-cyan/10 p-5 text-center transition hover:bg-cyan/20 active:scale-95 shadow-glow-cyan disabled:opacity-50 min-h-[100px]"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan animate-pulse" />
              <span className="font-display text-base font-bold text-white group-hover:text-cyan">
                {APP_COPY.hero.loadIncident001}
              </span>
            </div>
            <span className="mt-1 text-xs text-white/70">
              {APP_COPY.hero.loadIncident001Subtitle}
            </span>
          </button>

          {/* Button 2: Upload Own File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="group flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition hover:border-cyan/50 hover:bg-white/10 active:scale-95 min-h-[100px]"
          >
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-term-dim group-hover:text-white" />
              <span className="font-display text-base font-bold text-white">
                {APP_COPY.hero.useOwnFile}
              </span>
            </div>
            <span className="mt-1 text-xs text-term-dim">
              Accepts MP4, MOV, WebM, WAV, MP3, M4A, JPG
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

        {/* Drag & drop target with visual feedback */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mt-6 rounded-xl border-2 border-dashed p-4 text-center text-xs transition max-w-2xl mx-auto ${
            dragOver
              ? 'border-cyan bg-cyan/10 text-cyan'
              : 'border-term-border/80 bg-term-bg/50 text-term-dim hover:border-cyan/40'
          }`}
        >
          <p>{dragOver ? 'Release to ingest file locally' : APP_COPY.hero.sizeLimitNotice}</p>
        </div>

        {/* Error / Warning Alert Banner */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-950/30 border border-red-500/40 p-3 text-xs text-red-300 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Active Scan Results Banner */}
      {scanResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-term-border bg-term-card px-4 py-3 font-mono text-xs shadow-md">
          <div className="flex items-center gap-2">
            <FileVideo className="h-4 w-4 text-cyan" />
            <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {scanResult.sourceName}
            </span>
            <span className="rounded bg-term-hover px-1.5 py-0.5 text-[10px] text-term-dim">
              {scanResult.duration.toFixed(1)}s
            </span>
            {scanResult.isDemo && (
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] text-amber-300 font-bold">
                DEMO CLIP
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportResultsJson}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-cyan hover:bg-cyan/20"
              title="Export results.json to feed local python validate.py"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export results.json</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
