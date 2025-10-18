import { describe, it, expect } from 'vitest';
import { formatWeekEndDate, getWeekDateRange, getWeekDates } from '../../shared/utils/seasonalCalculations';

describe('week date range utilities', () => {
  it('calculates week 1 range for 2025', () => {
    const { start, end } = getWeekDateRange(2025, 1);
    expect(start.getFullYear()).toBe(2024);
    expect(start.getMonth()).toBe(11); // December // January
    expect(start.getDate()).toBe(29);
    expect(end.getFullYear()).toBe(2025);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(4);
  });

  it('formats week end date in MM/DD/YY format', () => {
    expect(formatWeekEndDate(2025, 5)).toBe('02/01/25');
  });

  it('returns seven dates for a week', () => {
    const dates = getWeekDates(2025, 12);
    expect(dates).toHaveLength(7);
    expect(dates[0].getDay()).toBe(0); // Sunday
    expect(dates[6].getDay()).toBe(6); // Saturday
  });
});

