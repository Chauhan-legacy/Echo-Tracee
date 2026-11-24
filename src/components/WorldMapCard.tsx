import React, { useEffect, useRef } from 'react';
import { MapPin, Globe, Camera, Calendar, ShieldCheck } from 'lucide-react';
import { MetadataReport } from '../types';
import { drawForensicWorldMap } from '../analyzers/metadata';

interface WorldMapCardProps {
  metadata: MetadataReport;
  isFixed?: boolean;
}

export const WorldMapCard: React.FC<WorldMapCardProps> = ({ metadata, isFixed = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isFixed || !metadata.gps) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#080B11';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#4B5565';
        ctx.font = '12px monospace';
        ctx.fillText(
          isFixed ? 'Geolocation metadata stripped.' : 'No GPS metadata found in file.',
          canvas.width / 2 - 110,
          canvas.height / 2
        );
      }
      return;
    }

    let animId: number;
    let tick = 0;

    const render = () => {
      drawForensicWorldMap(canvas, metadata.gps!.latitude, metadata.gps!.longitude, tick);
      tick++;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [metadata, isFixed]);

  return (
    <div className="rounded-xl border border-term-border bg-term-card p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-term-border pb-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Forensic Geolocation Radar
          </h4>
        </div>
        {metadata.isDemo && (
          <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
            DEMO GPS
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-term-border bg-[#080B11]">
        <canvas
          ref={canvasRef}
          width={540}
          height={220}
          className="h-48 w-full"
        />

        {isFixed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-term-bg/85 backdrop-blur-sm p-4 text-center">
            <ShieldCheck className="h-10 w-10 text-emerald-400 mb-2" />
            <h5 className="font-bold text-white text-sm">GPS Stripped & Cleaned</h5>
            <p className="text-xs text-term-dim max-w-xs mt-1">
              All QuickTime and EXIF geolocation atoms have been completely wiped. Zero location leakage.
            </p>
          </div>
        )}
      </div>

      {/* Metadata tags grid */}
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {metadata.gps && !isFixed ? (
          <div className="flex items-center gap-2 rounded-lg bg-term-bg p-2 font-mono text-[11px] text-white">
            <MapPin className="h-4 w-4 text-[#FF3366] shrink-0" />
            <span className="truncate">
              {metadata.gps.latitude.toFixed(4)}°N, {metadata.gps.longitude.toFixed(4)}°E
            </span>
          </div>
        ) : null}

        {metadata.deviceModel && (
          <div className="flex items-center gap-2 rounded-lg bg-term-bg p-2 font-mono text-[11px] text-term-dim">
            <Camera className="h-4 w-4 text-cyan shrink-0" />
            <span className="truncate">{metadata.deviceModel}</span>
          </div>
        )}

        {metadata.creationTime && (
          <div className="flex items-center gap-2 rounded-lg bg-term-bg p-2 font-mono text-[11px] text-term-dim">
            <Calendar className="h-4 w-4 text-cyan shrink-0" />
            <span className="truncate">{metadata.creationTime}</span>
          </div>
        )}
      </div>
    </div>
  );
};
