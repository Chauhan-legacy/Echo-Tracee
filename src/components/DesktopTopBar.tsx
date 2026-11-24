/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Upload, Download, Layers, Menu, CheckCircle2, Loader2, Circle } from 'lucide-react';
import { WaveformLogo } from './WaveformLogo';
import { ScanResult } from '../types';

interface DesktopTopBarProps {
  scanResult: ScanResult | null;
  isScanning: boolean;
  onOpenUpload?: () => void;
  onOpenExport?: () => void;
  onOpenAdvancedDrawer?: () => void;
  onOpenMenu?: () => void;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  scanResult,
  isScanning,
  onOpenUpload,
  onOpenExport,
  onOpenAdvancedDrawer,
  onOpenMenu,
}) => {
  // Case name
  const caseName = scanResult
    ? scanResult.sourceName
    : 'No Case Loaded';

  // Status Chip
  let statusChip: { text: string; bg: string; textCol: string; icon: React.ReactNode };
  if (isScanning) {
    statusChip = {
      text: 'Analysing',
      bg: 'bg-forest/20 border-forest/40',
      textCol: 'text-forest',
      icon: <Loader2 className="h-3 w-3 animate-spin text-forest" />,
    };
  } else if (scanResult) {
    statusChip = {
      text: 'Done',
      bg: 'bg-lime/20 border-lime/40',
      textCol: 'text-forest-ink',
      icon: <CheckCircle2 className="h-3 w-3 text-forest" />,
    };
  } else {
    statusChip = {
      text: 'Idle',
      bg: 'bg-beige-sunken/60 border-beige-hairline',
      textCol: 'text-forest-muted',
      icon: <Circle className="h-2.5 w-2.5 fill-forest-muted/40 text-forest-muted" />,
    };
  }

  return (
    <header className="sticky top-0 z-30 h-12 md:h-14 border-b border-beige-hairline bg-beige-card/95 backdrop-blur-md px-3 sm:px-6 select-none shrink-0">
      <div className="mx-auto flex h-full max-w-[1560px] items-center justify-between gap-3">
        {/* Left: Logo as a single flex item, never wrapped or clipped */}
        <div className="flex items-center shrink-0 whitespace-nowrap">
          <WaveformLogo isScanning={isScanning} />
        </div>

        {/* Middle: Case name with ellipsis and status chip (Hidden on very small screens < 640px) */}
        <div className="hidden sm:flex items-center gap-2 min-w-0 max-w-[420px] px-2">
          <span
            className="truncate font-mono text-xs font-semibold text-forest-ink"
            title={caseName}
          >
            {caseName}
          </span>
          {scanResult?.isDemo && (
            <span className="shrink-0 rounded bg-ochre/15 border border-ochre/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-ochre uppercase">
              DEMO DATA
            </span>
          )}
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold ${statusChip.bg} ${statusChip.textCol}`}
          >
            {statusChip.icon}
            <span>{statusChip.text}</span>
          </div>
        </div>

        {/* Right Desktop: Exactly 3 visible buttons (Upload, Export, Advanced) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* 1. Upload */}
          <button
            onClick={onOpenUpload}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
            title="Upload audio or video file"
          >
            <Upload className="h-3.5 w-3.5 text-forest" />
            <span>Upload</span>
          </button>

          {/* 2. Export */}
          <button
            onClick={onOpenExport}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-beige-hairline bg-cream px-3 text-xs font-bold text-forest hover:bg-beige-sunken transition shadow-sm"
            title="Export sanitized file & cryptographic receipt"
          >
            <Download className="h-3.5 w-3.5 text-forest" />
            <span>Export</span>
          </button>

          {/* 3. Advanced Drawer Trigger */}
          <button
            onClick={onOpenAdvancedDrawer}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-forest px-3.5 text-xs font-bold text-lime hover:bg-forest-deep transition shadow-sm"
            title="Open Advanced Drawer (Deep timeline, ML model cards, self-audit, network proofs)"
          >
            <Layers className="h-3.5 w-3.5 text-lime" />
            <span>Advanced</span>
          </button>
        </div>

        {/* Right Mobile (< 768px): Single Menu Button */}
        <div className="flex md:hidden items-center shrink-0">
          <button
            onClick={onOpenAdvancedDrawer || onOpenMenu}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-beige-hairline bg-cream text-forest hover:bg-beige-sunken transition shadow-sm"
            aria-label="Open navigation menu and advanced drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
