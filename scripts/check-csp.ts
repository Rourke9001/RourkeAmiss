/**
 * Verifies that every inline script and style in the built output is covered by
 * a hash in its own page's Content-Security-Policy, and that no style attribute
 * survives anywhere.
 *
 * This exists because the failure it catches is invisible in the build and in
 * the unit suite: a page whose inline scripts are not hashed still builds, still
 * passes every test, and still looks correct in `astro preview` — and then ships
 * a site whose form never hydrates and whose metric bars never draw, because the
 * browser silently refuses to run them. It has caught that exact defect once.
 *
 * Style attributes are checked separately because a hash can never whitelist
 * one: hashes do not apply to attributes, and CSP3 ignores 'unsafe-inline' as
 * soon as any hash is present in the directive.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface CspFinding {
  page: string;
  kind: 'missing-meta' | 'uncovered-script' | 'uncovered-style' | 'style-attribute';
  detail: string;
}

const sha256 = (body: string) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;

function hashesFor(meta: string, directive: string): Set<string> {
  const at = meta.indexOf(directive);
  if (at === -1) return new Set();
  const part = meta.slice(at).split(';')[0];
  return new Set([...part.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));
}

export function checkPage(html: string, page: string): CspFinding[] {
  const findings: CspFinding[] = [];
  const meta = /<meta http-equiv="content-security-policy" content="([^"]*)"/i.exec(html);
  if (!meta) return [{ page, kind: 'missing-meta', detail: 'no <meta> CSP on the page' }];

  const scriptHashes = hashesFor(meta[1], 'script-src');
  const styleHashes = hashesFor(meta[1], 'style-src');

  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attrs, body] = m;
    if (/ld\+json/i.test(attrs) || body.trim() === '') continue;
    if (!scriptHashes.has(sha256(body)))
      findings.push({ page, kind: 'uncovered-script', detail: body.slice(0, 70) });
  }

  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const body = m[2];
    if (body.trim() === '') continue;
    if (!styleHashes.has(sha256(body)))
      findings.push({ page, kind: 'uncovered-style', detail: body.slice(0, 70) });
  }

  for (const m of html.matchAll(/\sstyle="([^"]*)"/g)) {
    findings.push({ page, kind: 'style-attribute', detail: m[1].slice(0, 70) });
  }

  return findings;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (process.argv[2]) {
  const pages = walk(process.argv[2]).filter((f) => f.endsWith('.html'));
  const findings = pages.flatMap((f) => checkPage(readFileSync(f, 'utf8'), f));
  if (findings.length > 0) {
    console.error('CSP would block content in the built output:');
    for (const f of findings) console.error(`  ${f.page}: ${f.kind} -> ${f.detail}`);
    process.exit(1);
  }
  console.log(`check-csp: clean (${pages.length} pages, every inline script and style hashed)`);
}
