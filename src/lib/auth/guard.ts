import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, type AuthenticatedUser } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

/**
 * Server-side route guards — the actual security boundary (CLAUDE.md rule 5). Every
 * protected admin page calls `requirePermission(...)` (or `requireUser()` for pages that
 * only need *any* authenticated admin) at the top of its Server Component, before reading
 * or rendering anything. This runs on the server for every request; there is no
 * client-side-only equivalent, and none of these checks can be bypassed by disabling
 * JavaScript or editing the DOM.
 */

/** Redirects to /login if there is no valid session; otherwise returns the current user. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Redirects to /login if unauthenticated, or to /admin/unauthorized if authenticated but
 * missing `permission`. Only returns when the user genuinely holds the permission.
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!hasPermission(user.permissions, permission)) {
    redirect("/admin/unauthorized");
  }
  return user;
}
