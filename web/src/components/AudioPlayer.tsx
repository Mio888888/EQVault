import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { EqPreset } from '../data/types';
import {
  getAudioContext,
  ensureAudioContextResumed,
  createEqNodes,
  createPreampGain,
  connectEqGraph,
  connectBypassGraph,
  setEqRouting,
  disconnectNodes,
  disconnectNode,
} from '../lib/audioEngine';
import { createTestToneSource, createFileSource, type TestToneType } from '../lib/testTones';

/** User-uploaded, decoded audio. Lifted to ProfileDetail for cross-tab persistence. */
export interface UploadedAudio {
  buffer: AudioBuffer | null;
  fileName: string | null;
}

interface AudioPlayerProps {
  preset: EqPreset;
  uploadedAudio: UploadedAudio;
  onUploadedAudioChange: (audio: UploadedAudio) => void;
}

export default function AudioPlayer({ preset, uploadedAudio, onUploadedAudioChange }: AudioPlayerProps) {
  const { t } = useTranslation();
  const [toneType, setToneType] = useState<TestToneType>('pink');
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const preampRef = useRef<GainNode | null>(null);
  const volumeRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const eqEnabledRef = useRef(eqEnabled);
  const isPlayingRef = useRef(isPlaying);
  const volumeValRef = useRef(volume);
  const presetRef = useRef(preset);
  // Mirror of uploadedAudio.buffer so async startPlayback (which reads refs)
  // can access the current decoded buffer without stale-closure issues.
  const fileBufferRef = useRef<AudioBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Monotonic token guarding async startPlayback against concurrent
  // pause / tone-switch / eq-toggle. Each kickoff bumps the token; an
  // in-flight startPlayback aborts if the token changed under it.
  const playbackTokenRef = useRef(0);

  const toneLabels: Record<TestToneType, string> = {
    pink: t('audio.pinkNoise'),
    white: t('audio.whiteNoise'),
    sweep: t('audio.freqSweep'),
    file: t('audio.customAudio'),
  };

  // Keep fileBufferRef in sync with the lifted uploadedAudio prop.
  useEffect(() => {
    fileBufferRef.current = uploadedAudio.buffer;
  }, [uploadedAudio.buffer]);

  useEffect(() => {
    eqEnabledRef.current = eqEnabled;
  }, [eqEnabled]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeValRef.current = volume;
    if (volumeRef.current) {
      volumeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    presetRef.current = preset;

    if (!isPlayingRef.current || !audioContextRef.current) return;

    const ctx = audioContextRef.current;

    if (preampRef.current) {
      preampRef.current.gain.setValueAtTime(
        Math.pow(10, preset.preamp / 20),
        ctx.currentTime,
      );
    }

    const eqNodes = eqNodesRef.current;
    for (let i = 0; i < eqNodes.length && i < preset.filters.length; i++) {
      const node = eqNodes[i];
      const f = preset.filters[i];
      node.frequency.setValueAtTime(f.fc, ctx.currentTime);
      node.Q.setValueAtTime(f.q, ctx.currentTime);
      node.gain.setValueAtTime(f.gain, ctx.currentTime);
    }
  }, [preset]);

  // Live tone switching: if playing, seamlessly rebuild the source with the new tone.
  useEffect(() => {
    if (!isPlayingRef.current) return;
    void startPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toneType]);

  /**
   * Build the audio graph for the current tone/EQ/volume and start playback.
   * Tears down any existing graph first (synchronously, before the await).
   * Token-guarded: if a concurrent pause/toggle/tone-switch bumps the token
   * while we're awaiting the AudioContext resume, this kickoff aborts and
   * cleans up instead of racing onto a stale graph.
   *
   * Always rebuilds the whole graph rather than surgically reconnecting —
   * this avoids the bug where toggling EQ off then on severed the internal
   * eq[i]→eq[i+1] chain (built once in createEqNodes) and never restored it,
   * leaving the graph dead on the second "EQ on".
   */
  async function startPlayback() {
    const token = ++playbackTokenRef.current;
    cleanupNodes();

    const ctx = await ensureAudioContextResumed();
    // A concurrent pause/toggle happened during the await — drop this graph.
    if (token !== playbackTokenRef.current) {
      return;
    }
    audioContextRef.current = ctx;

    const volumeNode = ctx.createGain();
    volumeNode.gain.value = volumeValRef.current;
    volumeRef.current = volumeNode;

    const preampNode = createPreampGain(ctx, presetRef.current.preamp);
    preampRef.current = preampNode;

    const eqNodes = createEqNodes(ctx, presetRef.current);
    eqNodesRef.current = eqNodes;

    // Branch on source type: generated test tone vs user-uploaded file.
    let source: AudioBufferSourceNode;
    if (toneType === 'file') {
      const buf = fileBufferRef.current;
      if (!buf) {
        // No uploaded buffer — abort with a user-facing hint.
        setError(t('audio.uploadHint'));
        return;
      }
      source = createFileSource(ctx, buf);
    } else {
      source = createTestToneSource(ctx, toneType);
    }
    sourceRef.current = source;

    if (eqEnabledRef.current) {
      connectEqGraph(source, preampNode, eqNodes, volumeNode);
    } else {
      connectBypassGraph(source, preampNode, volumeNode);
    }

    volumeNode.connect(ctx.destination);
    source.start();
    setIsPlaying(true);
  }

  /** Tear down audio nodes only (no React state changes). Safe to call mid-rebuild. */
  function cleanupNodes() {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      disconnectNode(sourceRef.current);
      sourceRef.current = null;
    }

    if (eqNodesRef.current.length > 0) {
      disconnectNodes(eqNodesRef.current);
      eqNodesRef.current = [];
    }

    if (preampRef.current) {
      disconnectNode(preampRef.current);
      preampRef.current = null;
    }
    if (volumeRef.current) {
      disconnectNode(volumeRef.current);
      volumeRef.current = null;
    }
  }

  /** Tear down the audio graph and clear playing/error state. */
  function cleanup() {
    // Invalidate any in-flight startPlayback so it won't re-arm the graph.
    playbackTokenRef.current++;
    cleanupNodes();
    setIsPlaying(false);
    setError(null);
  }

  // Unmount-only teardown. Intentionally empty deps — we must not re-run on
  // every render, and `cleanup` reads only refs + setState (stable identity).
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePlay() {
    try {
      setError(null);
      await startPlayback();
    } catch (err) {
      console.error('Audio playback error:', err);
      setError(err instanceof Error ? err.message : t('audio.playError'));
      cleanup();
    }
  }

  function handlePause() {
    cleanup();
  }

  function handleToggleEq() {
    const newEqEnabled = !eqEnabledRef.current;
    setEqEnabled(newEqEnabled);
    eqEnabledRef.current = newEqEnabled;

    // While playing, re-route the live graph between EQ-engaged and bypass
    // WITHOUT rebuilding the source node — setEqRouting only changes the
    // preamp/volume boundary edges, so playback position is preserved
    // (important for the frequency sweep tone). Internal eq[i]->eq[i+1]
    // chain stays intact, fixing the earlier "off->on goes silent" bug.
    if (
      isPlayingRef.current &&
      preampRef.current &&
      volumeRef.current
    ) {
      setEqRouting(
        preampRef.current,
        eqNodesRef.current,
        volumeRef.current,
        newEqEnabled,
      );
    }
  }

  /** Decode a user-selected audio file into an AudioBuffer (loops on play). */
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input value so selecting the same file again re-fires onChange.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(file.name)) {
      setError(t('audio.unsupportedType'));
      return;
    }

    setError(null);
    setIsDecoding(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // decodeAudioData needs an AudioContext; the file-input change is a
      // user gesture, so creating the context here satisfies autoplay policy.
      const ctx = getAudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      onUploadedAudioChange({ buffer, fileName: file.name });
      setToneType('file');
    } catch (err) {
      console.error('Audio decode error:', err);
      setError(t('audio.uploadError'));
    } finally {
      setIsDecoding(false);
    }
  }

  /** Remove the uploaded file; revert tone to a generated source if needed. */
  function handleClearUpload() {
    onUploadedAudioChange({ buffer: null, fileName: null });
    if (toneType === 'file') {
      setToneType('pink');
    }
  }

  return (
    <div className="bg-surface rounded-card border border-line shadow-card p-4">
      <h2 className="text-sm font-semibold text-ink mb-3">{t('audio.listen')}</h2>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-control px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-ink-600 w-16 shrink-0">{t('audio.tone')}</label>
          <select
            value={toneType}
            onChange={(e) => setToneType(e.target.value as TestToneType)}
            className="flex-1 min-w-0 text-sm border border-line bg-cream rounded-control px-2 py-1.5 text-ink-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {Object.entries(toneLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Upload control: hidden file input + visible trigger button.
              Shows the uploaded filename with a clear (×) button once loaded. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploadedAudio.fileName ? (
            <div className="flex items-center gap-1 shrink-0 max-w-[40%]">
              <span
                className="text-xs text-ink-600 truncate"
                title={uploadedAudio.fileName}
              >
                {uploadedAudio.fileName}
              </span>
              <button
                onClick={handleClearUpload}
                className="text-ink-600/60 hover:text-ink text-xs px-1 transition-colors"
                aria-label={t('audio.clear')}
                title={t('audio.clear')}
              >
                &#x2715;
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecoding}
              className="shrink-0 text-xs px-2.5 py-1.5 rounded-control border border-line text-ink-600 hover:bg-cream hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDecoding ? t('audio.decoding') : t('audio.upload')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!isPlaying && toneType === 'file' && !uploadedAudio.buffer}
            aria-label={isPlaying ? t('audio.pause') : t('audio.play')}
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/12 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title={isPlaying ? t('audio.pause') : t('audio.play')}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="3.5" height="12" rx="1" />
                <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1.5v11l9-5.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleToggleEq}
            aria-pressed={eqEnabled}
            className={`px-3 py-1.5 rounded-control text-xs font-medium transition-colors shrink-0 ${
              eqEnabled
                ? 'bg-primary text-white hover:bg-primary-600'
                : 'bg-line text-ink-600 hover:bg-cream'
            }`}
          >
            EQ {eqEnabled ? t('audio.eqOn') : t('audio.eqOff')}
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-600/70 shrink-0">
              <path d="M1 5h2.5L7 2v10L3.5 9H1V5z" fill="currentColor" stroke="none" />
              {volume > 0.3 && <path d="M9.5 4.5c.7.7 1.1 1.6 1.1 2.5s-.4 1.8-1.1 2.5" />}
              {volume > 0.6 && <path d="M11.5 2.5c1.2 1.2 1.9 2.8 1.9 4.5s-.7 3.3-1.9 4.5" />}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 cursor-pointer"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span className="text-xs text-ink-600 w-8 text-right tabular-nums">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-600/70">
          {isPlaying && (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>{t('audio.playing', { tone: toneLabels[toneType], state: eqEnabled ? t('audio.eqOn') : t('audio.eqOff') })}</span>
            </>
          )}
          {!isPlaying && toneType === 'file' && !uploadedAudio.buffer && (
            <span>{t('audio.uploadHint')}</span>
          )}
          {!isPlaying && !(toneType === 'file' && !uploadedAudio.buffer) && !eqEnabled && (
            <span>{t('audio.eqPending')}</span>
          )}
          {!isPlaying && !(toneType === 'file' && !uploadedAudio.buffer) && eqEnabled && (
            <span>{t('audio.idle')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
