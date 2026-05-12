import { useState, useMemo, useCallback } from 'react';
import { useMeta, useIndex } from './hooks/useData';
import { filterProfiles } from './lib/search';
import type { FilterState } from './data/types';
import SearchBar from './components/SearchBar';
import FilterDropdowns from './components/FilterDropdowns';
import ProfileList from './components/ProfileList';
import ProfileDetail from './components/ProfileDetail';

interface ViewState {
  view: 'list' | 'detail';
  selectedId: string | null;
}

export default function App() {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ source: '', form: '', rig: '' });
  const [nav, setNav] = useState<ViewState>({ view: 'list', selectedId: null });

  const { data: meta, loading: metaLoading } = useMeta();
  const { data: index, loading: indexLoading, error: indexError } = useIndex(showAll);

  const filtered = useMemo(
    () => (index ? filterProfiles(index, query, filters) : []),
    [index, query, filters]
  );

  const handleSelect = useCallback((id: string) => {
    setNav({ view: 'detail', selectedId: id });
  }, []);

  const handleBack = useCallback(() => {
    setNav({ view: 'list', selectedId: null });
  }, []);

  const handleToggle = useCallback(() => {
    setShowAll((prev) => !prev);
    // Reset filters when toggling
    setFilters({ source: '', form: '', rig: '' });
  }, []);

  // Detail view
  if (nav.view === 'detail' && nav.selectedId) {
    return <ProfileDetail profileId={nav.selectedId} onBack={handleBack} />;
  }

  // List view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">EQVault</h1>
            {!metaLoading && meta && (
              <div className="text-xs text-gray-500 text-right">
                <span>{meta.total_profiles} profiles</span>
                <span className="mx-1.5">|</span>
                <span>{meta.recommended_count} recommended</span>
                <br />
                <span>Last sync: {new Date(meta.sync_time).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={!showAll ? undefined : handleToggle}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !showAll
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={showAll ? undefined : handleToggle}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  showAll
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Profiles
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-2">
            <SearchBar value={query} onChange={setQuery} />
            <FilterDropdowns profiles={index ?? []} filters={filters} onChange={setFilters} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {indexLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Loading...
          </div>
        )}

        {indexError && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">
            Failed to load data: {indexError}
          </div>
        )}

        {!indexLoading && !indexError && (
          <ProfileList profiles={filtered} onSelect={handleSelect} />
        )}
      </main>
    </div>
  );
}
