/** EQ filter types (from backend: PascalCase) */
export type FilterTypeBackend = 'LowShelf' | 'HighShelf' | 'Peaking' | 'LowPass' | 'HighPass';

/** EQ filter types (internal/frontend: UPPER_SNAKE_CASE) */
export type FilterType = 'LOW_SHELF' | 'HIGH_SHELF' | 'PEAKING' | 'LOW_PASS' | 'HIGH_PASS';

/** Measurement source */
export type Source = string;

/** Headphone form factor */
export type Form = string;

/** Measurement rig */
export type Rig = string;

/** EQ filter parameters (raw from backend) */
export interface EqFilterBackend {
  type: FilterTypeBackend;
  fc: number;
  gain: number;
  q: number;
}

/** EQ filter parameters (internal) */
export interface EqFilter {
  type: FilterType;
  fc: number;
  gain: number;
  q: number;
}

/** EQ preset with preamp and filters (raw from backend) */
export interface EqPresetBackend {
  preamp: number;
  filters: EqFilterBackend[];
}

/** EQ preset with preamp and filters (internal) */
export interface EqPreset {
  preamp: number;
  filters: EqFilter[];
}

/** Profile file paths (raw from backend) */
export interface ProfileFilesBackend {
  parametric_eq?: string;
  fixed_band_eq?: string;
  graphic_eq?: string;
  csv?: string;
}

/** Profile file paths (internal) */
export interface ProfileFiles {
  parametric?: string;
  fixed_band?: string;
  graphic?: string;
  csv?: string;
}

/** Profile EQ data (internal) */
export interface ProfileEq {
  parametric: EqPreset;
  fixed_band: EqPreset;
  graphic: string;
}

/** Index entry for profile listing */
export interface ProfileIndex {
  id: string;
  name: string;
  source: Source;
  form: Form;
  rig: Rig;
  recommended?: boolean;
}

/** Full profile detail (raw from backend JSON) */
export interface ProfileDetailBackend {
  id: string;
  name: string;
  source: Source;
  form: Form;
  rig: Rig;
  recommended: boolean;
  files: ProfileFilesBackend;
  parametric_eq?: EqPresetBackend;
  fixed_band_eq?: EqPresetBackend;
  graphic_eq?: string;
}

/** Full profile detail (internal, after transformation) */
export interface ProfileDetail {
  id: string;
  name: string;
  source: Source;
  form: Form;
  rig: Rig;
  recommended: boolean;
  files: ProfileFiles;
  eq: ProfileEq;
}

/** Build metadata */
export interface MetaData {
  sync_time: string;
  autoeq_commit: string;
  total_profiles: number;
  recommended_count: number;
}

/** Filter state for search/filter UI */
export interface FilterState {
  source: string;
  form: string;
  rig: string;
}
