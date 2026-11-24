import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import { Finding, Severity } from '../types';

interface FindingCardProps {
  finding: Finding;
  onFix?: (findingId: string) => void;
  isFixed?: boolean;
}

const SEVERITY_CONFIG: Record<
  Severity,
  { pillBg: string; text: string; icon: React.ComponentType<{ className?: string }>; tag: string }
> = {
  critical: {
    pillBg: 'bg-red-500/15 border-red-500/30 text-red-300',
    text: 'text-red-400',
    icon: AlertOctagon,
    tag: 'CRITICAL',
  },
  warn: {
    pillBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    text: 'text-amber-400',
    icon: AlertTriangle,
    tag: 'WARNING',
  },
  info: {
    pillBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    text: 'text-cyan-400',
    icon: Info,
    tag: 'INFO',
  },
};

function getMethodTag(category: string): string {
  switch (category) {
    case 'visual':
      return 'Quick Scan (image analysis)';
    case 'metadata':
      return 'Direct Inspection (container atoms)';
    case 'speech':
      return 'Quick Scan (vocal formants)';
    default:
      return 'Quick Scan (signal analysis)';
  }
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onFix, isFixed = false }) => {
  const [showHowWeKnow, setShowHowWeKnow] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity];
  const Icon = cfg.icon;
  const methodTag = getMethodTag(finding.category);

  return (
    <div
      className={`rounded-2xl border border-white/5 bg-[#0D121F] p-5 shadow-lg transition hover:border-white/10 ${
        isFixed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Icon */}
        <div className={`mt-0.5 rounded-xl p-2.5 bg-black/40 border border-white/5 ${cfg.text} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row: Plain headline in sentence case & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-base font-bold text-white tracking-wide">
              {finding.title}
            </h4>

            <div className="flex items-center gap-2">
              {/* Method Tag */}
              <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-term-dim">
                {methodTag}
              </span>

              {/* Severity Tag */}
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${cfg.pillBg}`}>
                {cfg.tag}
              </span>

              {isFixed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="h-3 w-3" /> Fixed
                </span>
              )}
            </div>
          </div>

          {/* One-Sentence Plain English Description (Requirement D.9, C.5: min 15px) */}
          <p className="text-[15px] text-white/80 leading-relaxed font-normal">
            {finding.plainText}
          </p>

          {/* Bottom Metainfo: Confidence Bar & Time Range */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-term-dim">Confidence</span>
              <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan transition-all duration-500"
                  style={{ width: `${Math.round(finding.confidence * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-white">
                {Math.round(finding.confidence * 100)}%
              </span>
            </div>

            {finding.timeRange && (
              <span className="font-mono text-xs text-term-dim">
                Active: {finding.timeRange[0]}s – {finding.timeRange[1]}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable "How We Know" Row with Numbers (Requirement D.9) */}
      <div className="mt-3.5 border-t border-white/5 pt-2.5">
        <button
          onClick={() => setShowHowWeKnow(!showHowWeKnow)}
          className="flex min-h-[44px] w-full items-center justify-between text-xs text-cyan hover:text-cyan/80 transition font-medium focus:outline-none"
        >
          <span>{showHowWeKnow ? 'Hide measurement evidence' : 'How we know (forensic numbers)'}</span>
          {showHowWeKnow ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showHowWeKnow && (
          <div className="mt-2.5 rounded-xl bg-black/40 border border-white/5 p-3.5 space-y-2">
            <table className="w-full text-left font-mono text-xs">
              <tbody>
                {Object.entries(finding.details).map(([key, val]) => (
                  <tr key={key} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 pr-4 text-term-dim capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </td>
                    <td className="py-1.5 font-medium text-white break-all">
                      {val === true ? 'Yes' : val === false ? 'No' : String(val ?? 'None')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {finding.fixDescription && (
              <div className="mt-2 rounded-lg border border-cyan/30 bg-cyan/10 p-2.5 text-xs text-cyan">
                <strong>Fix Action:</strong> {finding.fixDescription}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
