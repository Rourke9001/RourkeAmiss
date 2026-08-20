import { describe, it, expect } from 'vitest';
import { renderReadme } from '../../scripts/generate-readme';
import { scanText } from '../../scripts/check-forbidden';
import { cv } from '../../src/content/cv/cv';

describe('renderReadme', () => {
  const md = renderReadme(cv);

  it('opens with the name as an H1', () => {
    expect(md.split('\n')[0]).toBe('# Rourke Amiss');
  });
  it('states the position line', () => {
    expect(md).toContain(cv.positionLine);
  });
  it('includes every headline metric', () => {
    for (const m of cv.headlineMetrics) expect(md).toContain(m.label);
  });
  it('links the site', () => {
    expect(md).toContain('rourkeamiss.co.za');
  });
  it('never says Senior', () => {
    expect(md).not.toMatch(/\bsenior\b/i);
  });
  it('never leaks the phone number', () => {
    expect(md).not.toMatch(/(?:\+?27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/);
  });
  it('passes the never-publish guard outright', () => {
    expect(scanText(md, 'profile/README.md')).toEqual([]);
  });
});
