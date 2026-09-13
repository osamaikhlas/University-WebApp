import { Badge } from "@/components/ui/Badge";

/**
 * Visible on every admin page until authentication/RBAC (docs/implementation-plan.md Phase 2)
 * is implemented. Admin routes currently have no login gate or server-side permission checks —
 * this banner exists so that fact is never silently missed (CLAUDE.md rules 5, 14).
 */
export function AdminNoAuthBanner() {
  return (
    <div className="border-b border-placeholder-border bg-placeholder-bg px-4 py-2 text-xs text-placeholder-foreground sm:px-6 lg:px-8">
      <Badge tone="placeholder">Development placeholder</Badge>{" "}
      Authentication and role-based access control are not implemented yet. Do not deploy
      this admin area publicly until Phase 2 (auth/RBAC/audit) is complete.
    </div>
  );
}
