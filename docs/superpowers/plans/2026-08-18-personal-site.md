# Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a living CV at rourkeamiss.co.za — a static Astro site whose every claim is a measured before/after with visible provenance, plus a request-CV form that emails Rourke rather than serving a file.

**Architecture:** One typed `cv.ts` module is the single source of truth, feeding the landing page, the print-tuned `/cv` page, the generated GitHub profile README and JSON-LD. Case studies are MDX in an Astro content collection validated by Zod. The only interactive element is a React island that discloses how each figure was measured. A single HTTP-triggered managed Azure Function backs the request form; it sends through Azure Communication Services to one hardcoded recipient.

**Tech Stack:** Astro 7.2.x, @astrojs/react 6.x, React 19, TypeScript, Zod (bundled as `astro/zod`), Vitest, Playwright, @axe-core/playwright, @azure/functions 4.x, @azure/communication-email 1.1.0, Azure Static Web Apps (Free plan).

**Spec:** `docs/superpowers/specs/2026-08-18-personal-site-design.md`

## Global Constraints

- **Azure Static Web Apps stays on the Free plan.** Never upgrade to Standard. Overage bandwidth is `Unavailable` on Free, which is what makes a surprise bill structurally impossible.
- **`apiRuntime` is `node:22`.** Verified supported with no end-of-support date. Local Node is v24; do not assume the managed runtime matches it.
- **No CV file may enter the repository.** `.gitignore` blocks `*.pdf`, `*.docx`, `*.doc`. Never add an exception.
- **Never publish:** ticket identifiers, employer file paths, employer store/module/repository names, customer references (network or substation identifiers, client names). This applies to site content, MDX bodies, code comments, and commit messages.
- **The word "Senior" appears nowhere** on the site or in the generated README.
- **The phone number `+27 82 000 0000` appears nowhere** in this repository or the built output.
- **The Agnify 67% figure never gets a `verifiedBy` value.** It is carried over from the previous CV and was not independently verified.
- **Header facts, verbatim:** `Johannesburg, South Africa` · `Portuguese citizen · EU work authorisation` · `rourke9001@gmail.com` · `github.com/Rourke9001` · `linkedin.com/in/rourke-silva-amiss-73b983a7`
- **Design tokens** are those in spec §5 and are not invented per component.
- **Motion budget:** delta bars draw once on scroll-in. Nothing else animates. `prefers-reduced-motion: reduce` disables it.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/content/cv/types.ts` | Type definitions for all CV data. No data, no logic. |
| `src/content/cv/cv.ts` | The CV data itself. No logic. |
| `src/lib/metrics.ts` | Delta arithmetic and figure formatting. Pure functions. |
| `src/content.config.ts` | Astro collection definitions and Zod schemas. |
| `src/styles/tokens.css` | Colour and type tokens, light + dark. |
| `src/styles/base.css` | Element defaults, the hairline grid, print rules. |
| `src/components/Metric.astro` | One before/after ledger row. |
| `src/components/Provenance.tsx` | React island: discloses `verifiedBy`. |
| `src/components/RequestCv.tsx` | React island: the request form. |
| `src/layouts/Base.astro` | Document shell, head, JSON-LD, nav, footer. |
| `src/pages/index.astro` | Landing. |
| `src/pages/cv.astro` | Full CV, print-tuned. |
| `src/pages/work/index.astro` | Case study index. |
| `src/pages/work/[...slug].astro` | Case study detail. |
| `api/src/validate.ts` | Request schema and validation. Pure. |
| `api/src/rateLimit.ts` | Per-IP rate limiter. Pure, injectable clock. |
| `api/src/handler.ts` | Request logic. Pure — email transport injected. |
| `api/src/email.ts` | ACS transport. The only impure part of the API. |
| `api/src/functions/requestCv.ts` | Azure Functions binding. Thin wiring only. |
| `scripts/generate-readme.ts` | Renders the GitHub profile README from `cv.ts`. |
| `scripts/check-forbidden.ts` | Scans built output for never-publish patterns. |

---

## Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`
- Modify: `.gitignore` (already present — verify only)

**Interfaces:**
- Consumes: nothing
- Produces: a building Astro project; `npm run build` emits to `dist/`

- [ ] **Step 1: Scaffold with the official CLI**

Run in the repository root (the directory already contains `.git`, `.gitignore` and `docs/`):

```bash
npm create astro@latest . -- --template minimal --install --no-git --typescript strict --skip-houston
```

Answer "Yes" if it warns the directory is not empty. It must not delete `docs/` or `.gitignore`.

- [ ] **Step 2: Verify the scaffold builds**

```bash
npm run build
```

Expected: build succeeds, `dist/index.html` exists.

- [ ] **Step 3: Add the React integration**

```bash
npx astro add react --yes
```

- [ ] **Step 4: Record the real versions**

```bash
node -p "const p=require('./package.json'); JSON.stringify({...p.dependencies,...p.devDependencies},null,2)"
```

Paste the output into the commit message. Later tasks assume Astro 7.2.x and React 19; if the CLI installed something materially different, stop and report before continuing.

- [ ] **Step 5: Pin the front-end Node version**

Add to `package.json`:

```json
"engines": {
  "node": ">=20.0.0"
}
```

- [ ] **Step 6: Verify the build still passes**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project with React integration"
```

---

## Task 2: Design tokens, fonts and base layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Base.astro`
- Create: `public/fonts/` (font files)
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: Task 1's project
- Produces: `Base.astro` accepting props `{ title: string; description: string; page?: 'home' | 'cv' | 'work' }`

- [ ] **Step 1: Download and self-host the fonts**

Fetch the WOFF2 files for IBM Plex Sans (400, 500, 600), IBM Plex Mono (400, 500) and Source Serif 4 (400, 600, 700 — variable is fine) into `public/fonts/`. Both families are OFL-licensed; include the licence text at `public/fonts/OFL.txt`.

Do **not** link to fonts.googleapis.com. The spec requires self-hosting so the CSP stays strict and there is no layout shift.

