---
name: accessibility
description: Use when building or modifying any page, form, or interactive component — enforces WCAG 2.1 A/AA as a baseline (docs/architecture.md §13), the axe-core e2e scan pattern in tests/e2e/accessibility.spec.ts, and manual checks axe can't catch.
---

# Accessibility skill

## Purpose

`docs/architecture.md` §13 sets WCAG 2.1 AA as the baseline for the public site (and a
reasonable bar for the admin CMS, since college staff use it daily). This is a public
institutional site — accessibility isn't optional polish here, and CLAUDE.md rule 11
("verify UI using browser automation where practical") applies directly to it via the
existing `tests/e2e/accessibility.spec.ts` axe-core suite.

## When it applies

- Any new or modified page under `src/app/(public)/**` or `src/app/admin/**`.
- Any new or modified form, table, dialog, navigation, or other interactive component.
- Any change to `src/components/layout/**` (header, nav, sidebar, skip link) or
  `src/components/ui/**` primitives, since these are reused everywhere.
- Uploading/associating new media (gallery, faculty photos) — alt text is a required field,
  not optional (CLAUDE.md rule-adjacent per `docs/architecture.md` §13).

## Project rules

1. **WCAG 2.1 A/AA is the baseline**, checked both automatically (axe-core, see below) and
   manually for what automated tools can't verify.
2. **Alt text on media is required, not optional** — enforce it at the form/schema level for
   gallery items, faculty/staff photos, and any other uploaded image referenced from public
   content, not merely encouraged in a UI hint.
3. **The public site's skip link must actually move keyboard focus**, not just visually
   scroll — see `src/components/SkipLink.tsx`'s documented Chromium gap (a same-page hash
   navigation scrolls but doesn't reliably focus a `tabindex="-1"` target). Reuse `SkipLink`
   rather than a plain `<a href="#main-content">`.
4. **`<dl>` content models must be valid** — `<dt>`/`<dd>` pairs are direct children of
   `<dl>`, never wrapped in an intermediate `<div>` grid cell (a real regression axe caught
   across several admin detail pages — see the fix note in
   `tests/e2e/accessibility.spec.ts`). Use a CSS grid on the `<dl>` itself for layout instead
   of adding wrapper elements.
5. **Every form control has a real, programmatically associated label** (`<label htmlFor>`),
   matching the [[frontend]] skill's form rules — never a placeholder standing in for a
   label.

## Implementation rules

- **New page "shape" → extend `tests/e2e/accessibility.spec.ts`.** The suite deliberately
  samples one page per shape (list, create form, edit/workflow form, detail view, dashboard)
  rather than every route, since pages sharing layout/component code share findings. Add a
  new page to the existing shape's list if it's the same shape as something already covered;
  add a new `test()`/`describe` block only if it's a genuinely new shape (e.g. a new kind of
  interactive widget no existing page has).
- **Run the axe scan locally before treating a UI change as done**:
  `npm run test:e2e -- accessibility` (or the specific spec) — it drives a real Chromium via
  Playwright against `npm run dev`, logging in as `super-admin` for admin pages
  (`prisma/seed.ts`'s `[DEV SEED]` accounts, `<role-slug>@example.invalid`).
- **axe-core is a floor, not a ceiling.** It catches missing labels, contrast failures,
  invalid ARIA, and structural issues like the `<dl>` one above — it does not catch whether
  alt text is *meaningful* rather than merely present, whether focus order makes sense,
  whether a custom widget is actually operable via keyboard, or whether error messages are
  announced to a screen reader. Verify these manually (keyboard-only pass: Tab/Shift+Tab
  through the page, Enter/Space to activate, Esc to dismiss) for any new interactive
  component (dropdown, modal, custom filter control).
- **Color/contrast**: use the existing design tokens (`src/app/globals.css`,
  [[frontend]] skill) rather than a one-off color — they're chosen to meet AA contrast
  against their paired background/foreground tokens; a new ad hoc color combination isn't
  guaranteed to.
- **Dynamic/inline styles used for accessible data** (e.g. a progress bar's `style={{
  width }}`, per `next.config.ts`'s CSP comment) still need a text alternative
  (`aria-valuenow`/visible percentage text), not just a visual bar.
- **Keyboard focus management** for anything that moves focus programmatically (the skip
  link, a form that submits and shows a success panel) should land focus somewhere sensible
  (the new content, not silently stay where it was or jump to `<body>`).

## Validation checklist

- [ ] `npm run test:e2e -- accessibility` passes for the page(s) touched (added to the suite
      if it's a new page shape).
- [ ] Every interactive element is reachable and operable via keyboard alone (manual check).
- [ ] Every form control has a real `<label htmlFor>`; every image conveying information has
      meaningful (not filename-derived or generic) alt text.
- [ ] No `<dl>` has a wrapper element between it and its `<dt>`/`<dd>` children.
- [ ] New colors/contrast combinations use existing design tokens, not ad hoc values.
- [ ] Any element that gains/loses visibility or moves focus does so in a way a screen reader
      user can follow (no silent DOM changes with no focus/announcement).
- [ ] `tests.json` updated if accessibility coverage for a module changed (CLAUDE.md rule 15,
      [[testing]] skill).

## Common mistakes

- Treating a green axe-core run as proof of full accessibility and skipping the manual
  keyboard pass — axe cannot detect "this custom dropdown is unusable without a mouse."
- Adding a `<div>` wrapper inside a `<dl>` for grid layout convenience, reintroducing the
  exact `dlitem`/`definition-list` violation already fixed once across the admin detail
  pages.
- Uploading gallery/faculty media with empty or filename-derived alt text ("IMG_2043.jpg")
  because the form doesn't actually require the field.
- Building a new page shape (e.g. a new kind of multi-step wizard) without adding a
  corresponding entry to `tests/e2e/accessibility.spec.ts`, leaving it permanently outside
  the automated scan's coverage.
- Re-implementing skip-to-content or focus-management logic instead of reusing `SkipLink` and
  re-triggering the Chromium focus bug it works around.
