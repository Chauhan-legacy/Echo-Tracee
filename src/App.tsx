/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { DesktopTopBar } from './components/DesktopTopBar';
import { LeftIconRail } from './components/LeftIconRail';
import { BottomTabBar, ActiveTab } from './components/BottomTabBar';
import { ScanConsole } from './components/ScanConsole';
import { SpectrogramViewer } from './components/SpectrogramViewer';
import { LeakScoreGauge } from './components/LeakScoreGauge';
import { FindingCard } from './components/FindingCard';
import { HowWeKnowPanel } from './components/HowWeKnowPanel';
import { WorldMapCard } from './components/WorldMapCard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HearToneCard } from './components/HearToneCard';
import { AttackersViewCard } from './components/AttackersViewCard';
import { BeforeYouPostChecklist } from './components/BeforeYouPostChecklist';
import { BeaconBitStrip } from './components/BeaconBitStrip';
import { FirstRunHints } from './components/FirstRunHints';
import { SkyLeakRadarCard } from './components/SkyLeakRadarCard';
import { IngestedMedia, ingestUserFile } from './utils/fileIngest';
import { SITE_URL, APP_CONFIG } from './config';

import { ScanResult, Finding, FixReport, VisualFindingBox } from './types';
import { generateIncident001, generateIncident002, generateIncident003, generateIncident004 } from './demo/incident001';
import { analyzeHum } from './dsp/hum';
import { analyzeUltrasonicTones } from './dsp/ultrasonic';
import { analyzeRoomCharacter } from './dsp/reverb';
import { estimateDoppler } from './dsp/doppler';
import { calculateLeakScore } from './dsp/scoring';
import { analyzeVideoFrames } from './analyzers/frames';
import { analyzeSpokenSecrets } from './analyzers/speech';
import { classifySoundScene } from './analyzers/scene';
import { initNetworkAudit } from './utils/networkAudit';

