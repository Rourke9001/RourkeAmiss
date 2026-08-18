# Personal site — design spec

- **Date:** 2026-08-18
- **Repo:** github.com/Rourke9001/RourkeAmiss
- **Target domain:** rourkeamiss.co.za (configured last)
- **Status:** awaiting review

---

## 1. Purpose

A living CV at rourkeamiss.co.za. It serves two readers, as the CV itself does:

- **Reader one** — a recruiter, twenty seconds, reads the header and the headline
  numbers and never scrolls. The landing page must put evidence in front of them
  before prose.
- **Reader two** — a hiring manager on a second pass, who wants the bullets, the
  method and the proof.

The site is also, unavoidably, a work sample. A recruiter may click into this
repository. It is therefore built and tested to the same standard the CV claims.

### Positioning

Full-stack engineer who makes large and aging codebases maintainable, and can
prove it with measurements. The site's job is to make that claim legible in
seconds and defensible on inspection.

Target level is mid and plain "Software Engineer". The word "Senior" appears
nowhere on the site.

---

## 2. Scope

### Ships in v1

| Route | Content |
| --- | --- |
| `/` | Landing — name, position line, headline deltas, roles, projects, skills, request-CV form |
| `/cv` | Full CV, print-tuned — everything except the phone number |
| `/work` | Case study index |
| `/work/type-debt-programme` | First written case study |

### Structure ready, content later

Two further case studies exist as schema-valid stubs carrying `draft: true`, so
they are excluded from the build and never render or appear in the index.
Publishing one is: write the body, flip `draft` to `false`, commit. No code
change, no layout work.

- `build-performance-root-cause`
- `amissproj-legacy-rebuild`

### Deliberately out of scope

- **No CV file anywhere in this system.** Not in the repository, not in Blob
  Storage, not in the Function. See §7.
- No blog, no analytics, no cookie banner, no newsletter, no comments.
- Aligning LinkedIn with the CV — a real task, tracked elsewhere, not this project.
- Pinning repositories on the GitHub profile — a UI action, cannot be automated here.

---

## 3. Information architecture

```
/                     landing
/cv                   full CV, print-tuned
/work                 case study index
/work/[slug]          one case study per page
/api/request-cv       POST, Azure Function
```

Flat and shallow by intent. Every page is reachable in one click from every
other page.

---

## 4. Content model

### Single source of truth

```
src/content/cv/cv.ts
   |
   +--> /                    condensed view
   +--> /cv                  full view
   +--> profile-readme.md    generated, copied to Rourke9001/Rourke9001
   +--> JSON-LD Person       in <head>
```

One typed module feeds every surface, so the site, the GitHub profile and the
structured data cannot contradict each other.

### Metrics are structured, not prose

```ts
type Metric = {
  label: string;        // "Cold type-check"
  from: number;
  to: number;
  unit: string;         // "s" | "errors" | "tests" | "GB"
  delta: string;        // "-79%"
  direction: 'down-is-good' | 'up-is-good';
  verifiedBy: string;   // anonymised provenance, see §7
};
```

Consequences of this shape:

- A figure can never be typed inconsistently across two pages.
- The mono tabular-numeral treatment applies automatically rather than by hand.
- The proportional bar in the delta component derives from `from`/`to` — it
  cannot disagree with the numbers beside it.
- `verifiedBy` powers the provenance disclosure described in §5.

### Case studies

`src/content/work/*.mdx`, validated by a Zod schema through Astro content
collections. A malformed entry fails the build rather than shipping broken.

Schema: `title`, `summary`, `period`, `stack[]`, `metrics[]` (referencing the
same `Metric` type), `draft`, `order`.

---

## 5. Visual design

### Inherited system

The palette and type stack come from the CV artifact and are kept deliberately:

| Token | Light | Dark |
| --- | --- | --- |
| `--paper` | `#FBFBF9` | `#0E1114` |
| `--ink` | `#14171C` | `#E8ECEF` |
| `--ink-2` | `#3F4750` | `#AEB8C1` |
| `--ink-3` | `#78828D` | `#78848F` |
| `--rule` | `#DFE3E6` | `#262D33` |
| `--rule-soft` | `#EDF0F2` | `#1C2227` |
| `--accent` | `#1C4E5C` | `#7FBECD` |
| `--alert` | `#A4442F` | `#E08B72` |

