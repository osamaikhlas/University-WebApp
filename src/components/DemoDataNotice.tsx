import { Alert } from "@/components/ui/Alert";

/**
 * Shown above any public section that is currently rendering seed/demo data
 * (`isPlaceholder: true` on the underlying row) instead of real college records — so a demo
 * value can never be mistaken for verified official content (CLAUDE.md rules 1, 13, 14).
 * Once real content replaces the seed data, the row's `isPlaceholder` flag goes to `false`
 * and this notice stops rendering for that section on its own.
 */
export function DemoDataNotice() {
  return (
    <Alert tone="warning" title="Demo content">
      This section is showing clearly-marked placeholder data for development purposes, not
      verified official information from the college.
    </Alert>
  );
}
