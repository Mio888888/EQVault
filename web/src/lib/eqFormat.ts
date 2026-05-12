import type { EqPreset } from '../data/types';

/** Map internal filter types to EqualizerAPO type codes */
const FILTER_TYPE_MAP: Record<string, string> = {
  LOW_SHELF: 'LSC',
  HIGH_SHELF: 'HSC',
  PEAKING: 'PK',
  LOW_PASS: 'LP',
  HIGH_PASS: 'HP',
};

/**
 * Format an EQ preset to EqualizerAPO ParametricEQ text format.
 *
 * Output example:
 *   Preamp: -5.6 dB
 *   Filter 1: ON LSC Fc 105 Hz Gain 3.7 dB Q 0.70
 *   Filter 2: ON PK Fc 6196 Hz Gain 5.5 dB Q 3.02
 */
export function formatParametricEq(preset: EqPreset): string {
  return formatEqText(preset);
}

/**
 * Format an EQ preset to EqualizerAPO FixedBandEQ text format.
 * Uses the same filter line format as ParametricEQ.
 */
export function formatFixedBandEq(preset: EqPreset): string {
  return formatEqText(preset);
}

/**
 * Return GraphicEQ text as-is.
 */
export function formatGraphicEq(text: string): string {
  return text;
}

/**
 * Internal: format an EqPreset to EqualizerAPO text.
 */
function formatEqText(preset: EqPreset): string {
  const lines: string[] = [];

  lines.push(`Preamp: ${preset.preamp > 0 ? '+' : ''}${preset.preamp.toFixed(1)} dB`);

  for (let i = 0; i < preset.filters.length; i++) {
    const f = preset.filters[i];
    const type = FILTER_TYPE_MAP[f.type] ?? f.type;
    const gainStr = f.gain > 0 ? '+' : '';
    lines.push(
      `Filter ${i + 1}: ON ${type} Fc ${f.fc} Hz Gain ${gainStr}${f.gain.toFixed(1)} dB Q ${f.q.toFixed(2)}`
    );
  }

  return lines.join('\n');
}
