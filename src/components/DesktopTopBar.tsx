import React from 'react';
import { Shield, ShieldCheck, Video, Command, Search, Sparkles, HardDrive, Mic, Sliders } from 'lucide-react';
import { WaveformLogo } from './WaveformLogo';
import { ScanResult } from '../types';

interface DesktopTopBarProps {
  scanResult: ScanResult | null;
  isScanning: boolean;
  onOpenNetworkAudit: () => void;
  onOpenModelCard: () => void;
  isRecordingMode: boolean;
  onToggleRecordingMode: () => void;
  onOpenCommandPalette: () => void;
  viewMode?: 'plain' | 'technical';
  onToggleViewMode?: () => void;
  onOpenLiveRoomScan?: () => void;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  scanResult,
  isScanning,
  onOpenNetworkAudit,
  onOpenModelCard,
  isRecordingMode,
  onToggleRecordingMode,
  onOpenCommandPalette,
  viewMode = 'plain',
  onToggleViewMode,
  onOpenLiveRoomScan,
}) => {
  const duration = scanResult ? `${scanResult.duration.toFixed(1)}s` : '15.0s';
  const shaPrefix = scanResult ? scanResult.sha256.slice(0, 8) : 'e3b0c442';
  const fileName = scanResult ? scanResult.sourceName : 'INCIDENT-001.mp4';
  const analysisTime = scanResult?.analysisTimeMs ? `${scanResult.analysisTimeMs}ms` : '182ms';
  const rtf = scanResult?.realtimeFactor ? `${scanResult.realtimeFactor.toFixed(2)}x` : '0.012x';

  return (
    <header className="sticky top-0 z-30 border-b border-beige-hairline bg-beige-card/95 backdrop-blur-md px-4 sm:px-6 py-2">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4">
        {/* Left: Logo & Case Metadata */}
        <div className="flex items-center gap-4">
          <WaveformLogo isScanning={isScanning} />

          {/* Slim Case Info pill on desktop */}
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-beige-hairline bg-beige-sunken/60 px-3 py-1 font-mono text-xs text-forest-ink">
            <span className="font-bold text-forest">CASE:</span>
            <span className="font-semibold">{scanResult?.isDemo ? 'INCIDENT-001' : 'INSPECT-01'}</span>
            <span className="text-forest-muted">|</span>
            <span className="text-forest-muted truncate max-w-[140px]">{fileName}</span>
            <span className="text-forest-muted">|</span>
            <span className="text-forest-muted">SHA:</span>
            <span className="font-bold text-forest">{shaPrefix}...</span>
            <span className="text-forest-muted">|</span>
            <span className="text-forest-muted">{duration}</span>
            <span className="text-forest-muted">|</span>
            <span className="text-forest-muted">TIME: {analysisTime}</span>
            <span className="text-forest-muted">|</span>
            <span className="rounded bg-forest/20 px-1 text-[11px] font-bold text-forest">RTF: {rtf}</span>
          </div>
        </div>

        {/* Right Controls: View Mode, Live Mic, Command Palette, Privacy Badge */}
        <div className="flex items-center gap-2">
          {/* Plain / Technical Switch (F4) */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="flex items-center gap-1 rounded-xl border border-beige-hairline bg-cream px-2.5 py-1 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
              title="Toggle between Plain Language and Technical Forensic metrics"
            >
              <Sliders className="h-3.5 w-3.5 text-forest" />
              <span className="uppercase text-[11px] font-mono">
                {viewMode === 'plain' ? 'Mode: Plain' : 'Mode: Tech'}
              </span>
            </button>
          )}

          {/* Live Mic Scan Trigger (F2) */}
          {onOpenLiveRoomScan && (
            <button
              onClick={onOpenLiveRoomScan}
              className="flex items-center gap-1.5 rounded-xl border border-forest/30 bg-[#174D35] px-3 py-1 text-xs font-bold text-[#8BCF55] hover:bg-[#0B281B] transition shadow-sm"
              title="Record 10 seconds of raw microphone audio to check your room"
            >
              <Mic className="h-3.5 w-3.5 text-[#8BCF55]" />
              <span className="hidden md:inline">Scan Room</span>
            </button>
          )}

          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 py-1.5 text-xs font-mono text-forest-ink hover:bg-beige-sunken transition shadow-sm"
            title="Open command palette (Ctrl/Cmd+K)"
          >
            <Search className="h-3.5 w-3.5 text-forest-muted" />
            <span className="hidden sm:inline font-sans text-forest-muted">Search / Cmd</span>
            <kbd className="rounded border border-beige-hairline bg-beige-sunken px-1.5 py-0.5 text-[10px] font-bold text-forest">
              ⌘K
            </kbd>
          </button>

          {/* Privacy Proof badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-forest/10 border border-forest/20 px-3 py-1 text-xs font-semibold text-forest">
            <Shield className="h-3.5 w-3.5 text-forest" />
            <span>Nothing leaves your device</span>
          </div>

          {/* Prove it Button */}
          <button
            onClick={onOpenNetworkAudit}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-forest px-3 py-1 text-xs font-bold text-lime hover:bg-forest-deep transition shadow-sm"
            title="Inspect runtime network requests (proves zero user data transmitted)"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Prove it</span>
          </button>

          {/* Model Card Link Button */}
          <button
            onClick={onOpenModelCard}
            className="hidden sm:flex min-h-[38px] items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 py-1 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
            title="View ML Model Cards, metrics, and honest disclosures"
          >
            <span>Model Cards</span>
          </button>

          {/* Recording Mode Toggle */}
          <button
            onClick={onToggleRecordingMode}
            className={`flex min-h-[38px] items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
              isRecordingMode
                ? 'bg-brick text-cream border border-brick shadow-sm animate-pulse'
                : 'bg-beige-sunken text-forest-muted border border-beige-hairline hover:text-forest-ink'
            }`}
            title="Enlarge text and hide cursor for recording clean videos"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRecordingMode ? 'REC ON' : 'REC'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
