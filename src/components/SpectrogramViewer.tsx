import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Volume2, Crosshair, SplitSquareHorizontal } from 'lucide-react';
import { computeRealSpectrogram } from '../dsp/spectrogram';

interface SpectrogramViewerProps {
  channelData: Float32Array | null;
  cleanChannelData?: Float32Array | null;
  sampleRate: number;
  isScanning?: boolean;
  highlightFreqs?: { freq: number; label: string; color: string }[];
  isFixed?: boolean;
}

/**
 * Standard perceptual Inferno colormap mapping [0, 1] -> [R, G, B].
 * High dynamic range, monotonic lightness, zero false hue artifacts.
 */
function getInfernoRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.25) {
    const u = x / 0.25;
    return [
      Math.floor(0 + u * 87),
      Math.floor(0 + u * 16),
      Math.floor(4 + u * 106),
    ];
  } else if (x < 0.5) {
    const u = (x - 0.25) / 0.25;
    return [
      Math.floor(87 + u * 100),
      Math.floor(16 + u * 39),
      Math.floor(110 - u * 26),
    ];
  } else if (x < 0.75) {
    const u = (x - 0.5) / 0.25;
    return [
      Math.floor(187 + u * 62),
      Math.floor(55 + u * 87),
      Math.floor(84 - u * 75),
    ];
  } else {
    const u = (x - 0.75) / 0.25;
    return [
      Math.floor(249 + u * 3),
      Math.floor(142 + u * 113),
      Math.floor(9 + u * 155),
    ];
  }
}

