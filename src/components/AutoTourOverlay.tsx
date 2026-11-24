import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, X, Sparkles, ExternalLink, QrCode } from 'lucide-react';
import { SITE_URL, APP_CONFIG } from '../config';

interface AutoTourOverlayProps {
  isActive: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'scan' | 'findings' | 'fix' | 'share') => void;
  onTriggerFix: () => void;
  onTriggerShare: () => void;
}

const CINEMATIC_TOUR_STEPS = [
  {
    step: 1,
    title: 'THE 3-SECOND HOOK',
    tab: 'scan' as const,
    caption: '“This 15-second reel leaked my room, my voice and a tracker.” Drop any video you were about to post. See what it secretly leaks.',
    durationMs: 8000,
  },
  {
    step: 2,
    title: '100% ON-DEVICE PRIVACY X-RAY',
    tab: 'scan' as const,
    caption: 'ECHO//TRACE is a client-side privacy scanner. Mathematical signal processing runs directly in your browser with zero data upload.',
    durationMs: 8000,
  },
  {
    step: 3,
    title: 'ZERO-UPLOAD INGESTION',
    tab: 'scan' as const,
    caption: 'Ingesting INCIDENT-001. Computing Web Crypto SHA-256 fingerprint, parsing container atoms, and extracting 48 kHz uncompressed audio.',
    durationMs: 8000,
  },
  {
    step: 4,
    title: 'REAL-TIME SPECTRAL SWEEP',
    tab: 'scan' as const,
    caption: 'Watch the spectral sweep: Real-time FFT, Cell-Averaging CFAR tone detector, and quadratic peak interpolation running on actual samples.',
    durationMs: 8000,
  },
  {
    step: 5,
    title: 'FORENSIC LEAKS IDENTIFIED',
    tab: 'scan' as const,
    caption: 'Multiple leaks exposed: 50.02 Hz electrical grid hum, inaudible 19.4 kHz tracking beacon, and embedded Gujarat GPS coordinates.',
    durationMs: 9000,
  },
  {
    step: 6,
    title: 'ONE-TAP SANITIZATION',
    tab: 'fix' as const,
    caption: 'One tap cleans everything: Zero-phase notch filters strip the tracker, facial blur masks identities, and GPS container atoms are wiped.',
    durationMs: 9000,
    action: 'fix',
  },
  {
    step: 7,
    title: 'BEFORE / AFTER VERIFICATION',
    tab: 'fix' as const,
    caption: 'Drag the split-slider! Watch the 19.4 kHz tracker spike physically vanish! Leak score drops from 82 to 8, signed with Web Crypto ECDSA.',
    durationMs: 9000,
  },
  {
    step: 8,
    title: 'DEPLOY WITH EMBARKO',
    tab: 'share' as const,
    caption: 'Ready for the Embarko Student Challenge. 100% client-side privacy protection. Live on Embarko.',
    durationMs: 9000,
    action: 'share',
    isEndCard: true,
  },
];

export const AutoTourOverlay: React.FC<AutoTourOverlayProps> = ({
  isActive,
  onClose,
  onNavigateTab,
  onTriggerFix,
  onTriggerShare,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setStepIndex(0);
      return;
    }

    const current = CINEMATIC_TOUR_STEPS[stepIndex];
    onNavigateTab(current.tab);

    if (current.action === 'fix') {
      setTimeout(() => onTriggerFix(), 1000);
    } else if (current.action === 'share') {
      setTimeout(() => onTriggerShare(), 1500);
    }

    if (isPaused) return;

    const timer = setTimeout(() => {
      if (stepIndex < CINEMATIC_TOUR_STEPS.length - 1) {
        setStepIndex(s => s + 1);
      } else {
        onClose();
      }
    }, current.durationMs);

    return () => clearTimeout(timer);
  }, [isActive, stepIndex, isPaused, onClose, onNavigateTab, onTriggerFix, onTriggerShare]);

  if (!isActive) return null;

  const current = CINEMATIC_TOUR_STEPS[stepIndex];

  return (
    <div className="fixed bottom-20 sm:bottom-12 left-3 right-3 z-50 mx-auto max-w-2xl animate-in slide-in-from-bottom duration-300">
      <div className="rounded-3xl border-2 border-forest bg-[#0B281B]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-forest/50">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-lime">
              <Sparkles className="h-4 w-4 animate-spin" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-lime">
              {current.title}
            </span>
            <span className="rounded bg-forest/80 px-2 py-0.5 font-mono text-[10px] font-bold text-cream">
              {stepIndex + 1} / {CINEMATIC_TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/40 text-cream hover:text-lime transition"
              title={isPaused ? 'Resume tour' : 'Pause tour'}
              aria-label={isPaused ? 'Resume tour' : 'Pause tour'}
            >
              {isPaused ? <Play className="h-4 w-4 fill-lime text-lime" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                if (stepIndex < CINEMATIC_TOUR_STEPS.length - 1) setStepIndex(s => s + 1);
                else onClose();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/40 text-cream hover:text-lime transition"
              title="Next step"
              aria-label="Next step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/40 text-cream hover:text-lime transition"
              title="Close tour"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Large Cinematic Subtitles */}
        <p className="font-display text-base sm:text-xl font-bold text-cream leading-relaxed tracking-wide">
          {current.caption}
        </p>

        {/* Step 8 End Card Banner */}
        {current.isEndCard && (
          <div className="mt-4 rounded-2xl border border-lime/40 bg-forest/50 p-4 flex flex-wrap items-center justify-between gap-3 animate-in zoom-in-95">
            <div>
              <p className="font-display text-base font-bold text-lime">
                Built with AI. Live on Embarko.
              </p>
              <p className="font-mono text-xs text-cream/90 mt-0.5">
                {SITE_URL} • {APP_CONFIG.hashtag}
              </p>
            </div>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-lime px-3.5 py-2 font-display text-xs font-bold text-forest hover:bg-lime-bright transition shadow-sm"
            >
              <span>Visit Site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Progress Bar (68s total duration) */}
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-2 flex-1 rounded-full bg-forest overflow-hidden">
            <div
              className="h-full bg-lime transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / CINEMATIC_TOUR_STEPS.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-cream/80 font-bold">
            ~68s Auto-Tour
          </span>
        </div>
      </div>
    </div>
  );
};
