import { describe, it, expect } from 'vitest';
import { percentChange, barFraction, formatFigure, formatDelta } from '../../src/lib/metrics';

describe('percentChange', () => {
  it('reports a reduction as negative', () => {
    expect(percentChange(177, 36.6)).toBe(-79);
  });
  it('reports an increase as positive', () => {
    expect(percentChange(57, 328)).toBe(475);
  });
  it('reports elimination as -100', () => {
    expect(percentChange(264, 0)).toBe(-100);
  });
  it('throws when the baseline is zero', () => {
    expect(() => percentChange(0, 5)).toThrow();
  });
});

describe('barFraction', () => {
  it('is the remaining proportion', () => {
    expect(barFraction(1730, 1066)).toBeCloseTo(0.616, 3);
  });
  it('is zero when the value is eliminated', () => {
    expect(barFraction(264, 0)).toBe(0);
  });
  it('clamps growth to one', () => {
    expect(barFraction(57, 328)).toBe(1);
  });
});

describe('formatFigure', () => {
  it('groups thousands', () => {
    expect(formatFigure(1730, '')).toBe('1,730');
  });
  it('appends the unit verbatim', () => {
    expect(formatFigure(36.6, 's')).toBe('36.6s');
    expect(formatFigure(3.07, ' GB')).toBe('3.07 GB');
  });
  it('keeps zero as zero', () => {
    expect(formatFigure(0, '')).toBe('0');
  });
});

describe('formatDelta', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(formatDelta(177, 36.6)).toBe('−79%');
  });
  it('prefixes growth with a plus', () => {
    expect(formatDelta(57, 328)).toBe('+475%');
  });
});
