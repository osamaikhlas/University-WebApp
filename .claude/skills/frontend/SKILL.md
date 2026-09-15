---
name: frontend
description: Use when building or modifying a page, form, or component under src/app/** or src/components/** — enforces this app's Server/Client Component split, useActionState form pattern, shared UI primitives, and design-token usage.
---

# Frontend skill

## Purpose

Public pages and the admin CMS share one component system and one styling approach (Tailwind
v4 tokens in `src/app/globals.css`, primitives in `src/components/ui/**`). This skill keeps
new UI consistent with that system and with the App Router conventions the rest of the app
already follows, so pages don't each reinvent form handling, status display, or placeholder
messaging.

## When it applies

- Adding or modifying a page under `src/app/(public)/**` or `src/app/admin/**`.
- Adding or modifying a component under `src/components/**`.
- Any form that submits data (wiring a `<form>` to a Server Action).
- Any change to `src/app/globals.css` design tokens or shared layout components
  (`PublicHeader`, `AdminSidebar`, `PublicPageShell`).

## Project rules

1. **Server Components by default.** A component is a Server Component unless it needs
   interactivity (state, effects, event handlers, browser APIs) — only then does it get
   `"use client"` at the top, and only that component (push the boundary as low as possible:
   e.g. `GrievanceForm.tsx` is a client component, but the `page.tsx` that renders it stays a
   Server Component).
2. **Content is data, rendered, not hard-coded** (CLAUDE.md rule 2). A page fetches through
   its domain's `src/lib/**` query helper ([[architecture]] skill) — no inline institutional
   facts in a component.
3. **Placeholder/draft content is always visibly marked** (CLAUDE.md rules 13, 14) — use
   `DemoDataNotice`/`PagePlaceholder` (`src/components/**`) wherever `isPlaceholder` is true
   or a section has no published content yet, rather than silently omitting the section or
   rendering placeholder text indistinguishable from real content.
4. **No client-side-only access control** (CLAUDE.md rule 5). Conditionally hiding a nav
   link or button for a role is a UX nicety on top of a server-side `requirePermission()`
   check ([[security]] skill) — never the only gate.
5. **Accessible by default** — see the [[accessibility]] skill before shipping a new
   interactive component or form.

## Implementation rules — forms

Every data-submitting form in this app follows the same shape (see
`src/app/(public)/grievance/GrievanceForm.tsx` for the full pattern):

- Client component (`"use client"`) using `useActionState(actionFn, initialState)` from
  `react`, destructuring `[state, formAction, isPending]`.
- `initialState` is a concrete, typed value matching the action's return type
  (`{ status: "idle", error: null }`), imported from the same `actions.ts` the action lives
  in — the state type is defined and exported there, not duplicated in the component.
- `<form action={formAction}>` — never a manual `onSubmit` + `fetch`/`prisma` call from the
  client.
- Render `state.status === "success"` / `"error"` branches explicitly; show `state.error` via
  `<Alert tone="danger">`("`src/components/ui/Alert.tsx`) rather than a generic failure
  message.
- Disable the submit control while `isPending` for actions with a visible side effect
  (email sends, file uploads) so users don't double-submit.
- Every `<input>`/`<textarea>`/`<select>` has a real, associated `<label htmlFor>` — no
  placeholder-text-as-label.
- A honeypot field on unauthenticated public forms (grievance, contact) mirrors the pattern
  in `GrievanceForm.tsx`: visually and programmatically hidden (`aria-hidden`, `tabIndex={-1}`,
  clipped/zero-size on the input itself, not just a wrapper), never a real accessible field.

## Implementation rules — styling and components

- **Use the shared primitives first** (`src/components/ui/**`: `Button`/`LinkButton`, `Card`,
  `Table`, `Badge`, `Alert`, `EmptyState`, `Skeleton`, `Pagination`, `Breadcrumbs`,
  `PageHeading`, `Container`) before writing new one-off markup for something these already
  cover.
- **Style via design tokens**, not literal colors — reference the CSS custom properties in
  `src/app/globals.css` (`--brand`, `--surface`, `--border-subtle`, `--placeholder-*`,
  `--info-*`/`--success-*`/`--warning-*`/`--danger-*`) through their Tailwind
  `bg-*`/`text-*`/`border-*` classes, so a future real-branding pass (rule 1/13 — no
  branding exists yet) only touches the token definitions, not every component.
- **`--placeholder-*` tones mean "this is demo data," never a message severity** — use
  `--info-*`/`--success-*`/`--warning-*`/`--danger-*` (via `Alert`'s `tone` prop) for
  status/feedback messaging instead.
- **Admin status/workflow UI reuses `src/components/admin/**`** (`StatusBadge`,
  `WorkflowActions`, `ComplianceStatusBadge`, `GrievanceStatusBadge`, `ReviewPanel`) rather
  than a module-local badge/action-button implementation — see the [[cms]]/[[compliance]]
  skills for the states these render.
- **`clsx`** is the convention for conditional class composition (see `Button.tsx`); don't
  introduce a second class-merging utility.
- Prefer a real `<Link>`/`LinkButton` over a `<button onClick={router.push(...)}>` for
  navigation — keeps it a crawlable, keyboard/AT-correct anchor (see `LinkButton`'s own
  rationale comment).

## Validation checklist

- [ ] New interactive logic is isolated to the smallest possible `"use client"` boundary;
      the page/layout around it stays a Server Component.
- [ ] Form uses `useActionState` + `formAction`, with a typed state imported from the
      corresponding `actions.ts`.
- [ ] Every form control has a real associated label; errors render via `Alert`.
- [ ] Placeholder/missing content uses `DemoDataNotice`/`PagePlaceholder`, not silent omission
      or unmarked filler text.
- [ ] No role/permission-based UI hiding is presented as the security boundary — the
      underlying route/action is server-guarded regardless.
- [ ] New styling references existing design tokens/Tailwind classes, not new hard-coded
      color literals.
- [ ] Reused an existing `src/components/ui/**` or `src/components/admin/**` primitive where
      one already fits, instead of duplicating it.
- [ ] Ran the feature in a browser (dev server) to confirm it renders and behaves as intended
      (CLAUDE.md rule 11) — see the [[run]] skill and [[accessibility]] skill for verification.

## Common mistakes

- Marking an entire page `"use client"` because one small piece of it needs interactivity,
  losing server rendering (and the SEO/first-paint benefits `docs/architecture.md` §14 calls
  out) for the whole tree instead of extracting just the interactive part.
- Wiring a form to a client-side `fetch`/`onSubmit` handler instead of a Server Action +
  `useActionState`, bypassing the established validate/authorize/audit pipeline
  ([[backend]] skill) or duplicating it client-side.
- Hard-coding a hex color instead of a design token, creating drift the moment real branding
  is supplied.
- Building a new status pill/workflow button from scratch instead of reusing
  `StatusBadge`/`WorkflowActions`, producing inconsistent visual states across modules.
- Hiding a nav link for a role and treating that as sufficient access control, with no
  corresponding server-side guard on the route itself.
- Leaving a section with no published content simply blank instead of using
  `PagePlaceholder`, which reads to a visitor as "nothing exists here" rather than "not yet
  published."
