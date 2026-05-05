import { describe, it, expect } from 'vitest';
import { normalizeDate, parseAmount, sanitizeDescription } from './csv-parser';

// ---------------------------------------------------------------------------
// normalizeDate
// ---------------------------------------------------------------------------

describe('normalizeDate', () => {
  it('parses YYYY-MM-DD', () => {
    expect(normalizeDate('2026-01-15')).toBe('2026-01-15');
  });

  it('pads single-digit month and day in YYYY-M-D', () => {
    expect(normalizeDate('2026-1-5')).toBe('2026-01-05');
  });

  it('parses MM/DD/YYYY', () => {
    expect(normalizeDate('01/15/2026')).toBe('2026-01-15');
  });

  it('parses M/D/YYYY (no padding)', () => {
    expect(normalizeDate('3/7/2024')).toBe('2024-03-07');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeDate('  2026-04-01  ')).toBe('2026-04-01');
  });

  it('returns null for empty string', () => {
    expect(normalizeDate('')).toBeNull();
  });

  it('returns null for unrecognized format (DD-MM-YYYY)', () => {
    expect(normalizeDate('15-01-2026')).toBeNull();
  });

  it('returns null for invalid month 13', () => {
    expect(normalizeDate('2026-13-01')).toBeNull();
  });

  it('returns null for invalid day 32', () => {
    expect(normalizeDate('2026-01-32')).toBeNull();
  });

  it('returns null for Feb 30 (calendar invalid)', () => {
    expect(normalizeDate('2026-02-30')).toBeNull();
  });

  it('returns null for year out of range (1800)', () => {
    expect(normalizeDate('1800-01-01')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseAmount
// ---------------------------------------------------------------------------

describe('parseAmount', () => {
  it('parses a plain number', () => {
    expect(parseAmount('42.50')).toBe(42.5);
  });

  it('strips leading $ sign', () => {
    expect(parseAmount('$19.99')).toBe(19.99);
  });

  it('strips commas from thousands', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });

  it('returns absolute value for negative amounts', () => {
    expect(parseAmount('-99.00')).toBe(99);
  });

  it('rounds to 2 decimal places', () => {
    expect(parseAmount('10.999')).toBe(11);
  });

  it('returns null for empty string', () => {
    expect(parseAmount('')).toBeNull();
  });

  it('returns null for non-numeric text', () => {
    expect(parseAmount('N/A')).toBeNull();
  });

  it('strips whitespace', () => {
    expect(parseAmount('  50.00  ')).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// sanitizeDescription
// ---------------------------------------------------------------------------

describe('sanitizeDescription', () => {
  it('passes through a normal description unchanged', () => {
    expect(sanitizeDescription('WHOLE FOODS MARKET')).toBe('WHOLE FOODS MARKET');
  });

  it('strips leading = (CSV formula injection)', () => {
    expect(sanitizeDescription('=CMD|"/c calc"')).toBe('CMD|"/c calc"');
  });

  it('strips leading + sign', () => {
    expect(sanitizeDescription('+1-800-FRAUD')).toBe('1-800-FRAUD');
  });

  it('strips leading - sign', () => {
    expect(sanitizeDescription('-DROP TABLE users')).toBe('DROP TABLE users');
  });

  it('strips leading @ sign', () => {
    expect(sanitizeDescription('@SUM(A1:A10)')).toBe('SUM(A1:A10)');
  });

  it('strips multiple leading injection chars', () => {
    expect(sanitizeDescription('==+ATTACK')).toBe('ATTACK');
  });

  it('trims whitespace after stripping', () => {
    expect(sanitizeDescription('  NORMAL DESC  ')).toBe('NORMAL DESC');
  });

  it('preserves a hyphen mid-string', () => {
    expect(sanitizeDescription('LYFT RIDE APR-30')).toBe('LYFT RIDE APR-30');
  });
});
