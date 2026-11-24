/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { Share2, Download, X, Check, Copy, Smartphone, Square, LayoutTemplate } from 'lucide-react';
import QRCode from 'qrcode';
import { ScanResult, FixReport } from '../types';
import { SITE_URL, APP_CONFIG } from '../config';

interface ShareCardModalProps {
  scanResult: ScanResult;
  fixReport?: FixReport | null;
  onClose: () => void;
}

type CardFormat = '1080x1920' | '1080x1080' | '1200x630';

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  scanResult,
  fixReport,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<CardFormat>('1080x1920');
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
      setCanShareFiles(true);
    }
  }, []);

  // Handle ESC and Back button navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    window.history.pushState({ modal: 'share-card' }, '');
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Render high-res share card onto canvas
  useEffect(() => {
    let isCancelled = false;

    const renderCard = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = 1080;
      let h = 1920;
      if (selectedFormat === '1080x1080') {
        w = 1080;
        h = 1080;
      } else if (selectedFormat === '1200x630') {
        w = 1200;
        h = 630;
      }

      canvas.width = w;
      canvas.height = h;

      // 1. Deep forest background
      ctx.fillStyle = '#0B281B';
      ctx.fillRect(0, 0, w, h);

      // 2. Faint topographic background contours / grid
      ctx.strokeStyle = 'rgba(23, 77, 53, 0.4)';
      ctx.lineWidth = 1;
      const step = w === 1200 ? 50 : 60;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Double forest borders
      const pad = w === 1200 ? 30 : 50;
      ctx.strokeStyle = '#174D35';
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.strokeStyle = '#8BCF55';
      ctx.lineWidth = 2;
      ctx.strokeRect(pad + 10, pad + 10, w - (pad + 10) * 2, h - (pad + 10) * 2);

      // 4. Brand Header
      ctx.fillStyle = '#FAF5EB';
      ctx.font = 'bold 42px "Fraunces", Georgia, serif';
      ctx.fillText('ECHO // TRACE', pad + 40, pad + 80);

      ctx.fillStyle = '#8BCF55';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('100% CLIENT-SIDE PRIVACY X-RAY', pad + 40, pad + 115);

      // 5. One-Line Hook
      ctx.fillStyle = '#E8DCC3';
      ctx.font = selectedFormat === '1200x630' ? 'italic 24px Georgia' : 'italic 34px Georgia';
      ctx.fillText('“This 15-second reel leaked my room, my voice and a tracker.”', pad + 40, pad + (selectedFormat === '1200x630' ? 160 : 190));

      // 6. Score Display Box
      const origScore = scanResult.leakScore.totalScore;
      const fixedScore = fixReport?.newScore ?? null;
      const boxY = pad + (selectedFormat === '1200x630' ? 190 : 250);
      const boxH = selectedFormat === '1200x630' ? 140 : 200;
      const boxW = w - pad * 2 - 80;

      ctx.fillStyle = '#174D35';
      ctx.beginPath();
      ctx.roundRect(pad + 40, boxY, boxW, boxH, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(139, 207, 85, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (fixedScore !== null) {
        ctx.fillStyle = '#FAF5EB';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('LEAK SCORE SANITIZATION DROP', pad + 70, boxY + 45);

        ctx.fillStyle = '#E11D48';
        ctx.font = 'bold 72px monospace';
        ctx.fillText(`${origScore}`, pad + 70, boxY + 125);

        ctx.fillStyle = '#8BCF55';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('➔', pad + 190, boxY + 115);

        ctx.fillStyle = '#8BCF55';
        ctx.font = 'bold 72px monospace';
        ctx.fillText(`${fixedScore}`, pad + 270, boxY + 125);

        ctx.fillStyle = '#FAF5EB';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`(-${origScore - fixedScore} PTS CLEANED)`, pad + 380, boxY + 115);
      } else {
        ctx.fillStyle = '#FAF5EB';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('LEAK SCORE EXPOSURE', pad + 70, boxY + 45);

        ctx.fillStyle = origScore >= 60 ? '#E11D48' : '#F59E0B';
        ctx.font = 'bold 84px monospace';
        ctx.fillText(`${origScore}`, pad + 70, boxY + 130);

        ctx.fillStyle = '#FAF5EB';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('/ 100', pad + 200, boxY + 130);

        ctx.fillStyle = '#8BCF55';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${scanResult.findings.length} FORENSIC LEAKS ISOLATED`, pad + 360, boxY + 120);
      }

      // 7. Top Findings List
      const findingsY = boxY + boxH + 40;
      ctx.fillStyle = '#8BCF55';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('TOP FORENSIC LEAKS IDENTIFIED:', pad + 40, findingsY);

      const topFindings = scanResult.findings.slice(0, selectedFormat === '1200x630' ? 2 : 4);
      let curY = findingsY + 40;
      for (const f of topFindings) {
        ctx.fillStyle = '#F3EBD8';
        ctx.beginPath();
        ctx.roundRect(pad + 40, curY, boxW, selectedFormat === '1200x630' ? 60 : 80, 16);
        ctx.fill();

        ctx.fillStyle = f.severity === 'critical' ? '#E11D48' : '#D97706';
        ctx.beginPath();
        ctx.arc(pad + 70, curY + (selectedFormat === '1200x630' ? 30 : 40), 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10291D';
        ctx.font = 'bold 20px "Fraunces", Georgia, serif';
        ctx.fillText(f.title.slice(0, 48), pad + 95, curY + (selectedFormat === '1200x630' ? 36 : 38));

        if (selectedFormat !== '1200x630') {
          ctx.fillStyle = '#3F5E4C';
          ctx.font = '16px "Inter", sans-serif';
          ctx.fillText(f.plainText.slice(0, 68) + '...', pad + 95, curY + 62);
        }

        curY += (selectedFormat === '1200x630' ? 70 : 95);
      }

      // 8. Generate and Draw Real QR Code to SITE_URL
      try {
        const qrDataUrl = await QRCode.toDataURL(SITE_URL, {
          width: 200,
          margin: 1,
          color: { dark: '#10291D', light: '#F3EBD8' },
        });

        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
        });

        if (!isCancelled) {
          const qrSize = selectedFormat === '1200x630' ? 100 : 160;
          const qrX = pad + 40;
          const qrY = h - pad - qrSize - 40;
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Embarko Stamp
          ctx.fillStyle = '#FAF5EB';
          ctx.font = 'bold 24px "Fraunces", Georgia, serif';
          ctx.fillText('Built with AI. Live on Embarko.', qrX + qrSize + 25, qrY + 45);

          ctx.fillStyle = '#8BCF55';
          ctx.font = 'bold 22px monospace';
          ctx.fillText(`${APP_CONFIG.hashtag} • ${SITE_URL}`, qrX + qrSize + 25, qrY + 85);

          ctx.fillStyle = '#E8DCC3';
          ctx.font = '16px monospace';
          ctx.fillText('100% On-Device Web Audio & Web Crypto', qrX + qrSize + 25, qrY + 120);
        }
      } catch {}

      if (!isCancelled) {
        setDataUrl(canvas.toDataURL('image/png'));
      }
    };

    renderCard();

    return () => {
      isCancelled = true;
    };
  }, [selectedFormat, scanResult, fixReport]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `echotrace_share_${selectedFormat}.png`;
    a.click();
  };

  const handleWebShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `echotrace_leak_score_${selectedFormat}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'ECHO//TRACE Leak Scorecard',
            text: `“This 15-second reel leaked my room, my voice and a tracker.” ${APP_CONFIG.hashtag}`,
            url: SITE_URL,
            files: [file],
          });
        } else if (navigator.share) {
          await navigator.share({
            title: 'ECHO//TRACE Leak Scorecard',
            text: `“This 15-second reel leaked my room, my voice and a tracker.” ${APP_CONFIG.hashtag}`,
            url: SITE_URL,
          });
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-forest/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-xl rounded-3xl border-2 border-forest bg-beige-card p-6 shadow-2xl space-y-5 max-h-[95dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige-hairline pb-3">
          <div>
            <h3 id="share-modal-title" className="font-display text-lg font-bold text-forest-ink">
              Reach & Social Scorecard
            </h3>
            <p className="text-xs text-forest-muted">
              Export cryptographic privacy card with QR code for #DeployWithEmbarko
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-beige-hairline bg-beige-sunken/60 text-forest-muted hover:text-forest transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedFormat('1080x1920')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition min-h-[48px] ${
              selectedFormat === '1080x1920'
                ? 'bg-forest text-lime border-forest shadow-sm'
                : 'bg-beige-sunken/60 text-forest-ink border-beige-hairline hover:border-forest'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>9:16 Reel Cover</span>
          </button>

          <button
            onClick={() => setSelectedFormat('1080x1080')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition min-h-[48px] ${
              selectedFormat === '1080x1080'
                ? 'bg-forest text-lime border-forest shadow-sm'
                : 'bg-beige-sunken/60 text-forest-ink border-beige-hairline hover:border-forest'
            }`}
          >
            <Square className="h-4 w-4" />
            <span>1:1 Square Feed</span>
          </button>

          <button
            onClick={() => setSelectedFormat('1200x630')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition min-h-[48px] ${
              selectedFormat === '1200x630'
                ? 'bg-forest text-lime border-forest shadow-sm'
                : 'bg-beige-sunken/60 text-forest-ink border-beige-hairline hover:border-forest'
            }`}
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>Landscape OG</span>
          </button>
        </div>

        {/* Preview Container */}
        <div className="relative rounded-2xl border border-forest/40 bg-[#0B281B] p-3 flex items-center justify-center shadow-data overflow-hidden max-h-[360px]">
          <canvas
            ref={canvasRef}
            className="max-h-[330px] w-auto object-contain rounded-lg shadow-elevated"
          />
        </div>

        {/* Action Buttons (Touch targets >= 48px) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            onClick={handleWebShare}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-lime border-2 border-lime px-4 py-2 font-display text-sm font-bold text-forest shadow-elevated hover:bg-lime-bright transition"
          >
            <Share2 className="h-4 w-4" />
            <span>Web Share</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-forest bg-forest px-4 py-2 font-display text-sm font-bold text-cream hover:bg-forest-deep transition shadow-sm"
          >
            <Download className="h-4 w-4 text-lime" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopyImage}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-beige-hairline bg-beige-sunken px-4 py-2 font-display text-sm font-bold text-forest hover:bg-beige-card transition"
          >
            {copied ? <Check className="h-4 w-4 text-forest" /> : <Copy className="h-4 w-4 text-forest-muted" />}
            <span>{copied ? 'Copied!' : 'Copy Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