- **Serif** — Source Serif 4: name, headings, entry titles
- **Sans** — IBM Plex Sans: body
- **Mono** — IBM Plex Mono: every figure, plus labels, dates and section markers

Fonts are self-hosted and subset. No third-party font CDN: fewer external
dependencies, no render-blocking request, no layout shift, and a strict CSP
stays simple.

### Direction: the evidence ledger

The recurring unit of the design is a before-and-after reading, not a card:

```
COLD TYPE-CHECK        177s ──────────────────▶ 36.6s      −79%
TYPE DEBT            1,730 ─────────────▶ 1,066            −38%
MODULE ERRORS          264 ▶ 0                            −100%
```

Digits are tabular and column-align down the page. The hairline bar is
proportional to the reduction, so the magnitude reads before the number does.
This is the CV's argument expressed as a layout system rather than asserted in
a sentence.

**Every figure is accountable.** Any metric expands inline to one line of
provenance — *"cold type-check anchors, before and after"* — method only. This
is the site's single interactive element and the honest justification for a
React island in an otherwise static build. It renders expanded with no JS.

**Restraint is the signal.** No gradients, no glassmorphism, no hero image, no
animated background. Paper, hairline rules, ink, one teal accent. The artifact's
1px rule system is used as a real typeset grid. Someone whose pitch is
maintainability should produce a page that still looks right in five years.

**Motion budget.** Delta bars draw once on scroll into view. That is all of it.
`prefers-reduced-motion: reduce` removes it entirely.

**The landing opens on evidence.** Name, one position line, then immediately the
numbers. No greeting, no "welcome to my portfolio".

The `frontend-design` skill is invoked at implementation to execute this
direction rather than port the artifact verbatim — a web page has room and
interaction that an A4 page does not.

### Print

`/cv` carries a print stylesheet derived from the artifact's: light tokens
forced, rules preserved, entries `break-inside: avoid`, links unstyled. Printing
the page produces a clean document even though no PDF is offered for download.

---

## 6. Request-CV API

The CV is not downloadable. A request button opens a conversation instead.

```
POST /api/request-cv                       managed Azure Function, HTTP trigger

  body:   name, email, company, role, message, website (honeypot)

  guards: honeypot filled          -> 202, silently dropped
          schema validation fails  -> 400
          per-IP rate limit hit    -> 429

  action: one email to a hardcoded recipient (rourke9001@gmail.com)
          Reply-To set to the requester, so replying goes straight to them

  out:    202 Accepted
```

Rourke replies manually with the CV attached, tailored per application — which
the CV's own guidance says should be happening anyway.

### Why this is not an open relay

The recipient address is a compile-time constant. The endpoint cannot be made to
send mail to an attacker-chosen address; the worst available abuse is flooding
one inbox, which the rate limit bounds and which costs single-digit dollars at
ACS pricing.

### Email transport

**Azure Communication Services Email**, on an **Azure Managed Domain** — a free
one-click subdomain (`donotreply@<guid>.azurecomm.net`) pre-configured with SPF
and DKIM. It requires no DNS work, so the form works before rourkeamiss.co.za
is configured, and it can move to the custom domain later without code changes.

Fallback if ACS proves awkward: Resend, 3,000 messages/month free. Documented
here so the decision does not have to be re-derived.

The ACS connection string lives in Static Web Apps application settings. It is
never committed.

---

## 7. What is never published

Taken from the CV's own working notes and encoded here as a rule rather than an
intention. None of the following may appear on the site, in this repository, in
the generated README, or in a commit message:

1. **Ticket identifiers** of any kind.
2. **File paths** from employer codebases.
3. **Store internals, module names or repository names** belonging to an employer.
4. **Customer references** — network identifiers, substation identifiers, client names.
5. **The CV file itself.** `.gitignore` blocks `*.pdf` and `*.docx` at the
   repository root so a stray export cannot be committed by accident.

Case studies carry **method and outcome only**. Both survive anonymisation
completely, and they are the persuasive parts.

Two accuracy rules carried over from the CV's notes:

- The Agnify 67% deployment-time figure is **carried over and not independently
  verified**. It may appear on the site because it appears on the CV, but it is
  never given a `verifiedBy` provenance line, because none exists.
- Nothing is claimed that was measured and reverted rather than shipped.

**This spec is itself public.** It contains no figure or reference that is not
already safe to publish.

---

