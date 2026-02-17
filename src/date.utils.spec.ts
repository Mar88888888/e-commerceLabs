import { isSameDate } from './date.utils';

describe('isSameDate', () => {
  it('should return true for same dates', () => {
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2024-01-15T20:00:00Z');

    expect(isSameDate(date1, date2)).toBe(true);
  });

  it('should return false for different days', () => {
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2024-01-16T10:00:00Z');

    expect(isSameDate(date1, date2)).toBe(false);
  });

  it('should return false for different months', () => {
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2024-02-15T10:00:00Z');

    expect(isSameDate(date1, date2)).toBe(false);
  });

  it('should return false for different years', () => {
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2025-01-15T10:00:00Z');

    expect(isSameDate(date1, date2)).toBe(false);
  });
});