export const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({
  channelData,
  cleanChannelData,
  sampleRate,
  isScanning = false,
  highlightFreqs = [],
  isFixed = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ freq: number; time: number } | null>(null);
  const [sweepProgress, setSweepProgress] = useState(0);

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

  // Canvas rendering with perceptual inferno colormap & noise floor subtraction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#05070D';
    ctx.fillRect(0, 0, w, h);

    if (!beforeSpec || !beforeSpec.matrix) {
      ctx.fillStyle = '#8E9BAE';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('Awaiting audio stream...', w / 2 - 80, h / 2);
      return;
    }

    // 1. Noise Floor Subtraction and Percentile Clipping (Requirement E.10)
    // Sample matrix values to estimate noise baseline and high percentile energy
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
          pixels[idx] = 5;
          pixels[idx + 1] = 7;
          pixels[idx + 2] = 13;
          pixels[idx + 3] = 255;
          continue;
        }

        // Before or After matrix depending on split slider position
        let rawVal: number;
        if (px < splitCol) {
          rawVal = beforeSpec.matrix[r * numCols + c] || 0;
        } else {
          rawVal = afterSpec?.matrix[r * numCols + c] || 0;
        }

        // Contrast stretching: subtract noise floor & clip
        const normalized = Math.max(0, Math.min(1, (rawVal - noiseFloor) / energyRange));

        // Apply true perceptual Inferno colormap
        const [rVal, gVal, bVal] = getInfernoRgb(normalized);

        pixels[idx] = rVal;
        pixels[idx + 1] = gVal;
        pixels[idx + 2] = bVal;
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 2. Subtle 17–22 kHz Ultrasonic Band Shading (Requirement E.11)
    const nyquist = sampleRate / 2;
    if (nyquist >= 17000) {
      const yTop = Math.max(0, (1 - Math.min(22000, nyquist) / nyquist) * h);
      const yBottom = Math.max(0, (1 - 17000 / nyquist) * h);
      if (yBottom > yTop) {
        ctx.fillStyle = 'rgba(255, 51, 102, 0.07)';
        ctx.fillRect(0, yTop, w, yBottom - yTop);
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(0, yTop, w, yBottom - yTop);
        ctx.setLineDash([]);
      }
    }

    // 3. Draggable Split Divider Line & Handle (if in Fixed mode)
    if (isFixed && afterSpec) {
      const sx = splitCol;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Handle Diamond / Circle
      ctx.fillStyle = '#00F0FF';
      ctx.beginPath();
      ctx.arc(sx, h / 2, 9, 0, Math.PI * 2);
      ctx.fill();

      // Badges: "ORIGINAL (LEAKS)" vs "SANITIZED (CLEAN)"
      ctx.fillStyle = 'rgba(13, 18, 31, 0.9)';
      ctx.fillRect(12, 12, 140, 24);
      ctx.fillStyle = '#FF3366';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('◄ ORIGINAL (LEAKS)', 18, 28);

      ctx.fillStyle = 'rgba(13, 18, 31, 0.9)';
      ctx.fillRect(w - 152, 12, 140, 24);
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText('SANITIZED (CLEAN) ►', w - 146, 28);
    }

    // 4. Dynamic Frequency Marker Lines with Leader Lines (ONLY when finding exists)
    for (const hf of highlightFreqs) {
      const yNorm = 1 - hf.freq / nyquist;
      const y = yNorm * h;
      if (y >= 0 && y <= h) {
        const endX = isFixed && afterSpec ? splitCol : w;

        // Leader line
        ctx.strokeStyle = hf.color;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Frequency target anchor point
        ctx.fillStyle = hf.color;
        ctx.beginPath();
        ctx.arc(20, y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast readable marker label pill (12px JetBrains Mono)
        const labelText = hf.label;
        const pillWidth = Math.max(140, labelText.length * 7.5 + 20);
        const pillX = Math.max(12, endX - pillWidth - 12);
        const pillY = Math.max(8, Math.min(h - 26, y - 12));

        ctx.fillStyle = 'rgba(13, 18, 31, 0.92)';
        ctx.strokeStyle = hf.color;
        ctx.lineWidth = 1;
        ctx.fillRect(pillX, pillY, pillWidth, 22);
        ctx.strokeRect(pillX, pillY, pillWidth, 22);

        ctx.fillStyle = hf.color;
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(labelText, pillX + 10, pillY + 15);
      }
    }
  }, [beforeSpec, afterSpec, sweepProgress, splitPos, isFixed, highlightFreqs, sampleRate]);

  // Pointer interactions for dragging split slider
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isFixed || !afterSpec) return;
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, x / rect.width));
    const normY = Math.max(0, Math.min(1, y / rect.height));

    if (isDragging && isFixed && afterSpec) {
      setSplitPos(normX);
    }

    const maxFreq = sampleRate / 2;
    const freq = Math.round((1 - normY) * maxFreq);
    const time = Number((normX * duration).toFixed(2));

    setHoverInfo({ freq, time });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0D121F] p-5 shadow-xl space-y-3">
      {/* Header Row: Title & Diagnostics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <Volume2 className="h-5 w-5 text-cyan" />
          <h3 className="font-display text-base font-bold text-white tracking-wide">
            {isFixed ? 'Before / After Acoustic Comparison' : 'Spectrogram Frequency X-Ray'}
          </h3>
          <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-term-dim">
            0 – {(sampleRate / 2000).toFixed(1)} kHz
          </span>
        </div>

        {isFixed && (
          <div className="flex items-center gap-1.5 font-mono text-xs text-cyan bg-cyan/10 border border-cyan/30 px-2.5 py-1 rounded-lg">
            <SplitSquareHorizontal className="h-4 w-4" />
            <span>Drag slider to compare original vs cleaned audio</span>
          </div>
        )}

        {hoverInfo ? (
          <div className="flex items-center gap-3 font-mono text-xs text-cyan">
            <span className="flex items-center gap-1">
              <Crosshair className="h-3.5 w-3.5" /> {hoverInfo.freq.toLocaleString()} Hz
            </span>
            <span className="text-term-dim">{hoverInfo.time}s</span>
          </div>
        ) : (
          <span className="text-xs text-term-dim hidden sm:inline">
            Hover or touch canvas to inspect exact frequencies
          </span>
        )}
      </div>

      {/* Main Spectrogram Canvas with High-Contrast Frequency & Time Axes */}
      <div className="relative overflow-hidden rounded-xl bg-[#05070D] touch-none select-none border border-white/5">
        <canvas
          ref={canvasRef}
          width={720}
          height={240}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setIsDragging(false);
            setHoverInfo(null);
          }}
          className={`h-56 sm:h-64 w-full ${
            isFixed ? 'cursor-ew-resize' : 'cursor-crosshair'
          }`}
        />

        {/* Larger Axis Labels (Requirement E.10) */}
        <div className="pointer-events-none absolute left-3 top-2 rounded bg-[#0D121F]/90 border border-white/10 px-1.5 py-0.5 font-mono text-xs text-white backdrop-blur">
          {(sampleRate / 2000).toFixed(1)} kHz
        </div>
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded bg-[#0D121F]/90 border border-white/10 px-1.5 py-0.5 font-mono text-xs text-white backdrop-blur">
          {(sampleRate / 4000).toFixed(1)} kHz
        </div>
        <div className="pointer-events-none absolute bottom-2 left-3 rounded bg-[#0D121F]/90 border border-white/10 px-1.5 py-0.5 font-mono text-xs text-white backdrop-blur">
          0 Hz
        </div>

        {/* Ultrasonic 17-22 kHz Band Indicator */}
        {sampleRate >= 44100 && (
          <div className="pointer-events-none absolute right-3 top-2 rounded bg-red-950/40 border border-red-500/30 px-2 py-0.5 font-mono text-[11px] text-red-400">
            17–22 kHz Ultrasonic Band
          </div>
        )}
      </div>

      {/* Time Axis Row */}
      <div className="flex items-center justify-between text-xs text-term-dim font-mono px-1">
        <span>0.0s</span>
        <span className="text-term-dim/80">
          {isFixed ? 'Drag divider left or right' : 'Perceptual Inferno Colormap • Noise Floor Subtracted'}
        </span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
};
