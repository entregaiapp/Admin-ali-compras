import { describe, expect, it } from 'vitest';
import {
  buildSalesChartData,
  isValidDateInput
} from './salesChartData';

describe('sales chart data', () => {
  it('rejects empty and impossible date input values', () => {
    expect(isValidDateInput('')).toBe(false);
    expect(isValidDateInput('2026-02-30')).toBe(false);
    expect(isValidDateInput('2026-07-25')).toBe(true);
  });

  it('does not crash while a date field has a transient invalid value', () => {
    expect(() => buildSalesChartData(
      [{ data: '2026-07-25', vendas: 50 }],
      '',
      '2026-07-25'
    )).not.toThrow();
    expect(buildSalesChartData([], '', '2026-07-25')).toEqual([]);
  });

  it('ignores dated points outside the selected period', () => {
    const result = buildSalesChartData([
      { data: '2026-07-24', vendas: 100 },
      { data: '2026-07-25', vendas: 50 },
      { data: '2026-07-26', vendas: 200 },
    ], '2026-07-25', '2026-07-25');

    expect(result).toHaveLength(1);
    expect(result[0].vendas).toBe(50);
  });

  it('groups valid sales values by the selected day', () => {
    const result = buildSalesChartData([
      { data: '2026-07-25', vendas: '10,50' },
      { data: '2026-07-25', valor: 4.5 },
      { data: '2026-07-26', total: 20 },
    ], '2026-07-25', '2026-07-26');

    expect(result.map(point => point.vendas)).toEqual([15, 20]);
  });
});
