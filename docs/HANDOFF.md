# Handoff — paste this into a new chat

---

Continue building my personal CV website. A previous session did the design work and got 6 of 15 tasks in; everything is on disk and in git. Read the files below before doing anything — do not re-derive decisions that are already recorded.

**Project directory:** `C:\Users\Rourke Amiss\Documents\Personal\Projects\RourkeAmiss`
**Repo:** github.com/Rourke9001/RourkeAmiss (public)
**Branch:** `feat/site-foundation` — do the work here, `main` holds only the spec and plan
**HEAD:** `2550c79`

## Read these first, in this order

1. `docs/superpowers/specs/2026-08-18-personal-site-design.md` — the spec. Binding authority.
2. `docs/superpowers/plans/2026-08-18-personal-site.md` — 15-task implementation plan.
3. `docs/design-direction.md` — the visual direction.
4. `.superpowers/sdd/2026-08-18-personal-site/progress.md` — the ledger: every task's status, every ruling made and why. **This is the recovery map.** Trust it and `git log` over anything else.

## How the work is being executed

Using the `superpowers:subagent-driven-development` skill: one fresh implementer subagent per task, then a task reviewer, then a fix loop until the review is clean. Invoke that skill and resume the loop. The ledger records where each task stands.

Task briefs are extracted with the skill's `scripts/task-brief PLAN_FILE N`, and review packages with `scripts/review-package PLAN_FILE BASE HEAD`. Do not paste whole plan files into subagent prompts.

## Where it stands

| Task | State |
| --- | --- |
| 1. Astro scaffold | Complete, review clean |
| 2. Tokens, fonts, layout | Complete, review clean |
| 3. CV content model | Complete, review clean |
| 4. Delta arithmetic | Complete, review clean (1 fix round) |
| 5. Metric row + provenance island | Complete, review clean |
| 6. Landing page | Implemented; review's three findings fixed in fix round 1. **Awaiting re-review.** |
| 7–15 | Not started |

Stack as actually installed: Astro 7.2.3, React 19.2.8, `@astrojs/react` 6.0.3, Vitest. 22 tests pass. `npm run build` succeeds.

## START HERE — re-review Task 6

Fix round 1 closed all three findings (commit `2550c79`); the ledger records what
changed and why. Nothing is open. The next step is the re-review of Task 6, then
Task 7.

What the fixes touched, so the re-reviewer knows where to look:

- **New `src/components/MetricList.astro`** owns the trace strip's column tracks;
  each `Metric` row is now `grid-template-columns: subgrid`. Six tracks — label,
  bar, from, arrow, to, delta — so every figure holds its own column. Task 7's
  `/cv` page must wrap its metrics in `<MetricList>`, not a bare div.
- **`Metric.astro`** — the method toggle is unlined at rest and floated into the
  note's right margin, dropping beneath the note below 30rem. Button text and
  `aria-*` contract untouched; `tests/unit/provenance.test.tsx` still passes.
- **`Masthead.astro`** — the contact row is two deliberate rows, with separators
  generated on the item that follows them.

**Look at the rendered page yourself.** All three findings came from screenshots,
not diffs, and the unit suite cannot catch a geometric regression. The Chrome
extension may not be connected; headless Chrome works directly:

```
npx astro dev --background
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu   --hide-scrollbars --virtual-time-budget=4000 --window-size=1280,1400   --screenshot=out.png "http://localhost:4321/"
```

Headless clamps the viewport to a 500px minimum, so narrow widths must be checked
by loading the page in a fixed-width iframe from a temporary file in `public/`.

## Hard constraints — these are not style preferences

- **Azure Static Web Apps stays on the Free plan.** Free has `Unavailable` overage bandwidth, which is what makes a surprise bill structurally impossible. The user has MPN credits but explicitly does not want shock bills.
- **`apiRuntime` is `node:22`.** Verified supported, no end-of-support date.
- **No CV file in the repo, ever.** `.gitignore` blocks `*.pdf`, `*.docx`, `*.doc`. Never add an exception. The site has no CV download — a request form emails the user instead, and he replies manually with a tailored copy.
- **No phone number anywhere**, in content, code, tests, or commit messages. Guards match the South African mobile *shape*, never a literal number. A previous session leaked the real number into the plan document and pushed it publicly; history was rewritten and force-pushed to fix it. Do not reintroduce it.
- **Never publish:** ticket identifiers, employer file paths, employer store/module/repo names, customer or network or substation identifiers. Case studies carry method and outcome only.
- **The word "Senior" appears nowhere.** The user targets mid-level roles and gets filtered out of senior requisitions.
- **Motion budget for the whole site:** metric bars draw once on scroll-in. Nothing else animates.

## Decisions already made — do not relitigate

- Content model: one typed `src/content/cv/cv.ts` feeds the site, the generated GitHub profile README, and JSON-LD. Never hardcode CV text into a page.
- Fonts: Astro's built-in Fonts API with the Fontsource provider. Never a Google Fonts `<link>` — the CSP blocks it.
- Email transport: Azure Communication Services on an Azure Managed Domain (free subdomain, no DNS work needed). Resend is the documented fallback.
- The method apparatus uses a dagger marker, not lettered sigla — see the amendment note in `docs/design-direction.md` for why.
- `main` is protected in intent; CI becomes a required status check in Task 15.

## Two things to raise with the user

1. **His two CV sources disagree.** The Google Doc includes "type instantiations from 4.18M to 1.02M (−76%)" and "117 Storybook nodes"; the artifact omits both. The site follows the artifact. Ask whether he wants those two figures added — they are strong, and it is his call which version he will defend in an interview.
2. **Nothing since the spec and plan has been pushed.** The whole feature branch is local. Ask before pushing.

## Then continue

After Task 6's fix loop closes, carry on through Tasks 7–15 in order: the print-tuned `/cv` page, the case study collection, the request-CV Azure Function, the request form, the Static Web Apps config with CSP, the never-publish build guard, the profile README generator, CI with axe and Playwright, and the Azure deployment. Task 15 needs the user — it is portal and CLI work on his subscription.
