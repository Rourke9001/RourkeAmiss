import { describe, it, expect } from 'vitest';
import { scanText } from '../../scripts/check-forbidden';

describe('scanText', () => {
  it('catches a ticket identifier', () => {
    expect(scanText('fixed in ABCD-1234 last week', 'a.html')).toHaveLength(1);
  });
  it('catches a South African mobile number in any spacing', () => {
    expect(scanText('call +27 82 000 0000', 'a.html')).toHaveLength(1);
    expect(scanText('call +27820000000', 'a.html')).toHaveLength(1);
    expect(scanText('call 082 000 0000', 'a.html')).toHaveLength(1);
  });
  it('catches the word Senior', () => {
    expect(scanText('Senior Software Engineer', 'a.html')).toHaveLength(1);
  });
  it('catches a Windows or POSIX source path', () => {
    expect(scanText('see src/app/modules/thing/index.ts', 'a.html')).toHaveLength(1);
  });
  it('passes clean marketing copy', () => {
    expect(scanText('Cut the cold type-check from 177s to 36.6s.', 'a.html')).toHaveLength(0);
  });
  it('does not flag an ordinary hyphenated capital word', () => {
    expect(scanText('MUI-v4 was retired', 'a.html')).toHaveLength(0);
  });
});
