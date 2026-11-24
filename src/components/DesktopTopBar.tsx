import React from 'react';
import { Shield, ShieldCheck, Video, Command, Search, Sparkles, HardDrive, Mic, Sliders, Layers } from 'lucide-react';
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
  onOpenAdvancedDrawer?: () => void;
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
  onOpenAdvancedDrawer,
}) => {
  const duration = scanResult ? `${scanResult.duration.toFixed(1)}s` : '15.0s';
  const shaPrefix = scanResult ? scanResult.sha256.slice(0, 8) : 'e3b0c442';
  const fileName = scanResult ? scanResult.sourceName : 'INCIDENT-001.mp4';
  const analysisTime = scanResult?.analysisTimeMs ? `${scanResult.analysisTimeMs}ms` : '182ms';
  const rtf = scanResult?.realtimeFactor ? `${scanResult.realtimeFactor.toFixed(2)}x` : '0.012x';

  return (
    <header className="sticky top-0 z-30 border-b border-beige-hairline bg-beige-card/95 backdrop-blur-md px-3 sm:px-6 py-1.5 sm:py-2">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-2 sm:gap-4">
        {/* Left: Logo & Case Metadata */}
        <div className="flex items-center gap-3 sm:gap-4">
          <WaveformLogo isScanning={isScanning} />

          {/* Slim Case Info pill on desktop */}
          <div className="hidden xl:flex items-center gap-2 rounded-xl border border-beige-hairline bg-beige-sunken/60 px-3 py-1 font-mono text-xs text-forest-ink">
            <span className="font-bold text-forest">CASE:</span>
            <span className="font-semibold">{scanResult?.isDemo ? 'INCIDENT-001' : 'INSPECT-01'}</span>
            {scanResult?.isDemo && (
              <span className="rounded bg-ochre/20 text-ochre px-1.5 py-0.5 text-[10px] font-bold">
                DEMO DATA
              </span>
            )}
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

        {/* Right Controls: View Mode, Advanced Drawer, Prove it, Search */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Plain / Technical Switch (F4) */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="hidden md:flex items-center gap-1 rounded-xl border border-beige-hairline bg-cream px-2.5 py-1 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
              title="Toggle between Plain Language and Technical Forensic metrics"
            >
              <Sliders className="h-3.5 w-3.5 text-forest" />
              <span className="uppercase text-[11px] font-mono">
                {viewMode === 'plain' ? 'Plain' : 'Tech'}
              </span>
            </button>
          )}

          {/* Advanced Drawer Trigger */}
          {onOpenAdvancedDrawer && (
            <button
              onClick={onOpenAdvancedDrawer}
              className="flex min-h-[36px] items-center gap-1 rounded-xl border border-beige-hairline bg-cream px-2 sm:px-3 py-1 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
              title="Open Advanced Forensic Drawer (Deep timeline, graphs, models)"
            >
              <Layers className="h-3.5 w-3.5 text-forest" />
              <span className="hidden sm:inline">Advanced</span>
            </button>
          )}

          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex min-h-[36px] items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-2.5 sm:px-3 py-1 text-xs font-mono text-forest-ink hover:bg-beige-sunken transition shadow-sm"
            title="Open command palette (Ctrl/Cmd+K)"
          >
            <Search className="h-3.5 w-3.5 text-forest-muted" />
            <kbd className="rounded border border-beige-hairline bg-beige-sunken px-1.5 py-0.5 text-[10px] font-bold text-forest">
              ⌘K
            </kbd>
          </button>

          {/* Prove Zero Leaks Button */}
          <button
            onClick={onOpenNetworkAudit}
            className="flex min-h-[36px] items-center gap-1 rounded-xl bg-forest px-2.5 sm:px-3 py-1 text-xs font-bold text-lime hover:bg-forest-deep transition shadow-sm"
            title="Inspect runtime network requests (proves zero user data transmitted)"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Prove Zero Leaks</span>
            <span className="sm:hidden text-[11px]">Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
