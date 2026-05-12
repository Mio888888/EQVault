import type { ProfileIndex, FilterState } from '../data/types';

/**
 * Case-insensitive substring match for profile name
 */
function matchesSearch(profile: ProfileIndex, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return profile.name.toLowerCase().includes(lower);
}

/**
 * Check if profile matches all active filter criteria
 */
function matchesFilters(profile: ProfileIndex, filters: FilterState): boolean {
  if (filters.source && profile.source !== filters.source) return false;
  if (filters.form && profile.form !== filters.form) return false;
  if (filters.rig && profile.rig !== filters.rig) return false;
  return true;
}

/**
 * Extract unique sorted values for a given field from profiles
 */
export function extractOptions(profiles: ProfileIndex[], field: keyof Pick<ProfileIndex, 'source' | 'form' | 'rig'>): string[] {
  const set = new Set(profiles.map((p) => p[field]));
  return Array.from(set).sort();
}

/**
 * Filter and sort profiles based on search query and filter criteria
 */
export function filterProfiles(
  profiles: ProfileIndex[],
  query: string,
  filters: FilterState
): ProfileIndex[] {
  return profiles
    .filter((p) => matchesSearch(p, query) && matchesFilters(p, filters))
    .sort((a, b) => a.name.localeCompare(b.name));
}
