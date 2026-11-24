import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

/**
 * Custom monotone-lightness colormap:
 * deep forest (#0B281B) -> forest (#174D35) -> lime (#8BCF55) -> cream (#FAF5EB)
 */
export function getV3ColormapRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.35) {
    const u = x / 0.35;
    return [
      Math.floor(11 + u * (23 - 11)),
      Math.floor(40 + u * (77 - 40)),
      Math.floor(27 + u * (53 - 27)),
    ];
  } else if (x < 0.75) {
    const u = (x - 0.35) / 0.40;
    return [
      Math.floor(23 + u * (139 - 23)),
      Math.floor(77 + u * (207 - 77)),
      Math.floor(53 + u * (85 - 53)),
    ];
  } else {
    const u = (x - 0.75) / 0.25;
    return [
      Math.floor(139 + u * (250 - 139)),
      Math.floor(207 + u * (245 - 207)),
      Math.floor(85 + u * (235 - 85)),
    ];
  }
}

export const MiniLiveSpectrogram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      offset = (offset + 1.2) % 1000;
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      for (let y = 0; y < h; y++) {
        const normY = y / h; // 0 = top (high freq ~22kHz), 1 = bottom (low freq 0Hz)
        for (let x = 0; x < w; x++) {
          const t = (x + offset * 0.8) * 0.05;
          // Ultrasonic tracker tone at top (normY around 0.12)
          const trackerEnergy = Math.exp(-Math.pow((normY - 0.12) / 0.02, 2)) * 0.95 * (Math.sin(t * 3.5) > 0 ? 1 : 0.05);
          // Mains hum at bottom (normY around 0.95)
          const humEnergy = Math.exp(-Math.pow((normY - 0.95) / 0.03, 2)) * 0.85;
          // Room speech/acoustic formants in middle (normY around 0.5 to 0.8)
          const speechFormant1 = Math.exp(-Math.pow((normY - 0.65) / 0.08, 2)) * Math.max(0, Math.sin(t * 1.2) * Math.cos(t * 0.7));
          const speechFormant2 = Math.exp(-Math.pow((normY - 0.45) / 0.06, 2)) * Math.max(0, Math.cos(t * 1.5));
          const noise = (Math.sin(x * 12.9898 + y * 78.233 + offset) * 43758.5453) % 1 * 0.08;

          const energy = Math.max(0, Math.min(1, trackerEnergy + humEnergy + speechFormant1 * 0.7 + speechFormant2 * 0.5 + noise));
          const [r, g, b] = getV3ColormapRgb(energy);

          const idx = (y * w + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Grid overlay lines
      ctx.strokeStyle = 'rgba(139, 207, 85, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.12);
      ctx.lineTo(w, h * 0.12);
      ctx.moveTo(0, h * 0.95);
      ctx.lineTo(w, h * 0.95);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative rounded-2xl border border-forest/30 bg-forest-deep p-4 shadow-data overflow-hidden">
      <div className="flex items-center justify-between border-b border-forest/30 pb-2 mb-3">
        <div className="flex items-center gap-2 text-lime">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-lime">
            Live Acoustic Sensor Feed
          </span>
        </div>
        <span className="rounded bg-forest/40 border border-lime/30 px-2 py-0.5 font-mono text-[11px] text-lime font-bold">
          48 kHz STFT
        </span>
      </div>

      <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-forest/40">
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-2 left-2 rounded bg-forest-deep/90 border border-brick px-1.5 py-0.5 text-[10px] font-mono text-cream font-bold">
          19.4 kHz Ultrasonic Beacon
        </div>
        <div className="absolute bottom-2 left-2 rounded bg-forest-deep/90 border border-ochre px-1.5 py-0.5 text-[10px] font-mono text-cream font-bold">
          50.02 Hz Power Grid Hum
        </div>
      </div>
      <div className="mt-2.5 flex justify-between text-[11px] font-mono text-cream/70">
        <span>0 Hz</span>
        <span>1 kHz</span>
        <span>10 kHz</span>
        <span>24 kHz</span>
      </div>
    </div>
  );
};
