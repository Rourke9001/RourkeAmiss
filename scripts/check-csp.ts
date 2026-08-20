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

import { pathToFileURL } from 'node:url';

/**
 * True only when this file is the entry point. Compares module URLs rather
 * than matching the filename: an `endsWith('check-csp.ts')` test silently
 * stops matching if the file is renamed or precompiled to .js, and the block
 * it guards is the one that fails the deploy — so that miss turns the gate
 * green while scanning nothing, which is the failure it exists to prevent.
 */
function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

export interface CspFinding {
  page: string;
  kind:
    | 'missing-meta'
    | 'uncovered-script'
    | 'uncovered-style'
    | 'style-attribute'
    | 'script-before-meta';
  detail: string;
}

/**
 * Inline <style> blocks that Astro emits into <head> currently precede the meta
 * it appends at the end of <head>, so they are outside the policy. That is
 * Astro's ordering and not ours to change, and an injected style on a site with
 * no user content is a far smaller thing than an injected script. The count is
 * reported so a change is visible; scripts in that position are a hard failure.
 */
export function stylesBeforeMeta(html: string): number {
  const meta = /<meta http-equiv="content-security-policy"/i.exec(html);
  if (!meta) return 0;
  return [...html.matchAll(/<style[^>]*>/gi)].filter((m) => m.index! < meta.index!).length;
}

const sha256 = (body: string) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;

/**
 * Matches the directive as a whole token, not as a substring. `indexOf` would
 * let `script-src-elem` shadow `script-src` and read hashes out of the wrong
 * directive — which can fail either way round, and the way that passes wrongly
 * is the one that ships a broken page.
 */
function hashesFor(meta: string, directive: string): Set<string> {
  const m = new RegExp(String.raw`(?:^|;)\s*` + directive + String.raw`\s+([^;]*)`).exec(meta);
  if (!m) return new Set();
  return new Set([...m[1].matchAll(/'(sha256-[^']+)'/g)].map((h) => h[1]));
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
    // Order matters as much as coverage. A hash on a script the parser reached
    // before the meta is worthless — the script has already run unpoliced —
    // and a coverage-only check reports that page as clean.
    if (m.index! < meta.index!)
      findings.push({ page, kind: 'script-before-meta', detail: body.slice(0, 70) });
    if (!scriptHashes.has(sha256(body)))
      findings.push({ page, kind: 'uncovered-script', detail: body.slice(0, 70) });
  }

  for (const m of html.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi)) {
    const body = m[2];
    if (body.trim() === '') continue;
    if (!styleHashes.has(sha256(body)))
      findings.push({ page, kind: 'uncovered-style', detail: body.slice(0, 70) });
  }

  // Both quote styles: a hash can never whitelist a style attribute, so any
  // of them is a blocked bar or a blocked layout waiting to happen.
  for (const m of html.matchAll(/\sstyle=("([^"]*)"|'([^']*)')/g)) {
    findings.push({ page, kind: 'style-attribute', detail: (m[2] ?? m[3]).slice(0, 70) });
  }

  return findings;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e: string) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Guarded on direct invocation, not merely on an argument being present: the
// missing-argument case must FAIL rather than no-op, and a bare `if (argv[2])`
// cannot tell "run with no argument" from "imported by a test".
if (isDirectInvocation()) {
  const root = process.argv[2];
  if (!root) {
    console.error('check-csp: no directory given. Usage: check-csp.ts <dir>');
    process.exit(1);
  }

  const pages = walk(root).filter((f) => f.endsWith('.html'));
  // Scanning nothing is not the same as finding nothing. This runs immediately
  // before the deploy publishes, so a wrong path or an empty build must fail
  // rather than report success over zero pages.
  if (pages.length === 0) {
    console.error(`check-csp: no HTML found under ${root} — refusing to report clean.`);
    process.exit(1);
  }

  const findings = pages.flatMap((f) => checkPage(readFileSync(f, 'utf8'), f));
  if (findings.length > 0) {
    console.error('CSP would block content in the built output:');
    for (const f of findings) console.error(`  ${f.page}: ${f.kind} -> ${f.detail}`);
    process.exit(1);
  }

  const early = pages.reduce((n, f) => n + stylesBeforeMeta(readFileSync(f, 'utf8')), 0);
  console.log(
    `check-csp: clean (${pages.length} pages, every inline script and style hashed, ` +
      `no inline script precedes the meta; ${early} inline styles do)`,
  );
}
