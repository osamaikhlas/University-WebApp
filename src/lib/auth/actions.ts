"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { LOCKOUT_DURATION_MS, MAX_FAILED_ATTEMPTS } from "@/lib/auth/lockout";

/**
 * Login/logout Server Actions.
 *
 * Login never reveals *why* a sign-in failed beyond "invalid email or password" (no user
 * enumeration) except for the lockout case, which is an accepted, documented trade-off
 * (docs/architecture.md §3: "Account lockout/backoff on repeated failed logins").
 *
 * A `'use server'` file may only export async functions (see
 * node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md) — the
 * `LoginState` type export below is erased at compile time so it doesn't count, but any
 * plain value export (e.g. a constant) would invalidate every export in this file. Keep
 * non-function exports (like the lockout thresholds) in their own module instead.
 */

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error: string | null;
};

async function requestMeta() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  return {
    userAgent: headerStore.get("user-agent"),
    ipAddress: forwardedFor ? forwardedFor.split(",")[0]?.trim() : null,
  };
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const meta = await requestMeta();
  const genericError = { error: "Invalid email or password." };

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || user.status !== "ACTIVE") {
    // Deliberately identical to the wrong-password path below — never reveal whether an
    // account exists for this email.
    await prisma.auditLog.create({
      data: {
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: email,
        ipAddress: meta.ipAddress,
      },
    });
    return genericError;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error:
        "This account is temporarily locked after repeated failed sign-in attempts. Try again later.",
    };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockingNow = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingNow ? 0 : failedLoginAttempts,
        lockedUntil: lockingNow ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        ipAddress: meta.ipAddress,
      },
    });
    return genericError;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id, meta);
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: meta.ipAddress,
    },
  });

  redirect("/admin");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();

  if (user) {
    await prisma.auditLog.create({
      data: { actorId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id },
    });
  }

  redirect("/login");
}
