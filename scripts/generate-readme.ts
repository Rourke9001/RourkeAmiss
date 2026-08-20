import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Cv } from '../src/content/cv/types.ts';
import { cv } from '../src/content/cv/cv.ts';
import { formatFigure } from '../src/lib/metrics.ts';
import { scanText } from './check-forbidden.ts';

const SITE = 'rourkeamiss.co.za';

/**
 * The domain is registered and pointed at Static Web Apps in Task 15, which is
 * deliberately last. Until then the README names the site in plain text rather
 * than linking it, so the profile never carries a dead link. Flip this when the
 * deployment lands and regenerate.
 */
const SITE_LIVE = false;

function sentences(text: string, count: number): string {
  const parts = text.match(/[^.]+\./g) ?? [text];
  return parts
    .slice(0, count)
    .map((p) => p.trim())
    .join(' ');
}

function metricsTable(cv: Cv): string {
  const rows = cv.headlineMetrics.map(
    (m) =>
      `| ${m.label} | ${formatFigure(m.from, m.unit)} | ${formatFigure(m.to, m.unit)} | ${m.delta} |`,
  );
  return ['| Measure | Before | After | Change |', '| --- | ---: | ---: | ---: |', ...rows].join(
    '\n',
  );
}

function working(cv: Cv): string {
  const current = cv.roles.filter((r) => /present/i.test(r.period));
  const lines = [
    ...current.map((r) => `- **${r.org} — ${r.title}** · ${r.period}`),
    ...cv.projects.map((p) => {
      const [name] = p.name.split(' — ');
      const links = (p.links ?? []).map((l) => `[${l.label}](${l.href})`).join(' · ');
      return `- **${name}** · ${p.period}${links ? ` · ${links}` : ''}`;
    }),
  ];
  return lines.join('\n');
}

export function renderReadme(cv: Cv): string {
  const site = SITE_LIVE ? `[${SITE}](https://${SITE})` : `${SITE} — going live shortly`;

  return `# ${cv.name}

**${cv.positionLine}** · ${cv.location} · ${cv.citizenship}

${sentences(cv.profile, 2)}

## Measured, not asserted

${metricsTable(cv)}

Every figure above is a before and after I measured myself. How each one was
measured is published alongside it, on the site rather than in a bullet point.

## What I am working on

${working(cv)}

## Elsewhere

- Site — ${site}
- Email — [${cv.email}](mailto:${cv.email})
- LinkedIn — [${cv.linkedin.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}](${cv.linkedin})

<sub>Generated from the typed CV that also feeds the site — one source, no drift.</sub>
`;
}

if (process.argv[1]?.endsWith('generate-readme.ts')) {
  const md = renderReadme(cv);
  const findings = scanText(md, 'profile/README.md');
  if (findings.length > 0) {
    console.error('Refusing to write: never-publish patterns in the generated README.');
    for (const f of findings) console.error(`  ${f.name} -> "${f.match}"`);
    process.exit(1);
  }
  const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const out = join(repoRoot, 'profile', 'README.md');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, md, 'utf8');
  console.log(`generate-readme: wrote profile/README.md (${md.length} bytes, guard clean)`);
}
