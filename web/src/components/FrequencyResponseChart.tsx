import { useState, useMemo, useRef, useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  nameKey: string;
  color: string;
  dashArray?: string;
}

const CURVES: CurveConfig[] = [
  { key: 'raw', nameKey: 'chart.raw', color: '#9ca3af' },
  { key: 'target', nameKey: 'chart.target', color: '#22c55e', dashArray: '5 3' },
  { key: 'equalization', nameKey: 'chart.equalization', color: '#e65c00' },
  { key: 'equalized_raw', nameKey: 'chart.equalized', color: '#ffb380' },
];

const CHART_HEIGHT = 320;

/**
 * Track an element's pixel width via ResizeObserver. Returns 0 until the
 * first measurement lands, which the caller uses to gate rendering so the
 * chart never receives a zero/-1 width (the source of Recharts'
 * "width(-1)... should be greater than 0" warning).
 */
function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setWidth(el.clientWidth);
    update();

    const observer = new ResizeObserver((entries) => {
      // ResizeObserver fires for the observed element; use contentRect width.
      const w = entries[0]?.contentRect.width;
      if (typeof w === 'number') setWidth(w);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export default function FrequencyResponseChart({ data }: FrequencyResponseChartProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<Record<string, boolean>>({
    raw: true,
    target: true,
    equalization: true,
    equalized_raw: true,
  });

  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  const chartData = useMemo(() => toChartData(data), [data]);

  const toggleCurve = (key: string) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div ref={containerRef} className="w-full" style={{ height: CHART_HEIGHT }}>
        {/* Only render the chart once we have a real pixel width, so Recharts
            never receives a zero/-1 width (the source of its measurement warning). */}
        {width > 0 && (
          <LineChart
            width={width}
            height={CHART_HEIGHT}
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
                value: t('chart.freqAxis'),
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
                value: t('chart.dbAxis'),
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
                name={t(curve.nameKey)}
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
        )}
      </div>

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
              className={visible[curve.key] ? 'text-ink-600' : 'text-ink-600/50 line-through'}
            >
              {t(curve.nameKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
