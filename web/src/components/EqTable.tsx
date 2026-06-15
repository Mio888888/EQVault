import { useTranslation } from 'react-i18next';
import type { EqFilter } from '../data/types';

interface EqTableProps {
  preamp: number;
  filters: EqFilter[];
}

const typeLabels: Record<string, string> = {
  LOW_SHELF: 'LS',
  HIGH_SHELF: 'HS',
  PEAKING: 'PK',
  LOW_PASS: 'LP',
  HIGH_PASS: 'HP',
};

export default function EqTable({ preamp, filters }: EqTableProps) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-ink-600">{t('eq.preamp')}</span>
        <span className="text-sm font-mono text-ink">{preamp > 0 ? '+' : ''}{preamp.toFixed(1)} dB</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-1.5 px-2 text-ink-600 font-medium w-10">{t('eq.colIndex')}</th>
              <th className="text-left py-1.5 px-2 text-ink-600 font-medium w-12">{t('eq.colType')}</th>
              <th className="text-right py-1.5 px-2 text-ink-600 font-medium">{t('eq.colFreq')}</th>
              <th className="text-right py-1.5 px-2 text-ink-600 font-medium">{t('eq.colGain')}</th>
              <th className="text-right py-1.5 px-2 text-ink-600 font-medium">{t('eq.colQ')}</th>
            </tr>
          </thead>
          <tbody>
            {filters.map((f, i) => (
              <tr key={i} className="border-b border-line/60 hover:bg-cream transition-colors">
                <td className="py-1.5 px-2 text-ink-600/70">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <span className="inline-block px-1.5 py-0.5 bg-cream rounded-control text-xs font-mono text-primary">
                    {typeLabels[f.type]}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-ink">
                  {f.fc >= 1000 ? `${(f.fc / 1000).toFixed(f.fc % 1000 === 0 ? 0 : 1)}k` : f.fc}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-ink">
                  {f.gain > 0 ? '+' : ''}{f.gain.toFixed(1)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-ink">
                  {f.q.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