- [ ] **Step 2: Write the tokens**

Create `src/styles/tokens.css`. Light is the base; dark is redefined twice so the OS setting and an explicit choice both win:

```css
:root {
  --paper: #FBFBF9;
  --ink: #14171C;
  --ink-2: #3F4750;
  --ink-3: #78828D;
  --rule: #DFE3E6;
  --rule-soft: #EDF0F2;
  --accent: #1C4E5C;
  --accent-2: #2E6F80;
  --alert: #A4442F;

  --serif: "Source Serif 4", Georgia, "Times New Roman", serif;
  --sans: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #0E1114;
    --ink: #E8ECEF;
    --ink-2: #AEB8C1;
    --ink-3: #78848F;
    --rule: #262D33;
    --rule-soft: #1C2227;
    --accent: #7FBECD;
    --accent-2: #A3D2DE;
    --alert: #E08B72;
  }
}

:root[data-theme="dark"] {
  --paper: #0E1114;
  --ink: #E8ECEF;
  --ink-2: #AEB8C1;
  --ink-3: #78848F;
  --rule: #262D33;
  --rule-soft: #1C2227;
  --accent: #7FBECD;
  --accent-2: #A3D2DE;
  --alert: #E08B72;
}
```

- [ ] **Step 3: Write the base stylesheet**

Create `src/styles/base.css` with `@font-face` declarations pointing at `/fonts/*.woff2` (all `font-display: swap`), a border-box reset, and:

```css
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink-2);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

.sheet {
  max-width: 47rem;
  margin: 0 auto;
  padding: 3.4rem 1.6rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 2.1rem;
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Write the layout**

Create `src/layouts/Base.astro`:

```astro
---
import '../styles/tokens.css';
import '../styles/base.css';
interface Props { title: string; description: string; page?: 'home' | 'cv' | 'work'; }
const { title, description, page = 'home' } = Astro.props;
---
<!doctype html>
<html lang="en-ZA">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preload" href="/fonts/IBMPlexSans-Regular.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <div class="sheet">
      <slot />
    </div>
  </body>
</html>
```

- [ ] **Step 5: Point the index page at the layout**

Replace `src/pages/index.astro` with a minimal page using `Base` so the build exercises it.

- [ ] **Step 6: Verify**

```bash
npm run build
```

Expected: PASS. Confirm `dist/` contains the font files and that the built HTML references `/fonts/`, not `fonts.googleapis.com`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, self-hosted fonts and base layout"
```

---

## Task 3: Content model and CV data

**Files:**
- Create: `src/content/cv/types.ts`, `src/content/cv/cv.ts`
- Test: `tests/unit/cv.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type MetricDirection = 'down-is-good' | 'up-is-good'`
  - `interface Metric { label: string; from: number; to: number; unit: string; delta: string; direction: MetricDirection; verifiedBy?: string }`
  - `interface Role { org: string; title: string; period: string; context?: string; bullets: string[] }`
  - `interface Project { name: string; period: string; context?: string; links?: { label: string; href: string }[]; bullets: string[] }`
  - `interface SkillGroup { label: string; items: string[] }`
  - `interface Credential { what: string; who?: string }`
  - `interface Cv { name; positionLine; location; citizenship; email; github; linkedin; profile; headlineMetrics: Metric[]; roles: Role[]; projects: Project[]; skills: SkillGroup[]; credentials: Credential[] }`
  - `export const cv: Cv`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/cv.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cv } from '../../src/content/cv/cv';

