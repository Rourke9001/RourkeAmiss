# Design direction

The binding constraints come from the CV artifact: palette, type stack, and the
tabular treatment of figures. This document spends the freedom that remains.

## Calibration

Current AI-generated design clusters around three looks. One of them is "hairline
rules, zero border-radius, dense newspaper columns" — which is close enough to
this brief's inherited palette to be a real risk. The palette and typefaces are
the user's own and stay exactly as specified. Everything else is chosen to move
away from generic broadsheet and toward this particular engineer's subject matter.

Two things push it off the default axis already:

- The palette is **cool** — a near-white with a green cast, deep teal accent. Not
  the warm cream and terracotta of the common default.
- The structure is a **critical-edition grid** with a marginal gutter, not centred
  newspaper columns.

## Tokens

Colour, verbatim from the CV artifact — see spec §5 for the full light and dark
sets. Summary: `--paper #FBFBF9`, `--ink #14171C`, `--rule #DFE3E6`,
`--accent #1C4E5C`, `--alert #A4442F`.

Type, three roles:

| Role | Face | Used for |
| --- | --- | --- |
| Display | Source Serif 4 | Name, section titles, entry titles. Used with restraint. |
| Body | IBM Plex Sans | Prose, bullets. |
| Utility | IBM Plex Mono | Every figure, plus sigla, labels, dates, section markers. |

Every figure is `font-variant-numeric: tabular-nums` without exception. The whole
argument of this CV is measurement; the digits must column-align.

## Layout: the marginal gutter

A two-column typeset grid rather than a centred single column.

```
┌──────────┬────────────────────────────────────────────┐
│  gutter  │  main column                               │
│  ~7rem   │  ~34rem                                    │
│          │                                            │
│  PROFILE │  Full-stack engineer, three and a half     │
│          │  years, specialising in making large and   │
│          │  aging codebases maintainable...           │
│          │                                            │
│  EXP.    │  Utilifeed — Software Engineer             │
│  2025—   │  ────────────────────────────────────────  │
│          │  Surveyed the platform's 1,730 errors...   │
│    a     │                                            │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

The gutter carries mono section markers, dates and sigla. It is not decoration:
it holds the apparatus, which is why the main column can stay clean. Below
`48rem` the grid collapses and gutter content becomes small mono eyebrows above
their blocks.

## Signature: the trace strip

The one thing this page is remembered by, and the one place boldness is spent.

The single most impressive thing on this CV is root-causing a 177-second
type-check by reading a profiler trace. So the site's visual language *is* the
profiler trace. Every metric renders as a bar on a normalised axis where full
width is the original baseline and the filled portion is what remains:

```
COLD TYPE-CHECK      ████████████████████░░░░░░░░░░░░░░░░░░░░   177s → 36.6s   −79%
TYPE DEBT            ████████████████████████░░░░░░░░░░░░░░░░  1,730 → 1,066   −38%
MODULE ERRORS        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    264 → 0      −100%
TESTS, TWO MODULES   ████████████████████████████████████████     57 → 328    +475%
```

Because every bar is normalised to its own baseline, they share one axis and can
be read against each other at a glance: **shorter is more debt repaid.** This is
honest — it does not pretend seconds and error counts are the same unit — and it
is native to the subject rather than borrowed from a dashboard template.

The strip is the hero. It sits directly under the name and position line, before
any prose. A recruiter with twenty seconds sees magnitude before they read a word.

Growth metrics (`up-is-good`) fill toward the right in `--accent`; reduction
metrics empty toward the right in `--ink-3`. One glance distinguishes them.

## Second device: the method apparatus

Every figure is accountable, and that accountability is **typographic, not a UI
affordance**. Figures carry a superscript siglum — `a`, `b`, `c` — in mono. The
method notes collect in a small apparatus block at the foot of the section:

```
   ᵃ Type-check traces captured before and after, same machine, cold cache.
   ᵇ Full compiler error survey, re-audited three weeks after completion.
```

This is the apparatus of a critical edition, and it is doing real work: it dramatises
"I measure the debt and prove the result held" without a single sentence claiming it.

The apparatus is present in the HTML with no JavaScript. The React island only adds
collapse-on-mobile and the hover link between siglum and note. It must never be the
thing that makes the content exist.

## Motion

The bars draw once, on first scroll into view, staggered 60ms apart. That is the
entire motion budget for the site. `prefers-reduced-motion: reduce` renders them
at final width immediately.

No page-load sequence, no parallax, no hover-lift on cards, no fade-in on text.
The restraint is the point: a page arguing for long-term maintainability should
not look like it will feel dated in a year.

## Quality floor, not announced

- Responsive to 320px with no horizontal scroll.
- Visible keyboard focus on every interactive element, using `--accent`.
- Colour is never the only carrier of meaning — direction is also in the arrow
  and the sign on the delta.
- The apparatus and all content readable with JavaScript disabled.
- Print: the trace strip prints as figures only, bars and apparatus toggles hidden.

## The one accessory removed

An earlier version of this direction had the gutter also carrying a running
vertical rule and a per-section index number (01 / 02 / 03). Both are cut. The
sections are not a sequence — a reader does not need to know Experience is third —
so numbering them would be decoration pretending to be structure.
