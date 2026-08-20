import { execFileSync } from 'node:child_process';
import { cv } from '../src/content/cv/cv.ts';
import { renderReadme } from './generate-readme.ts';
import { scanText } from './check-forbidden.ts';

/**
 * Publishes the generated README to the profile repo, whose root README is what
 * github.com/Rourke9001 renders. Deliberately on demand rather than on every
 * push: cv.ts changes a few times a year, and the alternative is a write-scoped
 * PAT held as a secret in a public repo, publishing personal content with no
 * human look at the diff. Staleness is the cheaper failure.
 */
const REPO = 'Rourke9001/Rourke9001';

const md = renderReadme(cv);
const findings = scanText(md, `${REPO}/README.md`);
if (findings.length > 0) {
  console.error('Refusing to publish: never-publish patterns in the generated README.');
  for (const f of findings) console.error(`  ${f.name} -> "${f.match}"`);
  process.exit(1);
}

const sha = (() => {
  try {
    return execFileSync('gh', ['api', `repos/${REPO}/contents/README.md`, '--jq', '.sha'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
})();

const args = [
  'api',
  '-X',
  'PUT',
  `repos/${REPO}/contents/README.md`,
  '-f',
  'message=Update profile README from the typed CV',
  '-f',
  `content=${Buffer.from(md, 'utf8').toString('base64')}`,
  '--jq',
  '.commit.html_url',
];
if (sha) args.push('-f', `sha=${sha}`);

const url = execFileSync('gh', args, { encoding: 'utf8' }).trim();
console.log(`publish-readme: ${sha ? 'updated' : 'created'} ${REPO}/README.md -> ${url}`);
