/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Square, Radio, AlertTriangle } from 'lucide-react';
import { HeterodyneAudioPlayer } from '../audio/heterodynePlayer';

interface HearToneCardProps {
  samples: Float32Array;
  sampleRate: number;
  beaconFreqHz: number;
  snrDb: number;
  bitPattern?: string;
}

export const HearToneCard: React.FC<HearToneCardProps> = ({
  samples,
  sampleRate,
  beaconFreqHz,
  snrDb,
  bitPattern,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const playerRef = useRef<HeterodyneAudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new HeterodyneAudioPlayer();
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    } else {
      playerRef.current.setVolume(volume);
      playerRef.current.play(samples, sampleRate, beaconFreqHz, () => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    playerRef.current?.setVolume(val);
  };

  return (
    <div className="bg-[#0B281B] text-[#FAF5EB] rounded-xl p-5 border border-[#174D35] shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#8BCF55] animate-pulse" />
          <h3 className="font-serif font-bold text-lg text-[#F3EBD8]">
            Hear the Hidden Tone (Audible Down-Conversion)
          </h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#174D35] text-[#8BCF55]">
          {(beaconFreqHz / 1000).toFixed(1)} kHz → 1.5 kHz
        </span>
      </div>

      {/* Warning Banner */}
      <div className="bg-[#7A4E00]/20 border border-[#7A4E00]/50 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#E6A23C] shrink-0 mt-0.5" />
        <div className="text-xs text-[#E8DCC3] leading-relaxed">
          <strong className="text-[#F3EBD8]">Audible Heterodyne Mixing:</strong> Humans cannot hear {(beaconFreqHz / 1000).toFixed(1)} kHz directly. We multiply the recording by a local oscillator at {(beaconFreqHz - 1500).toFixed(0)} Hz to transpose the ultrasonic carrier down to an audible 1,500 Hz whistle. You will hear the tracker’s exact on-off keying cadence.
        </div>
      </div>

      {/* Bit strip visualization if present */}
      {bitPattern && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[#C9BB9A]">
            <span>Demodulated Bit Cadence</span>
            <span className="font-mono text-[#8BCF55]">{bitPattern.length} bits captured</span>
          </div>
          <div className="flex gap-1 overflow-x-auto py-1">
            {bitPattern.split('').slice(0, 32).map((bit, idx) => (
              <span
                key={idx}
                className={`inline-block w-3 h-5 rounded-sm text-[9px] font-mono font-bold flex items-center justify-center ${
                  bit === '1'
                    ? 'bg-[#8BCF55] text-[#0B281B]'
                    : 'bg-[#174D35] text-[#8BCF55]/60'
                }`}
                title={`Bit ${idx}: ${bit}`}
              >
                {bit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#174D35]/60">
        <button
          onClick={togglePlay}
          className={`px-4 py-2 rounded-lg font-mono text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
            isPlaying
              ? 'bg-[#A32A1F] text-white hover:bg-[#852219]'
              : 'bg-[#8BCF55] text-[#0B281B] hover:bg-[#7ABF45]'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Stop 1.5 kHz Tone
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Play Down-Converted Tone
            </>
          )}
        </button>

        {/* Volume slider */}
        <div className="flex items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="w-4 h-4 text-[#C9BB9A]" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#8BCF55]" />
          )}
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.02"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-[#8BCF55] cursor-pointer"
            title="Safe Volume Control"
          />
          <span className="font-mono text-xs text-[#C9BB9A]">
            {Math.round((volume / 0.5) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
