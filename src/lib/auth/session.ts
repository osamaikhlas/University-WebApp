import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Permission, RoleName } from "@/lib/auth/permissions";

/**
 * Server-side session handling.
 *
 * The session cookie carries only a high-entropy random token — never a role, permission,
 * or any other claim a client could tamper with (CLAUDE.md rule 5). Only a SHA-256 hash of
 * the token is persisted (mirroring `passwordHash`), so a stolen database dump cannot be
 * replayed as a live cookie, and the raw token never appears in logs/query output.
 */

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours — an admin work session.

export type AuthenticatedUser = {
  id: string;
  collegeId: string;
  name: string;
  email: string;
  roles: RoleName[];
  permissions: Set<Permission>;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Creates a session for `userId` and sets the session cookie on the current response.
 * Must be called from a Server Action or Route Handler (anywhere `cookies()` is mutable).
 */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: meta.userAgent ?? undefined,
      ipAddress: meta.ipAddress ?? undefined,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Ends the current session server-side (revokes the DB row) and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

function flattenPermissions(
  roles: { role: { name: string; permissions: { permission: { key: string } }[] } }[],
): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const userRole of roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key as Permission);
    }
  }
  return permissions;
}

/**
 * Resolves the current request's session cookie into a full user + permission set, always
 * re-read from the database (never trusted from the cookie itself). Returns `null` for any
 * missing/expired/revoked session or a non-active account, and opportunistically clears a
 * dead cookie so the browser doesn't keep resending it.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) {
      // Clean up an expired/orphaned row so it doesn't linger in the sessions table.
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Sliding activity timestamp only — never extends `expiresAt` itself, so an absolute
  // session lifetime is enforced regardless of how active the user is.
  await prisma.session
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    id: session.user.id,
    collegeId: session.user.collegeId,
    name: session.user.name,
    email: session.user.email,
    roles: session.user.roles.map((userRole) => userRole.role.name as RoleName),
    permissions: flattenPermissions(session.user.roles),
  };
}
