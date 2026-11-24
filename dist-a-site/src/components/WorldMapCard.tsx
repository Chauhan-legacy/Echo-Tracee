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
        ctx.fillStyle = '#0B281B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#C9BB9A';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText(
          isFixed ? 'Geolocation metadata stripped.' : 'No GPS metadata found in file.',
          canvas.width / 2 - 120,
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
    <div className="rounded-2xl border border-beige-hairline bg-beige-card p-5 shadow-panel">
      <div className="mb-3 flex items-center justify-between border-b border-beige-hairline pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-forest" />
          <h4 className="font-display text-sm font-bold text-forest-ink">
            Forensic Geolocation Radar
          </h4>
        </div>
        {metadata.isDemo && (
          <span className="rounded bg-ochre/20 border border-ochre/40 px-2 py-0.5 font-mono text-[10px] text-ochre font-bold">
            DEMO GPS
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-forest/30 bg-forest-deep shadow-data">
        <canvas
          ref={canvasRef}
          width={540}
          height={220}
          className="h-48 w-full"
        />

        {isFixed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-forest-deep/90 backdrop-blur-sm p-4 text-center">
            <ShieldCheck className="h-10 w-10 text-lime mb-2" />
            <h5 className="font-display font-bold text-cream text-base">GPS Stripped & Cleaned</h5>
            <p className="text-xs text-cream/70 max-w-xs mt-1">
              All QuickTime and EXIF geolocation atoms have been completely wiped. Zero location leakage.
            </p>
          </div>
        )}
      </div>

      {/* Metadata tags grid */}
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {metadata.gps && !isFixed ? (
          <div className="flex items-center gap-2 rounded-xl bg-beige-sunken p-2.5 font-mono text-[11px] text-forest-ink border border-beige-hairline">
            <MapPin className="h-4 w-4 text-brick shrink-0" />
            <span className="truncate">
              {metadata.gps.latitude.toFixed(4)}°N, {metadata.gps.longitude.toFixed(4)}°E
            </span>
          </div>
        ) : null}

        {metadata.deviceModel && (
          <div className="flex items-center gap-2 rounded-xl bg-beige-sunken p-2.5 font-mono text-[11px] text-forest-muted border border-beige-hairline">
            <Camera className="h-4 w-4 text-forest shrink-0" />
            <span className="truncate">{metadata.deviceModel}</span>
          </div>
        )}

        {metadata.creationTime && (
          <div className="flex items-center gap-2 rounded-xl bg-beige-sunken p-2.5 font-mono text-[11px] text-forest-muted border border-beige-hairline sm:col-span-2">
            <Calendar className="h-4 w-4 text-forest shrink-0" />
            <span className="truncate">{metadata.creationTime}</span>
          </div>
        )}
      </div>
    </div>
  );
};
