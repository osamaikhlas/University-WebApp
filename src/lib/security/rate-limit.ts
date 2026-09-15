import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Abuse protection for unauthenticated public write paths (currently just grievance
 * submission — src/app/(public)/grievance/actions.ts) that have no account/session to lock
 * out (unlike admin login, which already has `User.failedLoginAttempts`/`lockedUntil` — see
 * src/lib/auth/lockout.ts). Backed by `RateLimitEntry`, a generic fixed-window counter keyed
 * `"<scope>:<identifier>"` so any future unauthenticated endpoint can reuse it.
 *
 * The read-then-write here is not perfectly atomic under concurrent requests from the same
 * source within the same instant — an acceptable simplification for a low-traffic public form;
 * it never lets more than one or two extra requests through, it just can't be relied on for a
 * hard security boundary against a determined distributed attacker.
 */

/** SHA-256 hash of the caller's IP — never store the raw address (CLAUDE.md rule 6's privacy
 * spirit extends to not hoarding unnecessary PII, even for abuse tracking). */
export async function getClientIpHash(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export type RateLimitResult = { allowed: boolean };

export async function checkRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await prisma.rateLimitEntry.findUnique({ where: { key: params.key } });

  const windowExpired =
    !existing || now.getTime() - existing.windowStart.getTime() > params.windowMs;

  if (windowExpired) {
    await prisma.rateLimitEntry.upsert({
      where: { key: params.key },
      update: { count: 1, windowStart: now },
      create: { key: params.key, count: 1, windowStart: now },
    });
    return { allowed: true };
  }

  if (existing.count >= params.max) {
    return { allowed: false };
  }

  await prisma.rateLimitEntry.update({
    where: { key: params.key },
    data: { count: { increment: 1 } },
  });
  return { allowed: true };
}
