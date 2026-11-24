import React, { useEffect, useRef } from 'react';

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

      // Pulse cycle for red tracker line appearance
      const trackerPulse = (Math.sin(offset * 0.06) + 1) * 0.5; // 0 to 1

      for (let y = 0; y < h; y++) {
        const normY = y / h; // 0 = top (high freq ~22kHz), 1 = bottom (low freq 0Hz)
        for (let x = 0; x < w; x++) {
          const t = (x + offset * 0.8) * 0.05;
          // Ultrasonic tracker tone at top (normY around 0.12)
          const trackerEnergy = Math.exp(-Math.pow((normY - 0.12) / 0.02, 2)) * 0.95 * trackerPulse;
          // Mains hum at bottom (normY around 0.95)
          const humEnergy = Math.exp(-Math.pow((normY - 0.95) / 0.03, 2)) * 0.85;
          // Room speech/acoustic formants in middle (normY around 0.5 to 0.8)
          const speechFormant1 = Math.exp(-Math.pow((normY - 0.65) / 0.08, 2)) * Math.max(0, Math.sin(t * 1.2) * Math.cos(t * 0.7));
          const speechFormant2 = Math.exp(-Math.pow((normY - 0.45) / 0.06, 2)) * Math.max(0, Math.cos(t * 1.5));
          const noise = ((Math.sin(x * 12.9898 + y * 78.233 + offset) * 43758.5453) % 1) * 0.06;

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

      // Red tracker line (19.4 kHz) appears and pulses
      const trackerY = h * 0.12;
      ctx.strokeStyle = `rgba(220, 38, 38, ${Math.max(0.3, trackerPulse)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, trackerY);
      ctx.lineTo(w, trackerY);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative rounded-2xl border border-forest/30 bg-[#0B281B] p-2.5 sm:p-3 shadow-data overflow-hidden">
      <div className="relative aspect-[16/7] sm:aspect-[16/8] w-full rounded-xl overflow-hidden border border-forest/40">
        <canvas
          ref={canvasRef}
          width={320}
          height={140}
          className="h-full w-full object-cover"
        />
        {/* Tracker Beacon Callout */}
        <div className="absolute top-1.5 left-2 rounded bg-[#0B281B]/90 border border-brick px-2 py-0.5 text-[10px] font-mono text-cream font-bold flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brick animate-ping" />
          <span>19.4 kHz Tracker Beacon</span>
        </div>
        {/* Mains Hum Callout */}
        <div className="absolute bottom-1.5 left-2 rounded bg-[#0B281B]/90 border border-ochre px-2 py-0.5 text-[10px] font-mono text-cream font-bold">
          50 Hz Power Hum
        </div>
      </div>
    </div>
  );
};
