/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useRef, useEffect, useState } from 'react';
import { Plane, Compass, ShieldAlert, ArrowRight, Activity, Crosshair } from 'lucide-react';
import { Finding } from '../types';
import { evaluateDopplerFreq } from '../../packages/echotrace-math/src/forensic/aircraftDoppler';

interface SkyLeakRadarCardProps {
  finding: Finding;
  onFix?: () => void;
  isFixed?: boolean;
}

export const SkyLeakRadarCard: React.FC<SkyLeakRadarCardProps> = ({
  finding,
  onFix,
  isFixed = false,
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sweepAngle, setSweepAngle] = useState(0);

  const speedKmh = Number(finding.details?.speedKmh) || 775;
  const speedKnots = Number(finding.details?.speedKnots) || 418;
  const dMinM = Number(finding.details?.closestApproachMeters) || 2100;
  const f0 = Number(finding.details?.bladePassFrequencyHz) || 160;
  const t0 = Number(finding.details?.inflectionTimeSec) || 7.5;
  const r2 = Number(finding.details?.goodnessOfFitR2) || 0.982;
  const geoRadius = Number(finding.details?.geolocationConfidenceRadiusM) || 95;
  const callsign = String(finding.details?.matchedFlightCallsign || 'DLH412');
  const model = String(finding.details?.aircraftModel || 'Airbus A321-271N');
  const corridor = String(finding.details?.flightCorridor || 'Regional Jetway Corridor UL-607');

  // Continuous sweeping radar beam animation (60 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      // 360 degrees in 3.5 seconds
      setSweepAngle(prev => (prev + (dt / 3.5) * Math.PI * 2) % (Math.PI * 2));
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 1. Render Plan Position Indicator (PPI) Circular Radar Scope
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) - 15;

    // Deep forest radar background
    ctx.fillStyle = '#071A12';
    ctx.fillRect(0, 0, w, h);

    // Range rings (1km, 2km, 3km, 5km scaled)
    ctx.strokeStyle = 'rgba(139, 207, 85, 0.25)';
    ctx.lineWidth = 1;
    for (let rFrac of [0.25, 0.5, 0.75, 1.0]) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * rFrac, 0, Math.PI * 2);
      ctx.stroke();

      // Range text
      ctx.fillStyle = 'rgba(139, 207, 85, 0.6)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`${(rFrac * 5).toFixed(0)}km`, cx + 4, cy - maxR * rFrac + 10);
    }

    // Crosshairs (N-S-E-W)
    ctx.beginPath();
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.stroke();

    // Cardinal directions
    ctx.fillStyle = '#8BCF55';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('N', cx - 3, cy - maxR + 9);
    ctx.fillText('S', cx - 3, cy + maxR - 2);
    ctx.fillText('E', cx + maxR - 10, cy + 3);
    ctx.fillText('W', cx - maxR + 2, cy + 3);

    // Flight Corridor Vector (Line passing listener at dMin)
    // Scale: maxR represents 5,000 meters
    const cpaPixels = Math.min(maxR * 0.9, (dMinM / 5000) * maxR);
    const flightAngle = -Math.PI / 6; // Heading 330 deg

    ctx.save();
    ctx.translate(cx, cy);

    // Flight track line
    ctx.strokeStyle = isFixed ? 'rgba(139, 207, 85, 0.3)' : 'rgba(163, 42, 31, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-maxR * 1.2, -cpaPixels);
    ctx.lineTo(maxR * 1.2, -cpaPixels);
    ctx.stroke();
    ctx.setLineDash([]);

    // Closest Point of Approach (CPA) Perpendicular Line
    ctx.strokeStyle = 'rgba(139, 207, 85, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -cpaPixels);
    ctx.stroke();

    // Aircraft Blip & Label
    const planeX = maxR * 0.35;
    const planeY = -cpaPixels;

    ctx.fillStyle = isFixed ? '#8BCF55' : '#A32A1F';
    ctx.beginPath();
    ctx.arc(planeX, planeY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Blip pulse ring
    ctx.strokeStyle = isFixed ? 'rgba(139, 207, 85, 0.5)' : 'rgba(163, 42, 31, 0.6)';
    ctx.beginPath();
    ctx.arc(planeX, planeY, 9 + Math.sin(sweepAngle * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Aircraft Transponder Label Box
    ctx.fillStyle = 'rgba(11, 40, 27, 0.92)';
    ctx.fillRect(planeX + 8, planeY - 18, 120, 26);
    ctx.strokeStyle = isFixed ? '#8BCF55' : '#A32A1F';
    ctx.strokeRect(planeX + 8, planeY - 18, 120, 26);

    ctx.fillStyle = '#FAF5EB';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`▲ ${callsign} [${model.split(' ')[0]}]`, planeX + 12, planeY - 6);
    ctx.fillStyle = isFixed ? '#8BCF55' : '#FF9999';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${speedKmh} km/h • CPA ${(dMinM / 1000).toFixed(1)}km`, planeX + 12, planeY + 4);

    // Triangulated Ground Geolocation Risk Circle (Center crosshair)
    ctx.fillStyle = isFixed ? 'rgba(139, 207, 85, 0.15)' : 'rgba(163, 42, 31, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isFixed ? '#8BCF55' : '#A32A1F';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FAF5EB';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 2. Rotating Radar Sweep Beam (Wedge gradient)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepAngle);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
    grad.addColorStop(0, 'rgba(139, 207, 85, 0.4)');
    grad.addColorStop(1, 'rgba(139, 207, 85, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, -0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Leading sweep line
    ctx.strokeStyle = '#8BCF55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(maxR, 0);
    ctx.stroke();

    ctx.restore();
  }, [sweepAngle, isFixed, speedKmh, dMinM, callsign, model]);

  // 2. Render Theoretical vs Observed Doppler S-Curve Plot
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0B281B';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 45;
    const padRight = 15;
    const padTop = 20;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Kinematic parameters
    const v = speedKmh / 3.6;
    const c = 343;
    const duration = 15.0;

    const fMax = f0 * (1 + v / c);
    const fMin = f0 * (1 - v / c);
    const freqSpan = fMax - fMin;

    // Gridlines
    ctx.strokeStyle = 'rgba(139, 207, 85, 0.15)';
    ctx.lineWidth = 1;
    for (let fStep = Math.floor(fMin / 20) * 20; fStep <= fMax + 10; fStep += 20) {
      const yNorm = 1.0 - (fStep - (fMin - 10)) / (freqSpan + 20);
      const y = padTop + yNorm * plotH;
      if (y >= padTop && y <= padTop + plotH) {
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(250, 245, 235, 0.5)';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`${fStep}Hz`, 8, y + 3);
      }
    }

    // Time axis gridlines
    for (let t = 0; t <= duration; t += 3) {
      const x = padLeft + (t / duration) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      ctx.fillStyle = 'rgba(250, 245, 235, 0.5)';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(`${t}s`, x - 6, h - 8);
    }

    // Draw theoretical Kinematic Doppler S-Curve f(t) = f0 * (1 - (v^2*(t-t0))/(c*sqrt(dMin^2 + v^2*(t-t0)^2)))
    ctx.strokeStyle = isFixed ? '#8BCF55' : '#FF4D4D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration;
      const f = evaluateDopplerFreq(t, f0, v, dMinM, t0, c);
      const x = padLeft + (t / duration) * plotW;
      const yNorm = 1.0 - (f - (fMin - 10)) / (freqSpan + 20);
      const y = padTop + Math.max(0, Math.min(1, yNorm)) * plotH;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mark Inflection Point (CPA overhead)
    const cpaX = padLeft + (t0 / duration) * plotW;
    const cpaYNorm = 1.0 - (f0 - (fMin - 10)) / (freqSpan + 20);
    const cpaY = padTop + cpaYNorm * plotH;

    ctx.fillStyle = '#8BCF55';
    ctx.beginPath();
    ctx.arc(cpaX, cpaY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Label Inflection point
    ctx.fillStyle = '#FAF5EB';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`CPA Inflection: ${f0.toFixed(0)} Hz @ ${t0.toFixed(1)}s`, Math.max(padLeft + 10, cpaX - 60), cpaY - 8);
  }, [speedKmh, dMinM, f0, t0, isFixed]);

  return (
    <div className="rounded-3xl border-2 border-forest/30 bg-beige-card p-4 sm:p-6 shadow-panel space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beige-hairline pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-forest text-lime shadow-sm">
            <Plane className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg sm:text-xl font-black text-forest-ink">
                SkyLeak: Acoustic ADS-B Aircraft Radar
              </h3>
              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isFixed ? 'bg-forest text-lime' : 'bg-brick/15 text-brick border border-brick/30'
              }`}>
                {isFixed ? 'NEUTRALIZED' : 'CRITICAL GEOLOCATION LEAK'}
              </span>
            </div>
            <p className="text-xs text-forest font-semibold">
              OSINT acoustic triangulation vector: Background aircraft Doppler shift correlated with public flight logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-beige-sunken px-2.5 py-1 font-mono text-xs font-bold text-forest-ink">
            Fit R² = {r2.toFixed(3)}
          </span>
          <span className="rounded-lg bg-forest text-lime px-2.5 py-1 font-mono text-xs font-bold">
            Accuracy: ±{geoRadius}m
          </span>
        </div>
      </div>

      {/* Main Radar Display & Doppler Curve Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: PPI Circular Radar Scope (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border-2 border-forest/40 bg-forest-deep p-3.5 flex flex-col items-center justify-between shadow-data">
          <div className="flex items-center justify-between w-full text-xs font-mono text-cream/80 border-b border-forest/40 pb-2 mb-2">
            <span className="font-bold flex items-center gap-1.5 text-lime">
              <Compass className="h-3.5 w-3.5" />
              <span>PLAN POSITION INDICATOR (PPI)</span>
            </span>
            <span className="text-[10px] text-cream/60">RANGE: 5.0 KM</span>
          </div>

          <div className="relative aspect-square w-full max-w-[280px]">
            <canvas
              ref={radarCanvasRef}
              width={560}
              height={560}
              className="w-full h-full rounded-full object-contain"
            />
          </div>

          <div className="w-full pt-2 mt-2 border-t border-forest/40 flex items-center justify-between text-[11px] font-mono text-cream/70">
            <span>Center: Observer Location</span>
            <span className="text-lime font-bold">Vector: 330° Heading</span>
          </div>
        </div>

        {/* Right: S-Curve Plot & ADS-B Flight Match Details (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3.5">
          {/* Kinematic S-Curve Canvas */}
          <div className="rounded-2xl border-2 border-forest/40 bg-forest-deep p-3.5 shadow-data space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-cream/80">
              <span className="font-bold text-lime flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>ACOUSTIC DOPPLER S-CURVE TRAJECTORY</span>
              </span>
              <span className="text-[10px] text-cream/60">
                f₀ = {f0.toFixed(0)} Hz • Δf = {((f0 * speedKmh) / (343 * 1.8)).toFixed(0)} Hz
              </span>
            </div>

            <div className="aspect-[16/7] w-full rounded-xl overflow-hidden border border-forest/40">
              <canvas
                ref={curveCanvasRef}
                width={640}
                height={280}
                className="w-full h-full object-fill"
              />
            </div>
          </div>

          {/* Flight Corridor & Telemetry Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="p-2.5 rounded-xl border border-beige-hairline bg-cream">
              <span className="text-[10px] text-forest font-bold uppercase block">Ground Speed</span>
              <span className="text-sm font-black text-forest-ink">{speedKmh} km/h</span>
              <span className="text-[10px] text-forest-muted block">{speedKnots} knots</span>
            </div>

            <div className="p-2.5 rounded-xl border border-beige-hairline bg-cream">
              <span className="text-[10px] text-forest font-bold uppercase block">CPA Slant Range</span>
              <span className="text-sm font-black text-forest-ink">{(dMinM / 1000).toFixed(2)} km</span>
              <span className="text-[10px] text-forest-muted block">{dMinM.toLocaleString()} meters</span>
            </div>

            <div className="p-2.5 rounded-xl border border-beige-hairline bg-cream">
              <span className="text-[10px] text-forest font-bold uppercase block">Matched Flight</span>
              <span className="text-sm font-black text-forest-ink">{callsign}</span>
              <span className="text-[10px] text-forest-muted block">{model.split(' ')[0]}</span>
            </div>

            <div className="p-2.5 rounded-xl border border-beige-hairline bg-cream">
              <span className="text-[10px] text-forest font-bold uppercase block">Geo Pinpoint</span>
              <span className="text-sm font-black text-brick">±{geoRadius}m</span>
              <span className="text-[10px] text-forest-muted block">Corridor Cut</span>
            </div>
          </div>

          {/* Threat Intelligence Box */}
          <div className="rounded-xl border border-beige-hairline bg-beige-sunken/60 p-3 text-xs text-forest-ink space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-forest">
                <ShieldAlert className="h-4 w-4 text-brick" />
                <span>How this leaks your location (Colsto OSINT Discovery):</span>
              </span>
              {!isFixed && onFix && (
                <button
                  onClick={onFix}
                  className="rounded-lg bg-forest text-lime font-mono text-xs font-bold px-3 py-1 hover:bg-forest-deep transition shadow-sm flex items-center gap-1"
                >
                  <span>Scrub Doppler Flight Curve</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-forest leading-relaxed">
              Turbofan blade passage tones shift predictably as an airplane passes overhead. By tracking this S-curve and querying public ADS-B flight radar databases (OpenSky / FlightRadar24), an investigator triangulates the recording location down to within ~{geoRadius} meters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
