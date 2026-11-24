import React, { useEffect, useRef } from 'react';

interface WaveformLogoProps {
  isScanning?: boolean;
}

export const WaveformLogo: React.FC<WaveformLogoProps> = ({ isScanning = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw subtle background waveform bars
      const numBars = 32;
      const barWidth = w / numBars;

      for (let i = 0; i < numBars; i++) {
        const x = i * barWidth;
        const norm = i / numBars;
        // Harmonic motion
        const heightFactor =
          Math.sin(norm * Math.PI * 4 + phase) * 0.4 +
          Math.sin(norm * Math.PI * 2 - phase * 0.5) * 0.3 +
          (isScanning ? Math.sin(phase * 3 + i) * 0.3 : 0.1);

        const barHeight = Math.max(4, Math.abs(heightFactor) * (h * 0.85));
        const y = (h - barHeight) / 2;

        const alpha = isScanning ? 0.35 + Math.sin(phase + i * 0.2) * 0.2 : 0.18;
        ctx.fillStyle = isScanning
          ? `rgba(0, 240, 255, ${alpha})`
          : `rgba(142, 155, 174, ${alpha})`;

        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
      }

      phase += isScanning ? 0.08 : 0.03;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isScanning]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden py-1">
      {/* Background canvas waveform */}
      <canvas
        ref={canvasRef}
        width={240}
        height={48}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      />
      {/* Brand Title */}
      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2">
        <span className="font-mono text-lg sm:text-2xl font-black tracking-wide sm:tracking-widest text-cyan drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          ECHO<span className="text-[#FF3366]">//</span>TRACE
        </span>
        <span className="hidden sm:inline rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan uppercase tracking-wider">
          v1.0
        </span>
      </div>
    </div>
  );
};
