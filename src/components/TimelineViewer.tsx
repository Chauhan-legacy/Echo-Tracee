/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Clock, Play, Pause, Layers } from 'lucide-react';
import { Finding, VisualFindingBox } from '../types';

interface TimelineViewerProps {
  duration: number;
  findings: Finding[];
  visualBoxes: VisualFindingBox[];
  hoveredFindingId?: string | null;
}

export const TimelineViewer: React.FC<TimelineViewerProps> = ({
  duration = 15.0,
  findings,
  visualBoxes,
  hoveredFindingId = null,
}) => {
  const [currentTime, setCurrentTime] = useState(3.5);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  return (
    <div className="rounded-2xl border border-beige-hairline bg-beige-card p-5 shadow-panel space-y-4">
      <div className="flex items-center justify-between border-b border-beige-hairline pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-forest" />
          <h4 className="font-display text-sm font-bold text-forest-ink">
            Synchronized Multitrack Timeline (00:00 – 00:{Math.floor(duration).toString().padStart(2, '0')})
          </h4>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-forest font-bold bg-beige-sunken px-2.5 py-1 rounded-lg">
          <span>Scrubber: {currentTime.toFixed(1)}s</span>
        </div>
      </div>

      {/* Scrub range input */}
      <input
        type="range"
        min={0}
        max={duration}
        step={0.1}
        value={currentTime}
        onChange={handleScrub}
        className="w-full accent-forest h-2 bg-beige-sunken rounded-lg cursor-pointer"
      />

      {/* Multitrack lanes */}
      <div className="space-y-3 font-mono text-xs">
        {/* Track 1: Acoustic Spectrum */}
        <div className="rounded-xl bg-forest-deep p-3 border border-forest/30 shadow-data">
          <div className="flex items-center justify-between text-cream/80 text-[11px] mb-1.5">
            <span className="font-bold text-lime">TRACK 1: Acoustic Spectrum (0 – 24 kHz)</span>
            <span className="text-cream/50">Spectral Events</span>
          </div>
          <div className="relative h-8 w-full bg-[#081810] rounded border border-forest/40 overflow-hidden">
            {/* Mains Hum base line */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-ochre/60" title="50.02 Hz Mains Hum" />

            {/* Ultrasonic Tracker active 3.0s - 9.5s */}
            <div
              className={`absolute top-1 h-4 bg-brick rounded px-1.5 text-[9px] text-cream font-bold flex items-center justify-center transition ${
                hoveredFindingId?.includes('ultrasonic') ? 'ring-2 ring-lime scale-105' : ''
              }`}
              style={{
                left: `${(3.0 / duration) * 100}%`,
                width: `${((9.5 - 3.0) / duration) * 100}%`,
              }}
            >
              19.4 kHz Tracker Beacon
            </div>

            {/* Audio edit jump at 11s */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-ochre"
              style={{ left: `${(11.0 / duration) * 100}%` }}
              title="Frequency Jump Edit at 11s"
            />

            {/* Playhead marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-lime shadow-[0_0_8px_#8BCF55]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Track 2: Visual Frame Detections */}
        <div className="rounded-xl bg-forest-deep p-3 border border-forest/30 shadow-data">
          <div className="flex items-center justify-between text-cream/80 text-[11px] mb-1.5">
            <span className="font-bold text-brick">TRACK 2: Visual Frame Detections</span>
            <span className="text-cream/50">Frames (1 fps)</span>
          </div>
          <div className="relative h-8 w-full bg-[#081810] rounded border border-forest/40 overflow-hidden">
            <div
              className="absolute inset-y-1 bg-brick/30 border border-brick/60 rounded px-2 flex items-center text-[10px] text-cream font-sans font-medium"
              style={{ left: '0%', width: '100%' }}
            >
              Credentials & Faces Active
            </div>

            {/* Playhead marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-lime shadow-[0_0_8px_#8BCF55]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
