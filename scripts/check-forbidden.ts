import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { pathToFileURL } from 'node:url';

/**
 * True only when this file is the entry point. Compares module URLs rather
 * than matching the filename: an `endsWith('check-forbidden.ts')` test silently
 * stops matching if the file is renamed or precompiled to .js, and the block
 * it guards is the one that fails the deploy — so that miss turns the gate
 * green while scanning nothing, which is the failure it exists to prevent.
 */
function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

export const FORBIDDEN = [
  { name: 'ticket identifier', pattern: /\b[A-Z]{2,10}-\d{3,6}\b/g },
  { name: 'phone number', pattern: /(?:\+?27|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g },
  { name: 'the word Senior', pattern: /\bsenior\b/gi },
  {
    name: 'source path',
    pattern: /\b(?:src|apps|libs|packages)\/[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|jsx|java|go|py)\b/g,
  },
];

export function scanText(text: string, source: string) {
  const findings: { name: string; source: string; match: string }[] = [];
  for (const { name, pattern } of FORBIDDEN) {
    for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
      findings.push({ name, source, match: m[0] });
    }
  }
  return findings;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((e: string) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Guarded on direct invocation rather than on an argument being present, and
// refusing both empty cases, for the same reason as check-csp.ts: this gates
// the deploy, so a wrong path or an unbuilt dist must fail rather than report
// clean over nothing. A bare `if (roots.length)` cannot tell "run with no
// argument" from "imported by a test", and silently passed both.
if (isDirectInvocation()) {
  const roots = process.argv.slice(2);
  if (roots.length === 0) {
    console.error('check-forbidden: no path given. Usage: check-forbidden.ts <dir|file>...');
    process.exit(1);
  }

  const files = roots.flatMap((root: string) =>
    (statSync(root).isDirectory() ? walk(root) : [root]).filter((f) =>
      /\.(html|js|css|json|txt|xml|md)$/.test(f),
    ),
  );

  if (files.length === 0) {
    console.error(
      `check-forbidden: no scannable files under ${roots.join(', ')} — refusing to report clean.`,
    );
    process.exit(1);
  }

  const findings = files.flatMap((f: string) => scanText(readFileSync(f, 'utf8'), f));
  if (findings.length > 0) {
    console.error('Never-publish patterns found in published output:');
    for (const f of findings) console.error(`  ${f.source}: ${f.name} -> "${f.match}"`);
    process.exit(1);
  }
  console.log(`check-forbidden: clean (${files.length} files scanned)`);
}
