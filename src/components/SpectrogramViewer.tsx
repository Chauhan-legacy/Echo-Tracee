/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Volume2, Crosshair, SplitSquareHorizontal, Eye, AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react';
import { computeRealSpectrogram } from '../dsp/spectrogram';
import { getV3ColormapRgb } from './MiniLiveSpectrogram';
import { createWavBlob } from '../utils/wavHelper';

interface SpectrogramViewerProps {
  channelData: Float32Array | null;
  cleanChannelData?: Float32Array | null;
  sampleRate: number;
  isScanning?: boolean;
  highlightFreqs?: { freq: number; label: string; color: string; findingId?: string }[];
  isFixed?: boolean;
  hoveredFindingId?: string | null;
  onHoverFinding?: (id: string | null) => void;
  currentTime?: number;
}

export type FrequencyScale = 'linear' | 'log' | 'mel';

export const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({
  channelData,
  cleanChannelData,
  sampleRate,
  isScanning = false,
  highlightFreqs = [],
  isFixed = false,
  hoveredFindingId = null,
  onHoverFinding,
  currentTime = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{ freq: number; time: number } | null>(null);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [scale, setScale] = useState<FrequencyScale>('linear');

  // Draggable split position (0.0 to 1.0, default 0.5)
  const [splitPos, setSplitPos] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);

  const numCols = 360;
  const numRows = 160;

  // Real STFT computation on actual samples (Zero Math.random, 100% physical DSP)
  const beforeSpec = useMemo(() => {
    if (!channelData || channelData.length === 0) return null;
    return computeRealSpectrogram(channelData, sampleRate, numCols, numRows);
  }, [channelData, sampleRate, numCols, numRows]);

  const afterSpec = useMemo(() => {
    if (!cleanChannelData || cleanChannelData.length === 0) return null;
    return computeRealSpectrogram(cleanChannelData, sampleRate, numCols, numRows);
  }, [cleanChannelData, sampleRate, numCols, numRows]);

  const duration = beforeSpec?.duration || 15.0;

  // Audio Blob URL created from decoded Float32Array PCM samples
  const audioUrl = useMemo(() => {
    if (!channelData || channelData.length === 0) return null;
    const blob = createWavBlob(channelData, sampleRate);
    return URL.createObjectURL(blob);
  }, [channelData, sampleRate]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const effectiveCurrentTime = currentTime > 0 ? currentTime : playbackTime;

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const handleSeek = (newTime: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(duration, newTime));
    setPlaybackTime(clamped);
    if (audio) {
      audio.currentTime = clamped;
    }
  };

  const handleRestart = () => {
    handleSeek(0);
  };

  // Sweep animation during analysis
  useEffect(() => {
    if (!isScanning) {
      setSweepProgress(1.0);
      return;
    }

    const start = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = (now - start) / 2200;
      if (elapsed < 1.0) {
        setSweepProgress(elapsed);
        animId = requestAnimationFrame(tick);
      } else {
        setSweepProgress(1.0);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isScanning]);

  // Frequency mapping functions
  const mapYToFreq = (yNorm: number, nyquist: number): number => {
    // yNorm: 0 at top (high freq), 1 at bottom (low freq)
    const inv = 1 - yNorm;
    if (scale === 'linear') {
      return inv * nyquist;
    } else if (scale === 'log') {
      const minF = 20;
      return minF * Math.pow(nyquist / minF, inv);
    } else {
      // Mel scale: m = 2595 * log10(1 + f / 700)
      const maxMel = 2595 * Math.log10(1 + nyquist / 700);
      const mel = inv * maxMel;
      return 700 * (Math.pow(10, mel / 2595) - 1);
    }
  };

  const mapFreqToY = (f: number, nyquist: number): number => {
    let inv = 0;
    if (scale === 'linear') {
      inv = f / nyquist;
    } else if (scale === 'log') {
      const minF = 20;
      inv = Math.max(0, Math.log(Math.max(minF, f) / minF) / Math.log(nyquist / minF));
    } else {
      const maxMel = 2595 * Math.log10(1 + nyquist / 700);
      const mel = 2595 * Math.log10(1 + Math.max(0, f) / 700);
      inv = mel / maxMel;
    }
    return 1 - Math.max(0, Math.min(1, inv));
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0B281B'; // Deep Forest background
    ctx.fillRect(0, 0, w, h);

    if (!beforeSpec || !beforeSpec.matrix) {
      ctx.fillStyle = '#C9BB9A';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('Awaiting audio stream...', w / 2 - 80, h / 2);
      return;
    }

    // 1. Noise Floor Subtraction and Percentile Clipping
    const sampleVals: number[] = [];
    const step = Math.max(1, Math.floor(beforeSpec.matrix.length / 500));
    for (let i = 0; i < beforeSpec.matrix.length; i += step) {
      sampleVals.push(beforeSpec.matrix[i]);
    }
    sampleVals.sort((a, b) => a - b);
    const noiseFloor = sampleVals[Math.floor(sampleVals.length * 0.15)] || 0.05;
    const peakEnergy = sampleVals[Math.floor(sampleVals.length * 0.98)] || 0.85;
    const energyRange = Math.max(1e-4, peakEnergy - noiseFloor);

    const imgData = ctx.createImageData(w, h);
    const pixels = imgData.data;

    const currentSweepCol = Math.floor(w * sweepProgress);
    const splitCol = isFixed && afterSpec ? Math.floor(w * splitPos) : w;

    for (let py = 0; py < h; py++) {
      const r = Math.floor((py / h) * numRows);
      for (let px = 0; px < w; px++) {
        const c = Math.floor((px / w) * numCols);
        const idx = (py * w + px) * 4;

        if (px > currentSweepCol) {
          pixels[idx] = 11;
          pixels[idx + 1] = 40;
          pixels[idx + 2] = 27;
          pixels[idx + 3] = 255;
          continue;
        }

        let rawVal: number;
        if (px < splitCol) {
          rawVal = beforeSpec.matrix[r * numCols + c] || 0;
        } else {
          rawVal = afterSpec?.matrix[r * numCols + c] || 0;
        }

        // Contrast stretching: subtract noise floor & clip to percentiles
        const normalized = Math.max(0, Math.min(1, (rawVal - noiseFloor) / energyRange));

        // Monotone lightness colormap: deep forest -> forest -> lime -> cream
        const [rVal, gVal, bVal] = getV3ColormapRgb(normalized);

        pixels[idx] = rVal;
        pixels[idx + 1] = gVal;
        pixels[idx + 2] = bVal;
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 2. Ultrasonic Band Shading (17-22 kHz) with cross-hatch pattern for color-blind safety
    const nyquist = sampleRate / 2;
    if (nyquist >= 17000) {
      const yTop = mapFreqToY(Math.min(22000, nyquist), nyquist) * h;
      const yBottom = mapFreqToY(17000, nyquist) * h;
      if (yBottom > yTop) {
        ctx.fillStyle = 'rgba(163, 42, 31, 0.12)';
        ctx.fillRect(0, yTop, w, yBottom - yTop);
        ctx.strokeStyle = '#A32A1F';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(0, yTop, w, yBottom - yTop);
        ctx.setLineDash([]);
      }
    }

    // 3. Playhead Sync Line
    if (effectiveCurrentTime > 0 && duration > 0) {
      const playheadX = Math.floor((effectiveCurrentTime / duration) * w);
      if (playheadX >= 0 && playheadX <= w) {
        ctx.strokeStyle = '#8BCF55';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, h);
        ctx.stroke();

        // Draw playhead timestamp badge at top of line
        ctx.fillStyle = '#8BCF55';
        ctx.fillRect(Math.max(0, Math.min(w - 48, playheadX - 24)), 2, 48, 16);
        ctx.fillStyle = '#10291D';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(`${effectiveCurrentTime.toFixed(1)}s`, Math.max(4, Math.min(w - 44, playheadX - 18)), 13);
      }
    }

    // 4. Draggable Split Divider Line & Handle (if in Fixed mode)
    if (isFixed && afterSpec) {
      const sx = splitCol;
      ctx.strokeStyle = '#8BCF55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();

      ctx.fillStyle = '#8BCF55';
      ctx.beginPath();
      ctx.arc(sx, h / 2, 9, 0, Math.PI * 2);
      ctx.fill();

      // Badges
      ctx.fillStyle = '#FAF5EB';
      ctx.fillRect(12, 12, 140, 24);
      ctx.strokeStyle = '#A32A1F';
      ctx.strokeRect(12, 12, 140, 24);
      ctx.fillStyle = '#A32A1F';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('◄ ORIGINAL (LEAKS)', 16, 28);

      ctx.fillStyle = '#FAF5EB';
      ctx.fillRect(w - 152, 12, 140, 24);
      ctx.strokeStyle = '#174D35';
      ctx.strokeRect(w - 152, 12, 140, 24);
      ctx.fillStyle = '#174D35';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('SANITIZED (CLEAN) ►', w - 146, 28);
    }

    // 5. Dynamic Frequency Marker Chips with Warning Red Outlines
    for (const hf of highlightFreqs) {
      const yNorm = mapFreqToY(hf.freq, nyquist);
      const y = yNorm * h;

      if (y >= 0 && y <= h) {
        const endX = isFixed && afterSpec ? splitCol : w;
        const isHovered = hoveredFindingId && hf.findingId === hoveredFindingId;
        const borderColor = '#A32A1F'; // Brick red for leaks

        // Leader line
        ctx.strokeStyle = borderColor;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Anchor
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.arc(16, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Chip
        const labelText = hf.label;
        const pillWidth = Math.max(135, labelText.length * 7.5 + 24);
        const pillX = Math.max(12, endX - pillWidth - 12);
        const pillY = Math.max(8, Math.min(h - 28, y - 13));

        ctx.fillStyle = '#FAF5EB';
        ctx.fillRect(pillX, pillY, pillWidth, 24);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeRect(pillX, pillY, pillWidth, 24);

        ctx.fillStyle = '#10291D';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(labelText, pillX + 8, pillY + 16);
      }
    }
  }, [
    beforeSpec,
    afterSpec,
    sweepProgress,
    splitPos,
    isFixed,
    highlightFreqs,
    sampleRate,
    numCols,
    numRows,
    hoveredFindingId,
    scale,
    effectiveCurrentTime,
  ]);

  // Pointer Handlers: Drag split in Fixed mode, or Seek audio on canvas click
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isFixed && afterSpec && Math.abs(x - splitPos) < 0.08) {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      handleSeek(x * duration);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isDragging) {
      setSplitPos(x);
    }

    const nyquist = sampleRate / 2;
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const freq = Math.round(mapYToFreq(y, nyquist));
    const time = Number((x * duration).toFixed(2));
    setHoverInfo({ freq, time });
  };

  const handlePointerUp = () => setIsDragging(false);
  const handlePointerLeave = () => {
    setIsDragging(false);
    setHoverInfo(null);
  };

  return (
    <div className="rounded-2xl border border-forest/30 bg-forest-deep p-4 shadow-data overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/30 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-lime" />
          <h3 className="font-display text-base font-bold text-cream">
            Acoustic Spectrum X-Ray
          </h3>
          <span className="rounded bg-forest/50 border border-lime/30 px-2 py-0.5 font-mono text-[11px] text-lime font-bold">
            0 Hz – {(sampleRate / 2000).toFixed(1)} kHz
          </span>
        </div>

        {/* Scale Switch (Linear / Log / Mel) */}
        <div className="flex items-center gap-1 rounded-xl bg-forest/40 border border-forest/60 p-0.5 font-mono text-[10px]">
          {(['linear', 'log', 'mel'] as FrequencyScale[]).map(s => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`px-2 py-0.5 rounded-lg font-bold uppercase transition ${
                scale === s ? 'bg-lime text-forest-ink shadow-sm' : 'text-cream/70 hover:text-cream'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {isFixed && afterSpec && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-lime font-bold">
            <SplitSquareHorizontal className="h-4 w-4 text-lime" />
            <span>Drag slider to compare Before / After</span>
          </div>
        )}

        {hoverInfo && (
          <div className="flex items-center gap-2 font-mono text-xs text-cream/90 bg-forest/40 border border-forest/50 px-2.5 py-1 rounded-lg">
            <Crosshair className="h-3.5 w-3.5 text-lime" />
            <span>{hoverInfo.freq.toLocaleString()} Hz</span>
            <span className="text-cream/40">|</span>
            <span>{hoverInfo.time}s</span>
          </div>
        )}
      </div>

      {/* Main Spectrogram with Color Bar */}
      <div className="flex items-stretch gap-2.5">
        <div className="relative aspect-[16/8] flex-1 rounded-xl overflow-hidden border border-forest/40 bg-forest-deep cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={720}
            height={320}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="h-full w-full object-fill touch-none"
          />
        </div>

        {/* Vertical dB Colormap Legend */}
        <div className="flex flex-col items-center justify-between py-1 text-[9px] font-mono text-cream/70 shrink-0">
          <span>0 dB</span>
          <div
            className="w-3 flex-1 my-1 rounded border border-forest/60"
            style={{
              background: 'linear-gradient(to bottom, #FAF5EB, #8BCF55, #174D35, #0B281B)',
            }}
          />
          <span>-80 dB</span>
        </div>
      </div>

      {/* Frequency & Time Axis Labels + Suspicious Legend */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-cream/70">
        <div className="flex items-center gap-4">
          <span>0.0s</span>
          <span>{(duration * 0.25).toFixed(1)}s</span>
          <span>{(duration * 0.5).toFixed(1)}s</span>
          <span>{(duration * 0.75).toFixed(1)}s</span>
          <span>{duration.toFixed(1)}s</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-cream/80">
          <span className="inline-block h-2 w-2 rounded-full bg-brick animate-pulse" />
          <span className="text-brick font-semibold">Red Overlay:</span>
          <span>Suspicious acoustic beacon / grid hum anomaly</span>
        </div>
      </div>

      {/* Integrated Audio Playback & Scrubbing Toolbar */}
      {audioUrl && (
        <div className="mt-3.5 pt-3 border-t border-forest/40 flex flex-wrap items-center justify-between gap-3">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => audioRef.current && setPlaybackTime(audioRef.current.currentTime)}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackTime(0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* Left Controls: Play/Pause, Rewind, Time Readout */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-lime text-forest font-bold hover:bg-lime-bright active:scale-95 transition shadow-sm"
              title={isPlaying ? 'Pause audio' : 'Play audio recording'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-forest" />
              ) : (
                <Play className="h-5 w-5 fill-forest ml-0.5" />
              )}
            </button>

            <button
              onClick={handleRestart}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-forest/40 border border-forest/60 text-cream hover:bg-forest/60 active:scale-95 transition"
              title="Restart from beginning"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="font-mono text-xs sm:text-sm font-bold text-cream pl-1">
              <span>
                {Math.floor(effectiveCurrentTime / 60)}:
                {(effectiveCurrentTime % 60).toFixed(1).padStart(4, '0')}
              </span>
              <span className="text-cream/40 px-1">/</span>
              <span className="text-cream/70">
                {Math.floor(duration / 60)}:
                {(duration % 60).toFixed(1).padStart(4, '0')}
              </span>
            </div>
          </div>

          {/* Center: Interactive Scrubber Slider */}
          <div className="flex-1 min-w-[140px] max-w-md flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={effectiveCurrentTime}
              onChange={e => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-forest/60 rounded-lg appearance-none cursor-pointer accent-[#8BCF55]"
            />
          </div>

          {/* Right Status Badge */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-cream/70 bg-forest/30 border border-forest/50 px-2.5 py-1.5 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
            <span>Real Audio: {sampleRate.toLocaleString()} Hz</span>
          </div>
        </div>
      )}
    </div>
  );
};