describe('cv data', () => {
  it('carries the agreed header facts', () => {
    expect(cv.name).toBe('Rourke Amiss');
    expect(cv.location).toBe('Johannesburg, South Africa');
    expect(cv.email).toBe('rourke9001@gmail.com');
    expect(cv.linkedin).toBe('https://www.linkedin.com/in/rourke-silva-amiss-73b983a7/');
  });

  it('never uses the word Senior', () => {
    expect(JSON.stringify(cv)).not.toMatch(/senior/i);
  });

  it('never contains the phone number', () => {
    expect(JSON.stringify(cv)).not.toMatch(/82\s*000\s*0000/);
  });

  it('leads with at least three headline metrics', () => {
    expect(cv.headlineMetrics.length).toBeGreaterThanOrEqual(3);
  });

  it('gives every headline metric a distinct from and to', () => {
    for (const m of cv.headlineMetrics) {
      expect(m.from).not.toBe(m.to);
    }
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
npx vitest run tests/unit/cv.test.ts
```

Expected: FAIL — cannot resolve `../../src/content/cv/cv`.

- [ ] **Step 4: Write the types**

Create `src/content/cv/types.ts` with exactly the interfaces listed in **Interfaces** above.

- [ ] **Step 5: Write the data**

Create `src/content/cv/cv.ts`. Transcribe the CV content from the spec's source artifact. Headline metrics:

```ts
import type { Cv } from './types';

export const cv: Cv = {
  name: 'Rourke Amiss',
  positionLine: 'Full-stack Software Engineer',
  location: 'Johannesburg, South Africa',
  citizenship: 'Portuguese citizen · EU work authorisation',
  email: 'rourke9001@gmail.com',
  github: 'https://github.com/Rourke9001',
  linkedin: 'https://www.linkedin.com/in/rourke-silva-amiss-73b983a7/',
  profile:
    'Full-stack engineer, three and a half years, specialising in making large and aging codebases maintainable. I measure the debt, find the root causes, sequence the fix and prove the result held. Frontend-weighted through React and TypeScript at scale, with Java, Spring Boot, Go and Azure work alongside it.',
  headlineMetrics: [
    {
      label: 'Cold type-check',
      from: 177, to: 36.6, unit: 's', delta: '−79%',
      direction: 'down-is-good',
      verifiedBy: 'Type-check traces captured before and after, same machine and same cold-cache conditions.',
    },
    {
      label: 'Application type debt',
      from: 1730, to: 1066, unit: '', delta: '−38%',
      direction: 'down-is-good',
      verifiedBy: 'Full compiler error survey, re-audited three weeks after the remediation sequence completed.',
    },
    {
      label: 'Analytics module errors',
      from: 264, to: 0, unit: '', delta: '−100%',
      direction: 'down-is-good',
      verifiedBy: 'Nine phases, each proven behaviour-preserving against 92 characterization snapshots.',
    },
    {
      label: 'Tests across two modules',
      from: 57, to: 328, unit: '', delta: '+475%',
      direction: 'up-is-good',
      verifiedBy: 'Suite counts before the refactor and after both modules landed.',
    },
  ],
  roles: [ /* Utilifeed, Agnify, IQ Logistica — bullets transcribed from the artifact, anonymised */ ],
  projects: [ /* AmissProj, BAC — transcribed from the artifact */ ],
  skills: [ /* six groups from the artifact */ ],
  credentials: [ /* BSc + three certifications */ ],
};
```

Transcribe every role, project, skill group and credential in full. Anonymisation rules while transcribing:

- Drop `PropAI` — write "a module" instead. It is an employer module name.
- Keep `MUI`, `SxProps`, `tsc --generateTrace`, `ESLint`, `Jenkins`. These are public tools, not internal detail.
- Keep the "7 of 621 source files" ESLint finding; it names no internal thing.
- The Agnify 67% bullet gets **no** `verifiedBy`.

- [ ] **Step 6: Run the tests**

```bash
npx vitest run tests/unit/cv.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add typed CV content model as the single source of truth"
```

---

## Task 4: Delta arithmetic and figure formatting

**Files:**
- Create: `src/lib/metrics.ts`
- Test: `tests/unit/metrics.test.ts`

**Interfaces:**
- Consumes: nothing. These are pure numeric functions and deliberately import no types, which keeps them trivially testable.
- Produces:
  - `percentChange(from: number, to: number): number` — signed, rounded to nearest integer
  - `barFraction(from: number, to: number): number` — `to/from` clamped to `0..1`
  - `formatFigure(value: number, unit: string): string` — locale digits plus the unit appended verbatim
  - `formatDelta(from: number, to: number): string` — e.g. `−79%`, using U+2212 MINUS SIGN

- [ ] **Step 1: Write the failing test**

Create `tests/unit/metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { percentChange, barFraction, formatFigure, formatDelta } from '../../src/lib/metrics';

describe('percentChange', () => {
  it('reports a reduction as negative', () => {
    expect(percentChange(177, 36.6)).toBe(-79);
  });
  it('reports an increase as positive', () => {
    expect(percentChange(57, 328)).toBe(475);
  });
  it('reports elimination as -100', () => {
    expect(percentChange(264, 0)).toBe(-100);
  });
  it('throws when the baseline is zero', () => {
    expect(() => percentChange(0, 5)).toThrow();
  });
});

describe('barFraction', () => {
  it('is the remaining proportion', () => {
    expect(barFraction(1730, 1066)).toBeCloseTo(0.616, 3);
  });
  it('is zero when the value is eliminated', () => {
    expect(barFraction(264, 0)).toBe(0);
  });
  it('clamps growth to one', () => {
    expect(barFraction(57, 328)).toBe(1);
  });
});

describe('formatFigure', () => {
  it('groups thousands', () => {
    expect(formatFigure(1730, '')).toBe('1,730');
  });
  it('appends the unit verbatim', () => {
    expect(formatFigure(36.6, 's')).toBe('36.6s');
    expect(formatFigure(3.07, ' GB')).toBe('3.07 GB');
  });
  it('keeps zero as zero', () => {
    expect(formatFigure(0, '')).toBe('0');
  });
});

describe('formatDelta', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(formatDelta(177, 36.6)).toBe('−79%');
  });
  it('prefixes growth with a plus', () => {
    expect(formatDelta(57, 328)).toBe('+475%');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/metrics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/metrics.ts`:

```ts
export function percentChange(from: number, to: number): number {
  if (from === 0) throw new Error('percentChange: baseline cannot be zero');
  return Math.round(((to - from) / from) * 100);
}

export function barFraction(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.min(1, Math.max(0, to / from));
}

export function formatFigure(value: number, unit: string): string {
  return `${value.toLocaleString('en-GB')}${unit}`;
}

export function formatDelta(from: number, to: number): string {
  const pct = percentChange(from, to);
  return pct < 0 ? `−${Math.abs(pct)}%` : `+${pct}%`;
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/metrics.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Guard the data against the maths**

Append to `tests/unit/cv.test.ts`:

```ts
import { formatDelta } from '../../src/lib/metrics';

it('states a delta that matches its own from and to', () => {
  for (const m of cv.headlineMetrics) {
    expect(m.delta).toBe(formatDelta(m.from, m.to));
  }
});
```

- [ ] **Step 6: Run the full suite**

```bash
npm test
```

Expected: PASS. If a `delta` string disagrees with its numbers, fix the **data**, not the test — that is the bug this test exists to catch.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add delta arithmetic with data consistency guard"
```

---

## Task 5: The Metric ledger row and Provenance island

**Files:**
- Create: `src/components/Metric.astro`, `src/components/Provenance.tsx`
- Test: `tests/unit/provenance.test.tsx`

**Interfaces:**
- Consumes: `Metric`, `barFraction`, `formatFigure`, `formatDelta`
- Produces: `<Metric metric={m} />` (Astro), `<Provenance text={string} label={string} />` (React island)

- [ ] **Step 1: Install React testing dependencies**

```bash
npm install -D @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react
```

`@vitejs/plugin-react` is required by `vitest.config.ts` below. Astro's React integration may already pull it in transitively, but depend on it explicitly rather than relying on hoisting.

Add to `astro.config.mjs` nothing; create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
});
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/provenance.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provenance } from '../../src/components/Provenance';

describe('Provenance', () => {
  it('renders the text so it is present without JavaScript', () => {
    render(<Provenance text="Traces captured before and after." label="Cold type-check" />);
    expect(screen.getByText('Traces captured before and after.')).toBeDefined();
  });

  it('exposes an accessible toggle naming the metric', () => {
    render(<Provenance text="Traces captured." label="Cold type-check" />);
    expect(screen.getByRole('button', { name: /Cold type-check/i })).toBeDefined();
  });

  it('collapses and expands on click', () => {
    render(<Provenance text="Traces captured." label="Cold type-check" />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
npx vitest run tests/unit/provenance.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the island**

Create `src/components/Provenance.tsx`. It starts **expanded** so the text is in the server-rendered HTML and survives with JS disabled:

```tsx
import { useState } from 'react';

export function Provenance({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="provenance">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`How ${label} was measured`}
        onClick={() => setOpen(!open)}
      >
        {open ? 'hide method' : 'how this was measured'}
      </button>
      <p hidden={!open}>{text}</p>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests**

```bash
npx vitest run tests/unit/provenance.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Build the ledger row**

Create `src/components/Metric.astro` rendering one row: label in mono uppercase, `from` figure, a hairline bar whose filled width is `barFraction(from, to) * 100%`, the `to` figure, and the delta. All figures use `font-variant-numeric: tabular-nums` and `font-family: var(--mono)`. Render `<Provenance client:visible />` only when `metric.verifiedBy` is set.

The root element of the row **must carry a `data-metric` attribute** whose value is the metric's `label`. Task 14's end-to-end tests select on it, and it is the stable hook for any later instrumentation.

The bar animates its width once via a CSS transition triggered by an `IntersectionObserver`; guard with `prefers-reduced-motion`.

- [ ] **Step 7: Verify and commit**

```bash
npm test && npm run build
```

Expected: PASS.

```bash
git add -A
git commit -m "feat: add metric ledger row and provenance disclosure island"
```

---

## Task 6: Landing page

**Files:**
- Create: `src/components/Masthead.astro`, `src/components/Entry.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `cv`, `Metric.astro`, `Base.astro`
- Produces: the `/` route

- [ ] **Step 1: Build the masthead**

`src/components/Masthead.astro`: name in Source Serif 4 at `clamp(2.1rem, 1.6rem + 2vw, 2.75rem)` weight 700, position line in mono uppercase with `letter-spacing: 0.13em` in `var(--accent)`, then the contact row (location, citizenship, email, GitHub, LinkedIn) above a `1px solid var(--rule)` top border. **No phone number.**

- [ ] **Step 2: Build the entry component**

`src/components/Entry.astro` renders one role or project: title with the org in `var(--accent)`, period in mono tabular on the right, optional context paragraph in `var(--ink-3)`, then bullets.

- [ ] **Step 3: Assemble the landing page**

`src/pages/index.astro` in this order — evidence before prose, per spec §5:

1. `<Masthead />`
2. The headline metrics ledger — `cv.headlineMetrics.map(m => <Metric metric={m} />)`
3. Profile paragraph
4. Experience — `cv.roles`
5. Projects — `cv.projects`
6. Skills
7. Request-CV section (a placeholder `<section id="request">` for now; Task 10 fills it)

- [ ] **Step 4: Add JSON-LD**

In `Base.astro`, emit a `Person` schema built from `cv` — `name`, `jobTitle`, `email`, `url`, `sameAs: [github, linkedin]`, `address.addressLocality: 'Johannesburg'`.

- [ ] **Step 5: Verify**

```bash
npm run build && npm run preview
```

Open the preview. Check: metrics column-align, dark mode via OS setting, and no horizontal scroll at 320px width.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add landing page leading with the metrics ledger"
```

---

## Task 7: The `/cv` page and print stylesheet

**Files:**
- Create: `src/pages/cv.astro`, `src/styles/print.css`

**Interfaces:**
- Consumes: `cv`, `Entry.astro`, `Masthead.astro`
- Produces: the `/cv` route

- [ ] **Step 1: Build the page**

`src/pages/cv.astro`: the full CV in the standard parser-friendly section order — Profile, Experience, Projects, Skills, Education & Certification. Single column, left aligned, no tables for layout.

- [ ] **Step 2: Write the print stylesheet**

Create `src/styles/print.css`, imported only by `cv.astro`:

```css
@media print {
  :root {
    --paper: #FFFFFF; --ink: #000000; --ink-2: #1F2428; --ink-3: #5A6169;
    --rule: #C9CFD4; --rule-soft: #F0F2F4; --accent: #143F4B; --accent-2: #143F4B;
  }
  body { font-size: 10.2pt; line-height: 1.42; background: #FFFFFF; }
  .sheet { max-width: none; padding: 0; gap: 1.2rem; }
  .entry { break-inside: avoid; }
  a { text-decoration: none; }
  .provenance button, nav, footer { display: none; }
}
```

Note the last rule: the provenance toggle is interactive chrome and must not print.

- [ ] **Step 3: Verify by printing**

```bash
npm run build && npm run preview
```

Open `/cv`, print to PDF, and confirm: no entry splits across a page, no navigation chrome, black-on-white, links unstyled.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add print-tuned CV page"
```

---

## Task 8: Case study collection

**Files:**
- Create: `src/content.config.ts`, `src/content/work/type-debt-programme.mdx`, `src/content/work/build-performance-root-cause.mdx`, `src/content/work/amissproj-legacy-rebuild.mdx`
- Create: `src/pages/work/index.astro`, `src/pages/work/[...slug].astro`
- Test: `tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `Metric` shape from Task 3
- Produces: the `work` collection; routes `/work` and `/work/[slug]`

- [ ] **Step 1: Add MDX**

```bash
npx astro add mdx --yes
```

- [ ] **Step 2: Define the collection**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const metricSchema = z.object({
  label: z.string(),
  from: z.number(),
  to: z.number(),
  unit: z.string().default(''),
  delta: z.string(),
  direction: z.enum(['down-is-good', 'up-is-good']),
  verifiedBy: z.string().optional(),
});

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    period: z.string(),
    stack: z.array(z.string()),
    metrics: z.array(metricSchema).default([]),
    draft: z.boolean().default(true),
    order: z.number(),
  }),
});

export const collections = { work };
```

- [ ] **Step 3: Write the failing test**

Create `tests/unit/content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/work';
const FORBIDDEN = [
  { name: 'ticket identifier', re: /\b[A-Z]{2,10}-\d{3,6}\b/ },
  { name: 'phone number', re: /82\s*000\s*0000/ },
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
```

- [ ] **Step 4: Run it to confirm it fails**

```bash
npx vitest run tests/unit/content.test.ts
```

Expected: FAIL — directory does not exist.

- [ ] **Step 5: Write the first case study**

Create `src/content/work/type-debt-programme.mdx` with `draft: false` and `order: 1`. Structure it as the working method, not a narrative:

- **The situation** — an enterprise React application with 1,730 compiler errors and no map of them.
- **What I measured first** — grouping every error by root cause; three clusters covered 48%.
- **The sequence** — publishing the remediation order before touching anything.
- **How I proved it held** — 92 characterization snapshots per phase; type-error set-diffing; browser verification over CDP.
- **What it cost and what it returned** — 1,730 → 1,066 application-wide; the analytics module 264 → 0; tests 57 → 328.

Method and outcome only. No ticket references, no file paths, no module names.

- [ ] **Step 6: Write the two stubs**

Create `build-performance-root-cause.mdx` (`order: 2`) and `amissproj-legacy-rebuild.mdx` (`order: 3`), both with `draft: true` and complete valid frontmatter. Body: one sentence of placeholder prose. They must never render.

- [ ] **Step 7: Build the routes**

`src/pages/work/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
const studies = (await getCollection('work', ({ data }) => !data.draft))
  .sort((a, b) => a.data.order - b.data.order);
---
```

`src/pages/work/[...slug].astro` uses `getStaticPaths` over the same filtered collection and `render(entry)` to get `<Content />`.

- [ ] **Step 8: Verify drafts do not ship**

```bash
npm test && npm run build
grep -ri "build-performance" dist/ || echo "PASS: drafts excluded"
```

Expected: tests PASS, and the grep finds nothing.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add case study collection with first study and draft stubs"
```

---

## Task 9: Request-CV API

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/host.json`, `api/src/validate.ts`, `api/src/rateLimit.ts`, `api/src/handler.ts`, `api/src/email.ts`, `api/src/functions/requestCv.ts`
- Test: `tests/unit/api.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `RECIPIENT: 'rourke9001@gmail.com'` (const, exported from `handler.ts`)
  - `validateRequest(body: unknown): { ok: true; data: CvRequest } | { ok: false; errors: string[] }`
  - `createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }): { check(key: string): boolean }`
  - `handleRequest(deps: { body: unknown; ip: string; limiter: RateLimiter; send: SendEmail }): Promise<{ status: number; body?: unknown }>`
  - `type SendEmail = (msg: { to: string; replyTo: string; subject: string; text: string }) => Promise<void>`

- [ ] **Step 1: Create the API package**

```bash
mkdir -p api/src/functions
cd api && npm init -y && npm install @azure/functions@^4 @azure/communication-email@^1.1.0 zod@^4 && npm install -D typescript @types/node && cd ..
```

Create `api/host.json`:

```json
{ "version": "2.0", "extensionBundle": { "id": "Microsoft.Azure.Functions.ExtensionBundle", "version": "[4.*, 5.0.0)" } }
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/api.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { validateRequest } from '../../api/src/validate';
import { createRateLimiter } from '../../api/src/rateLimit';
import { handleRequest, RECIPIENT } from '../../api/src/handler';

const valid = { name: 'Jane Doe', email: 'jane@acme.com', company: 'Acme', role: 'Software Engineer', message: 'Please send your CV.', website: '' };
const limiter = () => createRateLimiter({ max: 3, windowMs: 60_000 });

describe('validateRequest', () => {
  it('accepts a well-formed request', () => {
    expect(validateRequest(valid).ok).toBe(true);
  });
  it('rejects a malformed email', () => {
    const r = validateRequest({ ...valid, email: 'not-an-email' });
    expect(r.ok).toBe(false);
  });
  it('rejects a missing name', () => {
    expect(validateRequest({ ...valid, name: '' }).ok).toBe(false);
  });
  it('rejects an overlong message', () => {
    expect(validateRequest({ ...valid, message: 'x'.repeat(5001) }).ok).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit then refuses', () => {
    const l = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(false);
  });
  it('keeps separate budgets per key', () => {
    const l = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('2.2.2.2')).toBe(true);
  });
  it('forgets once the window passes', () => {
    let t = 0;
    const l = createRateLimiter({ max: 1, windowMs: 1000, now: () => t });
    expect(l.check('1.1.1.1')).toBe(true);
    expect(l.check('1.1.1.1')).toBe(false);
    t = 1001;
    expect(l.check('1.1.1.1')).toBe(true);
  });
});

describe('handleRequest', () => {
  it('sends exactly one email and returns 202', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: valid, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(202);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('always sends to the hardcoded recipient', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await handleRequest({ body: { ...valid, email: 'attacker@evil.com' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(send.mock.calls[0][0].to).toBe(RECIPIENT);
  });

  it('sets reply-to to the requester so a reply reaches them', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await handleRequest({ body: valid, ip: '1.1.1.1', limiter: limiter(), send });
    expect(send.mock.calls[0][0].replyTo).toBe('jane@acme.com');
  });

  it('drops a honeypot submission silently without sending', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: { ...valid, website: 'http://spam.example' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(202);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid input without sending', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const res = await handleRequest({ body: { ...valid, email: 'nope' }, ip: '1.1.1.1', limiter: limiter(), send });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 429 once the rate limit is exhausted', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const l = createRateLimiter({ max: 1, windowMs: 60_000 });
    await handleRequest({ body: valid, ip: '1.1.1.1', limiter: l, send });
    const res = await handleRequest({ body: valid, ip: '1.1.1.1', limiter: l, send });
    expect(res.status).toBe(429);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
npx vitest run tests/unit/api.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement validation**

Create `api/src/validate.ts`:

```ts
import { z } from 'zod';

export const requestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  role: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  website: z.string().max(200).optional().default(''),
});

export type CvRequest = z.infer<typeof requestSchema>;

export function validateRequest(body: unknown):
  | { ok: true; data: CvRequest }
  | { ok: false; errors: string[] } {
  const parsed = requestSchema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
```

- [ ] **Step 5: Implement the rate limiter**

Create `api/src/rateLimit.ts`:

```ts
export interface RateLimiter { check(key: string): boolean }

export function createRateLimiter(opts: { max: number; windowMs: number; now?: () => number }): RateLimiter {
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();
  return {
    check(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < opts.windowMs);
      if (recent.length >= opts.max) { hits.set(key, recent); return false; }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
  };
}
```

This is per-instance memory, which is the correct trade for this endpoint: a cold instance forgets, but the cost of a forgotten window is one extra email.

- [ ] **Step 6: Implement the handler**

Create `api/src/handler.ts`:

```ts
import { validateRequest } from './validate';
import type { RateLimiter } from './rateLimit';

export const RECIPIENT = 'rourke9001@gmail.com';

export type SendEmail = (msg: { to: string; replyTo: string; subject: string; text: string }) => Promise<void>;

export async function handleRequest(deps: {
  body: unknown; ip: string; limiter: RateLimiter; send: SendEmail;
}): Promise<{ status: number; body?: unknown }> {
  const parsed = validateRequest(deps.body);
  if (!parsed.ok) return { status: 400, body: { errors: parsed.errors } };

  // Honeypot: a real browser leaves this hidden field empty. Answer 202 so a
  // bot cannot distinguish a drop from a success and retry with a variation.
  if (parsed.data.website.trim() !== '') return { status: 202 };

  if (!deps.limiter.check(deps.ip)) return { status: 429, body: { error: 'Too many requests' } };

  const { name, email, company, role, message } = parsed.data;
  await deps.send({
    to: RECIPIENT,
    replyTo: email,
    subject: `CV request: ${name}${company ? ` — ${company}` : ''}`,
    text: [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Company: ${company || '—'}`,
      `Role:    ${role || '—'}`,
      '',
      message || '(no message)',
    ].join('\n'),
  });

  return { status: 202 };
}
```

- [ ] **Step 7: Run the tests**

```bash
npx vitest run tests/unit/api.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 8: Implement the ACS transport**

Create `api/src/email.ts`. Uses the documented `beginSend` poller from `@azure/communication-email` 1.1.0:

```ts
import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';
import type { SendEmail } from './handler';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;

export const sendViaAcs: SendEmail = async (msg) => {
  const connectionString = process.env.ACS_CONNECTION_STRING;
  const senderAddress = process.env.ACS_SENDER_ADDRESS;
  if (!connectionString || !senderAddress) throw new Error('ACS is not configured');

  const client = new EmailClient(connectionString);
  const poller = await client.beginSend({
    senderAddress,
    replyTo: [{ address: msg.replyTo }],
    recipients: { to: [{ address: msg.to }] },
    content: { subject: msg.subject, plainText: msg.text },
  });

  for (let i = 0; i < MAX_POLLS && !poller.isDone(); i++) {
    await poller.poll();
    if (poller.isDone()) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const result = poller.getResult();
  if (!result || result.status !== KnownEmailSendStatus.Succeeded) {
    throw new Error(`ACS send did not succeed: ${result?.status ?? 'timed out'}`);
  }
};
```

- [ ] **Step 9: Wire the Function**

Create `api/src/functions/requestCv.ts`:

```ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleRequest } from '../handler';
import { createRateLimiter } from '../rateLimit';
import { sendViaAcs } from '../email';

const limiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

app.http('requestCv', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'request-cv',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    let body: unknown;
    try { body = await request.json(); } catch { return { status: 400, jsonBody: { errors: ['invalid JSON'] } }; }

    try {
      const res = await handleRequest({ body, ip, limiter, send: sendViaAcs });
      return { status: res.status, jsonBody: res.body };
    } catch (err) {
      context.error('request-cv failed', err);
      return { status: 502, jsonBody: { error: 'Could not deliver the request' } };
    }
  },
});
```

- [ ] **Step 10: Verify the whole suite and commit**

```bash
npm test
```

Expected: PASS.

```bash
git add -A
git commit -m "feat: add request-CV function with honeypot, rate limit and fixed recipient"
```

---

## Task 10: The request form

**Files:**
- Create: `src/components/RequestCv.tsx`
- Modify: `src/pages/index.astro`, `src/pages/cv.astro`

**Interfaces:**
- Consumes: `POST /api/request-cv`
- Produces: `<RequestCv client:visible />`

- [ ] **Step 1: Build the form**

Create `src/components/RequestCv.tsx`. Requirements:

- Fields: name, email, company, role, message, plus a `website` honeypot hidden with `position: absolute; left: -9999px`, `tabIndex={-1}`, `autoComplete="off"`, and an `aria-hidden` wrapper so screen readers skip it.
- Native `required` and `type="email"` so validation works before any JS runs.
- Three states: idle, sending, done. On success, replace the form with: *"Request received. Rourke will reply from rourke9001@gmail.com."*
- On a 429, say so plainly rather than showing a generic failure.
- Label the section honestly: *"The CV is not published here. Ask and it comes back tailored to the role."*

- [ ] **Step 2: Mount it**

Replace the `<section id="request">` placeholder on the landing page, and add the same section to `/cv`.

- [ ] **Step 3: Verify locally against the real Function**

```bash
npm install -g @azure/static-web-apps-cli
npm run build
swa start dist --api-location api
```

Submit the form. Without ACS configured the API returns 502 — that is correct and proves the wiring. Confirm the honeypot path by filling the hidden field via devtools and checking that no email is attempted.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add request-CV form"
```

---

## Task 11: Static Web Apps configuration

**Files:**
- Create: `staticwebapp.config.json`

- [ ] **Step 1: Write the configuration**

```json
{
  "platform": { "apiRuntime": "node:22" },
  "trailingSlash": "auto",
  "navigationFallback": { "rewrite": "/404.html", "exclude": ["/fonts/*", "/api/*"] },
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload"
  },
  "routes": [
    { "route": "/api/request-cv", "methods": ["POST"] },
    { "route": "/api/*", "methods": ["GET", "PUT", "PATCH", "DELETE"], "statusCode": 405 }
  ],
  "responseOverrides": { "404": { "rewrite": "/404.html" } }
}
```

`style-src` needs `'unsafe-inline'` because Astro inlines scoped component styles. Everything else is locked down.

- [ ] **Step 2: Add a 404 page**

Create `src/pages/404.astro` using `Base.astro`.

- [ ] **Step 3: Verify the headers**

```bash
npm run build && swa start dist --api-location api
curl -sI http://localhost:4280/ | grep -i "content-security-policy\|x-content-type"
```

Expected: both headers present.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Static Web Apps config with CSP and node:22 runtime"
```

---

## Task 12: Never-publish build guard

**Files:**
- Create: `scripts/check-forbidden.ts`
- Test: `tests/unit/check-forbidden.test.ts`

**Interfaces:**
- Produces:
  - `FORBIDDEN: { name: string; pattern: RegExp }[]`
  - `scanText(text: string, source: string): { name: string; source: string; match: string }[]`
  - CLI: `node --experimental-strip-types scripts/check-forbidden.ts dist` exits 1 on any finding

- [ ] **Step 1: Write the failing test**

Create `tests/unit/check-forbidden.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scanText } from '../../scripts/check-forbidden';

describe('scanText', () => {
  it('catches a ticket identifier', () => {
    expect(scanText('fixed in ABCD-1234 last week', 'a.html')).toHaveLength(1);
  });
  it('catches the phone number in any spacing', () => {
    expect(scanText('call +27 82 000 0000', 'a.html')).toHaveLength(1);
    expect(scanText('call +27820000000', 'a.html')).toHaveLength(1);
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
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/check-forbidden.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/check-forbidden.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const FORBIDDEN = [
  { name: 'ticket identifier', pattern: /\b[A-Z]{2,10}-\d{3,6}\b/g },
  { name: 'phone number', pattern: /\+?27[\s-]?82[\s-]?000[\s-]?0000|82\s*000\s*0000/g },
  { name: 'the word Senior', pattern: /\bsenior\b/gi },
  { name: 'source path', pattern: /\b(?:src|apps|libs|packages)\/[\w.-]+\/[\w./-]+\.(?:ts|tsx|js|jsx|java|go|py)\b/g },
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

if (process.argv[2]) {
  const root = process.argv[2];
  const files = walk(root).filter((f) => /\.(html|js|css|json|txt|xml)$/.test(f));
  const findings = files.flatMap((f) => scanText(readFileSync(f, 'utf8'), f));
  if (findings.length > 0) {
    console.error('Never-publish patterns found in built output:');
    for (const f of findings) console.error(`  ${f.source}: ${f.name} -> "${f.match}"`);
    process.exit(1);
  }
  console.log(`check-forbidden: clean (${files.length} files scanned)`);
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/check-forbidden.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Run it against the real build**

```bash
npm run build
node --experimental-strip-types scripts/check-forbidden.ts dist
```

Expected: `check-forbidden: clean`. **If it flags real content, fix the content, not the pattern.** The one legitimate reason to relax a pattern is a false positive on a public tool name — record why in the commit message.

- [ ] **Step 6: Wire it into the build**

Add to `package.json` scripts:

```json
"check:forbidden": "node --experimental-strip-types scripts/check-forbidden.ts dist"
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add build guard for never-publish patterns"
```

---

## Task 13: GitHub profile README generator

**Files:**
- Create: `scripts/generate-readme.ts`, `profile/README.md` (generated output)
- Test: `tests/unit/generate-readme.test.ts`

**Interfaces:**
- Consumes: `cv` from `src/content/cv/cv.ts`
- Produces: `renderReadme(cv: Cv): string`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/generate-readme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderReadme } from '../../scripts/generate-readme';
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
    expect(md).not.toMatch(/82\s*000\s*0000/);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/generate-readme.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/generate-readme.ts` exporting `renderReadme(cv)`, which emits: the H1 name, the position line, a two-sentence positioning paragraph, a markdown table of the headline metrics (`Measure | Before | After | Change`), a short "What I'm working on" list, and the contact links (email, site, LinkedIn — **no phone**). When run directly, it writes `profile/README.md`.

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/generate-readme.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Generate and check the output**

```bash
node --experimental-strip-types scripts/generate-readme.ts
cat profile/README.md
```

Add the npm script `"readme": "node --experimental-strip-types scripts/generate-readme.ts"`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: generate GitHub profile README from the CV source of truth"
```

---

## Task 14: End-to-end tests, accessibility and CI

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/site.spec.ts`, `.github/workflows/ci.yml`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Configure it**

Create `playwright.config.ts` with `webServer: { command: 'npm run preview', url: 'http://localhost:4321', reuseExistingServer: !process.env.CI }` and `testDir: './tests/e2e'`.

- [ ] **Step 3: Write the E2E tests**

Create `tests/e2e/site.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/cv', '/work']) {
  test(`${path} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the landing page shows evidence before prose', async ({ page }) => {
  await page.goto('/');
  const firstMetric = page.locator('[data-metric]').first();
  await expect(firstMetric).toBeVisible();
});

test('provenance text is present without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByText(/measured|captured|survey/i).first()).toBeVisible();
});

test('the CV page carries no phone number', async ({ page }) => {
  await page.goto('/cv');
  expect(await page.content()).not.toMatch(/82\s*000\s*0000/);
});

test('the CV page prints without interactive chrome', async ({ page }) => {
  await page.goto('/cv');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.provenance button').first()).toBeHidden();
});
```

- [ ] **Step 4: Run them**

```bash
npm run build && npx playwright test
```

Expected: PASS. Fix any axe violations in the components — do not add exclusions.

- [ ] **Step 5: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm ci --prefix api
      - run: npx astro check
      - run: npm test
      - run: npm run build
      - run: npm run check:forbidden
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
```

Node 22 in CI deliberately matches the `apiRuntime`, so the API is tested on the runtime it deploys to.

- [ ] **Step 6: Verify and commit**

```bash
git add -A
git commit -m "ci: add accessibility, e2e and never-publish checks"
```

---

## Task 15: Azure deployment

**Files:**
- Create: `.github/workflows/azure-static-web-apps.yml`, `docs/deployment.md`

- [ ] **Step 1: Create the Azure resources**

These are portal or CLI actions, not code. Record what was done in `docs/deployment.md`.

```bash
az group create --name rg-rourkeamiss-site --location westeurope

az staticwebapp create \
  --name swa-rourkeamiss \
  --resource-group rg-rourkeamiss-site \
  --location westeurope \
  --sku Free
```

**`--sku Free` is not optional.** It is the control that makes an unexpected bill structurally impossible.

- [ ] **Step 2: Create the Communication Services email resource**

In the portal: create an **Email Communication Service**, add an **Azure Managed Domain** (one click — it provisions `donotreply@<guid>.azurecomm.net` with SPF and DKIM already configured), then create a **Communication Service** and connect the verified domain to it.

- [ ] **Step 3: Set the application settings**

```bash
az staticwebapp appsettings set \
  --name swa-rourkeamiss \
  --setting-names ACS_CONNECTION_STRING="<connection string>" ACS_SENDER_ADDRESS="donotreply@<guid>.azurecomm.net"
```

Never commit either value.

- [ ] **Step 4: Set the budget**

```bash
az consumption budget create \
  --budget-name budget-rourkeamiss \
  --amount 5 \
  --time-grain Monthly \
  --category Cost \
  --resource-group rg-rourkeamiss-site
```

Add an alert at 80%. Static Web Apps on Free cannot bill; this exists to catch Communication Services usage, which is the only metered resource in the architecture.

- [ ] **Step 5: Write the deploy workflow**

Create `.github/workflows/azure-static-web-apps.yml` using `Azure/static-web-apps-deploy@v1` with `app_location: "/"`, `api_location: "api"`, `output_location: "dist"`, and `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`. Include the `closed` event job so PR preview environments are torn down — only 3 exist on Free.

- [ ] **Step 6: Push and confirm the deployment**

```bash
git push -u origin main
```

Watch the Actions run. Confirm the site loads on the generated `*.azurestaticapps.net` hostname.

- [ ] **Step 7: Test the request form against real ACS**

Submit the form on the deployed site. Confirm the email lands in rourke9001@gmail.com and that replying to it addresses the requester, not `donotreply@`.

- [ ] **Step 8: Protect `main`**

In GitHub repository settings: protect `main`, require the `verify` status check, and disallow direct pushes.

- [ ] **Step 9: Write the deployment record**

Create `docs/deployment.md` covering: resource names, which settings live in Azure rather than the repo, how to rotate the ACS connection string, the custom-domain steps for apex and `www` (both planned; 2 is exactly the Free plan limit), and the reminder that the plan must never be changed from Free.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "ci: add Azure Static Web Apps deployment on the Free plan"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
| --- | --- |
| §2 Scope — `/`, `/cv`, `/work`, first case study | 6, 7, 8 |
| §2 Draft stubs excluded from build | 8 |
| §3 Information architecture | 6, 7, 8, 9 |
| §4 Single source of truth | 3, 13 |
| §4 Structured metrics | 3, 4 |
| §4 Case study collection with Zod schema | 8 |
| §5 Tokens, fonts, self-hosting | 2 |
| §5 Evidence-ledger direction | 5, 6 |
| §5 Provenance disclosure | 5 |
| §5 Motion budget | 5 |
| §5 Print | 7 |
| §6 Request-CV API, honeypot, rate limit, fixed recipient | 9 |
| §6 ACS on an Azure Managed Domain | 9, 15 |
| §7 Never-publish rules | 8, 12 |
| §7 No CV file in the repo | `.gitignore`, committed |
| §8 Free plan and cost guards | 15 |
| §9 CI as required status check | 14, 15 |
| §10 Testing matrix | 3, 4, 5, 9, 12, 13, 14 |
| §11 Repository structure | all |
| §12 Header facts | 3, 6 |

**Placeholder scan:** The only intentionally unwritten content is the body prose of the two draft case studies (Task 8, Step 6), which the spec explicitly defers, and the transcription of roles/projects/skills in Task 3 Step 5, where the source is the spec's artifact and the anonymisation rules are given explicitly.

**Type consistency:** `Metric` is defined once in Task 3 and consumed unchanged in Tasks 4, 5, 8 and 13. The Zod schema in Task 8 mirrors it field for field. `SendEmail` is defined in Task 9's handler and implemented in the same task's `email.ts`. `RECIPIENT` is exported from `handler.ts` and asserted from the test. `barFraction` and `formatDelta` keep their Task 4 signatures wherever used.

**Known risks carried into execution:**

1. **Astro 7 is newer than the assistant's training data.** Task 1 scaffolds with the official CLI and records the real installed versions before any other task runs, rather than assuming config syntax. The content collections API in Task 8 was verified against current docs (`src/content.config.ts`, `glob()` loader, `getCollection`/`render`), but if the CLI installs a materially different major version, stop at Task 1 Step 4 and report.
2. **`@azure/communication-email` docs cite a version 3.1.0 that does not exist on npm** — the published latest is 1.1.0. Task 9's transport codes against the 1.1.0 poller surface (`beginSend`, `isDone`, `poll`, `getResult`). If the typings disagree at implementation, the documented manual-poll sample is the reference, not memory.
3. **The rate limiter is per-instance memory.** A cold start forgets the window. This is the right trade here — the cost of a forgotten window is one extra email to a single fixed inbox — but it is a deliberate choice, not an oversight.