## 8. Infrastructure and cost control

The stated constraint is not "cheap" — it is *no surprise bills*.

### Verified free-tier position

Azure Static Web Apps, **Free plan**
([plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans),
[quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)):

| Feature | Free plan | Needed here |
| --- | --- | --- |
| Included bandwidth | 100 GB/month | Far below |
| **Overage bandwidth** | **Unavailable** | **Cannot be billed** |
| Storage, single environment | 250 MB | A few MB |
| Custom domains | 2 | apex + `www` |
| Preview environments | 3 | PR previews |
| Managed Functions | HTTP triggers only | One HTTP POST |
| SSL certificates | Free, auto-renewing | Yes |
| SLA | **None** | Accepted |

The decisive property: on the Free plan, overage bandwidth is *unavailable*
rather than metered. Exceeding 100 GB throttles the app; it does not generate an
invoice. Cost safety is structural, not a dashboard someone has to remember to
check.

### The one metered resource

Azure Communication Services Email is pay-as-you-go. Bounded by the fixed
recipient, the honeypot and the rate limit as described in §6.

### Guards

1. Static Web Apps stays on the **Free** plan. Moving to Standard is a
   deliberate act, never an automatic upgrade.
2. An **Azure Budget** on the resource group with an alert at a low threshold.
3. Application Insights is **off by default**. It is metered beyond its free
   allowance and the site does not need it.
4. No Blob Storage, no database, no Key Vault, no always-on compute.

---

## 9. CI/CD

```
.github/workflows/ci.yml
    typecheck -> lint -> unit tests -> build -> a11y check -> link check

.github/workflows/azure-static-web-apps.yml
    build and deploy; PRs get a preview environment (3 available on Free)
```

`ci.yml` is a **required status check on a protected `main`** — the same
discipline the CV describes on AmissProj, applied to the site that describes it.

The managed Function runtime is pinned via the `apiRuntime` property in
`staticwebapp.config.json` to a version currently supported by Static Web Apps.
The supported list is confirmed against the languages-and-runtimes doc at
implementation time rather than assumed, since local Node is 24 and the managed
runtime list lags.

---

## 10. Testing

| Layer | Tool | Covers |
| --- | --- | --- |
| Unit | Vitest | Content-model invariants, delta maths, README generator |
| Unit | Vitest | Function handler: validation, honeypot, rate limit, recipient is constant |
| E2E | Playwright | Request-form happy path and rejection paths |
| E2E | Playwright | `/cv` renders correctly under print emulation |
| Static | axe | Accessibility on every route |
| Static | grep | **No forbidden token** (§7 patterns) appears in built output |

The last one is a build-enforced guard on the never-publish rules, not a
convention people have to remember.

---

## 11. Repository structure

```
RourkeAmiss/
├─ .github/workflows/
│   ├─ ci.yml
│   └─ azure-static-web-apps.yml
├─ api/
│   └─ request-cv/
├─ docs/superpowers/specs/
├─ public/fonts/
├─ scripts/
│   └─ generate-readme.ts
├─ src/
│   ├─ components/          .astro + .tsx islands
│   ├─ content/
│   │   ├─ cv/cv.ts
│   │   └─ work/*.mdx
│   ├─ layouts/
│   ├─ pages/
│   └─ styles/
├─ tests/
│   ├─ unit/
│   └─ e2e/
├─ .gitignore               blocks *.pdf, *.docx
├─ astro.config.mjs
└─ staticwebapp.config.json  security headers, CSP, apiRuntime
```

---

## 12. Header facts

```
Rourke Amiss
Full-stack Software Engineer

Johannesburg, South Africa
Portuguese citizen · EU work authorisation
rourke9001@gmail.com
github.com/Rourke9001
linkedin.com/in/rourke-silva-amiss-73b983a7
```

The phone number appears only in the CV sent by email, never on the page.

---

## 13. Follow-ups outside this project

Tracked so they are not lost, explicitly not built here:

- Align LinkedIn titles and dates with the CV.
- Pin AmissProj on the GitHub profile; confirm the BAC repositories are
  deliberately public or private.
- Configure rourkeamiss.co.za at deploy time. Both apex and `www` are planned;
  the registrar has been used before and supports the ALIAS/ANAME record that
  Static Web Apps requires for an apex domain. Two custom domains is exactly the
  Free plan limit, so this fits with nothing to spare.
