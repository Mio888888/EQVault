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
        <span className="text-sm font-medium text-gray-700">{t('eq.preamp')}</span>
        <span className="text-sm font-mono text-gray-900">{preamp > 0 ? '+' : ''}{preamp.toFixed(1)} dB</span>
      </div>

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
            {filters.map((f, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
                    {typeLabels[f.type]}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-gray-900">
                  {f.fc >= 1000 ? `${(f.fc / 1000).toFixed(f.fc % 1000 === 0 ? 0 : 1)}k` : f.fc}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-gray-900">
                  {f.gain > 0 ? '+' : ''}{f.gain.toFixed(1)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-gray-900">
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
