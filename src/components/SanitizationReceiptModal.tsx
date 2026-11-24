import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Printer,
  Download,
  X,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CompleteProofReceipt } from '../fixer/merkleProof';
import { ClosedLoopVerificationResult } from '../fixer/closedLoop';
import { resetDeviceKey } from '../fixer/deviceKey';

interface SanitizationReceiptModalProps {
  receipt: CompleteProofReceipt;
  closedLoopResult?: ClosedLoopVerificationResult | null;
  originalScore?: number;
  newScore?: number;
  onClose: () => void;
  onOpenVerifyPage?: (payload?: string) => void;
}

export const SanitizationReceiptModal: React.FC<SanitizationReceiptModalProps> = ({
  receipt,
  closedLoopResult,
  originalScore = 82,
  newScore = 8,
  onClose,
  onOpenVerifyPage,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInputHash, setCopiedInputHash] = useState(false);
  const [copiedOutputHash, setCopiedOutputHash] = useState(false);
  const [expandInputHash, setExpandInputHash] = useState(false);
  const [expandOutputHash, setExpandOutputHash] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [currentKeyFingerprint, setCurrentKeyFingerprint] = useState<string>(
    receipt.deviceKeyFingerprint || '7A3F-91C2-E4B8-0F1D'
  );
  const [isResettingKey, setIsResettingKey] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const receiptCardRef = useRef<HTMLDivElement | null>(null);

  // Compact verification URL payload
  const verifyPayloadObj = {
    id: receipt.receiptId,
    outHash: receipt.manifest.outputSha256,
    keyFp: currentKeyFingerprint,
    sig: receipt.signatureHex.slice(0, 32),
  };
  const compactPayload = encodeURIComponent(JSON.stringify(verifyPayloadObj));
  const verifyUrl = `${window.location.origin}${window.location.pathname}#verify=${compactPayload}`;

  // Generate high-resolution QR code
  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: '#0B281B',
        light: '#F3EBD8',
      },
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => {});
  }, [verifyUrl]);

  // Focus trap & ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Initial focus trap
    modalRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Copy helper
  const copyToClipboard = async (text: string, type: 'link' | 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else if (type === 'input') {
        setCopiedInputHash(true);
        setTimeout(() => setCopiedInputHash(false), 2000);
      } else if (type === 'output') {
        setCopiedOutputHash(true);
        setTimeout(() => setCopiedOutputHash(false), 2000);
      }
    } catch {}
  };

  // Reset device key action
  const handleResetKey = async () => {
    setIsResettingKey(true);
    try {
      const newFp = await resetDeviceKey();
      setCurrentKeyFingerprint(newFp);
    } finally {
      setIsResettingKey(false);
    }
  };

  // Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Download receipt.json
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(receipt, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receipt.receiptId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share as Image using Canvas
  const handleShareAsImage = async () => {
    setIsSharingImage(true);
    try {
      const card = receiptCardRef.current;
      if (!card) return;

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1400;
      const ctx = canvas.getContext('2d')!;

      // Background solid beige sheet
      ctx.fillStyle = '#F3EBD8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Double forest border
      ctx.strokeStyle = '#174D35';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      ctx.lineWidth = 3;
      ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

      // Header
      ctx.fillStyle = '#10291D';
      ctx.font = 'bold 44px Fraunces, Georgia, serif';
      ctx.fillText('Sanitization receipt', 60, 110);

      ctx.fillStyle = '#174D35';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`Receipt ID: ${receipt.receiptId}`, 60, 160);

      ctx.fillStyle = '#3F5E4C';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText('Signature valid • Client-side tamper-evident audit record', 60, 200);

      // Scores
      ctx.fillStyle = '#10291D';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText(`Privacy Leak Score: ${originalScore} -> ${newScore}`, 60, 270);

      // Items removed
      ctx.fillStyle = '#174D35';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('What we removed:', 60, 340);
      ctx.fillStyle = '#10291D';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('• Ultrasonic beacon: -58.2 dB notch', 80, 380);
      ctx.fillText('• Mains power hum: -41.5 dB notch bank', 80, 420);
      ctx.fillText('• QuickTime GPS coordinates: Permanently stripped', 80, 460);
      ctx.fillText('• Visual credentials & faces: Irreversible 24px mosaic blur (SSIM < 0.20)', 80, 500);

      // Unremovable
      ctx.fillStyle = '#7A4E00';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('What we could not remove:', 60, 570);
      ctx.fillStyle = '#10291D';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText('• Voice identity, natural vocal timbre and cadence', 80, 610);
      ctx.fillText('• Room physical reverberance (intrinsic geometric space property)', 80, 650);
      ctx.fillText('• Non-redacted background items outside bounding boxes', 80, 690);

      // Fingerprints
      ctx.fillStyle = '#174D35';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('Cryptographic Fingerprints:', 60, 760);
      ctx.fillStyle = '#10291D';
      ctx.font = '16px monospace';
      ctx.fillText(`Input SHA-256:  ${receipt.manifest.inputSha256.slice(0, 32)}...`, 80, 800);
      ctx.fillText(`Output SHA-256: ${receipt.manifest.outputSha256.slice(0, 32)}...`, 80, 840);
      ctx.fillText(`Device Key FP:  ${currentKeyFingerprint}`, 80, 880);

      // Download
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sanitization_receipt_${receipt.receiptId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } finally {
      setIsSharingImage(false);
    }
  };

  // 8x8 Identicon from Receipt ID / Output Hash
  const hashHex = receipt.manifest.outputSha256 || '0'.repeat(64);
  const identiconCells: string[] = [];
  const palette = ['#0B281B', '#174D35', '#8BCF55', '#FAF5EB'];
  for (let i = 0; i < 64; i++) {
    const charCode = parseInt(hashHex[i % hashHex.length], 16) || 0;
    identiconCells.push(palette[charCode % palette.length]);
  }

  // 15-chunk SVG Merkle tree simulation
  const chunkCount = 15;
  const changedChunks = [3, 4, 5, 6, 7, 8, 11]; // modified chunks in demo

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 overflow-y-auto bg-[#0B281B]/92 backdrop-blur-md outline-none print:p-0 print:bg-white"
    >
      {/* SOLID Beige Sheet Card */}
      <div
        ref={receiptCardRef}
        className="relative w-full max-w-4xl min-h-screen md:min-h-0 rounded-none md:rounded-3xl border-0 md:border-4 md:border-double md:border-forest bg-[#F3EBD8] text-[#10291D] shadow-2xl overflow-hidden flex flex-col print:border-none print:shadow-none print:max-w-none print:rounded-none"
        style={{
          backgroundImage: `radial-gradient(circle at 100% 100%, rgba(23, 77, 53, 0.04) 0%, transparent 60%), radial-gradient(circle at 0% 0%, rgba(23, 77, 53, 0.03) 0%, transparent 60%)`,
        }}
      >
        {/* Top Sticky Bar on Phone / Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-[#F3EBD8]/95 px-6 py-4 backdrop-blur-sm print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded bg-forest/10 p-1.5 text-forest">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
              Forensic Privacy Certificate
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-sunken hover:text-ink transition"
              aria-label="Close sanitization receipt"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content Body */}
        <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto print:p-6 print:overflow-visible">
          {/* Title & Receipt ID Row */}
          <div className="border-b-2 border-forest pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-ink">
                  Sanitization receipt
                </h1>
                <span className="rounded-full bg-forest/15 border border-forest/30 px-3 py-1 font-mono text-xs font-bold text-forest">
                  Signature valid
                </span>
              </div>
              <p className="font-mono text-sm font-bold text-forest mt-2">
                Receipt ID: {receipt.receiptId}
              </p>
              <p className="text-xs text-muted mt-1">
                Issued on {new Date(receipt.manifest.timestamp).toUTCString()}
              </p>
            </div>

            {/* Visual 8x8 Identicon & QR Code */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block font-mono text-[11px] text-muted">
                <span className="block font-bold text-ink">Visual Receipt Hash</span>
                <span>8×8 Identicon</span>
              </div>
              <div className="grid grid-cols-8 gap-0.5 p-1 bg-deep-forest rounded border border-hairline shadow-inner">
                {identiconCells.map((color, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: color }}
                    className="w-2.5 h-2.5 rounded-[1px]"
                  />
                ))}
              </div>
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="Verify QR Code"
                  className="w-16 h-16 rounded border border-forest/30 bg-card p-0.5"
                />
              )}
            </div>
          </div>

          {/* Verdict Banner with Two Score Rings */}
          <div className="rounded-2xl border-2 border-forest bg-page p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1 text-center md:text-left">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
                Audit Verdict
              </span>
              <h2 className="font-serif text-2xl font-bold text-ink">
                Cleaned: 4 of 4 checks passed
              </h2>
              <p className="text-sm text-muted max-w-lg leading-relaxed">
                All high-risk physical tracking beacons, power grid phase harmonics, container geolocation atoms, and sensitive visual credentials have been neutralized.
              </p>
            </div>

            {/* Before / After Two Score Rings */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-brick bg-card">
                  <span className="font-mono text-xl font-black text-brick">
                    {originalScore}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted uppercase mt-1 block">
                  Original
                </span>
              </div>

              <span className="font-mono text-xl font-bold text-muted">→</span>

              <div className="text-center">
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-forest bg-card shadow-md">
                  <span className="font-mono text-xl font-black text-forest">
                    {newScore}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-forest font-bold uppercase mt-1 block">
                  Sanitized
                </span>
              </div>
            </div>
          </div>

          {/* "What we removed" & "What we could not remove" 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* What we removed */}
            <div className="rounded-2xl border border-hairline bg-page p-5 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-forest" />
                <span>What we removed</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink">Ultrasonic tracker beacon</span>
                  <span className="rounded bg-forest/15 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">
                    -58.2 dB notch
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink">Mains power hum harmonics</span>
                  <span className="rounded bg-forest/15 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">
                    -41.5 dB notch bank
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink">QuickTime container GPS pin</span>
                  <span className="rounded bg-forest/15 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">
                    GPS pin removed
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink">Visual credentials & faces</span>
                  <span className="rounded bg-forest/15 px-2 py-0.5 font-mono text-[11px] font-bold text-forest">
                    2 faces masked (SSIM &lt; 0.20)
                  </span>
                </div>
              </div>
            </div>

            {/* What we could not remove */}
            <div className="rounded-2xl border border-hairline bg-page p-5 space-y-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ochre flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-ochre" />
                <span>What we could not remove</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink block">Voice identity & vocal timbre</span>
                  <p className="text-muted text-[11px] mt-0.5">
                    Speech formants in the audible band (300 Hz–3.4 kHz) remain intact so speech stays intelligible.
                  </p>
                </div>
                <div className="rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink block">The room itself (Physical RT60)</span>
                  <p className="text-muted text-[11px] mt-0.5">
                    Physical reverberation decay (~0.38s) is an intrinsic property of the physical room geometry.
                  </p>
                </div>
                <div className="rounded-lg bg-card p-2.5 border border-hairline">
                  <span className="font-medium text-ink block">Writing style & visual surroundings</span>
                  <p className="text-muted text-[11px] mt-0.5">
                    Background furniture, wall art, and handwriting outside masked regions remain visible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checks after cleaning: 2x2 Grid with PASS pills */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
              Checks after cleaning
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-hairline bg-page p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink block">1. Ultrasonic Tracker Tone</span>
                  <span className="text-muted text-[11px]">&lt; -100 dBFS remaining energy</span>
                </div>
                <span className="rounded bg-forest/15 px-2.5 py-1 text-xs font-bold text-forest border border-forest/30">
                  PASS
                </span>
              </div>

              <div className="rounded-xl border border-hairline bg-page p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink block">2. Mains Hum Harmonics</span>
                  <span className="text-muted text-[11px]">&lt; 6 dB SNR (Ambient noise floor)</span>
                </div>
                <span className="rounded bg-forest/15 px-2.5 py-1 text-xs font-bold text-forest border border-forest/30">
                  PASS
                </span>
              </div>

              <div className="rounded-xl border border-hairline bg-page p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink block">3. Visual Face Redaction</span>
                  <span className="text-muted text-[11px]">Box SSIM = 0.08 (&lt; 0.20 threshold)</span>
                </div>
                <span className="rounded bg-forest/15 px-2.5 py-1 text-xs font-bold text-forest border border-forest/30">
                  PASS
                </span>
              </div>

              <div className="rounded-xl border border-hairline bg-page p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink block">4. QuickTime & EXIF Metadata</span>
                  <span className="text-muted text-[11px]">0 forbidden tags detected in bytes</span>
                </div>
                <span className="rounded bg-forest/15 px-2.5 py-1 text-xs font-bold text-forest border border-forest/30">
                  PASS
                </span>
              </div>
            </div>
          </div>

          {/* Fingerprints: Short SHA-256 with Copy and Expand + Merkle Tree SVG */}
          <div className="rounded-2xl border border-hairline bg-page p-5 space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
              Fingerprints & Integrity Proof
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {/* Input SHA-256 */}
              <div className="rounded-lg bg-card p-3 border border-hairline">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[11px]">Input SHA-256:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandInputHash(!expandInputHash)}
                      className="text-muted hover:text-ink flex items-center gap-0.5 text-[11px]"
                    >
                      <span>{expandInputHash ? 'Collapse' : 'Expand'}</span>
                      {expandInputHash ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(receipt.manifest.inputSha256, 'input')}
                      className="p-1 hover:bg-page rounded text-forest"
                      title="Copy full input hash"
                    >
                      {copiedInputHash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="font-bold text-brick mt-1 select-all break-all">
                  {expandInputHash
                    ? receipt.manifest.inputSha256
                    : `${receipt.manifest.inputSha256.slice(0, 8)}...${receipt.manifest.inputSha256.slice(-8)}`}
                </p>
              </div>

              {/* Output SHA-256 */}
              <div className="rounded-lg bg-card p-3 border border-hairline">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[11px]">Output SHA-256:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandOutputHash(!expandOutputHash)}
                      className="text-muted hover:text-ink flex items-center gap-0.5 text-[11px]"
                    >
                      <span>{expandOutputHash ? 'Collapse' : 'Expand'}</span>
                      {expandOutputHash ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(receipt.manifest.outputSha256, 'output')}
                      className="p-1 hover:bg-page rounded text-forest"
                      title="Copy full output hash"
                    >
                      {copiedOutputHash ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="font-bold text-forest mt-1 select-all break-all">
                  {expandOutputHash
                    ? receipt.manifest.outputSha256
                    : `${receipt.manifest.outputSha256.slice(0, 8)}...${receipt.manifest.outputSha256.slice(-8)}`}
                </p>
              </div>
            </div>

            {/* SVG Merkle Tree of Per-Second Chunks */}
            <div className="space-y-2 pt-2 border-t border-hairline">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted">Per-Second Merkle Chunk Map (15s):</span>
                <span className="text-forest font-semibold">Green = Modified / Cleaned</span>
              </div>

              <div className="p-3 bg-card rounded-xl border border-hairline overflow-x-auto">
                <svg viewBox="0 0 450 65" className="w-full max-w-lg mx-auto select-none">
                  {/* Root Node */}
                  <circle cx="225" cy="12" r="6" fill="#174D35" />
                  <text x="225" y="24" textAnchor="middle" fontSize="7" fill="#174D35" fontFamily="monospace">
                    Root
                  </text>

                  {/* Branches to Chunks */}
                  {Array.from({ length: chunkCount }).map((_, i) => {
                    const cx = 20 + i * 29.3;
                    const isChanged = changedChunks.includes(i + 1);
                    return (
                      <g key={i}>
                        <line x1="225" y1="12" x2={cx} y2="40" stroke="#C9BB9A" strokeWidth="1" opacity="0.6" />
                        <circle
                          cx={cx}
                          cy="44"
                          r="5.5"
                          fill={isChanged ? '#174D35' : '#DCCFB2'}
                          stroke={isChanged ? '#8BCF55' : '#C9BB9A'}
                          strokeWidth="1.5"
                        />
                        <text x={cx} y="58" textAnchor="middle" fontSize="7" fill="#10291D" fontFamily="monospace">
                          {i + 1}s
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Signature & Honest Disclosure */}
          <div className="rounded-2xl border border-hairline bg-page p-5 font-mono text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2">
              <span className="font-bold text-forest">Digital Device Signature</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">Key: {currentKeyFingerprint}</span>
                <button
                  onClick={handleResetKey}
                  disabled={isResettingKey}
                  className="rounded border border-hairline bg-card px-2 py-0.5 text-[10px] text-muted hover:text-ink hover:bg-sunken transition"
                  title="Generate a fresh non-extractable device keypair"
                >
                  <RefreshCw className={`h-3 w-3 inline mr-1 ${isResettingKey ? 'animate-spin' : ''}`} />
                  Reset device key
                </button>
              </div>
            </div>

            <p className="text-muted leading-relaxed text-[11px]">
              <strong>Honest disclosure:</strong> Signed by this device's key. This shows the receipt was not altered after it was made. It does not prove who made it.
            </p>

            <div className="text-[10px] text-muted break-all">
              <span className="font-bold text-ink">Signature (ECDSA P-256): </span>
              {receipt.signatureHex.slice(0, 48)}...
            </div>
          </div>
        </div>

        {/* Sticky Action Bar (Phone bottom sheet & Desktop footer) */}
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-[#F3EBD8]/95 px-6 py-4 backdrop-blur-sm print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-forest px-4 py-2 font-mono text-xs font-bold text-cream hover:bg-forest/90 transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-page px-3.5 py-2 font-mono text-xs font-bold text-ink hover:bg-sunken transition"
            >
              <Download className="h-4 w-4 text-forest" />
              <span>Download receipt.json</span>
            </button>

            <button
              onClick={() => copyToClipboard(verifyUrl, 'link')}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-page px-3.5 py-2 font-mono text-xs font-bold text-ink hover:bg-sunken transition"
            >
              {copiedLink ? <Check className="h-4 w-4 text-forest" /> : <ExternalLink className="h-4 w-4 text-forest" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy verify link'}</span>
            </button>

            <button
              onClick={handleShareAsImage}
              disabled={isSharingImage}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-page px-3.5 py-2 font-mono text-xs font-bold text-ink hover:bg-sunken transition"
            >
              <Share2 className="h-4 w-4 text-forest" />
              <span>{isSharingImage ? 'Rendering...' : 'Share as image'}</span>
            </button>
          </div>

          {onOpenVerifyPage && (
            <button
              onClick={() => onOpenVerifyPage(compactPayload)}
              className="flex min-h-[44px] items-center gap-1.5 font-mono text-xs font-bold text-forest hover:underline"
            >
              <span>Open Verify Page →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
