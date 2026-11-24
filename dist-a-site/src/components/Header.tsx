import React from 'react';
import { Shield, Sparkles, Play, Video, ShieldCheck, HelpCircle } from 'lucide-react';
import { WaveformLogo } from './WaveformLogo';
import { ActiveTab } from './BottomTabBar';
import { APP_COPY } from '../constants/copy';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onStartTour: () => void;
  isScanning?: boolean;
  onOpenNetworkAudit: () => void;
  isRecordingMode: boolean;
  onToggleRecordingMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onStartTour,
  isScanning = false,
  onOpenNetworkAudit,
  isRecordingMode,
  onToggleRecordingMode,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-term-border bg-[#080B11]/90 backdrop-blur-md">
      {/* Top Banner: Privacy Proof badge, Prove it button, Boot Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-term-border/50 bg-term-card/60 px-4 py-1.5 text-[11px] font-mono text-term-dim">
        <div className="flex items-center gap-1.5 text-cyan">
          <span className="h-2 w-2 rounded-full bg-cyan animate-ping" />
          <span className="font-semibold">{APP_COPY.header.bootLine}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            <span className="font-medium">Nothing leaves your device</span>
          </div>

          {/* "Prove it" Button (Requirement D.10) */}
          <button
            onClick={onOpenNetworkAudit}
            className="flex min-h-[44px] items-center gap-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-950/70 transition"
            title="Inspect runtime network calls"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Prove it</span>
          </button>

          {/* Recording Mode Toggle (Requirement C.9) */}
          <button
            onClick={onToggleRecordingMode}
            className={`flex min-h-[44px] items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-bold transition ${
              isRecordingMode
                ? 'bg-[#FF3366] text-white border border-[#FF3366] shadow-glow-red animate-pulse'
                : 'bg-term-hover text-term-dim border border-term-border hover:text-white'
            }`}
            title="Enlarge text and hide cursor for screen recording"
          >
            <Video className="h-3.5 w-3.5" />
            <span>{isRecordingMode ? 'REC ON' : 'REC MODE'}</span>
          </button>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <WaveformLogo isScanning={isScanning} />
        </div>

        {/* Desktop Navigation Links (Hidden on phones, visible at md: 768px+) */}
        <div className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <button
            onClick={() => onSelectTab('scan')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'scan' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Scan Console
          </button>
          <button
            onClick={() => onSelectTab('findings')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'findings' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Findings
          </button>
          <button
            onClick={() => onSelectTab('fix')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'fix' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Fixer Hero
          </button>
          <button
            onClick={() => onSelectTab('timeline')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'timeline' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => onSelectTab('evidence')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'evidence' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Evidence Graph
          </button>
          <button
            onClick={() => onSelectTab('bench')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'bench' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            ET-Bench
          </button>
          <button
            onClick={() => onSelectTab('audit')}
            className={`min-h-[44px] rounded-xl px-3.5 py-2 transition ${
              activeTab === 'audit' ? 'bg-cyan/15 text-cyan font-bold border border-cyan/40' : 'text-term-dim hover:text-white'
            }`}
          >
            Self-Audit
          </button>
        </div>

        {/* Guided Auto-Tour CTA Button */}
        <button
          onClick={onStartTour}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-cyan bg-cyan/15 px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan shadow-glow-cyan hover:bg-cyan/25 active:scale-95"
        >
          <Play className="h-3.5 w-3.5 fill-cyan" />
          <span>{APP_COPY.tour.button}</span>
        </button>
      </div>
    </header>
  );
};
