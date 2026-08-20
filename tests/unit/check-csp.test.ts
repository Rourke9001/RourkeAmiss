import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { checkPage, stylesBeforeMeta } from '../../scripts/check-csp';

const sha = (body: string) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
const page = (meta: string, body: string) =>
  `<html><head><meta http-equiv="content-security-policy" content="${meta}"></head><body>${body}</body></html>`;

describe('checkPage', () => {
  it('passes a page whose inline script is hashed', () => {
    const script = 'console.log(1)';
    const html = page(`script-src 'self' '${sha(script)}'; style-src 'self'`, `<script>${script}</script>`);
    expect(checkPage(html, 'a.html')).toEqual([]);
  });

  it('flags an inline script with no matching hash', () => {
    const html = page("script-src 'self'; style-src 'self'", '<script>alert(1)</script>');
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['uncovered-script']);
  });

  it('flags an inline style with no matching hash', () => {
    const html = page("script-src 'self'; style-src 'self'", '<style>.a{color:red}</style>');
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['uncovered-style']);
  });

  it('flags a style attribute even when style-src carries hashes', () => {
    const html = page("script-src 'self'; style-src 'self' 'sha256-x'", '<div style="width: 50%"></div>');
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['style-attribute']);
  });

  it('ignores JSON-LD, which is data and never executed', () => {
    const html = page("script-src 'self'; style-src 'self'", '<script type="application/ld+json">{"a":1}</script>');
    expect(checkPage(html, 'a.html')).toEqual([]);
  });

  it('ignores external scripts and stylesheets, which style-src self already covers', () => {
    const html = page("script-src 'self'; style-src 'self'", '<script src="/a.js"></script><link rel="stylesheet" href="/a.css">');
    expect(checkPage(html, 'a.html')).toEqual([]);
  });

  it('flags an inline script that the parser reaches before the meta', () => {
    const script = 'console.log(1)';
    // Hashed, but positioned ahead of the policy that carries the hash — so it
    // has already run by the time the browser reads the meta. A coverage-only
    // check calls this page clean, which is the hole this closes.
    const html =
      `<html><head><script>${script}</script>` +
      `<meta http-equiv="content-security-policy" content="script-src 'self' '${sha(script)}'; style-src 'self'">` +
      `</head><body></body></html>`;
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['script-before-meta']);
  });

  it('counts inline styles that precede the meta without failing on them', () => {
    const html =
      `<html><head><style>.a{color:red}</style><style>.b{color:blue}</style>` +
      `<meta http-equiv="content-security-policy" content="script-src 'self'; style-src 'self'">` +
      `</head><body></body></html>`;
    expect(stylesBeforeMeta(html)).toBe(2);
  });

  it('reports a page with no CSP at all', () => {
    expect(checkPage('<html><head></head><body></body></html>', 'a.html').map((f) => f.kind)).toEqual([
      'missing-meta',
    ]);
  });

  it('does not let a longer directive name shadow the one being read', () => {
    const script = 'console.log(1)';
    // script-src-elem comes first and carries the hash; script-src does not.
    // A substring match would read the wrong pool and wrongly pass.
    const html = page(
      `script-src-elem 'self' '${sha(script)}'; script-src 'self'; style-src 'self'`,
      `<script>${script}</script>`,
    );
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['uncovered-script']);
  });

  it('flags a single-quoted style attribute too', () => {
    const html = page("script-src 'self'; style-src 'self' 'sha256-x'", "<div style='width: 50%'></div>");
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['style-attribute']);
  });

  it('does not confuse the style-src hashes with the script-src ones', () => {
    const script = 'console.log(1)';
    const html = page(`script-src 'self'; style-src 'self' '${sha(script)}'`, `<script>${script}</script>`);
    expect(checkPage(html, 'a.html').map((f) => f.kind)).toEqual(['uncovered-script']);
  });
});
