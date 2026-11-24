import React, { useState, useEffect } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, HelpCircle, ArrowRight } from 'lucide-react';
import { LeakScoreResult, Finding } from '../types';
import { calculateLeakScore } from '../dsp/scoring';

interface LeakScoreGaugeProps {
  score: LeakScoreResult;
  findings?: Finding[];
  isFixed?: boolean;
  onFixAll?: () => void;
}

/**
 * Dynamically computes an honest, plain-English one-sentence verdict
 * strictly matching what was ACTUALLY detected in the findings.
 * Never mentions "location clues" unless GPS or physical scene was found.
 */
function getScoreVerdict(score: LeakScoreResult, findings: Finding[]): string {
  if (score.totalScore === 0 || findings.length === 0) {
    return 'Your media is clean — zero acoustic beacons, location metadata, or sensitive cues detected.';
  }

  const hasBeacon = findings.some(
    f => f.category === 'ultrasonic' && f.severity === 'critical'
  );
  const hasGps = findings.some(
    f => f.category === 'metadata' && (f.details?.latitude || f.title.toLowerCase().includes('gps'))
  );
  const hasScene = findings.some(f => f.category === 'scene' || f.category === 'room');
  const hasFaceOrText = findings.some(f => f.category === 'visual');
  const hasSpeech = findings.some(f => f.category === 'speech');
  const hasHum = findings.some(f => f.category === 'hum');

  if (hasBeacon && hasGps) {
    return 'Critical privacy exposure: physical location clues and acoustic tracking beacons detected.';
  }
  if (hasBeacon) {
    return 'High privacy exposure: hidden acoustic tracking beacon detected in ultrasonic spectrum.';
  }
  if (hasGps) {
    return 'Location privacy leak: physical geographic coordinates embedded in file metadata.';
  }
  if (hasFaceOrText && hasSpeech) {
    return 'Visual and acoustic exposure: exposed credentials, facial features, and vocal speech detected.';
  }
  if (hasFaceOrText) {
    return 'Visual privacy exposure: identifiable credentials and facial features exposed in video frames.';
  }
  if (hasSpeech) {
    return 'Vocal privacy indicator: human speech audio detected in recording.';
  }
  if (hasHum && !hasGps && !hasBeacon) {
    return 'Grid electrical signature detected; acoustic environment is otherwise clean.';
  }
  if (hasScene && !hasGps && !hasBeacon) {
    return 'Environmental acoustic reverberation detected with no direct location indicators.';
  }

  return 'Moderate exposure: environmental and background signatures present.';
}

export const LeakScoreGauge: React.FC<LeakScoreGaugeProps> = ({
  score,
  findings = [],
  isFixed = false,
  onFixAll,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  // Requirement D.7: Smooth Count-Up Animation
  useEffect(() => {
    let start = performance.now();
    const duration = 900;
    const target = score.totalScore;
    let animId: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [score.totalScore]);

  // SVG Ring Dimensions: 180px desktop, 150px phone
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score.totalScore / 100) * circumference;

  // Severity counts
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warnCount = findings.filter(f => f.severity === 'warn').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  const fixableCount = findings.filter(f => f.fixable).length;
  const projectedCleanScore = Math.max(0, calculateLeakScore(findings.filter(f => !f.fixable)).totalScore);

  const verdictText = getScoreVerdict(score, findings);

  return (
    <div className="space-y-4">
      {/* Score Hero Card (Requirement D.7) */}
      <div className="rounded-2xl border border-white/5 bg-[#0D121F] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Large Ring Gauge: 180px desktop, 150px phone */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="h-[150px] w-[150px] sm:h-[180px] sm:w-[180px] relative flex items-center justify-center">
              <svg
                className="h-full w-full -rotate-90 transform"
                viewBox="0 0 160 160"
              >
                {/* Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#162032"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Active Colored Arc */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={score.color}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  style={{
                    filter: `drop-shadow(0 0 10px ${score.color}88)`,
                  }}
                />
              </svg>

              {/* Number in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {displayScore}
                </span>
                <span className="font-mono text-xs text-term-dim uppercase tracking-wider mt-0.5">
                  / 100 LEAK
                </span>
              </div>
            </div>
          </div>

          {/* Right info block: Verdict at 18px & Severity Chips */}
          <div className="flex-1 space-y-3 text-center sm:text-left min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className="h-3 w-3 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: score.color }}
              />
              <span className="font-display text-xl font-bold text-white tracking-tight">
                {score.rating}
              </span>
              {isFixed && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-xs text-emerald-400 font-semibold">
                  Sanitized
                </span>
              )}
            </div>

            {/* One-sentence verdict in plain English at 18px (Requirement D.7) */}
            <p id="score-verdict-text" className="text-[17px] sm:text-[18px] font-normal text-white/90 leading-snug">
              {verdictText}
            </p>

            {/* Three Severity Chips with counts (Requirement D.7) */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {criticalCount} Critical
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {warnCount} Warning
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-semibold text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {infoCount} Info
              </span>
            </div>

            {/* Explain this score link (Requirement D.7) */}
            <div className="pt-1">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="inline-flex items-center gap-1.5 text-xs text-cyan hover:text-cyan/80 transition font-medium focus:outline-none"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Explain this score</span>
                {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Explanation Breakdown */}
        {showExplanation && (
          <div className="mt-5 border-t border-white/5 pt-4 space-y-2">
            <h5 className="font-display text-xs font-bold uppercase tracking-wider text-term-dim">
              Deterministic Leak Score Breakdown
            </h5>
            <div className="space-y-1.5">
              {score.contributions.length === 0 ? (
                <p className="text-xs text-term-dim">No penalty points added. Audio and frame spectrum clean.</p>
              ) : (
                score.contributions.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2 text-xs"
                  >
                    <div className="pr-3">
                      <span className="font-medium text-white">{c.title}</span>
                      <p className="text-[11px] text-term-dim">{c.explanation}</p>
                    </div>
                    <span className="font-mono font-bold text-red-400 shrink-0">
                      +{c.points} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prominent Full-Width "Fix Leaks in 1 Tap" Button with Promise (Requirement D.8) */}
      {!isFixed && fixableCount > 0 && onFixAll && (
        <button
          onClick={onFixAll}
          className="w-full min-h-[52px] rounded-xl bg-cyan hover:bg-cyan/90 active:scale-[0.99] transition shadow-glow-cyan p-4 text-center flex items-center justify-between group text-black font-display font-bold text-base"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5" />
            <span>Fix leaks in 1 tap</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-black/20 px-2.5 py-1 font-mono text-xs font-semibold">
              score {score.totalScore} → about {projectedCleanScore}
            </span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}
    </div>
  );
};
