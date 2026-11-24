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
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onSelect?: () => void;
  viewMode?: 'plain' | 'technical';
}

const SEVERITY_CONFIG: Record<
  Severity,
  { pillBg: string; text: string; icon: React.ComponentType<{ className?: string }>; tag: string }
> = {
  critical: {
    pillBg: 'bg-brick/15 border-brick/30 text-brick',
    text: 'text-brick',
    icon: AlertOctagon,
    tag: 'CRITICAL',
  },
  warn: {
    pillBg: 'bg-ochre/15 border-ochre/30 text-ochre',
    text: 'text-ochre',
    icon: AlertTriangle,
    tag: 'WARNING',
  },
  info: {
    pillBg: 'bg-forest/15 border-forest/30 text-forest',
    text: 'text-forest',
    icon: Info,
    tag: 'INFO',
  },
};

function getMethodTag(category: string, method?: string): string {
  if (method) return method;
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

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onFix,
  isFixed = false,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  onSelect,
  viewMode = 'plain',
}) => {
  const [showHowWeKnow, setShowHowWeKnow] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity];
  const Icon = cfg.icon;
  const methodTag = getMethodTag(finding.category, finding.method);
  const isTechMode = viewMode === 'technical';

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onSelect}
      className={`rounded-2xl border bg-beige-card p-5 shadow-panel transition cursor-pointer ${
        isHovered
          ? 'border-forest ring-2 ring-forest/20 shadow-elevated scale-[1.01]'
          : 'border-beige-hairline hover:border-forest/40'
      } ${isFixed ? 'opacity-65' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Icon */}
        <div className={`mt-0.5 rounded-xl p-2.5 bg-beige-sunken/80 border border-beige-hairline ${cfg.text} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row: Plain headline in sentence case & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-base font-bold text-forest-ink tracking-tight">
              {finding.title}
            </h4>

            <div className="flex items-center gap-2">
              {/* Method Tag */}
              <span className="rounded-md bg-beige-sunken border border-beige-hairline px-2 py-0.5 text-xs text-forest-muted font-medium">
                {methodTag}
              </span>

              {/* Severity Tag */}
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${cfg.pillBg}`}>
                {cfg.tag}
              </span>

              {isFixed && (
                <span className="inline-flex items-center gap-1 rounded-md bg-forest/15 border border-forest/30 px-2 py-0.5 text-xs text-forest font-semibold">
                  <CheckCircle className="h-3 w-3" /> Fixed
                </span>
              )}
            </div>
          </div>

          {/* One-Sentence Plain English Description (Body >= 16px) */}
          <p className="text-[16px] text-forest-ink/90 leading-relaxed font-normal">
            {finding.plainText}
          </p>

          {/* Bottom Metainfo: Confidence Bar & Time Range */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-forest-muted font-medium">Confidence</span>
              <div className="h-2 w-20 bg-beige-sunken rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-500"
                  style={{ width: `${Math.round(finding.confidence * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-forest-ink font-bold">
                {Math.round(finding.confidence * 100)}%
              </span>
            </div>

            {finding.timeRange && (
              <div className="font-mono text-xs text-forest-muted bg-beige-sunken/60 px-2 py-0.5 rounded border border-beige-hairline">
                ⏱ {finding.timeRange[0].toFixed(1)}s – {finding.timeRange[1].toFixed(1)}s
              </div>
            )}
          </div>

          {/* Expandable "How We Know" details toggle */}
          <div className="pt-2 border-t border-beige-hairline/80">
            <button
              onClick={e => {
                e.stopPropagation();
                setShowHowWeKnow(!showHowWeKnow);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-ink transition"
            >
              <span>{isTechMode ? 'Forensic Mathematical Breakdown' : 'How we know (parameters & math)'}</span>
              {showHowWeKnow || isTechMode ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {(showHowWeKnow || isTechMode) && (
              <div className="mt-2 rounded-xl bg-beige-sunken/70 border border-beige-hairline p-3 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-forest-muted uppercase tracking-wider mb-1">
                  <span>Extracted Signal Parameters</span>
                  {isTechMode && <span className="text-[#174D35] bg-[#8BCF55]/20 px-1.5 py-0.5 rounded text-[10px]">Technical View</span>}
                </div>
                {Object.entries(finding.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-0.5 border-b border-beige-hairline/50 last:border-0">
                    <span className="text-forest-muted">{key}:</span>
                    <span className="text-forest-ink font-semibold">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
