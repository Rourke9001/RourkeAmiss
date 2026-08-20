import { describe, it, expect } from 'vitest';
import { cv } from '../../src/content/cv/cv';
import { formatDelta } from '../../src/lib/metrics';

describe('cv data', () => {
  it('carries the agreed header facts', () => {
    expect(cv.name).toBe('Rourke Amiss');
    expect(cv.location).toBe('Johannesburg, South Africa');
    expect(cv.email).toBe('rourke9001@gmail.com');
    expect(cv.linkedin).toBe('https://www.linkedin.com/in/rourke-silva-amiss-73b983a7/');
  });

  it('never uses the word Senior', () => {
    expect(JSON.stringify(cv)).not.toMatch(/senior/i);
  });

  it('never contains the phone number', () => {
    expect(JSON.stringify(cv)).not.toMatch(/(?:\+?27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/);
  });

  it('leads with at least three headline metrics', () => {
    expect(cv.headlineMetrics.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every headline metric a distinct from and to', () => {
    for (const m of cv.headlineMetrics) {
      expect(m.from).not.toBe(m.to);
    }
  });

  it('states a delta that matches its own from and to', () => {
    for (const m of cv.headlineMetrics) {
      expect(m.delta).toBe(formatDelta(m.from, m.to));
    }
  });
});