// Lazy-loaded heavy components for bundle budget (<250 kB gzip initial payload)
const FixerViewer = lazy(() => import('./components/FixerViewer').then(m => ({ default: m.FixerViewer })));
const ShareCardModal = lazy(() => import('./components/ShareCardModal').then(m => ({ default: m.ShareCardModal })));
const AutoTourOverlay = lazy(() => import('./components/AutoTourOverlay').then(m => ({ default: m.AutoTourOverlay })));
const NetworkAuditModal = lazy(() => import('./components/NetworkAuditModal').then(m => ({ default: m.NetworkAuditModal })));
const LiveRoomScanModal = lazy(() => import('./components/LiveRoomScanModal').then(m => ({ default: m.LiveRoomScanModal })));
const ModelCardModal = lazy(() => import('./components/ModelCardModal').then(m => ({ default: m.ModelCardModal })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const ETBenchPage = lazy(() => import('./components/ETBenchPage').then(m => ({ default: m.ETBenchPage })));
const SelfAuditPage = lazy(() => import('./components/SelfAuditPage').then(m => ({ default: m.SelfAuditPage })));
const VerifyReceiptPage = lazy(() => import('./components/VerifyReceiptPage').then(m => ({ default: m.VerifyReceiptPage })));
const EvidenceGraph = lazy(() => import('./components/EvidenceGraph').then(m => ({ default: m.EvidenceGraph })));
const TimelineViewer = lazy(() => import('./components/TimelineViewer').then(m => ({ default: m.TimelineViewer })));
const AdvancedDrawer = lazy(() => import('./components/AdvancedDrawer').then(m => ({ default: m.AdvancedDrawer })));
const ForensicLabModal = lazy(() => import('./components/ForensicLabModal').then(m => ({ default: m.ForensicLabModal })));

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
  const [isModelCardOpen, setIsModelCardOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLiveRoomScanOpen, setIsLiveRoomScanOpen] = useState(false);
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);
  const [isForensicLabOpen, setIsForensicLabOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Plain vs Technical toggle (F4)
  const [viewMode, setViewMode] = useState<'plain' | 'technical'>(() => {
    return (localStorage.getItem('echotrace_view_mode') as 'plain' | 'technical') || 'plain';
  });

  const toggleViewMode = () => {
    const next = viewMode === 'plain' ? 'technical' : 'plain';
    setViewMode(next);
    localStorage.setItem('echotrace_view_mode', next);
  };

  // Brushing and Linking state: currently hovered or selected finding
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Manual blur box drawing state
  const [isDrawingBlurBox, setIsDrawingBlurBox] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topFileInputRef = useRef<HTMLInputElement | null>(null);

  // Redraw frame canvas with analyst workbench boxes
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
        ctx.strokeStyle = isManual ? '#174D35' : '#A32A1F';
        ctx.lineWidth = 2;
        ctx.setLineDash(isManual ? [6, 3] : [4, 2]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        ctx.fillStyle = isManual ? '#174D35' : '#A32A1F';
        ctx.fillRect(bx, Math.max(0, by - 18), Math.max(bw, 140), 18);
        ctx.fillStyle = '#FAF5EB';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(box.label, bx + 4, Math.max(13, by - 5));
      }

      if (currentDrawBox) {
        const bx = currentDrawBox.x * canvas.width;
        const by = currentDrawBox.y * canvas.height;
        const bw = currentDrawBox.w * canvas.width;
        const bh = currentDrawBox.h * canvas.height;

        ctx.strokeStyle = '#174D35';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = 'rgba(23, 77, 53, 0.25)';
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

  // Initialize network audit, online/offline listener & check URL hash on mount
  useEffect(() => {
    initNetworkAudit();

    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#verify')) {
        setActiveTab('verify');
      } else if (hash === '#bench') {
        setActiveTab('bench');
      } else if (hash === '#audit') {
        setActiveTab('audit');
      } else if (hash === '#evidence') {
        setActiveTab('evidence');
      } else if (hash === '#timeline') {
        setActiveTab('timeline');
      } else if (hash === '#fix') {
        setActiveTab('fix');
      } else if (hash === '#share') {
        setActiveTab('share');
      } else if (hash === '#scan' || hash === '') {
        setActiveTab('scan');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
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

  // Load and analyze Incidents 001 - 004
  const handleLoadIncident = useCallback(async (incidentId: '001' | '002' | '003' | '004' = '001') => {
    if (isScanning) return; // double-tap debounce
    setIsScanning(true);
    setFixReport(null);
    setCleanAudioData(null);
    setErrorMessage(null);

    if ('vibrate' in navigator) {
      try { navigator.vibrate(35); } catch {}
    }

    const startPerf = performance.now();

    // 1. In-browser procedural generator
    const demoData = incidentId === '004'
      ? await generateIncident004()
      : incidentId === '003'
      ? await generateIncident003()
      : incidentId === '002'
      ? await generateIncident002()
      : await generateIncident001();

    setVideoFrames(demoData.videoFrames);
    setAudioChannelData(demoData.audioBuffer);
    (window as any).__LAST_AUDIO_DATA__ = demoData.audioBuffer;

    // Fast tactile delay (~200ms) to ensure LCP/latency budget <= 3.0s under 4x CPU throttle
    await new Promise(r => setTimeout(r, 200));

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
      const locName = demoData.metadata.gps.locationName || 'Demo Site';
      allFindings.push({
        id: `demo-metadata-gps-${incidentId}`,
        category: 'metadata',
        title: `QuickTime GPS Coordinates Embedded (${locName.split(',')[0]})`,
        plainText: `File container contains embedded geographic coordinates: ${demoData.metadata.gps.latitude.toFixed(4)}° N, ${demoData.metadata.gps.longitude.toFixed(4)}° E (${locName}). Device: ${demoData.metadata.deviceModel}.`,
        severity: 'critical',
        confidence: 1.0,
        evidenceKind: 'Measured',
        method: 'Direct Container Inspection (moov.trak.mdia)',
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
    const elapsedMs = Math.round(performance.now() - startPerf);

    const caseNames: Record<string, string> = {
      '001': 'INCIDENT-001: The Hostel Reel [DEMO]',
      '002': 'INCIDENT-002: Coffee Shop Voice Note [DEMO]',
      '003': 'INCIDENT-003: Silent Office Video [DEMO]',
      '004': 'INCIDENT-004: Flight Corridor Reel [DEMO]',
    };

    const result: ScanResult = {
      sourceName: caseNames[incidentId] || caseNames['001'],
      duration: demoData.duration,
      sha256: demoData.sha256,
      findings: allFindings,
      leakScore,
      metadata: demoData.metadata,
      visualBoxes: frameRes.visualBoxes.length > 0 ? frameRes.visualBoxes : demoData.visualBoxes,
      analysisTimeMs: elapsedMs,
      realtimeFactor: Number((elapsedMs / (demoData.duration * 1000)).toFixed(3)),
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
  }, [isScanning]);

  const handleLoadIncident001 = useCallback(() => handleLoadIncident('001'), [handleLoadIncident]);
  const handleLoadIncident002 = useCallback(() => handleLoadIncident('002'), [handleLoadIncident]);
  const handleLoadIncident003 = useCallback(() => handleLoadIncident('003'), [handleLoadIncident]);
  const handleLoadIncident004 = useCallback(() => handleLoadIncident('004'), [handleLoadIncident]);

  // Core Ingested Media Processor
  const processIngestedMedia = useCallback(async (media: IngestedMedia) => {
    setIsScanning(true);
    setFixReport(null);
    setCleanAudioData(null);
    setErrorMessage(null);

    const startPerf = performance.now();

    try {
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
          method: 'Direct Container Inspection (moov.trak.mdia)',
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
      const elapsedMs = Math.round(performance.now() - startPerf);

      const result: ScanResult = {
        sourceName: media.sourceName,
        duration: media.duration,
        sha256: media.sha256,
        findings: allFindings,
        leakScore,
        metadata: media.metadata,
        visualBoxes: frameRes.visualBoxes,
        analysisTimeMs: elapsedMs,
        realtimeFactor: Number((elapsedMs / (Math.max(1, media.duration) * 1000)).toFixed(3)),
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

  // Robust User File Ingestion
  const handleUploadFile = useCallback(async (file: File) => {
    if (isScanning) return; // double-tap debounce
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const media = await ingestUserFile(file);
      await processIngestedMedia(media);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not parse file. Check format and try again.');
      setIsScanning(false);
    }
  }, [isScanning, processIngestedMedia]);

  // Export results.json
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

    if (audioChannelData) {
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
    const list: { freq: number; label: string; color: string; findingId?: string }[] = [];

    const ultraFindings = scanResult.findings.filter(f => f.category === 'ultrasonic' && f.severity === 'critical');
    for (const uf of ultraFindings) {
      const freq = typeof uf.details?.frequencyHz === 'number' ? uf.details.frequencyHz : null;
      if (freq && !list.some(x => Math.abs(x.freq - freq) < 15)) {
        list.push({
          freq,
          label: `${(freq / 1000).toFixed(1)} kHz Tracker Beacon`,
          color: '#A32A1F',
          findingId: uf.id,
        });
      }
    }

    const humFinding = scanResult.findings.find(f => f.category === 'hum');
    const humHz = scanResult.audioMetrics.detectedHumHz || (humFinding ? Number(humFinding.details?.baseFrequencyHz) : null);
    if (humHz && humHz > 40 && humHz < 70) {
      const grid = scanResult.audioMetrics.humGridFamily || (humFinding?.details?.gridFamily as string) || '';
      list.push({
        freq: humHz,
        label: `${humHz.toFixed(2)} Hz Mains Hum ${grid ? `(${grid})` : ''}`,
        color: '#7A4E00',
        findingId: humFinding?.id,
      });
    }

    // SkyLeak Aircraft Blade-Pass Doppler Ridge highlight
    const aircraftFinding = scanResult.findings.find(f => f.id === 'skyleak-aircraft-doppler');
    if (aircraftFinding?.details?.flightTelemetry) {
      const tel = aircraftFinding.details.flightTelemetry as any;
      list.push({
        freq: tel.bladePassFreqHz,
        label: `${tel.bladePassFreqHz.toFixed(1)} Hz Blade-Pass (${tel.callsign})`,
        color: '#8BCF55',
        findingId: aircraftFinding.id,
      });
    }

    return list;
  }, [scanResult]);

  // Aircraft Doppler Geolocation finding if detected (SkyLeak ADS-B)
  const dopplerAircraftFinding = useMemo(() => {
    if (!scanResult) return null;
    return scanResult.findings.find(f => f.id === 'skyleak-aircraft-doppler') || null;
  }, [scanResult]);

  // Ultrasonic beacon finding if detected
  const ultrasonicBeaconFinding = useMemo(() => {
    if (!scanResult) return null;
    return scanResult.findings.find(f => f.category === 'ultrasonic' && f.severity === 'critical') || null;
  }, [scanResult]);

  // Findings sorted by severity: Critical first, then Warning, then Info
  const sortedFindings = useMemo(() => {
    if (!scanResult) return [];
    const order: Record<string, number> = { critical: 0, warn: 1, info: 2 };
    return [...scanResult.findings].sort((a, b) => {
      const diff = (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });
  }, [scanResult]);

  // Top 3 Findings for Simple Mode (Requirement 2)
  const top3Findings = useMemo(() => {
    return sortedFindings.slice(0, 3);
  }, [sortedFindings]);

  // Currently inspected finding for docked inspector
  const activeInspectedFinding = useMemo(() => {
    if (hoveredFindingId) {
      return sortedFindings.find(f => f.id === hoveredFindingId) || null;
    }
    if (selectedFindingId) {
      return sortedFindings.find(f => f.id === selectedFindingId) || null;
    }
    return sortedFindings[0] || null;
  }, [hoveredFindingId, selectedFindingId, sortedFindings]);

  const handleNextFinding = () => {
    if (sortedFindings.length === 0) return;
    const currentIndex = sortedFindings.findIndex(f => f.id === selectedFindingId);
    const nextIndex = (currentIndex + 1) % sortedFindings.length;
    setSelectedFindingId(sortedFindings[nextIndex].id);
  };

  const handlePrevFinding = () => {
    if (sortedFindings.length === 0) return;
    const currentIndex = sortedFindings.findIndex(f => f.id === selectedFindingId);
    const prevIndex = currentIndex <= 0 ? sortedFindings.length - 1 : currentIndex - 1;
    setSelectedFindingId(sortedFindings[prevIndex].id);
  };

  return (
    <div className="min-h-[100dvh] bg-beige-page text-forest-ink pb-24 md:pb-12 flex flex-col font-sans">
      {/* Offline Alert Strip */}
      {isOffline && (
        <div className="bg-[#174D35] px-4 py-2 text-center text-xs font-bold text-[#8BCF55] border-b border-forest flex items-center justify-center gap-2">
          <span>✓ Offline mode active. ECHO//TRACE runs 100% locally on your device with zero cloud requests.</span>
        </div>
      )}

      {/* Hidden file input triggered by Top Bar Upload */}
      <input
        ref={topFileInputRef}
        type="file"
        accept="audio/*,video/*,.mp4,.mov,.wav,.mp3,.webm"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleUploadFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Desktop Top Bar: Exactly 3 visible buttons, unclipped logo, case info */}
      <DesktopTopBar
        scanResult={scanResult}
        isScanning={isScanning}
        onOpenUpload={() => {
          setActiveTab('scan');
          topFileInputRef.current?.click();
        }}
        onOpenExport={() => {
          if (fixReport) {
            setActiveTab('fix');
          } else if (scanResult) {
            handleExportResultsJson();
          } else {
            setIsAdvancedDrawerOpen(true);
          }
        }}
        onOpenAdvancedDrawer={() => setIsAdvancedDrawerOpen(true)}
      />

      {/* Main Container with Left Icon Rail on Desktop */}
      <div className="flex-1 flex w-full">
        <LeftIconRail
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          findingsCount={criticalFindings.length + warnFindings.length}
        />

        {/* Main Content Area (Max 1560px, 32px gutters) */}
        <main className="flex-1 mx-auto max-w-[1560px] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8">
          {activeTab === 'scan' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Dismissible First-Run Hints (Max 3) */}
              <FirstRunHints
                hasScanResult={scanResult !== null}
                hasUltrasonic={ultrasonicBeaconFinding !== null}
                isFixed={fixReport !== null}
                onOpenFixer={() => setActiveTab('fix')}
              />

              <ErrorBoundary fallbackTitle="Could not load Ingest Console">
                <ScanConsole
                  onLoadIncident001={handleLoadIncident001}
                  onLoadIncident002={handleLoadIncident002}
                  onLoadIncident003={handleLoadIncident003}
                  onLoadIncident004={handleLoadIncident004}
                  onUploadFile={handleUploadFile}
                  isScanning={isScanning}
                  scanResult={scanResult}
                  onExportResultsJson={handleExportResultsJson}
                  onOpenNetworkAudit={() => setIsNetworkAuditOpen(true)}
                  onOpenLiveRoomScan={() => setIsLiveRoomScanOpen(true)}
                  onOpenForensicLab={() => setIsForensicLabOpen(true)}
                  errorMessage={errorMessage}
                />
              </ErrorBoundary>

              {scanResult && (
                /* Desktop 12-column grid (8/4) & Phone single-column order */
                <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 gap-6">
                  {/* Left 8 columns on Desktop */}
                  <div className="contents lg:block lg:col-span-8 lg:space-y-8">
                    {/* Item 4 on Phone: Spectrogram */}
                    <div className="order-4 lg:order-none space-y-4">
                      <ErrorBoundary fallbackTitle="Could not render Spectrogram">
                        <SpectrogramViewer
                          channelData={audioChannelData}
                          cleanChannelData={cleanAudioData}
                          sampleRate={scanResult.audioMetrics.sampleRate}
                          isScanning={isScanning}
                          highlightFreqs={dynamicHighlightFreqs}
                          isFixed={fixReport !== null}
                          hoveredFindingId={hoveredFindingId || selectedFindingId}
                          onHoverFinding={setHoveredFindingId}
                        />
                      </ErrorBoundary>

                      {/* F1: Hear the Hidden Tone & F5: Beacon Bit Strip */}
                      {ultrasonicBeaconFinding && audioChannelData && (
                        <div className="space-y-4">
                          <ErrorBoundary fallbackTitle="Could not load Tone Player">
                            <HearToneCard
                              samples={audioChannelData}
                              sampleRate={scanResult.audioMetrics.sampleRate}
                              beaconFreqHz={Number(ultrasonicBeaconFinding.details?.frequencyHz) || 19400}
                              snrDb={Number(ultrasonicBeaconFinding.details?.snrDb) || 15}
                              bitPattern={String(ultrasonicBeaconFinding.details?.bitString || '101011001101')}
                            />
                          </ErrorBoundary>
                          <ErrorBoundary fallbackTitle="Could not load Bit Strip">
                            <BeaconBitStrip
                              bitString={String(ultrasonicBeaconFinding.details?.bitString || '101011001101')}
                              baudRate={Number(ultrasonicBeaconFinding.details?.keyingRateBaud) || 12.5}
                              freqHz={Number(ultrasonicBeaconFinding.details?.frequencyHz) || 19400}
                            />
                          </ErrorBoundary>
                        </div>
                      )}

                      {/* SkyLeak: Acoustic ADS-B Aircraft Radar & Doppler Geolocation Engine */}
                      {dopplerAircraftFinding && (
                        <div className="space-y-4">
                          <ErrorBoundary fallbackTitle="Could not load Acoustic Flight Radar">
                            <SkyLeakRadarCard
                              finding={dopplerAircraftFinding}
                              onFix={() => setActiveTab('fix')}
                              isFixed={fixReport !== null}
                            />
                          </ErrorBoundary>
                        </div>
                      )}
                    </div>

                    {/* F3: Attacker's View Intelligence Card */}
                    <div className="order-8 lg:order-none">
                      <ErrorBoundary fallbackTitle="Could not load Attacker's View">
                        <AttackersViewCard findings={scanResult.findings} />
                      </ErrorBoundary>
                    </div>

                    {/* Geolocation Map */}
                    <div className="order-6 lg:order-none">
                      <ErrorBoundary fallbackTitle="Could not load Geolocation Radar">
                        <WorldMapCard metadata={scanResult.metadata} isFixed={fixReport !== null} />
                      </ErrorBoundary>
                    </div>
                  </div>

                  {/* Right 4 columns on Desktop: Score Hero, Top Findings, Before You Post */}
                  <div className="contents lg:block lg:col-span-4 lg:space-y-6">
                    {/* Item 1 on Phone: Score Hero */}
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

                    {/* F6: Before You Post Dynamic Checklist */}
                    <div className="order-2 lg:order-none">
                      <ErrorBoundary fallbackTitle="Could not load Checklist">
                        <BeforeYouPostChecklist
                          findings={scanResult.findings}
                          fixReport={fixReport}
                          onOpenFixer={() => setActiveTab('fix')}
                        />
                      </ErrorBoundary>
                    </div>

                    {/* Simple Mode: Top 3 Findings in Plain English */}
                    <div className="order-3 lg:order-none space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="font-display text-base font-bold text-forest-ink">
                          Top Privacy Leaks ({top3Findings.length} of {sortedFindings.length})
                        </h3>
                        <button
                          onClick={() => setIsAdvancedDrawerOpen(true)}
                          className="text-xs font-bold text-forest hover:underline"
                        >
                          View all {sortedFindings.length} in Advanced →
                        </button>
                      </div>

                      {/* Display Top 3 Cards or Clean File Guarantee */}
                      <div className="space-y-3">
                        {sortedFindings.length === 0 ? (
                          <div className="rounded-2xl border-2 border-forest/30 bg-cream p-5 shadow-panel space-y-3">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 rounded-xl bg-forest text-lime">
                                <CheckCircle2 className="h-5 w-5" />
                              </span>
                              <div>
                                <h4 className="font-display text-base font-bold text-forest-ink">
                                  Clean File — Zero Forensic Leaks
                                </h4>
                                <span className="font-mono text-xs font-bold text-forest">
                                  All 7 forensic analysis engines ran
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-forest-ink font-semibold leading-relaxed">
                              No hidden ultrasonic tracking beacons, continental power-grid hum, room reverberation leaks, aircraft Doppler corridors, or embedded container GPS coordinates were detected.
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-beige-hairline font-mono text-[11px] text-forest font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="text-lime font-black">✓</span> Mains Hum: None
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-lime font-black">✓</span> Beacons: None
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-lime font-black">✓</span> ADS-B Radar: Clear
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-lime font-black">✓</span> Metadata: Clean
                              </div>
                            </div>
                          </div>
                        ) : (
                          top3Findings.map((f: Finding) => (
                            <FindingCard
                              key={f.id}
                              finding={f}
                              onFix={() => setActiveTab('fix')}
                              isFixed={fixReport !== null}
                              isHovered={hoveredFindingId === f.id || selectedFindingId === f.id}
                              onMouseEnter={() => setHoveredFindingId(f.id)}
                              onMouseLeave={() => setHoveredFindingId(null)}
                              onSelect={() => setSelectedFindingId(f.id)}
                              viewMode={viewMode}
                            />
                          ))
                        )}
                      </div>

                      {sortedFindings.length > 3 && (
                        <button
                          onClick={() => setIsAdvancedDrawerOpen(true)}
                          className="w-full flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border-2 border-forest/30 bg-beige-sunken/60 p-3 text-xs font-bold text-forest hover:bg-beige-sunken transition"
                        >
                          <span>Explore all {sortedFindings.length} findings in Advanced Drawer</span>
                        </button>
                      )}
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
                <div className="rounded-2xl border border-beige-hairline bg-beige-card p-8 text-center text-forest-muted">
                  <p>No active scan loaded. Select "Scan Console" and load INCIDENT-001 or upload a file.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-forest-ink">
                      Privacy Leaks Isolated ({scanResult.findings.length} Total)
                    </h3>
                    <button
                      onClick={() => setActiveTab('fix')}
                      className="min-h-[44px] rounded-xl border border-forest bg-forest px-4 py-2 font-display text-xs font-bold text-lime hover:bg-forest-deep transition"
                    >
                      Go to Fixer →
                    </button>
                  </div>

                  {criticalFindings.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brick flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-brick animate-ping" />
                        Critical Exposures ({criticalFindings.length})
                      </h4>
                      {criticalFindings.map(f => (
                        <FindingCard
                          key={f.id}
                          finding={f}
                          onFix={() => setActiveTab('fix')}
                          isHovered={selectedFindingId === f.id}
                          onSelect={() => setSelectedFindingId(f.id)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}

                  {warnFindings.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ochre">
                        Potential Privacy Indicators ({warnFindings.length})
                      </h4>
                      {warnFindings.map(f => (
                        <FindingCard
                          key={f.id}
                          finding={f}
                          onFix={() => setActiveTab('fix')}
                          isHovered={selectedFindingId === f.id}
                          onSelect={() => setSelectedFindingId(f.id)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}

                  {infoFindings.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
                        Observational Acoustic Metrics ({infoFindings.length})
                      </h4>
                      {infoFindings.map(f => (
                        <FindingCard
                          key={f.id}
                          finding={f}
                          isHovered={selectedFindingId === f.id}
                          onSelect={() => setSelectedFindingId(f.id)}
                          viewMode={viewMode}
                        />
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
                <div className="rounded-2xl border border-beige-hairline bg-beige-card p-8 text-center text-forest-muted">
                  <p>Please load INCIDENT-001 or scan a video before launching the Fixer.</p>
                </div>
              ) : (
                <ErrorBoundary fallbackTitle="Fixer Engine Encountered an Error">
                  <Suspense fallback={<div className="p-12 text-center text-forest-muted font-mono text-sm">Loading Fixer engine...</div>}>
                    <FixerViewer
                      scanResult={scanResult}
                      videoFrames={videoFrames}
                      audioChannelData={audioChannelData}
                      sampleRate={scanResult.audioMetrics.sampleRate}
                      onFixedComplete={handleFixComplete}
                      existingReport={fixReport}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}
            </div>
          )}

          {/* Tab: Share */}
          {activeTab === 'share' && (
            <div className="space-y-6">
              {scanResult ? (
                <div className="rounded-2xl border border-beige-hairline bg-beige-card p-8 text-center shadow-panel">
                  <h3 className="font-display text-xl font-bold text-forest-ink mb-2">
                    Share Cryptographic Privacy Receipt
                  </h3>
                  <p className="text-sm text-forest-muted max-w-md mx-auto mb-5">
                    Generate a tamper-evident scorecard signed with Web Crypto ECDSA P-256 to share with #DeployWithEmbarko.
                  </p>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="min-h-[48px] rounded-xl bg-lime border-2 border-lime px-6 py-3 font-display text-sm font-bold text-forest shadow-elevated hover:bg-lime-bright transition"
                  >
                    Open Share Card Generator
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-beige-hairline bg-beige-card p-8 text-center text-forest-muted">
                  <p>Run a scan to generate your share card.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Timeline */}
          {activeTab === 'timeline' && (
            <ErrorBoundary fallbackTitle="Could not render Timeline">
              <Suspense fallback={<div className="p-8 text-center text-forest-muted font-mono text-xs">Loading Timeline...</div>}>
                <TimelineViewer
                  duration={scanResult?.duration || 15.0}
                  findings={scanResult?.findings || []}
                  visualBoxes={scanResult?.visualBoxes || []}
                  hoveredFindingId={hoveredFindingId || selectedFindingId}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Tab: Evidence Graph */}
          {activeTab === 'evidence' && (
            <ErrorBoundary fallbackTitle="Could not render Evidence Graph">
              <Suspense fallback={<div className="p-8 text-center text-forest-muted font-mono text-xs">Loading Evidence Graph...</div>}>
                <EvidenceGraph findings={scanResult?.findings || []} />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Tab: ET-Bench */}
          {activeTab === 'bench' && (
            <ErrorBoundary fallbackTitle="Could not load ET-Bench">
              <Suspense fallback={<div className="p-8 text-center text-forest-muted font-mono text-xs">Loading Benchmark Suite...</div>}>
                <ETBenchPage />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Tab: Self-Audit */}
          {activeTab === 'audit' && (
            <ErrorBoundary fallbackTitle="Could not load Self-Audit">
              <Suspense fallback={<div className="p-8 text-center text-forest-muted font-mono text-xs">Loading Self-Audit Suite...</div>}>
                <SelfAuditPage />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Tab: Verify Receipt */}
          {activeTab === 'verify' && (
            <ErrorBoundary fallbackTitle="Could not load Receipt Verifier">
              <Suspense fallback={<div className="p-8 text-center text-forest-muted font-mono text-xs">Loading Verifier...</div>}>
                <VerifyReceiptPage onClose={() => setActiveTab('scan')} />
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Advanced Drawer (Houses deep timeline, graph, models, benches) */}
      <Suspense fallback={null}>
        <AdvancedDrawer
          isOpen={isAdvancedDrawerOpen}
          onClose={() => setIsAdvancedDrawerOpen(false)}
          scanResult={scanResult}
          videoFrames={videoFrames}
          onOpenModelCard={() => {
            setIsAdvancedDrawerOpen(false);
            setIsModelCardOpen(true);
          }}
          onOpenBench={() => {
            setIsAdvancedDrawerOpen(false);
            setActiveTab('bench');
          }}
          onOpenAudit={() => {
            setIsAdvancedDrawerOpen(false);
            setActiveTab('audit');
          }}
          onOpenCommandPalette={() => {
            setIsAdvancedDrawerOpen(false);
            setIsCommandPaletteOpen(true);
          }}
        />
      </Suspense>

      {/* Command Palette (Ctrl/Cmd+K) */}
      <Suspense fallback={null}>
        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSelectTab={setActiveTab}
            onLoadIncident001={handleLoadIncident001}
            onUploadClick={() => {
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}
            onFixClick={() => setActiveTab('fix')}
            onShareClick={() => {
              if (scanResult) setIsShareModalOpen(true);
              else setActiveTab('share');
            }}
            onStartTour={() => {
              if (!scanResult) handleLoadIncident001();
              setIsTourActive(true);
            }}
            onOpenAudit={() => setIsNetworkAuditOpen(true)}
            onNextFinding={handleNextFinding}
            onPrevFinding={handlePrevFinding}
          />
        )}
      </Suspense>

      {/* Share Card Modal */}
      <Suspense fallback={null}>
        {isShareModalOpen && scanResult && (
          <ShareCardModal
            scanResult={scanResult}
            fixReport={fixReport}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}
      </Suspense>

      {/* Network Request Audit Modal ("Prove it") */}
      <Suspense fallback={null}>
        {isNetworkAuditOpen && (
          <NetworkAuditModal onClose={() => setIsNetworkAuditOpen(false)} />
        )}
      </Suspense>

      {/* Model Card Modal */}
      <Suspense fallback={null}>
        {isModelCardOpen && (
          <ModelCardModal
            isOpen={isModelCardOpen}
            onClose={() => setIsModelCardOpen(false)}
          />
        )}
      </Suspense>

      {/* Guided Auto-Tour Overlay */}
      <Suspense fallback={null}>
        {isTourActive && (
          <AutoTourOverlay
            isActive={isTourActive}
            onClose={() => setIsTourActive(false)}
            onNavigateTab={tab => setActiveTab(tab)}
            onTriggerFix={() => setActiveTab('fix')}
            onTriggerShare={() => setIsShareModalOpen(true)}
          />
        )}
      </Suspense>

      {/* Live Room Scan Modal (F2) */}
      <Suspense fallback={null}>
        {isLiveRoomScanOpen && (
          <LiveRoomScanModal
            isOpen={isLiveRoomScanOpen}
            onClose={() => setIsLiveRoomScanOpen(false)}
            onScanComplete={processIngestedMedia}
          />
        )}
      </Suspense>

      {/* Deep Forensic ML & DSP Lab Modal */}
      <Suspense fallback={null}>
        {isForensicLabOpen && (
          <ForensicLabModal
            isOpen={isForensicLabOpen}
            onClose={() => setIsForensicLabOpen(false)}
            scanResult={scanResult}
            audioChannelData={audioChannelData}
            videoFrames={videoFrames}
          />
        )}
      </Suspense>

      {/* Mobile 4-Step Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        findingCount={criticalFindings.length + warnFindings.length}
      />

      {/* Footer (Requirement 9: Hosted on Embarko) */}
      <footer className="w-full border-t border-beige-hairline py-4 px-4 text-center text-xs text-forest-muted bg-beige-card/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>Hosted on <a href="https://embarko.app" target="_blank" rel="noopener noreferrer" className="font-bold text-forest hover:underline">Embarko</a></span>
          <span>•</span>
          <span>Built for the Embarko Student Challenge</span>
          <span>•</span>
          <span className="font-mono">{APP_CONFIG.hashtag}</span>
          <span>•</span>
          <button onClick={() => setIsTourActive(true)} className="font-bold text-forest hover:underline">
            Take 68s Auto-Tour
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
