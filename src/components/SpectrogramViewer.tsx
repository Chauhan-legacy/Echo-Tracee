import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Volume2, Crosshair, SplitSquareHorizontal } from 'lucide-react';
import { computeRealSpectrogram } from '../dsp/spectrogram';
import { getV3ColormapRgb } from './MiniLiveSpectrogram';

interface SpectrogramViewerProps {
  channelData: Float32Array | null;
  cleanChannelData?: Float32Array | null;
  sampleRate: number;
  isScanning?: boolean;
  highlightFreqs?: { freq: number; label: string; color: string; findingId?: string }[];
  isFixed?: boolean;
  hoveredFindingId?: string | null;
  onHoverFinding?: (id: string | null) => void;
}

export const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({
  channelData,
  cleanChannelData,
  sampleRate,
  isScanning = false,
  highlightFreqs = [],
  isFixed = false,
  hoveredFindingId = null,
  onHoverFinding,
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

  // Canvas rendering with custom monotone-lightness colormap & noise floor subtraction
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

    // 2. Ultrasonic Band Shading (17-22 kHz)
    const nyquist = sampleRate / 2;
    if (nyquist >= 17000) {
      const yTop = Math.max(0, (1 - Math.min(22000, nyquist) / nyquist) * h);
      const yBottom = Math.max(0, (1 - 17000 / nyquist) * h);
      if (yBottom > yTop) {
        ctx.fillStyle = 'rgba(163, 42, 31, 0.08)';
        ctx.fillRect(0, yTop, w, yBottom - yTop);
        ctx.strokeStyle = 'rgba(163, 42, 31, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(0, yTop, w, yBottom - yTop);
        ctx.setLineDash([]);
      }
    }

    // 3. Draggable Split Divider Line & Handle (if in Fixed mode)
    if (isFixed && afterSpec) {
      const sx = splitCol;
      ctx.strokeStyle = '#8BCF55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
      ctx.stroke();

      // Handle circle
      ctx.fillStyle = '#8BCF55';
      ctx.beginPath();
      ctx.arc(sx, h / 2, 9, 0, Math.PI * 2);
      ctx.fill();

      // Badges: "ORIGINAL (LEAKS)" vs "SANITIZED (CLEAN)"
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

    // 4. Dynamic Frequency Marker Chips: Cream chips with brick/ochre borders
    for (const hf of highlightFreqs) {
      const yNorm = 1 - hf.freq / nyquist;
      const y = yNorm * h;
      if (y >= 0 && y <= h) {
        const endX = isFixed && afterSpec ? splitCol : w;
        const isHovered = hoveredFindingId && hf.findingId === hoveredFindingId;
        const borderColor = hf.color.includes('brick') || hf.color.includes('A32A1F') || hf.color.includes('red')
          ? '#A32A1F'
          : '#7A4E00';

        // Leader line
        ctx.strokeStyle = borderColor;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Frequency target anchor point
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.arc(16, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Cream chip with brick/ochre border (V3 rule)
        const labelText = hf.label;
        const pillWidth = Math.max(135, labelText.length * 7.5 + 24);
        const pillX = Math.max(12, endX - pillWidth - 12);
        const pillY = Math.max(8, Math.min(h - 28, y - 13));

        ctx.fillStyle = '#FAF5EB'; // Cream fill
        ctx.fillRect(pillX, pillY, pillWidth, 24);
        ctx.strokeStyle = borderColor; // Brick or Ochre border
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeRect(pillX, pillY, pillWidth, 24);

        ctx.fillStyle = '#10291D'; // Ink text
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(labelText, pillX + 8, pillY + 16);
      }
    }
  }, [beforeSpec, afterSpec, sweepProgress, splitPos, isFixed, highlightFreqs, sampleRate, numCols, numRows, hoveredFindingId]);

  // Mouse / Touch handlers for split-slider dragging and frequency inspection
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isFixed || !afterSpec) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (Math.abs(x - splitPos) < 0.08) {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
    const freq = Math.round((1 - y) * nyquist);
    const time = Number((x * duration).toFixed(2));
    setHoverInfo({ freq, time });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

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

      {/* Canvas Area */}
      <div className="relative aspect-[16/8] w-full rounded-xl overflow-hidden border border-forest/40 bg-forest-deep cursor-crosshair">
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

      {/* Frequency & Time Axis Labels */}
      <div className="mt-2.5 flex justify-between text-xs font-mono text-cream/70">
        <span>0.0s</span>
        <span>{(duration * 0.25).toFixed(1)}s</span>
        <span>{(duration * 0.5).toFixed(1)}s</span>
        <span>{(duration * 0.75).toFixed(1)}s</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
};
