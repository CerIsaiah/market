import { sheetsClient } from '../sheets/sheetsClient.js';
import { SHEET_NAMES } from '../sheets/sheetSchema.js';

export async function recordMetric(
  metricName: string,
  metricValue: number,
  dimensionA = '',
  dimensionB = '',
  notes = ''
): Promise<void> {
  const now = new Date();
  const metricDate = now.toISOString().slice(0, 10);

  await sheetsClient.appendRows(SHEET_NAMES.Metrics, [[
    metricDate,
    metricName,
    String(metricValue),
    dimensionA,
    dimensionB,
    notes,
    now.toISOString()
  ]]);
}
