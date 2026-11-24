import React, { useState, useEffect } from 'react';
import { X, Sparkles, Volume2, Wrench } from 'lucide-react';

interface FirstRunHintsProps {
  hasScanResult: boolean;
  hasUltrasonic: boolean;
  isFixed: boolean;
  onOpenFixer?: () => void;
}

export const FirstRunHints: React.FC<FirstRunHintsProps> = ({
  hasScanResult,
  hasUltrasonic,
  isFixed,
  onOpenFixer,
}) => {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('echotrace_dismissed_hints');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const dismissHint = (id: string) => {
    setDismissed(prev => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem('echotrace_dismissed_hints', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Hint 1: On initial landing (before scan)
  if (!hasScanResult && !dismissed['hint-1']) {
    return (
      <div className="relative rounded-2xl border-2 border-forest/30 bg-[#174D35]/15 p-4 text-sm text-forest-ink shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-5 w-5 text-forest shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-forest">
              Tip 1 of 3: Start by loading INCIDENT-001
            </p>
            <p className="text-xs text-forest-muted mt-0.5">
              Tap the big lime button below to see a 15-second hostel video analyzed for hidden tracking signals in 2 seconds.
            </p>
          </div>
        </div>
        <button
          onClick={() => dismissHint('hint-1')}
          className="rounded-lg p-1.5 text-forest-muted hover:text-forest hover:bg-forest/10 transition"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Hint 2: After scan, if ultrasonic beacon is found and not yet fixed
  if (hasScanResult && hasUltrasonic && !isFixed && !dismissed['hint-2']) {
    return (
      <div className="relative rounded-2xl border-2 border-forest/30 bg-[#174D35]/15 p-4 text-sm text-forest-ink shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-2.5">
          <Volume2 className="h-5 w-5 text-forest shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-forest">
              Tip 2 of 3: Listen to the hidden ultrasonic tone
            </p>
            <p className="text-xs text-forest-muted mt-0.5">
              Scroll to "Hear the Hidden Tone" below. We shift the silent 19.4 kHz tracker down to an audible 1.5 kHz tone you can hear.
            </p>
          </div>
        </div>
        <button
          onClick={() => dismissHint('hint-2')}
          className="rounded-lg p-1.5 text-forest-muted hover:text-forest hover:bg-forest/10 transition"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Hint 3: When reviewing leaks before fixing
  if (hasScanResult && !isFixed && !dismissed['hint-3']) {
    return (
      <div className="relative rounded-2xl border-2 border-forest/30 bg-[#174D35]/15 p-4 text-sm text-forest-ink shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
        <div className="flex items-start gap-2.5">
          <Wrench className="h-5 w-5 text-forest shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-forest">
              Tip 3 of 3: Fix leaks in one tap
            </p>
            <p className="text-xs text-forest-muted mt-0.5">
              Tap "Fix All Leaks" to notch out ultrasonic tones, remove power hum, clear GPS, and generate a signed receipt.
            </p>
          </div>
        </div>
        <button
          onClick={() => dismissHint('hint-3')}
          className="rounded-lg p-1.5 text-forest-muted hover:text-forest hover:bg-forest/10 transition"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
};
