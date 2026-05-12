import Papa from 'papaparse';

/** AutoEq result CSV column names */
const CSV_COLUMNS = [
  'frequency',
  'raw',
  'smoothed',
  'error',
  'error_smoothed',
  'equalization',
  'parametric_eq',
  'fixed_band_eq',
  'equalized_raw',
  'equalized_smoothed',
  'target',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface CsvData {
  frequency: number[];
  raw: number[];
  smoothed: number[];
  error: number[];
  error_smoothed: number[];
  equalization: number[];
  parametric_eq: number[];
  fixed_band_eq: number[];
  equalized_raw: number[];
  equalized_smoothed: number[];
  target: number[];
}

/** Chart data point for recharts */
export interface ChartDataPoint {
  frequency: number;
  raw: number;
  smoothed: number;
  error: number;
  error_smoothed: number;
  equalization: number;
  parametric_eq: number;
  fixed_band_eq: number;
  equalized_raw: number;
  equalized_smoothed: number;
  target: number;
}

/**
 * Parse AutoEq result CSV text into typed arrays.
 * Returns null if parsing fails.
 */
export function parseAutoEqCsv(text: string): CsvData | null {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // we handle conversion ourselves
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    console.error('CSV parse errors:', result.errors);
    return null;
  }

  const rows = result.data;
  if (rows.length === 0) return null;

  const data: CsvData = {
    frequency: [],
    raw: [],
    smoothed: [],
    error: [],
    error_smoothed: [],
    equalization: [],
    parametric_eq: [],
    fixed_band_eq: [],
    equalized_raw: [],
    equalized_smoothed: [],
    target: [],
  };

  for (const row of rows) {
    const freq = parseFloat(row['frequency'] ?? '');
    if (isNaN(freq)) continue;

    data.frequency.push(freq);
    for (const col of CSV_COLUMNS) {
      if (col === 'frequency') continue;
      const val = parseFloat(row[col] ?? '');
      (data[col] as number[]).push(isNaN(val) ? 0 : val);
    }
  }

  return data.frequency.length > 0 ? data : null;
}

/**
 * Convert CsvData to array of chart data points for recharts.
 * Recharts needs an array of objects, one per frequency point.
 */
export function toChartData(csv: CsvData): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  for (let i = 0; i < csv.frequency.length; i++) {
    points.push({
      frequency: csv.frequency[i],
      raw: csv.raw[i],
      smoothed: csv.smoothed[i],
      error: csv.error[i],
      error_smoothed: csv.error_smoothed[i],
      equalization: csv.equalization[i],
      parametric_eq: csv.parametric_eq[i],
      fixed_band_eq: csv.fixed_band_eq[i],
      equalized_raw: csv.equalized_raw[i],
      equalized_smoothed: csv.equalized_smoothed[i],
      target: csv.target[i],
    });
  }
  return points;
}
