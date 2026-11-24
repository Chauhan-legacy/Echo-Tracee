import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Activity,
  Cpu,
  ShieldAlert,
  FileCode2,
  FileCheck2,
  Share2,
  Search,
} from 'lucide-react';
import { ScanResult, Finding, FixReport, VisualFindingBox } from '../types';

interface AdvancedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResult | null;
  videoFrames: HTMLCanvasElement[];
  onOpenModelCard: () => void;
  onOpenBench: () => void;
  onOpenAudit: () => void;
  onOpenCommandPalette: () => void;
  children?: React.ReactNode;
}

export type AdvancedDrawerTab = 'timeline' | 'graph' | 'radar' | 'raw';

export const AdvancedDrawer: React.FC<AdvancedDrawerProps> = ({
  isOpen,
  onClose,
  scanResult,
  videoFrames,
  onOpenModelCard,
  onOpenBench,
  onOpenAudit,
  onOpenCommandPalette,
  children,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdvancedDrawerTab>('timeline');

  // Handle ESC key and browser history Back button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Push state for back button navigation
    window.history.pushState({ modal: 'advanced-drawer' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="advanced-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-deep-forest/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Backdrop overlay dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container (100dvh safe-area compliant) */}
      <div className="relative z-10 w-full max-w-2xl bg-beige-card border-l-2 border-forest shadow-2xl flex flex-col h-[100dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige-hairline px-6 py-4 bg-beige-sunken/40">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-forest" />
            <div>
              <h2 id="advanced-drawer-title" className="font-display text-lg font-bold text-forest-ink">
                Advanced Forensic Tools
              </h2>
              <p className="text-xs text-forest-muted">
                In-depth signal graphs, benchmark suites, and container disclosures
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-beige-hairline bg-beige-card text-forest-muted hover:text-forest hover:border-forest transition"
            aria-label="Close advanced drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Launch Action Strip */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-beige-hairline bg-beige-card">
          <button
            onClick={onOpenModelCard}
            className="flex items-center gap-1.5 rounded-lg border border-beige-hairline bg-beige-sunken px-3 py-1.5 text-xs font-bold text-forest hover:border-forest transition"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-forest" />
            <span>Model Card</span>
          </button>

          <button
            onClick={onOpenBench}
            className="flex items-center gap-1.5 rounded-lg border border-beige-hairline bg-beige-sunken px-3 py-1.5 text-xs font-bold text-forest hover:border-forest transition"
          >
            <Cpu className="h-3.5 w-3.5 text-forest" />
            <span>ET-Bench Suite</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 rounded-lg border border-beige-hairline bg-beige-sunken px-3 py-1.5 text-xs font-bold text-forest hover:border-forest transition"
          >
            <FileCheck2 className="h-3.5 w-3.5 text-forest" />
            <span>Self-Audit</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 rounded-lg border border-beige-hairline bg-beige-sunken px-3 py-1.5 text-xs font-bold text-forest hover:border-forest transition"
          >
            <Search className="h-3.5 w-3.5 text-forest" />
            <span>Command Palette (⌘K)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {children ? (
            children
          ) : (
            <div className="space-y-6">
              {scanResult ? (
                <>
                  <div className="rounded-2xl border border-beige-hairline bg-beige-sunken/60 p-4 space-y-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
                      Signal Analysis Parameters
                    </span>
                    <div className="font-mono text-xs text-forest-ink space-y-1">
                      <div className="flex justify-between">
                        <span className="text-forest-muted">Sample Rate:</span>
                        <span>{scanResult.audioMetrics.sampleRate} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-forest-muted">Real-Time Factor:</span>
                        <span>{scanResult.realtimeFactor}x ({scanResult.analysisTimeMs} ms)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-forest-muted">Grid Hum Family:</span>
                        <span>{scanResult.audioMetrics.humGridFamily || 'None detected'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-forest-muted">RT60 Reverberation:</span>
                        <span>{scanResult.audioMetrics.rt60EstimateSec?.toFixed(2) || 'N/A'} s</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-display text-base font-bold text-forest-ink">
                      Complete Findings List ({scanResult.findings.length})
                    </h3>
                    <div className="space-y-2">
                      {scanResult.findings.map(f => (
                        <div
                          key={f.id}
                          className="rounded-xl border border-beige-hairline bg-beige-card p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-forest-ink">{f.title}</span>
                            <span className="rounded bg-beige-sunken px-2 py-0.5 font-mono text-[10px] text-forest">
                              {Math.round(f.confidence * 100)}% conf
                            </span>
                          </div>
                          <p className="text-forest-muted">{f.plainText}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-beige-hairline p-8 text-center text-forest-muted">
                  <p>No scan loaded. Load INCIDENT-001 or scan your own file to view detailed forensic telemetry.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
