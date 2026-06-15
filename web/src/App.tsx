import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMeta, useIndex } from './hooks/useData';
import { filterProfiles } from './lib/search';
import type { FilterState } from './data/types';
import SearchBar from './components/SearchBar';
import FilterDropdowns from './components/FilterDropdowns';
import ProfileList from './components/ProfileList';
import ProfileDetail from './components/ProfileDetail';
import LanguageToggle from './components/LanguageToggle';
import SkeletonList from './components/SkeletonList';

interface ViewState {
  view: 'list' | 'detail';
  selectedId: string | null;
}

export default function App() {
  const { t } = useTranslation();
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
    setFilters({ source: '', form: '', rig: '' });
  }, []);

  // Detail view
  if (nav.view === 'detail' && nav.selectedId) {
    return <ProfileDetail profileId={nav.selectedId} onBack={handleBack} />;
  }

  // List view
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-cream/95 backdrop-blur border-b border-line sticky top-0 z-10 animate-rise-in">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{t('app.title')}</h1>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              {!metaLoading && meta && (
                <div className="text-xs text-ink-600 text-right leading-relaxed">
                  <span className="font-mono tabular-nums">{meta.total_profiles}</span> {t('app.profiles')}
                  <span className="mx-1.5 text-line">|</span>
                  <span className="font-mono tabular-nums">{meta.recommended_count}</span> {t('app.recommended')}
                  <br />
                  <span>{t('app.lastSync')} {new Date(meta.sync_time).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex bg-surface rounded-full p-0.5 border border-line">
              <button
                onClick={!showAll ? undefined : handleToggle}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  !showAll
                    ? 'bg-cream text-ink shadow-sm'
                    : 'text-ink-600 hover:text-ink'
                }`}
              >
                {t('app.recommendedToggle')}
              </button>
              <button
                onClick={showAll ? undefined : handleToggle}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  showAll
                    ? 'bg-cream text-ink shadow-sm'
                    : 'text-ink-600 hover:text-ink'
                }`}
              >
                {t('app.allProfiles')}
              </button>
            </div>
            <span className="text-sm text-ink-600 font-mono tabular-nums">
              {t('app.results', { count: filtered.length })}
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
          <SkeletonList />
        )}

        {indexError && (
          <div className="bg-red-50 text-red-700 text-sm rounded-card p-4">
            {t('app.loadError', { error: indexError })}
          </div>
        )}

        {!indexLoading && !indexError && (
          <ProfileList profiles={filtered} onSelect={handleSelect} />
        )}
      </main>
    </div>
  );
}
