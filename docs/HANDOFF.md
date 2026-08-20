# Handoff — paste this into a new chat

---

Continue building my personal CV website. Tasks 1–7, 12 and 13 of 15 are done; everything is on disk, in git, and pushed. Read the files below before doing anything — do not re-derive decisions that are already recorded.

**Project directory:** `C:\Users\Rourke Amiss\Documents\Personal\Projects\RourkeAmiss`
**Repo:** github.com/Rourke9001/RourkeAmiss (public) — branch `feat/site-foundation` is pushed
**Profile repo:** github.com/Rourke9001/Rourke9001 (public) — holds the generated profile README
**Branch:** `feat/site-foundation` — do the work here
**HEAD:** `c9a1d6b`

## Read these first, in this order

1. `docs/superpowers/specs/2026-08-18-personal-site-design.md` — the spec. Binding authority.
2. `docs/superpowers/plans/2026-08-18-personal-site.md` — 15-task implementation plan.
3. `docs/design-direction.md` — the visual direction.
4. `.superpowers/sdd/2026-08-18-personal-site/progress.md` — the ledger: every task's status, every ruling made and why. **This is the recovery map.** Trust it and `git log` over anything else.

## How the work is being executed

Using the `superpowers:subagent-driven-development` skill: one fresh implementer subagent per task, then a task reviewer, then a fix loop until the review is clean. Task briefs come from the skill's `scripts/task-brief PLAN_FILE N`. Do not paste whole plan files into subagent prompts.

## Where it stands

| Task | State |
| --- | --- |
| 1. Astro scaffold | Complete, review clean |
| 2. Tokens, fonts, layout | Complete, review clean |
| 3. CV content model | Complete, review clean |
| 4. Delta arithmetic | Complete, review clean |
| 5. Metric row + provenance island | Complete, review clean |
| 6. Landing page | Complete, fix round 1 closed all three findings |
| 7. `/cv` page + print stylesheet | Complete, verified against a real Chrome PDF at A4 |
| 8. Case study collection | Complete |
| 9. Request-CV API | Complete, verified against the real Function |
| 10. Request form | Complete, verified against the real Function |
| 11. SWA config + CSP | Complete, verified in the emulator |
| 12. Never-publish build guard | Complete |
| 13. Profile README generator | Complete |
| 14. CI, axe, Playwright | Complete — 15 browser tests, axe clean on all five routes |
| 15. Azure deployment | **Only the resources remain.** Workflow and runbook committed; follow `docs/deployment.md` |

Tasks 8–15 were implemented test-first but did **not** go through the reviewer subagent that Tasks 1–7 each got. A reviewer pass is the cheapest outstanding work, and the highest-value target is the CSP arrangement in Task 11 — the one piece whose failure mode is silent in every test and only visible in a real browser.

Stack as installed: Astro 7.2.3, React 19.2.8, `@astrojs/react` 6.0.3, Vitest, Playwright. 64 unit tests and 15 browser tests pass. `npx astro check` reports 0 errors and 0 warnings. `npm run build`, `npm run check:forbidden` and `npm run check:csp` are all clean.

## START HERE

All the code is done. What remains is Task 15's resource creation on the user's Azure subscription — follow `docs/deployment.md` top to bottom. Nothing in the build depends on the domain, so the site can deploy before it is registered.

## Incident this session — history was rewritten again

A real Jira ticket key from the employer's tracker had been written into the plan document by an earlier session as a test fixture for the never-publish guard, and was pushed publicly in commit `e09a4d1` on 18 Aug. The user identified it. It was genericised to `ABCD-1234` — the key itself is deliberately not repeated here — `git filter-branch` scrubbed it from every commit on both branches, and both were force-pushed.

**All commit SHAs recorded in the ledger above the Task 12 entry are pre-rewrite and no longer exist.** The old commit `e09a4d1` remains fetchable from GitHub's API by full SHA — unreachable objects survive until GitHub garbage-collects, and only a Support request forces it. Judged not worth a request for a Jira key; the user can revisit.

This is the second leak of this shape, after the phone number. Both reached the public repo through the **plan document's test fixtures**, not through site content. When writing a guard, the fixture must not be a real instance of the thing being guarded.

## Hard constraints — these are not style preferences

- **Azure Static Web Apps stays on the Free plan.** Free has `Unavailable` overage bandwidth, which is what makes a surprise bill structurally impossible.
- **`apiRuntime` is `node:22`.**
- **No CV file in the repo, ever.** `.gitignore` blocks `*.pdf`, `*.docx`, `*.doc`. Never add an exception. The site has no CV download — a request form emails the user instead.
- **No phone number anywhere**, in content, code, tests, or commit messages. Guards match the South African mobile *shape*, never a literal number.
- **Never publish:** ticket identifiers, employer file paths, employer store/module/repo names, customer or network or substation identifiers. Case studies carry method and outcome only.
- **The word "Senior" appears nowhere.** The user targets mid-level roles.
- **Motion budget for the whole site:** metric bars draw once on scroll-in. Nothing else animates.

## Decisions already made — do not relitigate

- Content model: one typed `src/content/cv/cv.ts` feeds the site, the generated profile README, and JSON-LD. Never hardcode CV text into a page.
- Fonts: Astro's built-in Fonts API with the Fontsource provider. Never a Google Fonts `<link>` — the CSP blocks it.
- Email transport: Azure Communication Services on an Azure Managed Domain. Resend is the documented fallback.
- The method apparatus uses a dagger marker, not lettered sigla.
- The metric column tracks live in `MetricList.astro`. Any page rendering metrics wraps them in `<MetricList>`, never a bare div.
- The two figures the artifact CV dropped (type instantiations −76%, 117 Storybook nodes) are restored in `cv.ts`. Type instantiations are deliberately **not** a fifth headline metric — same intervention as the cold type-check, measured twice.
- The profile README publishes on demand via `npm run readme:publish`, not from CI. A GitHub Action would need a write-scoped PAT in a public repo and would publish personal content with no human look at the diff.

## Open items for the user

1. **`SITE_LIVE` in `scripts/generate-readme.ts` is `false`.** rourkeamiss.co.za is not registered yet, so the profile README names the site in plain text rather than linking it — a dead link on a profile is worse than no link. **Registering the domain is not the end of the job: the deployment is not complete until that flag flips and `npm run readme:publish` runs.**
2. **Contrast — RESOLVED, but it changed a colour you chose.** Light `--ink-3` was `#78828D`, which is 3.77:1 on `--paper` and fails the 4.5:1 axe applies to text under 24px. It is now `#646D78` (5.07:1), the same colour shifted −20 per channel so hue and coolness are unchanged. The dark value already passed at 4.96:1 and is untouched. Spec §5 and the plan's token block are amended to match. Revert in one line if you dislike it.
3. **`/cv` and `/work` are now linked from a site nav** in `Base.astro`, because the spec's route table lists both as routes and Task 8's pages were otherwise unreachable. If the CV page was meant to be a URL handed out deliberately rather than a discoverable one, remove that one link — the decision is the user's.
4. **The Google Doc CVs have broken header lines** — unfilled `[[ CITY — REPLACE THIS ]]` and `[[ LINKEDIN URL — REPLACE THIS ]]` placeholders in two of them, a stray bracket in a third. These are the documents he sends to employers. Not site work; raised and not actioned.

## Then continue

Tasks 8 → 9 → 10 → 11 → 14 → 15. Task 11 needs 9 and 10; Task 14 needs 12, which is done; Task 15 is user-run and last.
