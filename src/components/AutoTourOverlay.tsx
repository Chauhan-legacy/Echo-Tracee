import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, X, Sparkles, Video } from 'lucide-react';

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
    caption: '“This 15-second reel leaked my room, my voice, and a tracker.” Drop any video you were about to post. See what it secretly leaks.',
    durationMs: 8000,
  },
  {
    step: 2,
    title: 'WHAT IT IS: PRIVACY X-RAY',
    tab: 'scan' as const,
    caption: 'ECHO//TRACE is a 100% client-side privacy X-ray for videos and voice notes. Real mathematical DSP and computer vision running directly inside your browser.',
    durationMs: 8000,
  },
  {
    step: 3,
    title: 'ZERO-UPLOAD INGESTION',
    tab: 'scan' as const,
    caption: 'Ingesting INCIDENT-001: The Hostel Reel. Computing Web Crypto SHA-256 fingerprint, parsing container atoms, and extracting 48 kHz uncompressed audio.',
    durationMs: 8000,
  },
  {
    step: 4,
    title: 'REAL DSP SPECTRAL SWEEP',
    tab: 'scan' as const,
    caption: 'Watch the cyan sweep: Real-time Cooley-Tukey STFT, Cell-Averaging CFAR tone detector, and quadratic peak interpolation running on actual samples.',
    durationMs: 8000,
  },
  {
    step: 5,
    title: 'FORENSIC FINDINGS LOCKED',
    tab: 'findings' as const,
    caption: 'Multiple leaks exposed: 50.02 Hz electrical grid hum, inaudible 19.4 kHz tracking beacon, whiteboard Wi-Fi credentials, and embedded Gujarat GPS coordinates.',
    durationMs: 9500,
  },
  {
    step: 6,
    title: 'HERO FIXER: ONE-TAP SANITIZATION',
    tab: 'fix' as const,
    caption: 'Hero moment: Surgical biquad notch filters strip the tracker (-28 dB), canvas pixelation blurs passwords, and container GPS atoms are completely wiped.',
    durationMs: 9000,
    action: 'fix',
  },
  {
    step: 7,
    title: 'BEFORE / AFTER VERIFICATION',
    tab: 'fix' as const,
    caption: 'Drag the split-slider! Watch the 19.4 kHz tracker spike physically vanish! Leak score drops from 82 to 8, signed with Web Crypto ECDSA.',
    durationMs: 8500,
  },
  {
    step: 8,
    title: 'SHARE & EMBARKO FINISH',
    tab: 'share' as const,
    caption: 'Ready for deployment! Share scorecard generated with #DeployWithEmbarko. 100% client-side. Zero cloud uploads. Verified for Embarko Student Challenge.',
    durationMs: 7000,
    action: 'share',
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
      setTimeout(() => onTriggerFix(), 1200);
    } else if (current.action === 'share') {
      setTimeout(() => onTriggerShare(), 2000);
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
    <div className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-2xl animate-in slide-in-from-bottom duration-300">
      <div className="rounded-2xl border-2 border-cyan bg-[#080B11]/95 p-5 shadow-[0_0_35px_rgba(0,240,255,0.4)] backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-term-border">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan/20 text-cyan">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
            </span>
            <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
              {current.title}
            </span>
            <span className="rounded bg-cyan/20 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
              {stepIndex + 1} / {CINEMATIC_TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-term-dim hover:text-white"
              title={isPaused ? 'Resume tour' : 'Pause tour'}
            >
              {isPaused ? <Play className="h-4 w-4 text-cyan fill-cyan" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                if (stepIndex < CINEMATIC_TOUR_STEPS.length - 1) setStepIndex(s => s + 1);
                else onClose();
              }}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-term-dim hover:text-white"
              title="Next step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-term-dim hover:text-white"
              title="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Large Cinematic Subtitles for Hands-Free Screen Recording */}
        <p className="font-sans text-base sm:text-lg font-semibold text-white leading-relaxed tracking-wide drop-shadow-sm">
          {current.caption}
        </p>

        {/* Step progress bar */}
        <div className="mt-3.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-term-border overflow-hidden">
            <div
              className="h-full bg-cyan transition-all duration-300 shadow-glow-cyan"
              style={{ width: `${((stepIndex + 1) / CINEMATIC_TOUR_STEPS.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-term-dim font-bold">
            ~65s Demo Tour
          </span>
        </div>
      </div>
    </div>
  );
};
