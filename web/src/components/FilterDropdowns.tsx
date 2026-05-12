import type { ProfileIndex, FilterState } from '../data/types';
import { extractOptions } from '../lib/search';

interface FilterDropdownsProps {
  profiles: ProfileIndex[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function FilterDropdowns({ profiles, filters, onChange }: FilterDropdownsProps) {
  const sources = extractOptions(profiles, 'source');
  const forms = extractOptions(profiles, 'form');
  const rigs = extractOptions(profiles, 'rig');

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer';

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={filters.source}
        onChange={(e) => handleChange('source', e.target.value)}
        className={selectClass}
        aria-label="Filter by source"
      >
        <option value="">All Sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.form}
        onChange={(e) => handleChange('form', e.target.value)}
        className={selectClass}
        aria-label="Filter by form"
      >
        <option value="">All Forms</option>
        {forms.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>

      <select
        value={filters.rig}
        onChange={(e) => handleChange('rig', e.target.value)}
        className={selectClass}
        aria-label="Filter by rig"
      >
        <option value="">All Rigs</option>
        {rigs.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}
