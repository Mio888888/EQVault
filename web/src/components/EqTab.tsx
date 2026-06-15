import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileDetail as ProfileDetailType, EqPreset } from '../data/types';
import EqTable from './EqTable';
import AudioPlayer from './AudioPlayer';
import EqEditor from './EqEditor';

interface EqTabProps {
  profile: ProfileDetailType;
  onCopy: (key: string, text: string) => void;
  copiedKey: string | null;
}

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

export default function EqTab({ profile, onCopy, copiedKey }: EqTabProps) {
  const { t } = useTranslation();
  const [editingParametric, setEditingParametric] = useState(false);
  const [workingParametric, setWorkingParametric] = useState<EqPreset>(profile.eq.parametric);

  const audioPreset = editingParametric ? workingParametric : profile.eq.parametric;

  const handleToggleEdit = useCallback(() => {
    setEditingParametric((prev) => !prev);
    setWorkingParametric(profile.eq.parametric);
  }, [profile.eq.parametric]);

  const handleReset = useCallback(() => {
    setWorkingParametric(profile.eq.parametric);
  }, [profile.eq.parametric]);

  return (
    <div className="space-y-4">
      {editingParametric && (
        <AudioPlayer preset={audioPreset} />
      )}

      <div className="bg-surface rounded-card border border-line shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">{t('eq.parametric')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleEdit}
              className={`text-xs px-2.5 py-1 rounded-control border transition-colors ${
                editingParametric
                  ? 'border-primary bg-primary/12 text-primary'
                  : 'border-line text-ink-600 hover:bg-cream hover:text-ink'
              }`}
            >
              {editingParametric ? t('eq.view') : t('eq.edit')}
            </button>
            {!editingParametric && (
              <button
                onClick={() => onCopy('parametric', formatEqText(profile.eq.parametric.preamp, profile.eq.parametric.filters))}
                className="text-xs px-2.5 py-1 rounded-control border border-line text-ink-600 hover:bg-cream hover:text-ink transition-colors"
              >
                {copiedKey === 'parametric' ? t('eq.copied') : t('eq.copy')}
              </button>
            )}
          </div>
        </div>

        {editingParametric ? (
          <EqEditor
            preset={profile.eq.parametric}
            workingPreset={workingParametric}
            onPresetChange={setWorkingParametric}
            onReset={handleReset}
          />
        ) : (
          <>
            <EqTable preamp={profile.eq.parametric.preamp} filters={profile.eq.parametric.filters} />
          </>
        )}
      </div>

      {!editingParametric && (
        <div className="bg-surface rounded-card border border-line shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">{t('eq.fixedBand')}</h2>
            <button
              onClick={() => onCopy('fixed_band', formatEqText(profile.eq.fixed_band.preamp, profile.eq.fixed_band.filters))}
              className="text-xs px-2.5 py-1 rounded-control border border-line text-ink-600 hover:bg-cream hover:text-ink transition-colors"
            >
              {copiedKey === 'fixed_band' ? t('eq.copied') : t('eq.copy')}
            </button>
          </div>
          <EqTable preamp={profile.eq.fixed_band.preamp} filters={profile.eq.fixed_band.filters} />
        </div>
      )}

      {!editingParametric && (
        <div className="bg-surface rounded-card border border-line shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">{t('eq.graphic')}</h2>
            <button
              onClick={() => onCopy('graphic', `GraphicEQ: ${profile.eq.graphic}`)}
              className="text-xs px-2.5 py-1 rounded-control border border-line text-ink-600 hover:bg-cream hover:text-ink transition-colors"
            >
              {copiedKey === 'graphic' ? t('eq.copied') : t('eq.copy')}
            </button>
          </div>
          <pre className="text-xs font-mono text-ink-600 bg-cream rounded-control p-3 overflow-x-auto whitespace-pre-wrap break-all">
            {`GraphicEQ: ${profile.eq.graphic}`}
          </pre>
        </div>
      )}
    </div>
  );
}
