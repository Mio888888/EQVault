/**
 * Test tone generators using Web Audio API.
 */

/** Generate white noise AudioBuffer: uniform random samples in [-1, 1] */
export function generateWhiteNoise(audioContext: AudioContext, duration: number): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * Generate pink noise AudioBuffer using Voss-McCartney algorithm.
 * Uses 16 rows of random generators for a good approximation.
 */
export function generatePinkNoise(audioContext: AudioContext, duration: number): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const numRows = 16;
  const rows = new Float32Array(numRows);

  // Initialize rows
  for (let r = 0; r < numRows; r++) {
    rows[r] = Math.random() * 2 - 1;
  }

  const range = numRows + 1; // +1 for the base random value

  for (let i = 0; i < length; i++) {
    // Voss algorithm: update a subset of rows based on counter
    let sum = 0;
    let counter = i;
    for (let r = 0; r < numRows; r++) {
      if (counter === 0) break;
      if (counter & 1) {
        // Update this row
        rows[r] = Math.random() * 2 - 1;
        break;
      }
      counter >>= 1;
    }

    // Sum all rows plus a fresh random value
    for (let r = 0; r < numRows; r++) {
      sum += rows[r];
    }
    sum += Math.random() * 2 - 1;

    // Normalize
    data[i] = sum / range;
  }

  return buffer;
}

/**
 * Generate a logarithmic frequency sweep AudioBuffer.
 * Sweeps from startFreq to endFreq over the given duration.
 */
export function generateSweep(
  audioContext: AudioContext,
  duration: number,
  startFreq: number = 20,
  endFreq: number = 20000,
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Logarithmic sweep: instantaneous frequency increases exponentially
  // phase(t) = 2*pi * startFreq * duration / ln(endFreq/startFreq) * (exp(t/duration * ln(endFreq/startFreq)) - 1)
  const ratio = endFreq / startFreq;
  const logRatio = Math.log(ratio);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const normalizedT = t / duration;
    // Instantaneous phase for exponential sweep
    const phase = (2 * Math.PI * startFreq * duration / logRatio) * (Math.pow(ratio, normalizedT) - 1);
    data[i] = Math.sin(phase);
  }

  // Apply fade in/out to avoid clicks
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.01), length / 4);
  for (let i = 0; i < fadeSamples; i++) {
    const factor = i / fadeSamples;
    data[i] *= factor;
    data[length - 1 - i] *= factor;
  }

  return buffer;
}

export type TestToneType = 'pink' | 'white' | 'sweep' | 'file';

/** Duration of generated test tones in seconds */
const TONE_DURATION = 8;

/**
 * Create a looping AudioBufferSourceNode for the selected test tone type.
 * For 'file', the caller must supply a pre-decoded buffer via createFileSource.
 */
export function createTestToneSource(
  audioContext: AudioContext,
  type: TestToneType,
): AudioBufferSourceNode {
  let buffer: AudioBuffer;

  switch (type) {
    case 'pink':
      buffer = generatePinkNoise(audioContext, TONE_DURATION);
      break;
    case 'white':
      buffer = generateWhiteNoise(audioContext, TONE_DURATION);
      break;
    case 'sweep':
      buffer = generateSweep(audioContext, TONE_DURATION);
      break;
    case 'file':
      // 'file' is handled separately via createFileSource; reaching here is a bug.
      throw new Error("createTestToneSource('file') is not supported — use createFileSource instead");
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/**
 * Create a looping AudioBufferSourceNode from a user-uploaded, decoded buffer.
 * Loops (same as generated tones) so the user can A/B-test the EQ on/off
 * against their own track continuously.
 */
export function createFileSource(
  audioContext: AudioContext,
  buffer: AudioBuffer,
): AudioBufferSourceNode {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}
