# Public Design System

This documents the visual system introduced for the **public-facing website** in the
2026-09-16 redesign ("Lead Product Designer + Senior Frontend Engineer" brief). It exists
alongside, and is deliberately decoupled from, the plain functional design the **admin
portal** keeps using — see [Scope boundary](#scope-boundary) below before touching anything
here.

## Design objective

Move the public site from a generic administrative-portal look to a modern, editorial,
premium 2026-era education-institution website — strong typographic hierarchy, generous
whitespace, restrained color/shadow/radius use, varied section composition (not "heading +
paragraph + 3 cards" repeated down the page) — while every word of institutional content
still comes from the database through the existing CMS/publish-gate pipeline (CLAUDE.md
rules 2–4), never hard-coded.

## Scope boundary

**The admin portal was intentionally not touched.** `src/components/ui/**` (`Button`,
`Card`, `Badge`, `EmptyState`, `PageHeading`, `Breadcrumbs`, `Pagination`, `Table`, `Alert`,
`Skeleton`, `Container`) is shared by 150+ admin pages — none of those files, nor any admin
route under `src/app/admin/**`, were modified. Instead, every public-site primitive lives in
a **parallel, public-only system**:

- `src/components/public/**` — new design-system primitives (below).
- `src/components/layout/Public*.tsx` — header/footer/page-shell (public-only already;
  restyled in place).
- `src/components/home/**` — homepage sections (public-only already; restyled in place).

If you're building a *new* admin page, keep using `src/components/ui/**` and
`src/components/admin/**` exactly as before — nothing here applies there.

## Tokens (`src/app/globals.css`)

All new tokens are prefixed `--pub-*` and are additive — the original shared tokens
(`--brand`, `--surface`, `--border-subtle`, …) are untouched and still drive the admin
portal's own (separate) light/dark behavior.

| Group | Tokens | Notes |
|---|---|---|
| Primary (navy) | `--pub-navy-950` … `--pub-navy-600` | Deep academic navy — headlines, primary CTA, dark section backgrounds. |
| Secondary (teal) | `--pub-teal-700/600/500` | Used sparingly — icons, gradient accents, dividers. Never a large fill. |
| Accent (gold) | `--pub-gold-600/500/400` | CTAs, "demo" markers, active/emphasis states only. `--pub-gold-600` is the *text*-safe variant (darkened specifically to clear 4.5:1 against `--pub-surface-alt` — see the accessibility note below); `-500`/`-400` are for backgrounds/borders/gradients, not text. |
| Neutral | `--pub-cream`, `--pub-cream-deep`, `--pub-surface`, `--pub-surface-alt`, `--pub-border`, `--pub-border-strong` | Warm off-white backgrounds — never pure white. `-deep`/`-alt` give alternating "layered section" bands their contrast without a hard color change. |
| Text | `--pub-ink`, `--pub-ink-soft`, `--pub-ink-muted`, `--pub-ink-on-navy`, `--pub-ink-on-navy-muted` | Strong dark neutral, never pure black. `-muted` was darkened from a more typical gray-500 specifically because it failed AA against `--pub-cream-deep` — see below. |
| Typography | `--pub-font-display` (Fraunces, via `next/font/google` in `src/app/layout.tsx`), `--pub-font-sans` (Geist, already loaded) | Display face is opt-in via the `.pub-font-display` class — never inherited globally, so it can't leak into admin. |
| Radius | `--pub-radius-sm/md/lg/full` | Restrained — no maximal rounding anywhere. |
| Shadow | `--pub-shadow-sm/md/lg` | Soft/diffused, not heavy drop shadows. |
| Motion | `--pub-ease`, `--pub-duration-fast/base/slow` | One eased curve, three durations, used consistently for hover/scroll transitions. |
| Container | `--pub-container-narrow/normal/wide` | 736px / 1280px / 1440px — see `PublicContainer`. |
| Section rhythm | `--pub-section-y`, `--pub-section-y-tight` | `clamp()`-based vertical section padding, so spacing scales with viewport instead of jumping at breakpoints. |

**The public site is a fixed light theme, on purpose** (`.pub-root { color-scheme: light; }`
in globals.css, applied by `src/app/(public)/layout.tsx`). It does **not** mirror
`prefers-color-scheme: dark` the way the admin portal's shared tokens do. This was a
deliberate fix, not an oversight: an earlier pass gave `--pub-*` a dark-mode variant, and
under a dark OS theme every `--pub-navy-*`/`--pub-gold-*` text token (designed for a light
background) went low-contrast against the flipped dark background. A half-dark theme with
contrast bugs is worse than one well-executed light theme, and the brief never asked for
dark mode. `.pub-root` also re-pins the *shared* tokens (`--background`, `--surface`,
`--border-subtle`, `--placeholder-*`, `--info-*`, …) back to their light `:root` values, so
public inner pages that still render through shared `ui/*` components (anything not yet
individually redesigned — see [What's deferred](#whats-deferred)) stay readable instead of
flipping dark under the same OS setting. This has zero effect on the admin portal, which has
no `.pub-root` ancestor.

**Accessibility-driven color changes.** `tests/e2e/accessibility.spec.ts` (axe-core) caught
two real contrast failures during this redesign, both now fixed at the token level:
`--pub-ink-muted` (breadcrumb "Home" link against `--pub-cream-deep`) and `--pub-gold-600`
(the small "demo" text marker against a 10%-opacity gold pill composited over
`--pub-surface-alt`, ~4.48:1 — just under AA's 4.5:1). Both are now verified ≥5.4:1 against
their worst-case background. If you introduce a new text/background pairing using these
tokens, don't assume the "on white" contrast holds — check it against `--pub-surface-alt`
and `--pub-cream-deep` too, since those are measurably darker.

## Components (`src/components/public/**`)

| Component | Purpose |
|---|---|
| `PublicContainer` | Width-constrained wrapper (`size="narrow" \| "normal" \| "wide"`). Not the same component as `ui/Container` (narrower, admin-shared). |
| `Eyebrow` | Small uppercase label with a leading rule (`tone="navy" \| "gold" \| "on-navy"`). |
| `SectionHeading` | The recurring section header: eyebrow + large `pub-font-display` headline + optional description + optional "View all →" link. **`id` is a required prop** — pass it matching the enclosing `<section aria-labelledby="…">`, or the section's accessible name silently breaks (a real bug this redesign hit and fixed — see `git blame` on this file's sections for the fix). |
| `ArrowLink` | The "Explore →" text-link pattern; arrow nudges right on hover via CSS transform, respects `prefers-reduced-motion`. |
| `CTAButton` | The one public-site button system (`variant="primary" \| "secondary" \| "ghost-on-navy"`). Not `ui/Button`. |
| `StatBlock` | Large-number/label pair for the About section's stats row; supports an inline `(demo)` marker via `isPlaceholder`. |
| `MediaSlot` | Placeholder "image" — see [Imagery](#imagery). |
| `PublicDemoNotice` | Public-styled equivalent of `DemoDataNotice` — same meaning (CLAUDE.md rules 1/13/14), different visual language (a compact gold pill, not a full-width alert banner). |
| `PublicCard` | Restrained-border/soft-shadow card for the rare cases a bounded surface genuinely helps (a notice tile, a program preview) — reach for a plain row/list first; the brief explicitly warns against "everything inside cards." |
| `Reveal` | Client component: fades/slides content in once it scrolls into view via `IntersectionObserver`. Entirely inert under `prefers-reduced-motion: reduce` (content is server-rendered and fully visible without it — see the CSS comment in `globals.css`). Currently available but not wired into every section; use sparingly. |

### A pitfall worth knowing: `hidden` vs. a component's own `inline-flex`

`ArrowLink` and `CTAButton` both hardcode `inline-flex` in their base classes. Passing
`className="hidden sm:inline-flex"` (or similar) *directly* to either of them does **not**
reliably hide them below the breakpoint — Tailwind's cascade is resolved by the *generated
CSS's* rule order, not by JSX prop order, so the component's own `inline-flex` can beat an
externally-passed `hidden`. This caused a real bug (the header's "Admissions" button and
`SectionHeading`'s desktop "View all" link both stayed visible on mobile) that browser
testing caught and fixed. **The fix: wrap the component in a plain element and put the
responsive `hidden`/`inline-flex` classes on the wrapper instead**, e.g.:

```tsx
<span className="hidden sm:inline-flex">
  <ArrowLink href="/academics">View all</ArrowLink>
</span>
```

A plain `<span>`/`<div>` has no conflicting base classes of its own, so there's nothing for
the responsive utility to lose to.

## Layout components

- `src/components/layout/PublicHeader.tsx` — utility bar (hidden once compact-on-scroll, and
  on small screens) + main nav + search + Admissions CTA + `MobileNav`. Scroll-aware
  compact/blur state is handled by `HeaderScrollShell` (client component) via a
  `data-scrolled` attribute + `group-data-[scrolled=true]:` Tailwind variants — **not** a
  render-prop function, because a Server Component (`PublicHeader`) cannot pass a function as
  children to a Client Component (an earlier version tried this and threw "Functions are not
  valid as a child of Client Components" at runtime; caught via browser console during
  testing).
- `src/components/layout/PublicFooter.tsx` — 5-column footer (College / Academics /
  Admissions / Student Life / Resources), grouped from `PUBLIC_NAV_LINKS`
  (`src/lib/navigation.ts`) — every link points at a real route; no social links are
  fabricated (no such data exists in the CMS yet, and inventing placeholder URLs would
  violate CLAUDE.md rule 1). No `/privacy`/`/accessibility` links either, for the same
  reason — those pages don't exist yet.
- `src/components/layout/PublicPageShell.tsx` — the shared intro band (breadcrumb + eyebrow +
  large headline + description) every public inner page renders through. Redesigning this
  one file gives **every** public route (including the ~19 not yet individually redesigned —
  see below) the elevated header treatment immediately, even before its own body content is
  touched.

## Imagery

The CSP's `img-src` is `'self' blob: data:` only (`next.config.ts`) and this project must
never fabricate real photographs of the college (project instruction). `MediaSlot`
(`src/components/public/MediaSlot.tsx`) is the placeholder in its place: a generated
gradient/dot-texture composition per "scene" (`campus`, `library`, `lab`, `students`,
`faculty`, `event`, `sports`, `seminar`), with a visible caption naming what real photography
belongs there (e.g. "Central Library — image placeholder") — the pattern itself is
`aria-hidden`, since the caption is the real accessible content. When real photography is
supplied, swap `MediaSlot`'s usage for a `next/image` reading from the college's
`Media`/`Document` store; every call site's `scene`/`ratio`/`className` API is designed to
stay a drop-in replacement.

## What's deferred

Per the brief's own phased process (§23 — "do NOT immediately rewrite every page"), this
pass covered: the design system, global header/footer, the homepage (all ~16 sections), and
`PublicPageShell` (which lifts every inner page's intro band). **Not yet individually
redesigned**: the body content of `/academics`, `/programs`, `/departments`, `/faculty`,
`/staff`, `/admissions`, `/notices`, `/events`, `/gallery`, `/examinations`, `/results`,
`/scholarships`, `/student-support`, `/rules`, `/affiliation`, `/grievance`, `/contact`,
`/downloads`, `/search` — these still render through the shared `ui/*` components below
`PublicPageShell`'s intro band (which is why `.pub-root`'s token re-pinning matters — see
above). Each is a real follow-up task: faculty needs a portrait-grid directory with
filters/search, admissions needs a conversion-focused timeline layout, notices/gallery need
their own editorial/masonry treatments, etc., per the original brief's per-page sections.

## Verification performed

- `npm run typecheck`, `npm run lint`, `npm test` (650/650 unit tests) — all clean.
- `tests/e2e/accessibility.spec.ts` — all 34 pages (10 public + 24 admin) pass with zero
  axe-core violations, including the two contrast bugs found and fixed during this pass.
  Admin pages passing confirms zero visual/accessibility regression there.
- `tests/e2e/homepage.spec.ts`, `public-content.spec.ts`, `public-site.spec.ts`,
  `auth.spec.ts` — updated where they asserted on now-intentionally-changed section
  headings/copy or on stale seed-data strings from earlier in this project's history, then
  re-verified green. `auth.spec.ts` passing end-to-end confirms the admin portal's behavior
  (not just its look) is unaffected.
- Real browser verification (Claude in Chrome) at desktop (1440px effective) and a genuine
  mobile viewport (~600–730px effective, via a fresh tab — window resize didn't propagate
  reliably to an already-open tab in this environment) — homepage scrolled top-to-bottom,
  one inner page (`/about`), the mobile nav panel opened/closed, and `/admin` confirmed
  pixel-for-pixel unchanged from its pre-redesign dark/dense/functional look.
- Found and fixed three real bugs this way that neither `tsc` nor `eslint` catch: the
  Server→Client function-as-children crash (above), the `hidden`-vs-`inline-flex` cascade
  bug (above), and the two contrast failures (above) — a reminder that a clean typecheck/lint
  pass is necessary, not sufficient, for a visual change like this one.
