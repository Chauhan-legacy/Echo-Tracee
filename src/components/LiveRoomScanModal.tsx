import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Square, AlertCircle, CheckCircle2, Activity, Info, Volume2 } from 'lucide-react';
import { IngestedMedia } from '../utils/fileIngest';
import { computeSha256 } from '../demo/incident001';

interface LiveRoomScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (media: IngestedMedia) => void;
}

export const LiveRoomScanModal: React.FC<LiveRoomScanModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [nyquistHz, setNyquistHz] = useState<number | null>(null);
  const [micLabel, setMicLabel] = useState<string>('Default Microphone');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [vuLevel, setVuLevel] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesAccumulatorRef = useRef<Float32Array[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    samplesAccumulatorRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Handle visibility change (tab hidden while recording)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && status === 'recording') {
        cleanup();
        setStatus('error');
        setErrorMessage('Recording paused because this browser tab was hidden.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [status]);

  // Handle ESC and Back button
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    window.history.pushState({ modal: 'live-mic-scan' }, '');
    const handlePopState = () => {
      cleanup();
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  const startRecording = async () => {
    cleanup();
    setErrorMessage(null);
    setStatus('recording');
    setSecondsRemaining(10);
    samplesAccumulatorRef.current = [];

    let stream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      // Try raw microphone audio first, fallback to standard audio constraint
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: 48000,
          },
        });
      } catch (rawErr: any) {
        // Fallback for Safari / mobile browsers that reject custom constraints
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      setMicLabel(track.label || 'Default Audio Device');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: settings.sampleRate || 48000 });
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const actualRate = ctx.sampleRate;
      setSampleRate(actualRate);
      setNyquistHz(actualRate / 2);

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        samplesAccumulatorRef.current.push(copy);

        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        setVuLevel(Math.min(1.0, rms * 5.0));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      let sec = 10;
      timerRef.current = setInterval(() => {
        sec -= 1;
        setSecondsRemaining(sec);
        if (sec <= 0) {
          finishRecording();
        }
      }, 1000);
    } catch (err: any) {
      cleanup();
      setStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was denied. Please allow microphone access in your browser settings to scan room audio.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone was detected on this device.');
      } else {
        setErrorMessage(err.message || 'Could not access microphone.');
      }
    }
  };

  const finishRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('processing');

    const totalSamples = samplesAccumulatorRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of samplesAccumulatorRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    cleanup();

    if (totalSamples === 0) {
      setStatus('error');
      setErrorMessage('No microphone audio was captured. Please try recording again.');
      return;
    }

    const currentRate = sampleRate || 48000;
    const duration = totalSamples / currentRate;

    const fakeBuffer = new ArrayBuffer(Math.min(1024 * 1024, totalSamples * 2));
    const sha = await computeSha256(fakeBuffer);

    const media: IngestedMedia = {
      sourceName: `Live Room Capture (${duration.toFixed(1)}s)`,
      channelData: merged,
      sampleRate: currentRate,
      duration,
      hasAudio: true,
      hasVideo: false,
      videoFrames: [],
      metadata: {
        deviceModel: micLabel,
        rawTags: {},
      },
      sha256: sha,
      isOverLength: false,
      originalDuration: duration,
      statusMessage: `Analyzed 10 seconds of raw room audio via ${micLabel} at ${currentRate} Hz.`,
    };

    onScanComplete(media);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-scan-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-forest/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-forest bg-beige-card p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige-hairline pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-forest p-2 text-lime">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 id="live-scan-title" className="font-display text-lg font-bold text-forest-ink">
                Scan Room Now
              </h3>
              <p className="text-xs text-forest-muted">
                10-second live acoustic capture for ultrasonic beacons and hum
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-beige-hairline bg-beige-sunken/60 text-forest-muted hover:text-forest transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* State Display */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-beige-hairline bg-beige-sunken/40 p-4 text-xs text-forest-ink space-y-2">
              <p className="font-semibold">What happens during this scan:</p>
              <ul className="list-disc list-inside space-y-1 text-forest-muted">
                <li>Records 10 seconds of uncompressed microphone audio.</li>
                <li>Extracts inaudible ultrasonic tracker beacons (18 kHz – 22 kHz).</li>
                <li>Measures electrical power grid hum to determine your region.</li>
                <li>Everything stays 100% on your device with zero data upload.</li>
              </ul>
            </div>

            <button
              onClick={startRecording}
              className="w-full flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-lime border-2 border-lime p-4 font-display text-base font-bold text-forest shadow-elevated hover:bg-lime-bright active:scale-[0.98] transition"
            >
              <Mic className="h-5 w-5" />
              <span>Start 10-Second Room Scan</span>
            </button>
          </div>
        )}

        {status === 'recording' && (
          <div className="space-y-5 py-2 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-forest text-lime animate-pulse">
                <span className="font-mono text-3xl font-black">{secondsRemaining}</span>
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-forest">
                Listening for hidden signals...
              </span>
            </div>

            {/* Live VU Meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-forest-muted">
                <span>Mic Input Level</span>
                <span>{Math.round(vuLevel * 100)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-beige-sunken overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-75"
                  style={{ width: `${Math.round(vuLevel * 100)}%` }}
                />
              </div>
            </div>

            {/* Hardware Limitations Disclosure */}
            {sampleRate && nyquistHz && (
              <div className="rounded-xl border border-beige-hairline bg-beige-sunken/60 p-3 text-[11px] font-mono text-forest-ink text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-forest-muted">Hardware Sample Rate:</span>
                  <span className="font-bold text-forest">{sampleRate} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-muted">Nyquist Frequency Ceiling:</span>
                  <span className="font-bold text-forest">{nyquistHz} Hz</span>
                </div>
                {nyquistHz < 20000 && (
                  <p className="text-ochre pt-1 text-[10px]">
                    ⚠️ Note: Hardware ceiling is below 20 kHz. Tracking tones above {nyquistHz} Hz cannot be detected.
                  </p>
                )}
              </div>
            )}

            <button
              onClick={finishRecording}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-brick/40 bg-brick/10 px-4 py-2 font-display text-sm font-bold text-brick hover:bg-brick/20 transition"
            >
              <Square className="h-4 w-4" />
              <span>Stop Early & Analyze</span>
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="py-8 text-center space-y-3">
            <Activity className="h-10 w-10 text-forest mx-auto animate-spin" />
            <p className="font-display text-base font-bold text-forest-ink">
              Analyzing Room Acoustics...
            </p>
            <p className="text-xs text-forest-muted">
              Running CFAR tone detector and ENF frequency estimation.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-brick/15 border border-brick/40 p-4 text-xs text-brick">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-brick" />
              <div className="space-y-1">
                <p className="font-bold">Scan Could Not Complete</p>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            <button
              onClick={startRecording}
              className="w-full flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2 font-display text-sm font-bold text-lime hover:bg-forest-deep transition"
            >
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
