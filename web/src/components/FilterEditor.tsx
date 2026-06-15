import type { EqFilter } from '../data/types';

interface FilterEditorProps {
  filter: EqFilter;
  index: number;
  onChange: (index: number, filter: EqFilter) => void;
}

const typeLabels: Record<string, string> = {
  LOW_SHELF: 'LS',
  HIGH_SHELF: 'HS',
  PEAKING: 'PK',
  LOW_PASS: 'LP',
  HIGH_PASS: 'HP',
};

export default function FilterEditor({ filter, index, onChange }: FilterEditorProps) {
  function handleFcChange(value: string) {
    const fc = parseFloat(value);
    if (!isNaN(fc) && fc >= 20 && fc <= 20000) {
      onChange(index, { ...filter, fc });
    }
  }

  function handleGainChange(value: string) {
    const gain = parseFloat(value);
    if (!isNaN(gain) && gain >= -20 && gain <= 20) {
      onChange(index, { ...filter, gain: Math.round(gain * 10) / 10 });
    }
  }

  function handleQChange(value: string) {
    const q = parseFloat(value);
    if (!isNaN(q) && q >= 0.01 && q <= 20) {
      onChange(index, { ...filter, q: Math.round(q * 100) / 100 });
    }
  }

  return (
    <tr className="border-b border-line/60 hover:bg-cream transition-colors">
      <td className="py-1.5 px-2 text-ink-600/70 text-sm">{index + 1}</td>
      <td className="py-1.5 px-2">
        <span className="inline-block px-1.5 py-0.5 bg-cream rounded-control text-xs font-mono text-primary">
          {typeLabels[filter.type]}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <input
          type="number"
          value={filter.fc}
          onChange={(e) => handleFcChange(e.target.value)}
          step={1}
          min={20}
          max={20000}
          className="w-20 text-right font-mono text-sm border border-line bg-cream rounded-control px-1.5 py-0.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </td>
      <td className="py-1.5 px-2">
        <input
          type="number"
          value={filter.gain}
          onChange={(e) => handleGainChange(e.target.value)}
          step={0.1}
          min={-20}
          max={20}
          className="w-18 text-right font-mono text-sm border border-line bg-cream rounded-control px-1.5 py-0.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </td>
      <td className="py-1.5 px-2">
        <input
          type="number"
          value={filter.q}
          onChange={(e) => handleQChange(e.target.value)}
          step={0.01}
          min={0.01}
          max={20}
          className="w-18 text-right font-mono text-sm border border-line bg-cream rounded-control px-1.5 py-0.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </td>
    </tr>
  );
}
