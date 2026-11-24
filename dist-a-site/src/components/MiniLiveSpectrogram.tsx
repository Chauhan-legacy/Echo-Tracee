import React, { useEffect, useRef, useState } from 'react';
import { Activity, Zap } from 'lucide-react';

/**
 * HiDPI Monotone Phosphor Forest Colormap:
 * Deep Forest (#071A12) -> Forest (#174D35) -> Emerald (#2E8555) -> Lime (#8BCF55) -> Neon Cream (#F5FFE6)
 */
export function getV4ColormapRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.25) {
    return [
      Math.floor(7 + (x / 0.25) * (23 - 7)),
      Math.floor(26 + (x / 0.25) * (77 - 26)),
      Math.floor(18 + (x / 0.25) * (53 - 18)),
    ];
  } else if (x < 0.65) {
    const u = (x - 0.25) / 0.40;
    return [
      Math.floor(23 + u * (46 - 23)),
      Math.floor(77 + u * (133 - 77)),
      Math.floor(53 + u * (85 - 53)),
    ];
  } else if (x < 0.90) {
    const u = (x - 0.65) / 0.25;
    return [
      Math.floor(46 + u * (139 - 46)),
      Math.floor(133 + u * (207 - 133)),
      Math.floor(85 + u * (85 - 85)),
    ];
  } else {
    const u = (x - 0.90) / 0.10;
    return [
      Math.floor(139 + u * (245 - 139)),
      Math.floor(207 + u * (255 - 207)),
      Math.floor(85 + u * (230 - 85)),
    ];
  }
}

export const getV3ColormapRgb = getV4ColormapRgb;

