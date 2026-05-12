import { useState, useRef, useEffect } from 'react';
import type { EqPreset } from '../data/types';
import {
  ensureAudioContextResumed,
  createEqNodes,
  createPreampGain,
  connectEqGraph,
  connectBypassGraph,
  disconnectNodes,
  disconnectNode,
} from '../lib/audioEngine';
import { createTestToneSource, type TestToneType } from '../lib/testTones';

interface AudioPlayerProps {
  preset: EqPreset;
}

const TONE_OPTIONS: { value: TestToneType; label: string }[] = [
  { value: 'pink', label: 'Pink Noise' },
  { value: 'white', label: 'White Noise' },
  { value: 'sweep', label: 'Freq Sweep' },
];

export default function AudioPlayer({ preset }: AudioPlayerProps) {
  const [toneType, setToneType] = useState<TestToneType>('pink');
  const [isPlaying, setIsPlaying] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState<string | null>(null);

  // Audio node refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const preampRef = useRef<GainNode | null>(null);
  const volumeRef = useRef<GainNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const eqEnabledRef = useRef(eqEnabled);
  const isPlayingRef = useRef(isPlaying);
  const volumeValRef = useRef(volume);
  const presetRef = useRef(preset);

  // Keep refs in sync with state
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

  // Live-update EQ node parameters when preset changes while playing.
  // This allows real-time audition while the user edits filter values
  // without restarting playback.
  useEffect(() => {
    presetRef.current = preset;

    // If currently playing with EQ enabled, update the audio nodes in-place
    if (!isPlayingRef.current || !audioContextRef.current) return;

    const ctx = audioContextRef.current;

    // Update preamp
    if (preampRef.current) {
      preampRef.current.gain.setValueAtTime(
        Math.pow(10, preset.preamp / 20),
        ctx.currentTime,
      );
    }

    // Update each EQ filter node parameter
    const eqNodes = eqNodesRef.current;
    for (let i = 0; i < eqNodes.length && i < preset.filters.length; i++) {
      const node = eqNodes[i];
      const f = preset.filters[i];
      node.frequency.setValueAtTime(f.fc, ctx.currentTime);
      node.Q.setValueAtTime(f.q, ctx.currentTime);
      node.gain.setValueAtTime(f.gain, ctx.currentTime);
    }
  }, [preset]);

  // Cleanup function - defined before useEffect that uses it
  function cleanup() {
    // Stop and disconnect source
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore if already stopped
      }
      disconnectNode(sourceRef.current);
      sourceRef.current = null;
    }

    // Disconnect EQ nodes
    if (eqNodesRef.current.length > 0) {
      disconnectNodes(eqNodesRef.current);
      eqNodesRef.current = [];
    }

    // Disconnect preamp and volume
    if (preampRef.current) {
      disconnectNode(preampRef.current);
      preampRef.current = null;
    }
    if (volumeRef.current) {
      disconnectNode(volumeRef.current);
      volumeRef.current = null;
    }

    setIsPlaying(false);
    setError(null);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  async function handlePlay() {
    try {
      setError(null);

      // Clean up any existing playback
      cleanup();

      // Create or resume AudioContext (must be in user gesture)
      const ctx = await ensureAudioContextResumed();
      audioContextRef.current = ctx;

      // Create volume gain node
      const volumeNode = ctx.createGain();
      volumeNode.gain.value = volumeValRef.current;
      volumeRef.current = volumeNode;

      // Create preamp gain node
      const preampNode = createPreampGain(ctx, presetRef.current.preamp);
      preampRef.current = preampNode;

      // Create EQ filter nodes
      const eqNodes = createEqNodes(ctx, presetRef.current);
      eqNodesRef.current = eqNodes;

      // Create test tone source
      const source = createTestToneSource(ctx, toneType);
      sourceRef.current = source;

      // Connect graph based on EQ enabled state
      if (eqEnabledRef.current) {
        connectEqGraph(source, preampNode, eqNodes, volumeNode);
      } else {
        connectBypassGraph(source, preampNode, volumeNode);
      }

      // Volume -> destination
      volumeNode.connect(ctx.destination);

      // Start playback
      source.start();
      setIsPlaying(true);
    } catch (err) {
      console.error('Audio playback error:', err);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
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

    // Reconnect graph if currently playing
    if (!isPlayingRef.current || !audioContextRef.current || !sourceRef.current || !preampRef.current || !volumeRef.current) {
      return;
    }

    const ctx = audioContextRef.current;
    const source = sourceRef.current;
    const preamp = preampRef.current;
    const volumeNode = volumeRef.current;
    const eqNodes = eqNodesRef.current;

    // Disconnect existing connections from preamp onwards
    disconnectNode(preamp);
    disconnectNodes(eqNodes);
    disconnectNode(volumeNode);

    // Reconnect
    if (newEqEnabled) {
      connectEqGraph(source, preamp, eqNodes, volumeNode);
    } else {
      connectBypassGraph(source, preamp, volumeNode);
    }

    volumeNode.connect(ctx.destination);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Listen</h2>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Test tone selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-16 shrink-0">Tone</label>
          <select
            value={toneType}
            onChange={(e) => setToneType(e.target.value as TestToneType)}
            disabled={isPlaying}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={`w-9 h-9 flex items-center justify-center rounded-full border-2 transition-colors shrink-0 ${
              isPlaying
                ? 'border-red-400 text-red-500 hover:bg-red-50'
                : 'border-blue-400 text-blue-500 hover:bg-blue-50'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
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

          {/* EQ toggle */}
          <button
            onClick={handleToggleEq}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
              eqEnabled
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            EQ {eqEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 shrink-0">
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
              className="flex-1 h-1 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isPlaying && (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Playing {TONE_OPTIONS.find((t) => t.value === toneType)?.label} with EQ {eqEnabled ? 'ON' : 'OFF'}</span>
            </>
          )}
          {!isPlaying && (
            <span>Select a test tone and press play to listen</span>
          )}
        </div>
      </div>
    </div>
  );
}
