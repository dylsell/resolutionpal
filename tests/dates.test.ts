import { describe, expect, it } from 'vitest';
import { addDays, formatDate, localDate, nextJanuaryFirst } from '../lib/dates';

describe('calendar dates stay coherent across a resolution', () => {
  it('uses local calendar dates rather than UTC conversion', () => {
    expect(localDate(new Date(2026, 10, 1, 23, 59))).toBe('2026-11-01');
    expect(formatDate('2026-11-01')).toBe('November 1, 2026');
  });
  it('handles year boundaries, leap years and DST without elapsed-hour arithmetic', () => {
    expect(addDays('2026-12-29', 6)).toBe('2027-01-04');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays('2027-01-01', 90)).toBe('2027-04-01');
  });
  it('offers a future New Year without a hardcoded year', () => {
    expect(nextJanuaryFirst(new Date(2026, 10, 1))).toBe('2027-01-01');
    expect(nextJanuaryFirst(new Date(2028, 11, 31))).toBe('2029-01-01');
  });
});
