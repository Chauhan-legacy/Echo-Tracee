import React, { useState } from 'react';
import { Binary, Info } from 'lucide-react';

interface BeaconBitStripProps {
  bitString: string;
  baudRate?: number;
  freqHz?: number;
}

export const BeaconBitStrip: React.FC<BeaconBitStripProps> = ({
  bitString,
  baudRate = 12.5,
  freqHz = 19400,
}) => {
  const [hoveredBit, setHoveredBit] = useState<number | null>(null);

  if (!bitString || bitString.length === 0) return null;

  const bits = bitString.split('');
  const symbolDurationMs = Math.round((1.0 / (baudRate || 12.5)) * 1000);

  // Group into bytes for hexadecimal preview
  const hexBytes: string[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const chunk = bits.slice(i, i + 8).join('');
    if (chunk.length === 8) {
      hexBytes.push('0x' + parseInt(chunk, 2).toString(16).toUpperCase().padStart(2, '0'));
    }
  }

  return (
    <div className="bg-[#0B281B] text-[#FAF5EB] rounded-xl p-4 border border-[#174D35] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-[#8BCF55]" />
          <h4 className="font-serif font-bold text-sm text-[#F3EBD8]">
            Demodulated Ultrasonic Bit Pattern (On-Off-Keying)
          </h4>
        </div>
        <div className="text-[11px] font-mono text-[#8BCF55]">
          ~{baudRate} Baud ({symbolDurationMs} ms/symbol)
        </div>
      </div>

      {/* Bit Strip Blocks */}
      <div className="space-y-1.5">
        <div className="flex gap-1 overflow-x-auto py-2 px-1 bg-[#174D35]/30 rounded-lg border border-[#174D35]">
          {bits.map((b, idx) => {
            const isOne = b === '1';
            const isHovered = hoveredBit === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredBit(idx)}
                onMouseLeave={() => setHoveredBit(null)}
                className={`flex-shrink-0 w-4 h-7 rounded flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isOne
                    ? 'bg-[#8BCF55] text-[#0B281B] shadow-sm'
                    : 'bg-[#10291D] border border-[#174D35] text-[#C9BB9A]'
                } ${isHovered ? 'scale-110 ring-2 ring-white z-10' : ''}`}
                title={`Bit ${idx}: Value = ${b} (${isOne ? 'Tone ON' : 'Tone OFF'}, ${idx * symbolDurationMs}ms)`}
              >
                <span className="font-mono text-[9px] font-bold">{b}</span>
              </div>
            );
          })}
        </div>

        {/* Dynamic Tooltip / Status line */}
        <div className="flex items-center justify-between text-[11px] text-[#C9BB9A] px-1 font-mono">
          <span>
            {hoveredBit !== null ? (
              <span className="text-[#8BCF55]">
                Bit #{hoveredBit}: {bits[hoveredBit] === '1' ? '1 (Tone Active)' : '0 (Silence)'} at ~{hoveredBit * symbolDurationMs} ms
              </span>
            ) : (
              'Hover over bits to inspect demodulated carrier pulses'
            )}
          </span>
          {hexBytes.length > 0 && (
            <span className="text-[#E8DCC3]">
              Decoded Bytes: {hexBytes.slice(0, 4).join(' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
