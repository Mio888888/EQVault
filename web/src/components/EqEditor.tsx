import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { EqPreset, EqFilter } from '../data/types';
import FilterEditor from './FilterEditor';
import { formatParametricEq } from '../lib/eqFormat';
import { downloadText, copyToClipboard } from '../lib/download';

interface EqEditorProps {
  preset: EqPreset;
  workingPreset: EqPreset;
  onPresetChange: (preset: EqPreset) => void;
  onReset: () => void;
}

export default function EqEditor({ preset, workingPreset, onPresetChange, onReset }: EqEditorProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const isModified =
    workingPreset.preamp !== preset.preamp ||
    workingPreset.filters.length !== preset.filters.length ||
    workingPreset.filters.some((f, i) => {
      const o = preset.filters[i];
      return o && (f.fc !== o.fc || f.gain !== o.gain || f.q !== o.q || f.type !== o.type);
    });

  const handlePreampChange = useCallback(
    (value: string) => {
      const preamp = parseFloat(value);
      if (!isNaN(preamp) && preamp >= -20 && preamp <= 20) {
        onPresetChange({ ...workingPreset, preamp: Math.round(preamp * 10) / 10 });
      }
    },
    [workingPreset, onPresetChange],
  );

  const handleFilterChange = useCallback(
    (index: number, filter: EqFilter) => {
      const newFilters = [...workingPreset.filters];
      newFilters[index] = filter;
      onPresetChange({ ...workingPreset, filters: newFilters });
    },
    [workingPreset, onPresetChange],
  );

  const handleExport = useCallback(() => {
    const text = formatParametricEq(workingPreset);
    downloadText('ParametricEQ.txt', text);
  }, [workingPreset]);

  const handleCopy = useCallback(async () => {
    const text = formatParametricEq(workingPreset);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [workingPreset]);

  return (
    <div className="space-y-3">
      {/* Preamp editor */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">{t('eq.preamp')}</label>
        <input
          type="number"
          value={workingPreset.preamp}
          onChange={(e) => handlePreampChange(e.target.value)}
          step={0.1}
          min={-20}
          max={20}
          className="w-20 text-right font-mono text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">dB</span>
      </div>

      {/* Filter editors table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-10">{t('eq.colIndex')}</th>
              <th className="text-left py-1.5 px-2 text-gray-500 font-medium w-12">{t('eq.colType')}</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">{t('eq.colFreq')}</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">{t('eq.colGain')}</th>
              <th className="text-right py-1.5 px-2 text-gray-500 font-medium">{t('eq.colQ')}</th>
            </tr>
          </thead>
          <tbody>
            {workingPreset.filters.map((filter, i) => (
              <FilterEditor
                key={i}
                filter={filter}
                index={i}
                onChange={handleFilterChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={onReset}
          disabled={!isModified}
          className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('eq.reset')}
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {t('eq.exportModified')}
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? t('eq.copied') : t('eq.copyModified')}
        </button>
        {isModified && (
          <span className="text-xs text-amber-600 ml-auto">
            {t('eq.modified')}
          </span>
        )}
      </div>
    </div>
  );
}
