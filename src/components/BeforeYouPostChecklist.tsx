import React from 'react';
import { CheckCircle2, Circle, AlertTriangle, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { Finding, FixReport } from '../types';

interface BeforeYouPostChecklistProps {
  findings: Finding[];
  fixReport: FixReport | null;
  onOpenFixer: () => void;
}

export const BeforeYouPostChecklist: React.FC<BeforeYouPostChecklistProps> = ({
  findings,
  fixReport,
  onOpenFixer,
}) => {
  // 1. GPS Check
  const hasGps = findings.some(f => f.id === 'metadata-gps-location' || f.id === 'demo-metadata-gps' || f.id === 'user-metadata-gps');
  const gpsClean = !hasGps || (fixReport !== null && fixReport.actionsTaken.some(a => a.toLowerCase().includes('stripped') || a.toLowerCase().includes('metadata')));

  // 2. Ultrasonic Beacon Check
  const hasBeacon = findings.some(f => f.category === 'ultrasonic' && f.severity === 'critical');
  const beaconClean = !hasBeacon || (fixReport !== null && fixReport.actionsTaken.some(a => a.toLowerCase().includes('notched') || a.toLowerCase().includes('ultrasonic') || a.toLowerCase().includes('kaiser')));

  // 3. Mains Hum Check
  const hasHum = findings.some(f => f.category === 'hum' && f.severity !== 'info');
  const humClean = !hasHum || (fixReport !== null && fixReport.actionsTaken.some(a => a.toLowerCase().includes('hum') || a.toLowerCase().includes('notch')));

  // 4. Visual Faces / Screens Check
  const visualCount = findings.filter(f => f.category === 'visual').length;
  const visualClean = visualCount === 0 || (fixReport !== null && fixReport.actionsTaken.some(a => a.toLowerCase().includes('masked') || a.toLowerCase().includes('face') || a.toLowerCase().includes('mosaic')));

  // 5. Spoken Secrets Check
  const hasSecrets = findings.some(f => f.category === 'speech' && f.severity === 'critical');
  const secretsClean = !hasSecrets || (fixReport !== null && fixReport.actionsTaken.some(a => a.toLowerCase().includes('audio') || a.toLowerCase().includes('speech') || a.toLowerCase().includes('redact')));

  const items = [
    {
      title: 'Strip GPS & Container Metadata',
      description: hasGps
        ? 'Precise physical coordinates embedded in QuickTime/EXIF atom.'
        : 'Container is free of GPS coordinates and camera serial numbers.',
      isClean: gpsClean,
      isIssue: hasGps && !gpsClean,
    },
    {
      title: 'Remove Inaudible Tracking Beacons (17–22 kHz)',
      description: hasBeacon
        ? 'Active ultrasonic telemetry beacon detected in audio spectrum.'
        : 'Audio spectrum is clean of cross-device ultrasonic tracking carriers.',
      isClean: beaconClean,
      isIssue: hasBeacon && !beaconClean,
    },
    {
      title: 'Attenuate Electric Mains Hum (50/60 Hz)',
      description: hasHum
        ? 'Wall wiring hum reveals continent and grid-timing location.'
        : 'Low-frequency electrical mains signature attenuated.',
      isClean: humClean,
      isIssue: hasHum && !humClean,
    },
    {
      title: 'Mask Visible Faces & Desktop Screens',
      description: visualCount > 0
        ? `${visualCount} personal identity or screen target(s) detected in frames.`
        : 'No biometric faces or glowing screens detected in video frames.',
      isClean: visualClean,
      isIssue: visualCount > 0 && !visualClean,
    },
    {
      title: 'Redact Spoken Private Identifiers',
      description: hasSecrets
        ? 'Private phone numbers or credentials detected in speech.'
        : 'Dialogue free of sensitive passwords, OTPs, or phone numbers.',
      isClean: secretsClean,
      isIssue: hasSecrets && !secretsClean,
    },
  ];

  const pendingIssues = items.filter(i => i.isIssue).length;
  const allClean = pendingIssues === 0;

  return (
    <div className="bg-[#FAF5EB] border-2 border-[#174D35] rounded-xl p-5 shadow-md space-y-4 text-[#10291D]">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allClean ? (
            <ShieldCheck className="w-6 h-6 text-[#174D35]" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-[#A32A1F]" />
          )}
          <h3 className="font-serif font-bold text-lg text-[#174D35]">
            "Before You Post" Dynamic Checklist
          </h3>
        </div>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
            allClean
              ? 'bg-[#8BCF55] text-[#0B281B]'
              : 'bg-[#A32A1F]/15 text-[#A32A1F]'
          }`}
        >
          {allClean ? 'SAFE TO POST' : `${pendingIssues} LEAK${pendingIssues > 1 ? 'S' : ''} PENDING`}
        </span>
      </div>

      {/* Checklist items */}
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border transition-all flex items-start gap-3 text-xs ${
              item.isClean
                ? 'bg-[#E8DCC3]/40 border-[#C9BB9A]'
                : 'bg-[#A32A1F]/5 border-[#A32A1F]/30'
            }`}
          >
            {item.isClean ? (
              <CheckCircle2 className="w-4 h-4 text-[#174D35] shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-[#A32A1F] shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div
                className={`font-bold ${
                  item.isClean ? 'text-[#174D35]' : 'text-[#A32A1F]'
                }`}
              >
                {item.title}
              </div>
              <p className="text-[#3F5E4C]">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      {!allClean ? (
        <button
          onClick={onOpenFixer}
          className="w-full py-3 bg-[#8BCF55] hover:bg-[#7ABF45] text-[#0B281B] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm"
        >
          <Sparkles className="w-4 h-4" /> Fix Everything in 1 Tap
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="bg-[#174D35] text-[#FAF5EB] p-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#8BCF55]" />
            <span>All checks verified! File is sanitized and safe to publish.</span>
          </div>
          <span className="font-mono text-[#8BCF55] text-[11px]">Ready for Instagram / TikTok</span>
        </div>
      )}
    </div>
  );
};
