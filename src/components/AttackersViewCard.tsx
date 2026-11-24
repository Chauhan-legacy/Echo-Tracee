import React from 'react';
import { ShieldAlert, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Finding } from '../types';

interface AttackersViewCardProps {
  findings: Finding[];
}

export const AttackersViewCard: React.FC<AttackersViewCardProps> = ({ findings }) => {
  // Deterministic deductions based on current findings
  const leaks: { label: string; deduction: string; confidence: number; category: string }[] = [];
  const protectedItems: string[] = [];

  // 1. Geolocation / GPS
  const gpsFinding = findings.find(f => f.id === 'metadata-gps-location');
  if (gpsFinding && gpsFinding.details) {
    leaks.push({
      category: 'Location',
      label: 'Exact Coordinates',
      deduction: `Adversary learned exact physical position: ${gpsFinding.details.latitude}° N, ${gpsFinding.details.longitude}° E. Anyone downloading this file can view your location down to 5 meters.`,
      confidence: gpsFinding.confidence,
    });
  } else {
    protectedItems.push('Physical GPS Coordinates (No container coordinates exposed)');
  }

  // 2. Ultrasonic Tracking Beacon
  const beaconFinding = findings.find(f => f.category === 'ultrasonic' && f.severity === 'critical');
  if (beaconFinding) {
    const freq = Number(beaconFinding.details?.frequencyHz) || 19400;
    const bits = String(beaconFinding.details?.bitString || '101011');
    leaks.push({
      category: 'Tracking',
      label: 'Cross-Device Ad Telemetry',
      deduction: `Adversary learned cross-device telemetry beacon active at ${(freq / 1000).toFixed(1)} kHz ('${bits}'). Third-party trackers can silently link this post to other devices in the same physical room.`,
      confidence: beaconFinding.confidence,
    });
  } else {
    protectedItems.push('Cross-Device Beacon (No inaudible tracking tones detected)');
  }

  // 3. Mains Power Grid Hum
  const humFinding = findings.find(f => f.category === 'hum');
  if (humFinding && humFinding.details) {
    const grid = String(humFinding.details.gridContinent || '50 Hz / 60 Hz Grid');
    const freq = Number(humFinding.details.baseFrequencyHz) || 50.0;
    leaks.push({
      category: 'Grid Context',
      label: 'Electrical Grid Region',
      deduction: `Adversary learned recording was connected to or near a ${grid} electrical supply (${freq.toFixed(2)} Hz). Narrows world region and eliminates thousands of geographical zones.`,
      confidence: humFinding.confidence,
    });
  } else {
    protectedItems.push('Power Grid Timing (No electrical mains hum isolated)');
  }

  // 4. Room Acoustics & Reverberation
  const roomFinding = findings.find(f => f.category === 'room');
  if (roomFinding && roomFinding.details) {
    const rt60 = Number(roomFinding.details.rt60Sec) || 0.38;
    const vol = Number(roomFinding.details.estimatedVolumeM3) || 45;
    leaks.push({
      category: 'Environment',
      label: 'Physical Room Geometry',
      deduction: `Adversary learned room volume (~${vol} m³) and acoustic decay (${rt60.toFixed(2)}s RT60). Confirms indoor recording in a furnished small-to-medium residential space.`,
      confidence: roomFinding.confidence,
    });
  }

  // 5. Visual Faces / Screens
  const visualFindings = findings.filter(f => f.category === 'visual');
  if (visualFindings.length > 0) {
    leaks.push({
      category: 'Visual',
      label: `${visualFindings.length} Visual Identity Target(s)`,
      deduction: `Adversary learned biometric facial geometry or visible screen content from video frames. Exposes personal identity and desktop activity.`,
      confidence: 0.95,
    });
  } else {
    protectedItems.push('Biometric Faces / Screens (Zero visual identities exposed)');
  }

  // 6. Spoken Secrets
  const speechFindings = findings.filter(f => f.category === 'speech' && f.severity === 'critical');
  if (speechFindings.length > 0) {
    leaks.push({
      category: 'Credentials',
      label: 'Spoken Credentials / Numbers',
      deduction: `Adversary learned private credentials or telephone numbers from the spoken dialogue.`,
      confidence: speechFindings[0].confidence,
    });
  } else {
    protectedItems.push('Spoken Secrets (No passwords, OTPs, or phone numbers found)');
  }

  // Always protected
  protectedItems.push('Client-Side Isolation: Raw file never sent to any server or cloud API');

  return (
    <div className="bg-[#0B281B] text-[#FAF5EB] rounded-xl p-5 border border-[#174D35] shadow-lg space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#174D35] pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#E6A23C]" />
          <h3 className="font-serif font-bold text-lg text-[#F3EBD8]">
            Attacker’s View (Adversary Intelligence Brief)
          </h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#174D35] text-[#8BCF55]">
          {leaks.length} Intel Points
        </span>
      </div>

      {/* Leaks list */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E6A23C] uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" /> What an Adversary Can Learn
        </div>

        {leaks.length > 0 ? (
          <div className="space-y-2.5">
            {leaks.map((leak, idx) => (
              <div
                key={idx}
                className="bg-[#174D35]/30 border border-[#174D35] rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F3EBD8] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E6A23C]" />
                    {leak.label}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#174D35] text-[#8BCF55]">
                    {Math.round(leak.confidence * 100)}% Confidence
                  </span>
                </div>
                <p className="text-[#E8DCC3] leading-relaxed pl-3.5">{leak.deduction}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#174D35]/20 p-3 rounded-lg text-xs text-[#8BCF55]">
            No critical forensic intelligence leaked in this file.
          </div>
        )}
      </div>

      {/* What they could NOT learn */}
      <div className="space-y-2 pt-2 border-t border-[#174D35]/60">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#8BCF55] uppercase tracking-wider">
          <EyeOff className="w-3.5 h-3.5" /> What an Adversary Could NOT Learn
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {protectedItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs text-[#E8DCC3] bg-[#174D35]/15 p-2 rounded-md"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#8BCF55] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
