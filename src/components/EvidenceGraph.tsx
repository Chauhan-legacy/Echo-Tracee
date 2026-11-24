/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { GitBranch, Database, Cpu, Search, CheckSquare } from 'lucide-react';
import { Finding, EvidenceKind } from '../types';

interface EvidenceGraphProps {
  findings: Finding[];
}

export const EvidenceGraph: React.FC<EvidenceGraphProps> = ({ findings }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-term-border bg-term-card p-4 shadow-lg">
        <div className="flex items-center gap-2 border-b border-term-border pb-3 mb-4">
          <GitBranch className="h-4 w-4 text-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Forensic Evidence Graph (Source → Measurement → Method → Finding)
          </h4>
        </div>

        <div className="space-y-4">
          {findings.map((f, idx) => (
            <div
              key={f.id || idx}
              className="rounded-lg border border-term-border/70 bg-term-bg/80 p-3"
            >
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 font-mono text-xs">
                {/* Node 1: Raw Source */}
                <div className="flex items-center gap-2 rounded bg-term-card border border-term-border p-2">
                  <Database className="h-4 w-4 text-cyan" />
                  <div>
                    <span className="text-[10px] text-term-dim uppercase">Source Stream</span>
                    <p className="font-semibold text-white">
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

                <span className="hidden lg:inline text-cyan text-base font-bold">→</span>

                {/* Node 2: Measurement */}
                <div className="flex items-center gap-2 rounded bg-term-card border border-term-border p-2">
                  <Search className="h-4 w-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-term-dim uppercase">Extracted Signal</span>
                    <p className="font-semibold text-white">
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

                <span className="hidden lg:inline text-cyan text-base font-bold">→</span>

                {/* Node 3: Method */}
                <div className="flex items-center gap-2 rounded bg-term-card border border-term-border p-2">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-term-dim uppercase">Forensic Method</span>
                    <p className="font-semibold text-white">
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

                <span className="hidden lg:inline text-cyan text-base font-bold">→</span>

                {/* Node 4: Finding Output */}
                <div className="flex items-center gap-2 rounded bg-term-card border border-cyan/40 p-2">
                  <CheckSquare className="h-4 w-4 text-[#FF3366]" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-cyan/20 px-1 font-mono text-[9px] text-cyan uppercase font-bold">
                        {f.evidenceKind}
                      </span>
                      <span className="text-[10px] text-term-dim">{(f.confidence * 100).toFixed(0)}% conf</span>
                    </div>
                    <p className="font-semibold text-white truncate max-w-xs">{f.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
