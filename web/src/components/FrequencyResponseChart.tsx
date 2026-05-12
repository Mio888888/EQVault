import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CsvData } from '../lib/csv';
import { toChartData } from '../lib/csv';

interface FrequencyResponseChartProps {
  data: CsvData;
}

const FREQ_TICKS = [
  20, 30, 40, 50, 60, 70, 80, 90,
  100, 200, 300, 400, 500, 600, 700, 800, 900,
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
  10000, 20000,
];

/** Format frequency for log axis tick labels */
function formatFreqTick(x: number): string {
  const log = Math.floor(Math.log10(x));
  const mantissa = x / 10 ** log;
  if ([1, 2, 5].includes(mantissa)) {
    return x >= 1000 ? `${(x / 1000).toFixed(0)}k` : x.toFixed(0);
  }
  return '';
}

interface CurveConfig {
  key: string;
  name: string;
  color: string;
  dashArray?: string;
}

const CURVES: CurveConfig[] = [
  { key: 'raw', name: 'Raw', color: '#3b82f6' },
  { key: 'target', name: 'Target', color: '#22c55e', dashArray: '5 3' },
  { key: 'equalization', name: 'Equalization', color: '#f97316' },
  { key: 'equalized_raw', name: 'Equalized', color: '#ef4444' },
];

export default function FrequencyResponseChart({ data }: FrequencyResponseChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    raw: true,
    target: true,
    equalization: true,
    equalized_raw: true,
  });

  const chartData = useMemo(() => toChartData(data), [data]);

  const toggleCurve = (key: string) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 25 }}
          >
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 2" />
            <XAxis
              dataKey="frequency"
              scale="log"
              domain={[20, 20000]}
              type="number"
              ticks={FREQ_TICKS}
              tickFormatter={formatFreqTick}
              interval={0}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{
                value: 'Frequency (Hz)',
                position: 'insideBottom' as const,
                dy: 18,
                fontSize: 12,
                fill: '#6b7280',
              }}
            />
            <YAxis
              scale="linear"
              type="number"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              label={{
                value: 'dBr',
                angle: -90,
                dx: -5,
                position: 'insideBottomLeft' as const,
                fontSize: 12,
                fill: '#6b7280',
              }}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip
              formatter={(value) => {
                const n = Number(value);
                return [`${isNaN(n) ? value : (n > 0 ? '+' : '') + n.toFixed(1) + ' dB'}`];
              }}
              labelFormatter={(label) => `${Number(label).toFixed(0)} Hz`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
            />
            {CURVES.map((curve) => (
              <Line
                key={curve.key}
                dataKey={visible[curve.key] ? curve.key : ''}
                name={curve.name}
                type="linear"
                dot={false}
                stroke={curve.color}
                strokeWidth={1.5}
                strokeDasharray={curve.dashArray}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Curve toggles */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {CURVES.map((curve) => (
          <button
            key={curve.key}
            onClick={() => toggleCurve(curve.key)}
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{
                backgroundColor: visible[curve.key] ? curve.color : '#d1d5db',
                textDecoration: curve.dashArray ? 'dashed' : undefined,
              }}
            />
            <span
              className={visible[curve.key] ? 'text-gray-700' : 'text-gray-400 line-through'}
            >
              {curve.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
