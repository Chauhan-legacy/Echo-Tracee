import React, { useState, useEffect } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, HelpCircle, ArrowRight, Wrench } from 'lucide-react';
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

  // Smooth Count-Up Animation
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

  const projectedCleanScore = Math.max(0, calculateLeakScore(findings.filter(f => !f.fixable)).totalScore);
  const verdictText = getScoreVerdict(score, findings);

  // Confidence interval for score
  const scoreLow = score.scoreLow ?? Math.max(0, score.totalScore - 6);
  const scoreHigh = score.scoreHigh ?? Math.min(100, score.totalScore + 6);

  // Color selection based on score severity
  const ringColor = score.totalScore >= 70 ? '#A32A1F' : score.totalScore >= 35 ? '#7A4E00' : '#174D35';

  return (
    <div className="space-y-4">
      {/* Score Hero Card */}
      <div className="rounded-2xl border border-beige-hairline bg-beige-card p-6 shadow-panel">
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
                  className="stroke-beige-sunken"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Progress */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Centered Score Number */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-4xl sm:text-5xl font-black text-forest-ink">
                  {displayScore}
                </span>
                <span className="font-mono text-[11px] font-bold text-forest-muted">
                  / 100
                </span>
                <span className="font-mono text-[10px] text-forest-muted mt-0.5">
                  [{scoreLow}–{scoreHigh}]
                </span>
              </div>
            </div>
          </div>

          {/* Right Information / Verdict */}
          <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`inline-block rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider ${
                  score.totalScore >= 70
                    ? 'bg-brick/15 text-brick border border-brick/30'
                    : score.totalScore >= 35
                    ? 'bg-ochre/15 text-ochre border border-ochre/30'
                    : 'bg-forest/15 text-forest border border-forest/30'
                }`}
              >
                {score.rating}
              </span>
              <span className="font-mono text-xs text-forest-muted">
                {findings.length} findings evaluated
              </span>
            </div>

            {/* Plain English Verdict (Requirement D.7: 18px) */}
            <p
              id="score-verdict-text"
              className="text-[18px] font-medium text-forest-ink leading-snug"
            >
              {verdictText}
            </p>

            {/* Severity Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="flex items-center gap-1.5 rounded-lg border border-brick/30 bg-brick/10 px-2.5 py-1 text-xs font-semibold text-brick">
                <span className="h-2 w-2 rounded-full bg-brick" />
                Critical: {criticalCount}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-ochre/30 bg-ochre/10 px-2.5 py-1 text-xs font-semibold text-ochre">
                <span className="h-2 w-2 rounded-full bg-ochre" />
                Warning: {warnCount}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-forest/20 bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                <span className="h-2 w-2 rounded-full bg-forest" />
                Info: {infoCount}
              </span>
            </div>

            {/* Explain Score Toggle */}
            <div className="pt-1">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:text-forest-ink hover:underline transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-forest" />
                <span>Explain this score & formula</span>
                {showExplanation ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Explanation Breakdown */}
        {showExplanation && (
          <div className="mt-5 border-t border-beige-hairline pt-4 space-y-3">
            <h5 className="font-display text-sm font-bold text-forest-ink">
              Transparent Leak Score Model (0–100)
            </h5>
            <p className="text-xs text-forest-muted leading-relaxed">
              Every point is calculated from physical signal measurements. Critical findings (e.g. ultrasonic tracking beacons, GPS fixes) carry high weights (25–35 pts), warnings (e.g. power grid hum, room reverb) carry moderate weights (10–20 pts), and info items carry low weights (5 pts).
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {score.contributions.map(item => (
                <div
                  key={item.findingId}
                  className="flex items-center justify-between rounded-lg bg-beige-sunken/60 border border-beige-hairline p-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        item.severity === 'critical'
                          ? 'bg-brick'
                          : item.severity === 'warn'
                          ? 'bg-ochre'
                          : 'bg-forest'
                      }`}
                    />
                    <span className="font-medium text-forest-ink truncate">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-beige-hairline overflow-hidden">
                      <div
                        className="h-full rounded-full bg-forest"
                        style={{ width: `${Math.min(100, (item.points / 35) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-forest w-8 text-right">
                      +{item.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-width "Fix leaks in 1 tap" Button (Requirement D.8) */}
      {onFixAll && !isFixed && score.totalScore > 0 && (
        <button
          onClick={onFixAll}
          className="group w-full flex items-center justify-between rounded-2xl bg-lime border-2 border-lime p-4 text-forest font-bold transition shadow-elevated hover:bg-lime-bright active:scale-[0.99] min-h-[56px]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest/15 p-2">
              <Wrench className="h-5 w-5 text-forest" />
            </div>
            <div className="text-left">
              <div className="font-display text-base font-bold text-forest">
                Fix leaks in 1 tap
              </div>
              <div className="text-xs text-forest/80 font-medium">
                Strip ultrasound, notch power hum, scrub metadata & blur faces
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-sm bg-forest text-lime px-3 py-1.5 rounded-xl font-bold">
            <span>score {score.totalScore}</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>about {projectedCleanScore}</span>
          </div>
        </button>
      )}
    </div>
  );
};
