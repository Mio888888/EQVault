import type { ProfileIndex, FilterState } from '../data/types';

function matchesFilters(profile: ProfileIndex, filters: FilterState): boolean {
  if (filters.source && profile.source !== filters.source) return false;
  if (filters.form && profile.form !== filters.form) return false;
  if (filters.rig && profile.rig !== filters.rig) return false;
  return true;
}

export function extractOptions(profiles: ProfileIndex[], field: keyof Pick<ProfileIndex, 'source' | 'form' | 'rig'>): string[] {
  const set = new Set(profiles.map((p) => p[field]));
  return Array.from(set).sort();
}

export function filterProfiles(
  profiles: ProfileIndex[],
  query: string,
  filters: FilterState
): ProfileIndex[] {
  const hasQuery = !!query;
  const hasFilters = !!(filters.source || filters.form || filters.rig);

  if (!hasQuery && !hasFilters) {
    return profiles;
  }

  const lower = hasQuery ? query.toLowerCase() : '';
  return profiles.filter((p) => {
    if (hasQuery && !p.name.toLowerCase().includes(lower)) return false;
    if (hasFilters && !matchesFilters(p, filters)) return false;
    return true;
  });
}
