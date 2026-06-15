import type { EqPreset } from '../data/types';

/** Map EQ filter types to BiquadFilterNode type strings */
const FILTER_TYPE_MAP: Record<string, BiquadFilterType> = {
  LOW_SHELF: 'lowshelf',
  HIGH_SHELF: 'highshelf',
  PEAKING: 'peaking',
  LOW_PASS: 'lowpass',
  HIGH_PASS: 'highpass',
};

/** Lazy singleton AudioContext */
let audioContext: AudioContext | null = null;

/**
 * Get or create the shared AudioContext.
 * Must be called from a user gesture handler to comply with autoplay policy.
 */
export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Resume AudioContext if it was suspended by the browser autoplay policy.
 */
export async function ensureAudioContextResumed(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
}

/**
 * Create a chain of BiquadFilterNodes from an EQ preset.
 * Returns the array of filter nodes (already connected in series).
 */
export function createEqNodes(audioContext: AudioContext, preset: EqPreset): BiquadFilterNode[] {
  const nodes: BiquadFilterNode[] = [];

  for (const filter of preset.filters) {
    const node = audioContext.createBiquadFilter();
    const biquadType = FILTER_TYPE_MAP[filter.type];
    if (biquadType) {
      node.type = biquadType;
    }
    node.frequency.value = filter.fc;
    node.Q.value = filter.q;
    node.gain.value = filter.gain;
    nodes.push(node);
  }

  // Connect nodes in series: node[0] -> node[1] -> ... -> node[n-1]
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].connect(nodes[i + 1]);
  }

  return nodes;
}

/**
 * Create a preamp GainNode from a dB value.
 * Converts dB to linear gain: 10^(dB/20)
 */
export function createPreampGain(audioContext: AudioContext, preampDb: number): GainNode {
  const gainNode = audioContext.createGain();
  gainNode.gain.value = Math.pow(10, preampDb / 20);
  return gainNode;
}

/**
 * Connect audio graph WITH EQ: source -> preamp -> eqNodes[0] -> ... -> eqNodes[n] -> destination
 */
export function connectEqGraph(
  sourceNode: AudioNode,
  preampGain: GainNode,
  eqNodes: BiquadFilterNode[],
  destination: AudioNode,
): void {
  sourceNode.connect(preampGain);

  if (eqNodes.length > 0) {
    preampGain.connect(eqNodes[0]);
    eqNodes[eqNodes.length - 1].connect(destination);
  } else {
    preampGain.connect(destination);
  }
}

/**
 * Connect audio graph WITHOUT EQ (bypass): source -> preamp -> destination
 */
export function connectBypassGraph(
  sourceNode: AudioNode,
  preampGain: GainNode,
  destination: AudioNode,
): void {
  sourceNode.connect(preampGain);
  preampGain.connect(destination);
}

/**
 * Re-route the live graph between EQ-engaged and bypass WITHOUT rebuilding
 * the source node (which would restart playback from buffer position 0).
 *
 * Only the routing edges at the preamp/volume boundaries are changed:
 *   EQ on  : preamp -> eq[0], eq[last] -> volume
 *   EQ off : preamp -> volume
 *
 * The internal eq[i] -> eq[i+1] chain (built once in createEqNodes) is never
 * touched, and the source node is never disconnected — so playback position
 * is preserved. Uses destination-specific disconnect() to surgically remove
 * only the edges being replaced.
 */
export function setEqRouting(
  preampGain: GainNode,
  eqNodes: BiquadFilterNode[],
  volumeNode: AudioNode,
  eqEnabled: boolean,
): void {
  // Always clear the boundary edges first. Destination-specific disconnect
  // leaves the internal eq chain intact.
  if (eqNodes.length > 0) {
    try { preampGain.disconnect(eqNodes[0]); } catch { /* not connected */ }
    try { eqNodes[eqNodes.length - 1].disconnect(volumeNode); } catch { /* not connected */ }
  }
  try { preampGain.disconnect(volumeNode); } catch { /* not connected */ }

  // Re-connect along the desired path. Internal eq chain already exists.
  if (eqEnabled && eqNodes.length > 0) {
    preampGain.connect(eqNodes[0]);
    eqNodes[eqNodes.length - 1].connect(volumeNode);
  } else {
    preampGain.connect(volumeNode);
  }
}

/**
 * Disconnect all connections from a set of EQ nodes.
 */
export function disconnectNodes(nodes: AudioNode[]): void {
  for (const node of nodes) {
    try {
      node.disconnect();
    } catch {
      // ignore if not connected
    }
  }
}

/**
 * Disconnect a specific node from all outputs.
 */
export function disconnectNode(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    // ignore
  }
}
