import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/work';
const FORBIDDEN = [
  { name: 'ticket identifier', re: /\b[A-Z]{2,10}-\d{3,6}\b/ },
  { name: 'phone number', re: /(?:\+?27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/ },
  { name: 'the word Senior', re: /\bsenior\b/i },
];

describe('case study content', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.mdx'));

  it('has at least one case study', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s contains nothing that must never be published', (file) => {
    const text = readFileSync(join(DIR, file), 'utf8');
    for (const { name, re } of FORBIDDEN) {
      expect(text, `${file} contains a ${name}`).not.toMatch(re);
    }
  });
});