export const MiniLiveSpectrogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;
    const w = canvas.width;
    const h = canvas.height;

    const render = () => {
      offset = (offset + 1.4) % 2000;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      // Pulse cycle for red tracker line appearance
      const trackerPulse = (Math.sin(offset * 0.05) + 1) * 0.5; // 0 to 1
      const humMod = 0.8 + 0.2 * Math.sin(offset * 0.03);

      for (let y = 0; y < h; y++) {
        const normY = y / h; // 0 = 22.05 kHz, 1 = 0 Hz
        for (let x = 0; x < w; x++) {
          const t = (x + offset * 0.9) * 0.04;

          // 1. Ultrasonic tracker tone at top (19.4 kHz ~ normY 0.12)
          const trackerDist = Math.abs(normY - 0.12);
          const trackerEnergy = Math.exp(-Math.pow(trackerDist / 0.015, 2)) * 0.95 * trackerPulse;

          // 2. Mains hum at bottom (50 Hz ~ normY 0.96)
          const humDist = Math.abs(normY - 0.96);
          const humEnergy = Math.exp(-Math.pow(humDist / 0.02, 2)) * 0.88 * humMod;

          // 3. Acoustic speech formants & vocal harmonics (500 Hz - 3.5 kHz ~ normY 0.5 to 0.85)
          const formant1 = Math.exp(-Math.pow((normY - 0.68) / 0.07, 2)) * Math.max(0, Math.sin(t * 1.4) * Math.cos(t * 0.8));
          const formant2 = Math.exp(-Math.pow((normY - 0.52) / 0.05, 2)) * Math.max(0, Math.cos(t * 1.8) * Math.sin(t * 0.6));
          const formant3 = Math.exp(-Math.pow((normY - 0.38) / 0.04, 2)) * Math.max(0, Math.sin(t * 2.2) * 0.5);

          // 4. Subtle ambient acoustic noise floor
          const noise = ((Math.sin(x * 12.9898 + y * 78.233 + offset * 0.1) * 43758.5453) % 1) * 0.04;

          const totalEnergy = Math.max(
            0,
            Math.min(1, trackerEnergy + humEnergy + formant1 * 0.75 + formant2 * 0.55 + formant3 * 0.35 + noise)
          );

          const [r, g, b] = getV4ColormapRgb(totalEnergy);
          const idx = (y * w + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Draw frequency grid lines
      ctx.strokeStyle = 'rgba(139, 207, 85, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 10 kHz grid line
      const y10k = h * (1 - 10000 / 22050);
      ctx.beginPath();
      ctx.moveTo(0, y10k);
      ctx.lineTo(w, y10k);
      ctx.stroke();

      // 1 kHz grid line
      const y1k = h * (1 - 1000 / 22050);
      ctx.beginPath();
      ctx.moveTo(0, y1k);
      ctx.lineTo(w, y1k);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // Glowing Red Tracker Line (19.4 kHz)
      const trackerY = h * 0.12;
      ctx.save();
      ctx.shadowColor = '#DC2626';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0.4, trackerPulse)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, trackerY);
      ctx.lineTo(w, trackerY);
      ctx.stroke();
      ctx.restore();

      // Glowing Lime Mains Hum Line (50 Hz)
      const humY = h * 0.96;
      ctx.save();
      ctx.shadowColor = '#8BCF55';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = 'rgba(139, 207, 85, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, humY);
      ctx.lineTo(w, humY);
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    const freqHz = Math.round((1 - relY) * 22050);

    if (freqHz >= 18000) {
      setHoverInfo(`${freqHz} Hz — Ultrasonic Tracking Spectrum (CFAR Alert: 19.4 kHz)`);
    } else if (freqHz <= 120) {
      setHoverInfo(`${freqHz} Hz — Electrical Mains Frequency (50 Hz Grid Detected)`);
    } else if (freqHz >= 300 && freqHz <= 3400) {
      setHoverInfo(`${freqHz} Hz — Human Voice Formants & Room Reverberation`);
    } else {
      setHoverInfo(`${freqHz} Hz — Ambient Acoustic Noise Floor`);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverInfo(null)}
      className="relative rounded-2xl border border-forest/30 bg-[#071A12] p-3 shadow-panel overflow-hidden group select-none"
    >
      {/* Header bar of monitor */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-forest/30 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#8BCF55]">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[11px]">Real-Time Signal Intercept</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-cream/70">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brick animate-ping" />
            <span className="text-brick font-bold">19.4 kHz BEACON</span>
          </span>
          <span className="text-[#8BCF55] font-bold">50.02 Hz ENF</span>
        </div>
      </div>

      {/* Waterfall Display */}
      <div className="relative aspect-[16/8] sm:aspect-[16/9] w-full rounded-xl overflow-hidden border border-forest/40 bg-[#0B281B]">
        <canvas
          ref={canvasRef}
          width={640}
          height={280}
          className="h-full w-full object-cover"
        />

        {/* Right Frequency Scale Ticks */}
        <div className="absolute right-1 inset-y-1 flex flex-col justify-between text-[9px] font-mono text-[#8BCF55]/80 pointer-events-none text-right">
          <span className="bg-[#071A12]/80 px-1 rounded">22 kHz</span>
          <span className="bg-[#DC2626]/80 text-cream px-1 rounded font-bold">19.4k</span>
          <span className="bg-[#071A12]/80 px-1 rounded">10 kHz</span>
          <span className="bg-[#071A12]/80 px-1 rounded">1 kHz</span>
          <span className="bg-[#174D35]/80 text-[#8BCF55] px-1 rounded font-bold">50 Hz</span>
        </div>

        {/* Floating Tooltip */}
        {hoverInfo && (
          <div className="absolute top-2 left-2 rounded-lg bg-[#071A12]/95 border border-[#8BCF55]/50 px-2.5 py-1 text-[11px] font-mono text-[#8BCF55] shadow-elevated">
            {hoverInfo}
          </div>
        )}
      </div>

      {/* Monitor Footer Telemetry */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-forest/20 text-[10px] font-mono text-forest-muted">
        <div className="flex items-center gap-1.5 text-cream/80">
          <Zap className="h-3 w-3 text-[#8BCF55]" />
          <span>FFT 4096-pt • Hanning • Parabolic Sub-Bin Precision</span>
        </div>
        <span className="text-[#8BCF55]">0.005 Hz/bin</span>
      </div>
    </div>
  );
};
