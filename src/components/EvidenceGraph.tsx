/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { GitBranch, Database, Cpu, Search, CheckSquare } from 'lucide-react';
import { Finding } from '../types';

interface EvidenceGraphProps {
  findings: Finding[];
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ findings }) => {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-beige-hairline bg-beige-card p-5 sm:p-8 shadow-panel space-y-6">
        <div className="flex items-center gap-2 border-b border-beige-hairline pb-4">
          <span className="p-2 rounded-xl bg-forest text-lime">
            <GitBranch className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-forest-ink">
              Forensic Evidence Graph
            </h3>
            <p className="text-sm font-semibold text-forest">
              Verifiable derivation chain: Source Stream → Extracted Signal → Forensic Method → Finding
            </p>
          </div>
        </div>

        {findings.length === 0 ? (
          <div className="rounded-2xl border-2 border-beige-hairline bg-cream p-8 text-center text-forest font-semibold">
            No active findings to trace. Load INCIDENT-001 or scan a file.
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((f, idx) => (
              <div
                key={f.id || idx}
                className="rounded-2xl border-2 border-beige-hairline bg-cream p-4 sm:p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-beige-hairline pb-2">
                  <span className="font-display text-sm font-bold text-forest-ink truncate max-w-md">
                    {f.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-forest/15 border border-forest/30 px-2 py-0.5 font-mono text-[11px] font-bold text-forest uppercase">
                      {f.evidenceKind}
                    </span>
                    <span className="rounded-lg bg-beige-sunken px-2 py-0.5 font-mono text-[11px] font-bold text-forest-ink">
                      {Math.round(f.confidence * 100)}% Confidence
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 font-mono text-xs">
                  {/* Node 1: Raw Source */}
                  <div className="flex items-center gap-3 rounded-xl bg-beige-card border border-beige-hairline p-3">
                    <Database className="h-4 w-4 text-forest shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-forest font-bold uppercase tracking-wider block">
                        Source Stream
                      </span>
                      <p className="font-bold text-forest-ink text-xs truncate">
                        {f.category === 'hum' || f.category === 'ultrasonic' || f.category === 'room'
                          ? 'Audio Waveform (48 kHz)'
                          : f.category === 'metadata'
                          ? 'Container Atoms / EXIF'
                          : f.category === 'speech'
                          ? 'Speech Formants'
                          : 'Video Pixel Frames'}
                      </p>
                    </div>
                  </div>

                  {/* Node 2: Measurement */}
                  <div className="flex items-center gap-3 rounded-xl bg-beige-card border border-beige-hairline p-3">
                    <Search className="h-4 w-4 text-ochre shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-forest font-bold uppercase tracking-wider block">
                        Extracted Signal
                      </span>
                      <p className="font-bold text-forest-ink text-xs truncate">
                        {f.category === 'hum'
                          ? '50/100/150 Hz STFT Bins'
                          : f.category === 'ultrasonic'
                          ? '19.4 kHz CFAR Peak'
                          : f.category === 'room'
                          ? 'Schroeder Decay Integral'
                          : f.category === 'metadata'
                          ? 'QuickTime GPS Coordinates'
                          : 'RGB Histogram Diff'}
                      </p>
                    </div>
                  </div>

                  {/* Node 3: Method */}
                  <div className="flex items-center gap-3 rounded-xl bg-beige-card border border-beige-hairline p-3">
                    <Cpu className="h-4 w-4 text-forest shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-forest font-bold uppercase tracking-wider block">
                        Forensic Method
                      </span>
                      <p className="font-bold text-forest-ink text-xs truncate">
                        {f.category === 'hum'
                          ? 'Quadratic Peak Interp.'
                          : f.category === 'ultrasonic'
                          ? 'Cell-Averaging CFAR'
                          : f.category === 'room'
                          ? 'Linear Regression Fit'
                          : f.category === 'metadata'
                          ? 'Binary Atom Parser'
                          : 'Sobel / Bounding Box'}
                      </p>
                    </div>
                  </div>

                  {/* Node 4: Finding Output */}
                  <div className="flex items-center gap-3 rounded-xl bg-beige-card border border-forest/30 p-3">
                    <CheckSquare className="h-4 w-4 text-brick shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-brick font-bold uppercase tracking-wider block">
                        Privacy Impact
                      </span>
                      <p className="font-bold text-forest-ink text-xs truncate">
                        {f.severity.toUpperCase()} Exposure
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
