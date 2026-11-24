import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Square, AlertCircle, CheckCircle2, Activity, Info } from 'lucide-react';
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

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

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

  const startRecording = async () => {
    cleanup();
    setErrorMessage(null);
    setStatus('recording');
    setSecondsRemaining(10);
    samplesAccumulatorRef.current = [];

    try {
      // Request raw, unadulterated microphone audio (crucial for ultrasonic and mains hum)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      setMicLabel(track.label || 'Default Audio Device');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: settings.sampleRate || 48000 });
      audioCtxRef.current = ctx;

      const actualRate = ctx.sampleRate;
      setSampleRate(actualRate);
      setNyquistHz(actualRate / 2);

      const source = ctx.createMediaStreamSource(stream);
      // AudioWorklet / ScriptProcessor for recording samples
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Clone samples
        const copy = new Float32Array(input.length);
        copy.set(input);
        samplesAccumulatorRef.current.push(copy);

        // Compute VU level
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        setVuLevel(Math.min(1.0, rms * 5.0));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      // 10s countdown timer
      let remaining = 10;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          finishRecording(actualRate);
        }
      }, 1000);
    } catch (err: any) {
      cleanup();
      setStatus('error');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings to scan the room.'
          : `Failed to open microphone: ${err.message}`
      );
    }
  };

  const finishRecording = async (sr: number) => {
    setStatus('processing');
    const chunks = samplesAccumulatorRef.current;
    cleanup();

    if (chunks.length === 0) {
      setStatus('error');
      setErrorMessage('No audio samples captured from microphone.');
      return;
    }

    // Concatenate chunks
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const allSamples = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      allSamples.set(c, offset);
      offset += c.length;
    }

    // Hash recording buffer
    const sha256 = await computeSha256(allSamples.buffer.slice(0, 1024 * 1024));

    const media: IngestedMedia = {
      sourceName: `Live Room Recording (${new Date().toLocaleTimeString()})`,
      channelData: allSamples,
      sampleRate: sr,
      duration: allSamples.length / sr,
      hasAudio: true,
      hasVideo: false,
      videoFrames: [],
      metadata: {
        rawTags: {
          'Audio:Capture': 'Live Browser Microphone',
          'Audio:SampleRate': `${sr} Hz`,
          'Audio:Nyquist': `${sr / 2} Hz`,
          'Audio:Device': micLabel,
        },
        isDemo: false,
      },
      sha256,
      isOverLength: false,
      originalDuration: allSamples.length / sr,
      statusMessage: `Recorded ${allSamples.length / sr}s raw audio at ${sr} Hz. Hardware Nyquist limit: ${sr / 2} Hz.`,
    };

    onScanComplete(media);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B281B]/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#F3EBD8] rounded-2xl border-2 border-[#174D35] p-6 shadow-2xl text-[#10291D] space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C9BB9A] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#174D35] text-[#8BCF55] flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-[#174D35]">
                Scan the Room Now (10s Live Mic)
              </h2>
              <p className="text-xs text-[#3F5E4C]">
                Raw acoustic capture for ultrasonic beacons, mains hum, and room reverb
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#3F5E4C] hover:bg-[#DCCFB2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Display */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div className="bg-[#FAF5EB] p-4 rounded-xl border border-[#C9BB9A] text-sm space-y-2">
              <div className="font-bold text-[#174D35]">What this will check:</div>
              <ul className="list-disc list-inside text-xs space-y-1 text-[#3F5E4C]">
                <li><strong>17–22 kHz Ultrasonic Beacons:</strong> Cross-device ad tracking signals in your room</li>
                <li><strong>50/60 Hz Mains Electricity:</strong> Acoustic grid hum leaking from room wiring</li>
                <li><strong>Room RT60 & Enclosure:</strong> Physical room volume and reverberation characteristics</li>
              </ul>
            </div>

            <button
              onClick={startRecording}
              className="w-full py-3.5 bg-[#8BCF55] hover:bg-[#7ABF45] text-[#0B281B] font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-base"
            >
              <Mic className="w-5 h-5" /> Start 10-Second Acoustic Capture
            </button>
          </div>
        )}

        {status === 'recording' && (
          <div className="space-y-5 text-center py-4">
            {/* Countdown Ring */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#174D35] flex items-center justify-center text-[#FAF5EB]">
                <span className="font-mono text-3xl font-bold">{secondsRemaining}s</span>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#8BCF55] border-t-transparent animate-spin" />
            </div>

            <div className="space-y-1">
              <div className="font-bold text-lg text-[#174D35]">Listening to Physical Room...</div>
              <div className="text-xs text-[#3F5E4C]">
                Hold device still. Stay silent to capture subtle background room acoustic signatures.
              </div>
            </div>

            {/* VU Meter */}
            <div className="space-y-1 max-w-xs mx-auto">
              <div className="flex justify-between text-[11px] text-[#3F5E4C]">
                <span>Mic Level</span>
                <span className="font-mono">{Math.round(vuLevel * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-[#DCCFB2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#174D35] transition-all duration-75"
                  style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                />
              </div>
            </div>

            {/* Hardware Telemetry */}
            {sampleRate && (
              <div className="inline-flex items-center gap-3 bg-[#E8DCC3] px-3 py-1.5 rounded-lg text-xs font-mono text-[#174D35]">
                <span>Sample Rate: {sampleRate.toLocaleString()} Hz</span>
                <span>•</span>
                <span>Nyquist: {(nyquistHz! / 1000).toFixed(1)} kHz</span>
              </div>
            )}

            <button
              onClick={() => {
                if (sampleRate) finishRecording(sampleRate);
              }}
              className="px-4 py-2 bg-[#A32A1F] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#852219]"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Finish Now
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="text-center py-8 space-y-3">
            <Activity className="w-10 h-10 text-[#174D35] animate-spin mx-auto" />
            <div className="font-bold text-[#174D35]">Analyzing Room Capture...</div>
            <p className="text-xs text-[#3F5E4C]">Running CA-CFAR, ESPRIT, and Room Acoustics engines.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-[#A32A1F]/10 border border-[#A32A1F]/30 p-4 rounded-xl text-sm flex items-start gap-3 text-[#A32A1F]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Capture Failed</div>
                <div className="text-xs mt-1 text-[#10291D]">{errorMessage}</div>
              </div>
            </div>

            <button
              onClick={startRecording}
              className="w-full py-3 bg-[#174D35] hover:bg-[#0B281B] text-[#FAF5EB] font-bold rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Honest Limitations Notice */}
        <div className="pt-3 border-t border-[#C9BB9A] flex items-start gap-2 text-[11px] text-[#3F5E4C] leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-[#174D35] mt-0.5" />
          <span>
            <strong>Hardware note:</strong> Standard smartphone microphones feature analog high-frequency roll-off above 20 kHz. Detection sensitivity above 21 kHz depends on your device microphone’s physical hardware response.
          </span>
        </div>
      </div>
    </div>
  );
};
