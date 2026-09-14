import { logout } from "@/lib/auth/actions";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";

/**
 * Replaces the old AdminNoAuthBanner (Phase 1 placeholder) now that authentication and
 * RBAC are implemented — shows who is signed in, with which role(s), and a real
 * server-side logout action.
 */
export function AdminUserBar({ user }: { user: AuthenticatedUser }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-surface-muted px-4 py-2 text-xs sm:px-6 lg:px-8">
      <span className="text-foreground/70">
        Signed in as <span className="font-medium text-foreground">{user.name}</span> (
        {user.roles.join(", ") || "no role assigned"})
      </span>
      <form action={logout}>
        <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
          Sign out
        </Button>
      </form>
    </div>
  );
}
