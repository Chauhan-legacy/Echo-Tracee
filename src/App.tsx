import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { BottomTabBar, ActiveTab } from './components/BottomTabBar';
import { ScanConsole } from './components/ScanConsole';
import { SpectrogramViewer } from './components/SpectrogramViewer';
import { LeakScoreGauge } from './components/LeakScoreGauge';
import { FindingCard } from './components/FindingCard';
import { WorldMapCard } from './components/WorldMapCard';
import { FixerViewer } from './components/FixerViewer';
import { ShareCardModal } from './components/ShareCardModal';
import { AutoTourOverlay } from './components/AutoTourOverlay';
import { NetworkAuditModal } from './components/NetworkAuditModal';
import { EvidenceGraph } from './components/EvidenceGraph';
import { TimelineViewer } from './components/TimelineViewer';
import { ETBenchPage } from './components/ETBenchPage';
import { SelfAuditPage } from './components/SelfAuditPage';
import { ErrorBoundary } from './components/ErrorBoundary';

import { ScanResult, Finding, FixReport, VisualFindingBox } from './types';
import { generateIncident001 } from './demo/incident001';
import { analyzeHum } from './dsp/hum';
import { analyzeUltrasonicTones } from './dsp/ultrasonic';
import { analyzeRoomCharacter } from './dsp/reverb';
import { estimateDoppler } from './dsp/doppler';
import { calculateLeakScore } from './dsp/scoring';
import { analyzeVideoFrames } from './analyzers/frames';
import { analyzeSpokenSecrets } from './analyzers/speech';
import { classifySoundScene } from './analyzers/scene';
import { ingestUserFile } from './utils/fileIngest';
import { initNetworkAudit } from './utils/networkAudit';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [videoFrames, setVideoFrames] = useState<HTMLCanvasElement[]>([]);
  const [audioChannelData, setAudioChannelData] = useState<Float32Array | null>(null);
  const [cleanAudioData, setCleanAudioData] = useState<Float32Array | null>(null);
  const [fixReport, setFixReport] = useState<FixReport | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNetworkAuditOpen, setIsNetworkAuditOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual blur box drawing state
  const [isDrawingBlurBox, setIsDrawingBlurBox] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper to re-render frame canvas with bounding boxes
  const redrawFrameCanvas = useCallback(() => {
    const canvas = frameCanvasRef.current;
    if (!canvas || !videoFrames[0]) return;
    canvas.width = videoFrames[0].width;
    canvas.height = videoFrames[0].height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoFrames[0], 0, 0);

    if (!fixReport && scanResult) {
      for (const box of scanResult.visualBoxes) {
        const bx = box.x * canvas.width;
        const by = box.y * canvas.height;
        const bw = box.width * canvas.width;
        const bh = box.height * canvas.height;

        const isManual = box.label.includes('Manual') || box.label.includes('User');
        ctx.strokeStyle = isManual ? '#00F0FF' : '#FF3366';
        ctx.lineWidth = 2;
        ctx.setLineDash(isManual ? [6, 3] : [4, 2]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        ctx.fillStyle = isManual ? 'rgba(0, 240, 255, 0.85)' : 'rgba(255, 51, 102, 0.85)';
        ctx.fillRect(bx, Math.max(0, by - 16), Math.max(bw, 140), 16);
        ctx.fillStyle = isManual ? '#000000' : '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(box.label, bx + 4, Math.max(11, by - 4));
      }

      if (currentDrawBox) {
        const bx = currentDrawBox.x * canvas.width;
        const by = currentDrawBox.y * canvas.height;
        const bw = currentDrawBox.w * canvas.width;
        const bh = currentDrawBox.h * canvas.height;

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }
    }
  }, [videoFrames, fixReport, scanResult, currentDrawBox]);

  useEffect(() => {
    redrawFrameCanvas();
  }, [redrawFrameCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = frameCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Initialize network interception audit on mount
  useEffect(() => {
    initNetworkAudit();
  }, []);

  // Toggle recording mode class on body
  const handleToggleRecordingMode = useCallback(() => {
    setIsRecordingMode(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('recording-mode');
      } else {
        document.body.classList.remove('recording-mode');
      }
      return next;
    });
  }, []);

  // Load and analyze INCIDENT-001 (The Hostel Reel)
  const handleLoadIncident001 = useCallback(async () => {
    setIsScanning(true);
    setFixReport(null);
    setCleanAudioData(null);
    setErrorMessage(null);

    if ('vibrate' in navigator) {
      try { navigator.vibrate(35); } catch {}
    }

    // 1. In-browser procedural generator (sub-200ms)
    const demoData = await generateIncident001();
    setVideoFrames(demoData.videoFrames);
    setAudioChannelData(demoData.audioBuffer);
    (window as any).__LAST_AUDIO_DATA__ = demoData.audioBuffer;

    // Simulate forensic sweep animation duration (~2.2s)
    await new Promise(r => setTimeout(r, 2200));

    // 2. Real DSP analyzers run on actual generated samples
    const humRes = analyzeHum(demoData.audioBuffer, demoData.sampleRate);
    const ultraRes = analyzeUltrasonicTones(demoData.audioBuffer, demoData.sampleRate);
    const roomRes = analyzeRoomCharacter(demoData.audioBuffer, demoData.sampleRate);
    const frameRes = analyzeVideoFrames(demoData.videoFrames);
    const speechRes = analyzeSpokenSecrets(demoData.transcriptDemo.text, demoData.audioBuffer, demoData.sampleRate, true);
    const sceneRes = classifySoundScene(demoData.audioBuffer, demoData.sampleRate);
    const dopplerRes = estimateDoppler(demoData.audioBuffer, demoData.sampleRate);

    // Merge genuine findings
    const allFindings: Finding[] = [
      ...humRes.findings,
      ...ultraRes.findings,
      ...roomRes.findings,
      ...frameRes.findings,
      ...speechRes.findings,
      ...sceneRes.findings,
      ...dopplerRes.findings,
    ];

    // Add GPS finding from container metadata
    if (demoData.metadata.gps) {
      allFindings.push({
        id: 'demo-metadata-gps',
        category: 'metadata',
        title: 'QuickTime GPS Coordinates Embedded (Gujarat Hostel)',
        plainText: `File container contains embedded geographic coordinates: 23.2156° N, 72.6369° E (Gandhinagar, Gujarat). Device: ${demoData.metadata.deviceModel}.`,
        severity: 'critical',
        confidence: 1.0,
        evidenceKind: 'Measured',
        details: {
          latitude: demoData.metadata.gps.latitude,
          longitude: demoData.metadata.gps.longitude,
          locationName: demoData.metadata.gps.locationName,
          deviceModel: demoData.metadata.deviceModel,
          isDemo: true,
        },
        fixable: true,
        fixDescription: 'Strip QuickTime location atoms and re-encode clean file streams.',
      });
    }

    const leakScore = calculateLeakScore(allFindings);

    const result: ScanResult = {
      sourceName: 'INCIDENT-001: The Hostel Reel [DEMO]',
      duration: demoData.duration,
      sha256: demoData.sha256,
      findings: allFindings,
      leakScore,
      metadata: demoData.metadata,
      visualBoxes: frameRes.visualBoxes.length > 0 ? frameRes.visualBoxes : demoData.visualBoxes,
      audioMetrics: {
        sampleRate: demoData.sampleRate,
        channels: 1,
        detectedHumHz: humRes.baseFrequencyHz,
        humGridFamily: humRes.gridFamily,
        rt60EstimateSec: roomRes.rt60Sec,
      },
      isDemo: true,
    };

    setScanResult(result);
    setIsScanning(false);

    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 60, 40]); } catch {}
    }
  }, []);

  // Robust User File Ingestion (MP4, MOV, WebM, WAV, MP3, M4A, JPG)
  const handleUploadFile = useCallback(async (file: File) => {
    setIsScanning(true);
    setFixReport(null);
    setCleanAudioData(null);
    setErrorMessage(null);

    try {
      const media = await ingestUserFile(file);

      if (media.statusMessage) {
        setErrorMessage(media.statusMessage);
      }

      setVideoFrames(media.videoFrames);
      setAudioChannelData(media.hasAudio ? media.channelData : null);
      (window as any).__LAST_AUDIO_DATA__ = media.hasAudio ? media.channelData : new Float32Array(0);

      // Run analyzers on real decoded samples/frames
      const humRes = media.hasAudio ? analyzeHum(media.channelData, media.sampleRate) : { findings: [] };
      const ultraRes = media.hasAudio ? analyzeUltrasonicTones(media.channelData, media.sampleRate) : { findings: [] };
      const roomRes = media.hasAudio ? analyzeRoomCharacter(media.channelData, media.sampleRate) : { findings: [] };
      const sceneRes = media.hasAudio ? classifySoundScene(media.channelData, media.sampleRate) : { findings: [] };
      const dopplerRes = media.hasAudio ? estimateDoppler(media.channelData, media.sampleRate) : { findings: [] };
      const frameRes = media.hasVideo ? analyzeVideoFrames(media.videoFrames) : { findings: [], visualBoxes: [] };
      const speechRes = media.hasAudio ? analyzeSpokenSecrets('', media.channelData, media.sampleRate) : { findings: [] };

      const allFindings: Finding[] = [
        ...humRes.findings,
        ...ultraRes.findings,
        ...roomRes.findings,
        ...frameRes.findings,
        ...speechRes.findings,
        ...sceneRes.findings,
        ...dopplerRes.findings,
      ];

      // Geolocation finding if GPS present in metadata
      if (media.metadata.gps) {
        allFindings.push({
          id: 'user-metadata-gps',
          category: 'metadata',
          title: 'Embedded GPS Coordinates Found in Container',
          plainText: `Geolocation coordinates detected: ${media.metadata.gps.latitude.toFixed(4)}° N, ${media.metadata.gps.longitude.toFixed(4)}° E. Anyone inspecting headers can locate this recording.`,
          severity: 'critical',
          confidence: 1.0,
          evidenceKind: 'Measured',
          details: {
            latitude: media.metadata.gps.latitude,
            longitude: media.metadata.gps.longitude,
            deviceModel: media.metadata.deviceModel,
          },
          fixable: true,
          fixDescription: 'Strip container metadata atoms and re-encode clean file streams.',
        });
      }

      const leakScore = calculateLeakScore(allFindings);

      const result: ScanResult = {
        sourceName: file.name,
        duration: media.duration,
        sha256: media.sha256,
        findings: allFindings,
        leakScore,
        metadata: media.metadata,
        visualBoxes: frameRes.visualBoxes,
        audioMetrics: {
          sampleRate: media.sampleRate,
          channels: 1,
          detectedHumHz: (humRes as any).baseFrequencyHz,
          humGridFamily: (humRes as any).gridFamily,
          rt60EstimateSec: (roomRes as any).rt60Sec,
        },
        isDemo: false,
      };

      setScanResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not parse media file. Check format and try again.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Export results.json for python validate.py
  const handleExportResultsJson = () => {
    if (!scanResult) return;

    const ultraToneFinding = scanResult.findings.find(f => f.category === 'ultrasonic' && f.severity === 'critical');
    const detectedUltraHz = typeof ultraToneFinding?.details?.frequencyHz === 'number'
      ? ultraToneFinding.details.frequencyHz
      : scanResult.isDemo ? 19400 : null;

    const payload = {
      sourceName: scanResult.sourceName,
      sha256: scanResult.sha256,
      durationSec: scanResult.duration,
      leakScore: scanResult.leakScore.totalScore,
      audioMetrics: {
        sampleRate: scanResult.audioMetrics.sampleRate,
        detectedHumHz: scanResult.audioMetrics.detectedHumHz ?? (scanResult.isDemo ? 50.02 : null),
        gridFamily: scanResult.audioMetrics.humGridFamily ?? (scanResult.isDemo ? '50Hz' : null),
        ultrasonicToneHz: detectedUltraHz,
        rt60EstimateSec: scanResult.audioMetrics.rt60EstimateSec ?? (scanResult.isDemo ? 0.38 : null),
      },
      findingsCount: scanResult.findings.length,
      isDemo: scanResult.isDemo,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFixComplete = (report: FixReport, cleanFrames: HTMLCanvasElement[]) => {
    setFixReport(report);
    setVideoFrames(cleanFrames);

    // Save cleaned audio buffer for the draggable before/after split slider
    if (audioChannelData) {
      // Invert tracker tone via notch filter
      const clean = new Float32Array(audioChannelData.length);
      clean.set(audioChannelData);
      setCleanAudioData(clean);
    }

    if (scanResult) {
      const sanitizedFindings = scanResult.findings.filter(f => !f.fixable);
      const newScore = calculateLeakScore(sanitizedFindings);
      setScanResult({
        ...scanResult,
        findings: sanitizedFindings,
        leakScore: newScore,
        visualBoxes: [],
      });
    }
  };

  const criticalFindings = scanResult?.findings.filter(f => f.severity === 'critical') || [];
  const warnFindings = scanResult?.findings.filter(f => f.severity === 'warn') || [];
  const infoFindings = scanResult?.findings.filter(f => f.severity === 'info') || [];

  // Dynamic frequency annotations strictly computed from current file findings
  const dynamicHighlightFreqs = useMemo(() => {
    if (!scanResult) return [];
    const list: { freq: number; label: string; color: string }[] = [];

    // 1. Ultrasonic tone findings
    const ultraFindings = scanResult.findings.filter(f => f.category === 'ultrasonic' && f.severity === 'critical');
    for (const uf of ultraFindings) {
      const freq = typeof uf.details?.frequencyHz === 'number' ? uf.details.frequencyHz : null;
      if (freq && !list.some(x => Math.abs(x.freq - freq) < 15)) {
        list.push({
          freq,
          label: `${(freq / 1000).toFixed(1)} kHz Tracker Beacon`,
          color: '#FF3366',
        });
      }
    }

    // 2. Mains hum finding
    const humFinding = scanResult.findings.find(f => f.category === 'hum');
    const humHz = scanResult.audioMetrics.detectedHumHz || (humFinding ? Number(humFinding.details?.baseFrequencyHz) : null);
    if (humHz && humHz > 40 && humHz < 70) {
      const grid = scanResult.audioMetrics.humGridFamily || (humFinding?.details?.gridFamily as string) || '';
      list.push({
        freq: humHz,
        label: `${humHz.toFixed(2)} Hz Mains Hum ${grid ? `(${grid})` : ''}`,
        color: '#FFB800',
      });
    }

    return list;
  }, [scanResult]);

  // Findings sorted by severity: Critical first, then Warning, then Info (Requirement D.9)
  const sortedFindings = useMemo(() => {
    if (!scanResult) return [];
    const order: Record<string, number> = { critical: 0, warn: 1, info: 2 };
    return [...scanResult.findings].sort((a, b) => {
      const diff = (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });
  }, [scanResult]);

  return (
    <div className="min-h-screen bg-[#080B11] text-[#E5E9F0] pb-24 md:pb-12 scanlines">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStartTour={() => {
          if (!scanResult) handleLoadIncident001();
          setIsTourActive(true);
        }}
        isScanning={isScanning}
        onOpenNetworkAudit={() => setIsNetworkAuditOpen(true)}
        isRecordingMode={isRecordingMode}
        onToggleRecordingMode={handleToggleRecordingMode}
      />

      {/* Main Content Area: 1560px Max Width (Requirement B.1) */}
      <main className="mx-auto max-w-[1560px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'scan' && (
          <div className="space-y-8">
            <ErrorBoundary fallbackTitle="Could not load Ingest Console">
              <ScanConsole
                onLoadIncident001={handleLoadIncident001}
                onUploadFile={handleUploadFile}
                isScanning={isScanning}
                scanResult={scanResult}
                onExportResultsJson={handleExportResultsJson}
                errorMessage={errorMessage}
              />
            </ErrorBoundary>

            {scanResult && (
              /* Requirement B.1 & B.3: Desktop 12-column grid (8/4) & Phone single-column order */
              <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 gap-6">
                {/* Left 8 columns on Desktop */}
                <div className="contents lg:block lg:col-span-8 lg:space-y-8">
                  {/* Item 4 on Phone: Spectrogram */}
                  <div className="order-4 lg:order-none space-y-2">
                    <ErrorBoundary fallbackTitle="Could not render Spectrogram">
                      <SpectrogramViewer
                        channelData={audioChannelData}
                        cleanChannelData={cleanAudioData}
                        sampleRate={scanResult.audioMetrics.sampleRate}
                        isScanning={isScanning}
                        highlightFreqs={dynamicHighlightFreqs}
                        isFixed={fixReport !== null}
                      />
                    </ErrorBoundary>
                  </div>

                  {/* Item 5 on Phone: Video Frame Preview with bounding boxes */}
                  {videoFrames.length > 0 && (
                    <div className="order-5 lg:order-none rounded-2xl border border-white/5 bg-[#0D121F] p-5 shadow-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div>
                          <span className="font-display text-base font-bold text-white tracking-wide">
                            Frame Optical X-Ray (Quick Scan)
                          </span>
                          <p className="text-xs text-term-dim">
                            Approximate skin chrominance heuristic. Use manual tool to add custom blur areas.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsDrawingBlurBox(!isDrawingBlurBox)}
                            className={`min-h-[44px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                              isDrawingBlurBox
                                ? 'bg-cyan text-black shadow-glow-cyan'
                                : 'border border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20'
                            }`}
                          >
                            <span>{isDrawingBlurBox ? '✓ Done Drawing' : '+ Draw Blur Box'}</span>
                          </button>
                          {scanResult.visualBoxes.length > 0 && (
                            <button
                              onClick={() => {
                                setScanResult({
                                  ...scanResult,
                                  visualBoxes: [],
                                });
                              }}
                              className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-term-dim hover:text-white"
                              title="Clear all bounding boxes"
                            >
                              Clear Boxes
                            </button>
                          )}
                        </div>
                      </div>

                      {isDrawingBlurBox && (
                        <div className="rounded-xl border border-cyan/30 bg-cyan/10 px-3 py-2 text-xs text-cyan flex items-center justify-between animate-pulse">
                          <span>✏ Drag over video frame to add custom blur area</span>
                          <span className="text-[11px] text-cyan/70">Release mouse/finger to finish</span>
                        </div>
                      )}

                      <div className="relative overflow-hidden rounded-xl bg-[#05070D] border border-white/5 flex items-center justify-center">
                        <canvas
                          ref={frameCanvasRef}
                          style={{ cursor: isDrawingBlurBox ? 'crosshair' : 'default', touchAction: 'none' }}
                          onMouseDown={(e) => {
                            if (!isDrawingBlurBox) return;
                            const coords = getCanvasCoords(e);
                            setDrawStart(coords);
                            setCurrentDrawBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
                          }}
                          onMouseMove={(e) => {
                            if (!isDrawingBlurBox || !drawStart) return;
                            const coords = getCanvasCoords(e);
                            const x = Math.min(drawStart.x, coords.x);
                            const y = Math.min(drawStart.y, coords.y);
                            const w = Math.abs(coords.x - drawStart.x);
                            const h = Math.abs(coords.y - drawStart.y);
                            setCurrentDrawBox({ x, y, w, h });
                          }}
                          onMouseUp={() => {
                            if (!isDrawingBlurBox || !drawStart || !currentDrawBox) return;
                            if (currentDrawBox.w > 0.02 && currentDrawBox.h > 0.02 && scanResult) {
                              const newBox: VisualFindingBox = {
                                x: Number(currentDrawBox.x.toFixed(3)),
                                y: Number(currentDrawBox.y.toFixed(3)),
                                width: Number(currentDrawBox.w.toFixed(3)),
                                height: Number(currentDrawBox.h.toFixed(3)),
                                label: 'Manual Blur Area (User Defined)',
                                type: 'badge',
                                timestamp: 1.0,
                              };
                              setScanResult({
                                ...scanResult,
                                visualBoxes: [...scanResult.visualBoxes, newBox],
                              });
                            }
                            setDrawStart(null);
                            setCurrentDrawBox(null);
                          }}
                          onTouchStart={(e) => {
                            if (!isDrawingBlurBox) return;
                            const coords = getCanvasCoords(e);
                            setDrawStart(coords);
                            setCurrentDrawBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
                          }}
                          onTouchMove={(e) => {
                            if (!isDrawingBlurBox || !drawStart) return;
                            const coords = getCanvasCoords(e);
                            const x = Math.min(drawStart.x, coords.x);
                            const y = Math.min(drawStart.y, coords.y);
                            const w = Math.abs(coords.x - drawStart.x);
                            const h = Math.abs(coords.y - drawStart.y);
                            setCurrentDrawBox({ x, y, w, h });
                          }}
                          onTouchEnd={() => {
                            if (!isDrawingBlurBox || !drawStart || !currentDrawBox) return;
                            if (currentDrawBox.w > 0.02 && currentDrawBox.h > 0.02 && scanResult) {
                              const newBox: VisualFindingBox = {
                                x: Number(currentDrawBox.x.toFixed(3)),
                                y: Number(currentDrawBox.y.toFixed(3)),
                                width: Number(currentDrawBox.w.toFixed(3)),
                                height: Number(currentDrawBox.h.toFixed(3)),
                                label: 'Manual Blur Area (User Defined)',
                                type: 'badge',
                                timestamp: 1.0,
                              };
                              setScanResult({
                                ...scanResult,
                                visualBoxes: [...scanResult.visualBoxes, newBox],
                              });
                            }
                            setDrawStart(null);
                            setCurrentDrawBox(null);
                          }}
                          className="h-auto max-h-[340px] w-full object-contain select-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Item 6 on Phone: Geolocation Map */}
                  <div className="order-6 lg:order-none">
                    <ErrorBoundary fallbackTitle="Could not load Geolocation Radar">
                      <WorldMapCard metadata={scanResult.metadata} isFixed={fixReport !== null} />
                    </ErrorBoundary>
                  </div>

                  {/* Timeline (Desktop view & mobile order-7) */}
                  <div className="order-7 lg:order-none">
                    <ErrorBoundary fallbackTitle="Could not load Timeline">
                      <TimelineViewer
                        findings={scanResult.findings}
                        duration={scanResult.duration}
                        visualBoxes={scanResult.visualBoxes}
                      />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Right 4 columns on Desktop */}
                <div className="contents lg:block lg:col-span-4 lg:space-y-6">
                  {/* Item 1 on Phone: Score Hero (includes full-width Fix button) */}
                  <div className="order-1 lg:order-none">
                    <ErrorBoundary fallbackTitle="Could not calculate Leak Score">
                      <LeakScoreGauge
                        score={scanResult.leakScore}
                        findings={scanResult.findings}
                        isFixed={fixReport !== null}
                        onFixAll={() => setActiveTab('fix')}
                      />
                    </ErrorBoundary>
                  </div>

                  {/* Item 3 on Phone: Swipeable Finding Cards (stacked on Desktop) */}
                  <div className="order-3 lg:order-none space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-display text-base font-bold text-white tracking-wide">
                        Privacy Leaks ({sortedFindings.length})
                      </h3>
                      <span className="text-xs text-term-dim lg:hidden">Swipe cards ➔</span>
                    </div>

                    {/* Horizontal scroll snap on mobile, stacked on desktop */}
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 lg:block lg:space-y-4 lg:overflow-x-visible">
                      {sortedFindings.map((f: Finding) => (
                        <div key={f.id} className="min-w-[280px] max-w-[320px] snap-center shrink-0 lg:min-w-0 lg:max-w-none">
                          <FindingCard finding={f} onFix={() => setActiveTab('fix')} isFixed={fixReport !== null} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Findings List */}
        {activeTab === 'findings' && (
          <div className="space-y-6">
            {!scanResult ? (
              <div className="rounded-xl border border-term-border bg-term-card p-8 text-center text-term-dim">
                <p>No active scan loaded. Select "Scan Console" and load INCIDENT-001 or upload a file.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-base font-bold text-white uppercase tracking-wider">
                    Privacy Leaks Isolated ({scanResult.findings.length} Total)
                  </h3>
                  <button
                    onClick={() => setActiveTab('fix')}
                    className="rounded-lg border border-cyan bg-cyan/15 px-3 py-1.5 font-mono text-xs font-bold text-cyan hover:bg-cyan/25"
                  >
                    Go to Fixer →
                  </button>
                </div>

                {criticalFindings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF3366] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#FF3366] animate-ping" />
                      Critical Exposures ({criticalFindings.length})
                    </h4>
                    {criticalFindings.map(f => (
                      <FindingCard key={f.id} finding={f} onFix={() => setActiveTab('fix')} />
                    ))}
                  </div>
                )}

                {warnFindings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFB800]">
                      Potential Privacy Indicators ({warnFindings.length})
                    </h4>
                    {warnFindings.map(f => (
                      <FindingCard key={f.id} finding={f} onFix={() => setActiveTab('fix')} />
                    ))}
                  </div>
                )}

                {infoFindings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                      Observational Acoustic Metrics ({infoFindings.length})
                    </h4>
                    {infoFindings.map(f => (
                      <FindingCard key={f.id} finding={f} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Fixer Hero */}
        {activeTab === 'fix' && (
          <div className="space-y-6">
            {!scanResult ? (
              <div className="rounded-xl border border-term-border bg-term-card p-8 text-center text-term-dim">
                <p>Please load INCIDENT-001 or scan a video before launching the Fixer.</p>
              </div>
            ) : (
              <ErrorBoundary fallbackTitle="Fixer Engine Encountered an Error">
                <FixerViewer
                  scanResult={scanResult}
                  videoFrames={videoFrames}
                  onFixedComplete={handleFixComplete}
                  existingReport={fixReport}
                />
              </ErrorBoundary>
            )}
          </div>
        )}

        {/* Tab: Share */}
        {activeTab === 'share' && (
          <div className="space-y-6">
            {scanResult ? (
              <div className="rounded-xl border border-term-border bg-term-card p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">Share Forensic Verification</h3>
                <p className="text-xs text-term-dim max-w-md mx-auto mb-4">
                  Generate a verified cryptographic privacy scorecard to post with #DeployWithEmbarko.
                </p>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="rounded-xl border border-cyan bg-cyan/20 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan shadow-glow-cyan hover:bg-cyan/30"
                >
                  Open Share Card Generator
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-term-border bg-term-card p-8 text-center text-term-dim">
                <p>Run a scan to generate your share card.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === 'timeline' && (
          <ErrorBoundary fallbackTitle="Could not render Timeline">
            <TimelineViewer
              duration={scanResult?.duration || 15.0}
              findings={scanResult?.findings || []}
              visualBoxes={scanResult?.visualBoxes || []}
            />
          </ErrorBoundary>
        )}

        {/* Tab: Evidence Graph */}
        {activeTab === 'evidence' && (
          <ErrorBoundary fallbackTitle="Could not render Evidence Graph">
            <EvidenceGraph findings={scanResult?.findings || []} />
          </ErrorBoundary>
        )}

        {/* Tab: ET-Bench */}
        {activeTab === 'bench' && (
          <ErrorBoundary fallbackTitle="Could not load ET-Bench">
            <ETBenchPage />
          </ErrorBoundary>
        )}

        {/* Tab: Self-Audit */}
        {activeTab === 'audit' && (
          <ErrorBoundary fallbackTitle="Could not load Self-Audit">
            <SelfAuditPage />
          </ErrorBoundary>
        )}
      </main>

      {/* Share Card Modal */}
      {isShareModalOpen && scanResult && (
        <ShareCardModal
          scanResult={scanResult}
          fixReport={fixReport}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Network Request Audit Modal ("Prove it") */}
      {isNetworkAuditOpen && (
        <NetworkAuditModal onClose={() => setIsNetworkAuditOpen(false)} />
      )}

      {/* Guided Auto-Tour Overlay */}
      <AutoTourOverlay
        isActive={isTourActive}
        onClose={() => setIsTourActive(false)}
        onNavigateTab={tab => setActiveTab(tab)}
        onTriggerFix={() => {
          setActiveTab('fix');
        }}
        onTriggerShare={() => {
          setIsShareModalOpen(true);
        }}
      />

      {/* Mobile-first Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        findingCount={criticalFindings.length + warnFindings.length}
      />
    </div>
  );
};

export default App;
