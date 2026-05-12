import { useState, useEffect, useCallback } from 'react';
import type { ProfileDetail as ProfileDetailType } from '../data/types';
import { useProfile } from '../hooks/useData';
import { parseAutoEqCsv, type CsvData } from '../lib/csv';
import { downloadText, copyToClipboard } from '../lib/download';
import FrequencyResponseChart from './FrequencyResponseChart';
import AudioPlayer from './AudioPlayer';
import EqTab from './EqTab';

interface ProfileDetailProps {
  profileId: string;
  onBack: () => void;
}

type TabId = 'overview' | 'eq' | 'download';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'eq', label: 'EQ Settings' },
  { id: 'download', label: 'Download' },
];

export default function ProfileDetail({ profileId, onBack }: ProfileDetailProps) {
  const { data: profile, loading, error } = useProfile(profileId);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [csvError, setCsvError] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const csvLoading = csvData === null && !csvError && !!profile?.files?.csv;

  // Fetch CSV data when profile loads
  useEffect(() => {
    if (!profile?.files?.csv) return;

    let cancelled = false;

    fetch(profile.files.csv)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          const parsed = parseAutoEqCsv(text);
          setCsvData(parsed);
          if (!parsed) setCsvError(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCsvData(null);
          setCsvError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.files?.csv]);

  const handleCopy = useCallback(async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-4 py-8">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center gap-1"
        >
          &larr; Back
        </button>
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">
          Failed to load profile: {error ?? 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-flex items-center gap-1"
          >
            &larr; Back to list
          </button>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{profile.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  {profile.source}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">
                  {profile.form}
                </span>
                <span className="text-xs text-gray-500">{profile.rig}</span>
                {profile.recommended && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                    &#9733; Recommended
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'overview' && (
          <OverviewTab profile={profile} csvData={csvData} csvLoading={csvLoading} />
        )}
        {activeTab === 'eq' && (
          <EqTab
            key={profile.id}
            profile={profile}
            onCopy={handleCopy}
            copiedKey={copiedKey}
          />
        )}
        {activeTab === 'download' && (
          <DownloadTab profile={profile} csvData={csvData} />
        )}
      </main>
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({
  profile,
  csvData,
  csvLoading,
}: {
  profile: ProfileDetailType;
  csvData: CsvData | null;
  csvLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Frequency Response</h2>
        {csvLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            Loading chart data...
          </div>
        )}
        {!csvLoading && csvData && (
          <FrequencyResponseChart data={csvData} />
        )}
        {!csvLoading && !csvData && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            No frequency response data available
          </div>
        )}
      </div>

      {/* Audio Player */}
      <AudioPlayer preset={profile.eq.parametric} />

      {/* Quick EQ summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">EQ Summary</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Parametric Preamp:</span>{' '}
            <span className="font-mono text-gray-900">
              {profile.eq.parametric.preamp > 0 ? '+' : ''}
              {profile.eq.parametric.preamp.toFixed(1)} dB
            </span>
          </div>
          <div>
            <span className="text-gray-500">Filters:</span>{' '}
            <span className="font-mono text-gray-900">{profile.eq.parametric.filters.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Fixed Band Preamp:</span>{' '}
            <span className="font-mono text-gray-900">
              {profile.eq.fixed_band.preamp > 0 ? '+' : ''}
              {profile.eq.fixed_band.preamp.toFixed(1)} dB
            </span>
          </div>
          <div>
            <span className="text-gray-500">Bands:</span>{' '}
            <span className="font-mono text-gray-900">{profile.eq.fixed_band.filters.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Download Tab ---

function formatEqText(preamp: number, filters: { type: string; fc: number; gain: number; q: number }[]): string {
  const typeMap: Record<string, string> = {
    LOW_SHELF: 'LSC',
    HIGH_SHELF: 'HSC',
    PEAKING: 'PK',
    LOW_PASS: 'LP',
    HIGH_PASS: 'HP',
  };

  let text = `Preamp: ${preamp > 0 ? '+' : ''}${preamp.toFixed(1)} dB\n`;
  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    const type = typeMap[f.type] ?? f.type;
    text += `Filter ${i + 1}: ON ${type} Fc ${f.fc} Hz Gain ${f.gain > 0 ? '+' : ''}${f.gain.toFixed(1)} dB Q ${f.q.toFixed(2)}\n`;
  }
  return text.trim();
}

function DownloadTab({
  profile,
  csvData,
}: {
  profile: ProfileDetailType;
  csvData: CsvData | null;
}) {
  const downloads = [
    {
      key: 'parametric',
      label: 'ParametricEQ.txt',
      action: () => downloadText('ParametricEQ.txt', formatEqText(profile.eq.parametric.preamp, profile.eq.parametric.filters)),
    },
    {
      key: 'fixed_band',
      label: 'FixedBandEQ.txt',
      action: () => downloadText('FixedBandEQ.txt', formatEqText(profile.eq.fixed_band.preamp, profile.eq.fixed_band.filters)),
    },
    {
      key: 'graphic',
      label: 'GraphicEQ.txt',
      action: () => downloadText('GraphicEQ.txt', `GraphicEQ: ${profile.eq.graphic}`),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Download EQ Presets</h2>
        <div className="space-y-2">
          {downloads.map((dl) => (
            <button
              key={dl.key}
              onClick={dl.action}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{dl.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">EqualizerAPO format</div>
              </div>
              <span className="text-gray-400 text-lg">&#8595;</span>
            </button>
          ))}

          {csvData && (
            <button
              onClick={() => {
                // Reconstruct CSV from parsed data
                const headers = 'frequency,raw,smoothed,error,error_smoothed,equalization,parametric_eq,fixed_band_eq,equalized_raw,equalized_smoothed,target';
                const rows = csvData.frequency.map((_, i) =>
                  [
                    csvData.frequency[i],
                    csvData.raw[i],
                    csvData.smoothed[i],
                    csvData.error[i],
                    csvData.error_smoothed[i],
                    csvData.equalization[i],
                    csvData.parametric_eq[i],
                    csvData.fixed_band_eq[i],
                    csvData.equalized_raw[i],
                    csvData.equalized_smoothed[i],
                    csvData.target[i],
                  ].join(',')
                );
                downloadText('result.csv', headers + '\n' + rows.join('\n'));
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">result.csv</div>
                <div className="text-xs text-gray-500 mt-0.5">Frequency response data</div>
              </div>
              <span className="text-gray-400 text-lg">&#8595;</span>
            </button>
          )}
        </div>
      </div>

      {/* Download from source URLs */}
      {profile.files && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Source Files</h2>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Parametric: <span className="font-mono">{profile.files.parametric}</span></p>
            <p>Fixed Band: <span className="font-mono">{profile.files.fixed_band}</span></p>
            <p>Graphic: <span className="font-mono">{profile.files.graphic}</span></p>
            <p>CSV: <span className="font-mono">{profile.files.csv}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
