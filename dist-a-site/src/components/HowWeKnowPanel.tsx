/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Microscope, ShieldAlert, CheckCircle2, HelpCircle, Layers, Cpu } from 'lucide-react';
import { Finding } from '../types';

interface HowWeKnowPanelProps {
  selectedFinding: Finding | null;
  totalFindingsCount: number;
}

export const HowWeKnowPanel: React.FC<HowWeKnowPanelProps> = ({
  selectedFinding,
  totalFindingsCount,
}) => {
  return (
    <div className="rounded-2xl border border-beige-hairline bg-beige-card p-5 shadow-panel">
      <div className="flex items-center justify-between border-b border-beige-hairline pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Microscope className="h-4 w-4 text-forest" />
          <h3 className="font-display text-base font-bold text-forest-ink">
            Analyst Inspection: How We Know
          </h3>
        </div>
        <span className="rounded bg-beige-sunken px-2 py-0.5 font-mono text-[11px] font-bold text-forest-muted">
          {selectedFinding ? 'Inspecting Signal' : `${totalFindingsCount} checks active`}
        </span>
      </div>

      {selectedFinding ? (
        <div className="space-y-4 text-sm text-forest-ink">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  selectedFinding.severity === 'critical'
                    ? 'bg-brick'
                    : selectedFinding.severity === 'warn'
                    ? 'bg-ochre'
                    : 'bg-forest-muted'
                }`}
              />
              <span className="font-display text-base font-bold text-forest-ink">
                {selectedFinding.title}
              </span>
            </div>
            <p className="text-forest-muted text-xs leading-relaxed">
              {selectedFinding.plainText}
            </p>
          </div>

          {/* Method & Ensemble Agreement */}
          <div className="rounded-xl border border-beige-hairline bg-beige-sunken/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-forest-muted">Analytical Method:</span>
              <span className="font-mono font-bold text-forest">
                {selectedFinding.method || 'Closed-Form Signal Processing'}
              </span>
            </div>

            {selectedFinding.modelType && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-forest-muted">Engine Layer:</span>
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-forest">
                  <Cpu className="h-3 w-3" />
                  {selectedFinding.modelType.toUpperCase()}
                  {selectedFinding.modelAgreement && ` (${selectedFinding.modelAgreement})`}
                </span>
              </div>
            )}

            {selectedFinding.timeRange && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-forest-muted">Active Window:</span>
                <span className="font-mono font-bold text-forest">
                  {selectedFinding.timeRange[0].toFixed(2)}s – {selectedFinding.timeRange[1].toFixed(2)}s
                </span>
              </div>
            )}
          </div>

          {/* Statistical Validation Matrix */}
          <div className="rounded-xl border border-beige-hairline bg-cream p-3 space-y-2 text-xs">
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-forest-muted mb-1">
              Statistical Evidence (M7)
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-beige-card p-2 border border-beige-hairline">
                <div className="text-[10px] text-forest-muted">False Alarm Prob (Pfa)</div>
                <div className="font-bold text-forest">
                  {selectedFinding.pfa !== undefined ? selectedFinding.pfa.toExponential(2) : '< 1.0e-6'}
                </div>
              </div>

              <div className="rounded bg-beige-card p-2 border border-beige-hairline">
                <div className="text-[10px] text-forest-muted">Confidence (95% CI)</div>
                <div className="font-bold text-forest">
                  {selectedFinding.ciLow !== undefined && selectedFinding.ciHigh !== undefined
                    ? `[${selectedFinding.ciLow.toFixed(2)}, ${selectedFinding.ciHigh.toFixed(2)}]`
                    : `${Math.round(selectedFinding.confidence * 100)}%`}
                </div>
              </div>
            </div>

            {/* Raw Parameter Values */}
            <div className="mt-2 pt-2 border-t border-beige-hairline">
              <div className="text-[10px] text-forest-muted font-mono mb-1">Extracted Parameters:</div>
              <div className="space-y-1 font-mono text-[11px]">
                {Object.entries(selectedFinding.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-forest-muted">{key}:</span>
                    <span className="font-bold text-forest-ink">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-forest-muted">
          <Layers className="h-8 w-8 mx-auto text-forest/40 mb-2" />
          <p className="font-medium text-forest-ink">Hover or click any finding card</p>
          <p className="text-xs mt-1">
            Reveals analytical method, false-alarm probability (Pfa), 95% confidence intervals, and exact mathematical parameters.
          </p>
        </div>
      )}
    </div>
  );
};
