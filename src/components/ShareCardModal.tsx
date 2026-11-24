import React, { useEffect, useRef, useState } from 'react';
import { Share2, Download, X, Check, Copy } from 'lucide-react';
import { ScanResult, FixReport } from '../types';

interface ShareCardModalProps {
  scanResult: ScanResult;
  fixReport?: FixReport | null;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  scanResult,
  fixReport,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#080B11');
    grad.addColorStop(0.5, '#0F1420');
    grad.addColorStop(1, '#05070A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern
    ctx.strokeStyle = '#151D2A';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Border glow
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Header brand
    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ECHO//TRACE', 35, 50);

    ctx.fillStyle = '#FF3366';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('//', 195, 50);

    ctx.fillStyle = '#8E9BAE';
    ctx.font = '11px sans-serif';
    ctx.fillText('100% Client-Side Privacy X-Ray', 35, 70);

    // Score comparison or single score
    const origScore = scanResult.leakScore.totalScore;
    const fixedScore = fixReport?.newScore ?? null;

    ctx.fillStyle = '#1E2638';
    ctx.beginPath();
    ctx.roundRect(35, 95, fixedScore !== null ? 220 : 180, 80, 8);
    ctx.fill();

    if (fixedScore !== null) {
      ctx.fillStyle = '#8E9BAE';
      ctx.font = '9px monospace';
      ctx.fillText('LEAK SCORE DROP', 50, 115);

      ctx.fillStyle = '#FF3366';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${origScore}`, 50, 155);

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('→', 110, 153);

      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`${fixedScore}`, 145, 155);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`(-${origScore - fixedScore} PTS)`, 195, 135);
    } else {
      ctx.fillStyle = '#8E9BAE';
      ctx.font = '9px monospace';
      ctx.fillText('LEAK SCORE', 50, 115);

      ctx.fillStyle = scanResult.leakScore.color;
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`${origScore}`, 50, 155);

      ctx.fillStyle = '#8E9BAE';
      ctx.font = '12px monospace';
      ctx.fillText('/ 100', 115, 155);
    }

    // Top 3 Findings in plain words
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('TOP FORENSIC LEAKS ISOLATED:', 35, 205);

    const topFindings = scanResult.findings
      .filter(f => f.severity === 'critical' || f.severity === 'warn')
      .slice(0, 3);

    topFindings.forEach((f, idx) => {
      const y = 230 + idx * 34;

      ctx.fillStyle = f.severity === 'critical' ? '#FF3366' : '#FFB800';
      ctx.beginPath();
      ctx.arc(42, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(f.title, 55, y);

      ctx.fillStyle = '#8E9BAE';
      ctx.font = '10px sans-serif';
      ctx.fillText(f.plainText.slice(0, 75) + '...', 55, y + 14);
    });

    // Embarko Footer & Hashtags
    ctx.fillStyle = '#172033';
    ctx.fillRect(10, h - 55, w - 20, 45);

    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('#DeployWithEmbarko', 35, h - 26);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px sans-serif';
    ctx.fillText('Embarko Student Challenge 2026', 220, h - 26);

    ctx.fillStyle = '#8E9BAE';
    ctx.font = '9px monospace';
    ctx.fillText('ZERO CLOUD UPLOADS // REAL DSP', w - 215, h - 26);

    setDataUrl(canvas.toDataURL('image/png'));
  }, [scanResult, fixReport]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ECHO//TRACE Privacy X-Ray',
          text: `Scanned my clip with ECHO//TRACE! Leak score dropped from ${scanResult.leakScore.totalScore} to ${fixReport?.newScore ?? 9} / 100. 100% client-side. #DeployWithEmbarko`,
          url: window.location.href,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      // Fallback: copy link
      await navigator.clipboard.writeText(
        `ECHO//TRACE Privacy X-Ray: Leak score dropped from ${scanResult.leakScore.totalScore} to ${fixReport?.newScore ?? 9} / 100. 100% client-side privacy scanner. #DeployWithEmbarko`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-term-border bg-term-card p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-term-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-cyan" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              Forensic Share Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-term-dim hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card preview */}
        <div className="overflow-hidden rounded-xl border border-term-border bg-[#080B11] shadow-inner">
          <canvas ref={canvasRef} className="h-auto w-full" />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
          <a
            href={dataUrl}
            download="echotrace_privacy_scorecard.png"
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-term-border bg-term-hover px-4 py-2.5 font-mono text-xs font-semibold text-white hover:border-cyan/50"
          >
            <Download className="h-4 w-4 text-cyan" />
            <span>Download PNG</span>
          </a>

          <button
            onClick={handleShare}
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-cyan bg-cyan/20 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-cyan shadow-glow-cyan hover:bg-cyan/30 active:scale-95"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Share Card (#DeployWithEmbarko)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
