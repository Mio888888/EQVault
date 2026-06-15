import { useTranslation } from 'react-i18next';
import type { ProfileIndex, FilterState } from '../data/types';
import { extractOptions } from '../lib/search';

interface FilterDropdownsProps {
  profiles: ProfileIndex[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function FilterDropdowns({ profiles, filters, onChange }: FilterDropdownsProps) {
  const { t } = useTranslation();
  const sources = extractOptions(profiles, 'source');
  const forms = extractOptions(profiles, 'form');
  const rigs = extractOptions(profiles, 'rig');

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const selectClass =
    'rounded-control border border-line bg-cream px-3 py-2 text-sm text-ink-600 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer';

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={filters.source}
        onChange={(e) => handleChange('source', e.target.value)}
        className={selectClass}
        aria-label={t('filter.bySource')}
      >
        <option value="">{t('filter.allSources')}</option>
        {sources.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.form}
        onChange={(e) => handleChange('form', e.target.value)}
        className={selectClass}
        aria-label={t('filter.byForm')}
      >
        <option value="">{t('filter.allForms')}</option>
        {forms.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <select
        value={filters.rig}
        onChange={(e) => handleChange('rig', e.target.value)}
        className={selectClass}
        aria-label={t('filter.byRig')}
      >
        <option value="">{t('filter.allRigs')}</option>
        {rigs.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}
