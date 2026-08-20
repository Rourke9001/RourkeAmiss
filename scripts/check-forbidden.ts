import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const roots = process.argv.slice(2);
if (roots.length > 0) {
  const files = roots.flatMap((root) =>
    (statSync(root).isDirectory() ? walk(root) : [root]).filter((f) =>
      /\.(html|js|css|json|txt|xml|md)$/.test(f),
    ),
  );
  const findings = files.flatMap((f) => scanText(readFileSync(f, 'utf8'), f));
  if (findings.length > 0) {
    console.error('Never-publish patterns found in published output:');
    for (const f of findings) console.error(`  ${f.source}: ${f.name} -> "${f.match}"`);
    process.exit(1);
  }
  console.log(`check-forbidden: clean (${files.length} files scanned)`);
}
