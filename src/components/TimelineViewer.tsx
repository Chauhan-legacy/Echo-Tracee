import React, { useState } from 'react';
import { Clock, Play, Pause, Layers } from 'lucide-react';
import { Finding, VisualFindingBox } from '../types';

interface TimelineViewerProps {
  duration: number;
  findings: Finding[];
  visualBoxes: VisualFindingBox[];
}

export const TimelineViewer: React.FC<TimelineViewerProps> = ({
  duration = 15.0,
  findings,
  visualBoxes,
}) => {
  const [currentTime, setCurrentTime] = useState(3.5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Time scrubber handler
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  return (
    <div className="rounded-xl border border-term-border bg-term-card p-4 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-term-border pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Forensic Multitrack Timeline (00:00 – 00:{Math.floor(duration)})
          </h4>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-cyan">
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
        className="w-full accent-cyan h-2 bg-term-border rounded-lg cursor-pointer"
      />

      {/* Multitrack lanes */}
      <div className="space-y-3 font-mono text-xs">
        {/* Track 1: Acoustic Leaks */}
        <div className="rounded-lg bg-term-bg p-3 border border-term-border">
          <div className="flex items-center justify-between text-term-dim text-[11px] mb-1.5">
            <span className="font-bold text-cyan">TRACK 1: Acoustic Spectrum (0 - 24 kHz)</span>
            <span>Audio Events</span>
          </div>
          <div className="relative h-8 w-full bg-[#080B11] rounded border border-term-border overflow-hidden">
            {/* Mains Hum base line */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500/50" title="50.02 Hz Mains Hum" />

            {/* Ultrasonic Tracker active 3.0s - 9.5s */}
            <div
              className="absolute top-1 h-3 bg-[#FF3366] rounded px-1 text-[8px] text-white font-bold flex items-center justify-center animate-pulse"
              style={{
                left: `${(3.0 / duration) * 100}%`,
                width: `${((9.5 - 3.0) / duration) * 100}%`,
              }}
            >
              19.4 kHz Tracker Beacon
            </div>

            {/* Audio edit jump at 11s */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400"
              style={{ left: `${(11.0 / duration) * 100}%` }}
              title="Frequency Jump Edit at 11s"
            />

            {/* Playhead marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan shadow-[0_0_8px_#00F0FF]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Track 2: Visual Leaks */}
        <div className="rounded-lg bg-term-bg p-3 border border-term-border">
          <div className="flex items-center justify-between text-term-dim text-[11px] mb-1.5">
            <span className="font-bold text-[#FF3366]">TRACK 2: Visual Frame Detections</span>
            <span>Frames (1 fps)</span>
          </div>
          <div className="relative h-8 w-full bg-[#080B11] rounded border border-term-border overflow-hidden">
            {/* Bounding boxes active throughout demo */}
            <div
              className="absolute inset-y-1 bg-cyan/20 border border-cyan/40 rounded px-2 flex items-center text-[9px] text-cyan"
              style={{ left: '0%', width: '100%' }}
            >
              Whiteboard Wi-Fi Credentials & ID Card Reflection Active
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan shadow-[0_0_8px_#00F0FF]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Track 3: Spoken & Metadata */}
        <div className="rounded-lg bg-term-bg p-3 border border-term-border">
          <div className="flex items-center justify-between text-term-dim text-[11px] mb-1.5">
            <span className="font-bold text-amber-400">TRACK 3: Spoken Secrets & Geolocation Atoms</span>
            <span>Metadata</span>
          </div>
          <div className="relative h-8 w-full bg-[#080B11] rounded border border-term-border overflow-hidden">
            <div
              className="absolute top-1 h-5 bg-amber-500/20 border border-amber-500/40 rounded px-2 flex items-center text-[8px] text-amber-300 font-bold"
              style={{
                left: `${(1.2 / duration) * 100}%`,
                width: `${(3.5 / duration) * 100}%`,
              }}
            >
              Spoken Phone Number (98250 •••••)
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan shadow-[0_0_8px_#00F0FF]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
