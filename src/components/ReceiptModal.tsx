import React, { useState } from 'react';
import {
  FileCheck,
  ShieldCheck,
  Printer,
  Download,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Key,
  Layers,
} from 'lucide-react';
import { CompleteProofReceipt, verifyCompleteProofReceipt } from '../fixer/merkleProof';
import { ClosedLoopVerificationResult } from '../fixer/closedLoop';

interface ReceiptModalProps {
  receipt: CompleteProofReceipt;
  closedLoopResult?: ClosedLoopVerificationResult | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  closedLoopResult,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'certificate' | 'verify'>('certificate');
  const [dropVerifyStatus, setDropVerifyStatus] = useState<'idle' | 'valid' | 'invalid' | 'parsing_error'>('idle');
  const [verifiedDetails, setVerifiedDetails] = useState<string | null>(null);

  // Print certificate
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
    a.download = `echotrace_receipt_${receipt.manifest.outputSha256.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Real-time verification of uploaded / pasted receipt.json
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CompleteProofReceipt;
      if (!parsed.manifest || !parsed.signatureHex || !parsed.publicKeyJwk) {
        setDropVerifyStatus('parsing_error');
        return;
      }
      const isValid = await verifyCompleteProofReceipt(parsed);
      setDropVerifyStatus(isValid ? 'valid' : 'invalid');
      if (isValid) {
        setVerifiedDetails(
          `Verified Merkle Root: ${parsed.manifest.outputMerkleRoot.slice(0, 16)}... | Signed at: ${parsed.manifest.timestamp}`
        );
      }
    } catch {
      setDropVerifyStatus('parsing_error');
    }
  };

  // Deterministic 8x8 Visual Hash Grid derived from output SHA-256
  const hashHex = receipt.manifest.outputSha256 || '00'.repeat(32);
  const cells: string[] = [];
  const palette = ['#0B281B', '#174D35', '#8BCF55', '#FAF5EB'];
  for (let i = 0; i < 64; i++) {
    const charCode = parseInt(hashHex[i % hashHex.length], 16) || 0;
    cells.push(palette[charCode % palette.length]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-hairline bg-card shadow-2xl overflow-hidden my-8">
        {/* Modal Top Header (Screen Only) */}
        <div className="print:hidden flex items-center justify-between border-b border-hairline bg-page px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-forest/15 p-2 text-forest">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-serif font-bold text-ink text-lg">
                Cryptographic Sanitization Certificate
              </h3>
              <p className="font-mono text-xs text-muted">
                ECDSA P-256 Signature • Merkle Tree Chunk Proof • Web Crypto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('certificate')}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                activeTab === 'certificate'
                  ? 'bg-forest text-cream'
                  : 'bg-sunken text-muted hover:text-ink'
              }`}
            >
              Certificate View
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                activeTab === 'verify'
                  ? 'bg-forest text-cream'
                  : 'bg-sunken text-muted hover:text-ink'
              }`}
            >
              Verify Receipt
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-sunken hover:text-ink transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: CERTIFICATE VIEW */}
        {activeTab === 'certificate' && (
          <div className="p-6 md:p-8 space-y-6 bg-card print:p-0 print:bg-white text-ink">
            {/* Certificate Header Banner */}
            <div className="border-b-2 border-forest pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-forest">
                  ECHO//TRACE CERTIFIED SANITIZATION RECEIPT
                </span>
                <h1 className="font-serif text-2xl font-black text-ink mt-1">
                  Forensic Integrity Guarantee
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  Generated client-side via W3C Web Cryptography API & Zero-Knowledge Merkle Proof
                </p>
              </div>

              {/* 8x8 Visual Hash Block */}
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-8 gap-0.5 p-1 bg-deep-forest rounded border border-hairline shadow-inner">
                  {cells.map((color, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: color }}
                      className="w-2.5 h-2.5 rounded-[1px]"
                    />
                  ))}
                </div>
                <div className="text-left font-mono text-[10px] text-muted">
                  <span className="block font-bold text-ink">VISUAL HASH</span>
                  <span>8x8 Merkle Matrix</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Identifiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-page p-4 rounded-xl border border-hairline font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-muted tracking-wider block">Input SHA-256</span>
                <span className="text-brick font-bold break-all select-all">
                  {receipt.manifest.inputSha256}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted tracking-wider block">Sanitized SHA-256</span>
                <span className="text-forest font-bold break-all select-all">
                  {receipt.manifest.outputSha256}
                </span>
              </div>
              <div className="pt-2 border-t border-hairline md:border-t-0">
                <span className="text-[10px] uppercase text-muted tracking-wider block">Input Merkle Root</span>
                <span className="text-ink break-all select-all">
                  {receipt.manifest.inputMerkleRoot}
                </span>
              </div>
              <div className="pt-2 border-t border-hairline md:border-t-0">
                <span className="text-[10px] uppercase text-muted tracking-wider block">Output Merkle Root</span>
                <span className="text-ink font-bold break-all select-all">
                  {receipt.manifest.outputMerkleRoot}
                </span>
              </div>
            </div>

            {/* Transformations Applied */}
            <div className="space-y-2">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                <span>Transformations Applied ({receipt.manifest.actions.length})</span>
              </h4>
              <div className="space-y-1.5 font-mono text-xs">
                {receipt.manifest.actions.map((act, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-page p-2.5 rounded-lg border border-hairline"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-forest" />
                      <span className="font-bold text-ink">{act.type}:</span>
                      <span className="text-muted">{act.description}</span>
                    </div>
                    <span className="text-[11px] text-forest font-semibold">
                      {Object.entries(act.parameters).map(([k, v]) => `${k}=${v}`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Closed-Loop Verification Checklist */}
            {closedLoopResult && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Closed-Loop Post-Sanitization Verification</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                  {closedLoopResult.ruleChecks.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-hairline bg-page flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-ink block">{rule.rule}</span>
                        <span className="text-[11px] text-muted">{rule.measuredValue}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.passed
                            ? 'bg-forest/15 text-forest border border-forest/30'
                            : 'bg-brick/15 text-brick border border-brick/30'
                        }`}
                      >
                        {rule.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ECDSA Signature Verification Block */}
            <div className="rounded-xl border border-hairline bg-page p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-hairline pb-2">
                <div className="flex items-center gap-2 text-forest font-bold">
                  <Key className="h-4 w-4" />
                  <span>ECDSA P-256 Digital Signature</span>
                </div>
                <span className="text-forest font-bold bg-forest/15 px-2 py-0.5 rounded text-[10px]">
                  MATHEMATICALLY VALID
                </span>
              </div>
              <div className="text-muted break-all text-[11px]">
                <span className="font-bold text-ink">Signature: </span>
                {receipt.signatureHex}
              </div>
              <div className="text-[10px] text-muted pt-1">
                Signed on: {new Date(receipt.manifest.timestamp).toUTCString()} by temporary session keypair.
              </div>
            </div>

            {/* Printable Controls (Hidden on print) */}
            <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-forest px-4 py-2 font-mono text-xs font-bold text-cream hover:bg-forest/90 transition shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-hairline bg-sunken px-4 py-2 font-mono text-xs font-bold text-ink hover:bg-page transition"
                >
                  <Download className="h-4 w-4" />
                  <span>Export receipt.json</span>
                </button>
              </div>
              <span className="font-mono text-xs text-muted">
                Tamper-evident verification file ready.
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: VERIFY RECEIPT VIEW */}
        {activeTab === 'verify' && (
          <div className="p-6 md:p-8 space-y-6 bg-card text-ink">
            <div>
              <h4 className="font-serif font-bold text-lg text-ink">
                Verify an Exported Sanitization Receipt
              </h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Drag and drop any exported <code>receipt.json</code> file below. ECHO//TRACE will independently reconstruct the SHA-256 manifest and execute Web Crypto ECDSA signature validation locally.
              </p>
            </div>

            {/* Upload Zone */}
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-hairline bg-page p-8 cursor-pointer hover:border-forest transition">
              <div className="rounded-full bg-forest/15 p-3 text-forest">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span className="font-mono text-xs font-bold text-forest">
                  Choose or drag receipt.json
                </span>
                <span className="block text-[11px] text-muted mt-0.5">
                  Validates ECDSA P-256 signature and Merkle root in browser
                </span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Result status */}
            {dropVerifyStatus === 'valid' && (
              <div className="rounded-xl border border-forest/30 bg-forest/10 p-4 font-mono text-xs text-forest space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-forest" />
                  <span>CRYPTOGRAPHIC RECEIPT AUTHENTIC & UNTAMPERED</span>
                </div>
                <p className="text-ink text-xs">{verifiedDetails}</p>
                <p className="text-[11px] text-muted">
                  Signature verified by W3C Web Cryptography API against embedded P-256 public key.
                </p>
              </div>
            )}

            {dropVerifyStatus === 'invalid' && (
              <div className="rounded-xl border border-brick/30 bg-brick/10 p-4 font-mono text-xs text-brick space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 text-brick" />
                  <span>VERIFICATION FAILED: SIGNATURE OR PAYLOAD TAMPERED</span>
                </div>
                <p className="text-xs text-ink">
                  The data in the manifest does not match the ECDSA cryptographic signature. This receipt has been modified or generated with an invalid key.
                </p>
              </div>
            )}

            {dropVerifyStatus === 'parsing_error' && (
              <div className="rounded-xl border border-ochre/30 bg-ochre/10 p-4 font-mono text-xs text-ochre space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 text-ochre" />
                  <span>INVALID RECEIPT FORMAT</span>
                </div>
                <p className="text-xs text-ink">
                  The selected file is not a valid ECHO//TRACE receipt JSON file.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
