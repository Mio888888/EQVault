import { useState, useEffect } from 'react';
import type { MetaData, ProfileIndex, ProfileDetail, ProfileDetailBackend, EqFilter, EqPreset, EqFilterBackend, EqPresetBackend } from '../data/types';

const BASE = './data';

/** Map backend filter type to internal filter type */
function mapFilterType(type: string): EqFilter['type'] {
  const map: Record<string, EqFilter['type']> = {
    'LowShelf': 'LOW_SHELF',
    'HighShelf': 'HIGH_SHELF',
    'Peaking': 'PEAKING',
    'LowPass': 'LOW_PASS',
    'HighPass': 'HIGH_PASS',
  };
  return map[type] ?? 'PEAKING';
}

/** Convert a backend filter to internal filter */
function convertFilter(f: EqFilterBackend): EqFilter {
  return {
    type: mapFilterType(f.type),
    fc: f.fc,
    gain: f.gain,
    q: f.q,
  };
}

/** Convert a backend preset to internal preset */
function convertPreset(preset: EqPresetBackend): EqPreset {
  return {
    preamp: preset.preamp,
    filters: preset.filters.map(convertFilter),
  };
}

/** Convert raw backend profile to internal profile */
export function convertProfile(raw: ProfileDetailBackend): ProfileDetail {
  return {
    id: raw.id,
    name: raw.name,
    source: raw.source,
    form: raw.form,
    rig: raw.rig,
    recommended: raw.recommended,
    files: {
      parametric: raw.files?.parametric_eq,
      fixed_band: raw.files?.fixed_band_eq,
      graphic: raw.files?.graphic_eq,
      csv: raw.files?.csv,
    },
    eq: {
      parametric: raw.parametric_eq ? convertPreset(raw.parametric_eq) : { preamp: 0, filters: [] },
      fixed_band: raw.fixed_band_eq ? convertPreset(raw.fixed_band_eq) : { preamp: 0, filters: [] },
      graphic: raw.graphic_eq ?? '',
    },
  };
}

/** Result when url is null */
const EMPTY = { data: null, loading: false, error: null };

/**
 * Fetch hook for a non-null URL. Always starts with loading=true.
 */
function useFetchUrl<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

/**
 * Fetch hook that gracefully handles null url (returns empty state).
 * Splits into two hooks to avoid set-state-in-effect when url is null.
 */
function useFetch<T>(url: string | null) {
  const result = useFetchUrl<T | null>(url ?? '');
  if (url === null) return EMPTY as { data: T | null; loading: boolean; error: string | null };
  return result as { data: T | null; loading: boolean; error: string | null };
}

/**
 * Fetch build metadata
 */
export function useMeta() {
  return useFetch<MetaData>(`${BASE}/meta.json`);
}

/**
 * Fetch profile index (recommended or all)
 */
export function useIndex(showAll: boolean) {
  const url = showAll ? `${BASE}/index/all.json` : `${BASE}/index/recommended.json`;
  return useFetch<ProfileIndex[]>(url);
}

/**
 * Fetch a single profile detail by id, converting backend format to internal format.
 */
export function useProfile(id: string | null) {
  const url = id ? `${BASE}/profiles/${id}.json` : null;
  const raw = useFetch<ProfileDetailBackend>(url);

  // Transform backend data to internal format
  if (raw.data) {
    return {
      data: convertProfile(raw.data),
      loading: raw.loading,
      error: raw.error,
    };
  }
  return raw as { data: ProfileDetail | null; loading: boolean; error: string | null };
}
