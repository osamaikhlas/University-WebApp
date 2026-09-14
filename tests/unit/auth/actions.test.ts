import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/password", () => ({ verifyPassword: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({
  createSession: vi.fn(),
  destroySession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => (name === "user-agent" ? "vitest" : null),
    }),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth/actions";
import { MAX_FAILED_ATTEMPTS } from "@/lib/auth/lockout";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const baseUser = {
  id: "user-1",
  email: "editor@example.invalid",
  passwordHash: "hashed",
  status: "ACTIVE" as const,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login — input validation", () => {
  it("rejects malformed input without querying the database", async () => {
    const result = await login(
      { error: null },
      formData({ email: "not-an-email", password: "x" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("login — unauthenticated/unknown-account access", () => {
  it("returns a generic error for an email that doesn't exist, without revealing that", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await login(
      { error: null },
      formData({ email: "nobody@example.invalid", password: "whatever" }),
    );

    expect(result.error).toBe("Invalid email or password.");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LOGIN_FAILED", entityId: "nobody@example.invalid" }),
      }),
    );
    expect(createSession).not.toHaveBeenCalled();
  });

  it("returns the same generic error for a suspended account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...baseUser, status: "SUSPENDED" } as never);

    const result = await login({ error: null }, formData({ email: baseUser.email, password: "x" }));

    expect(result.error).toBe("Invalid email or password.");
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("login — account lockout", () => {
  it("refuses to even check the password once locked, with a distinct message", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      lockedUntil: new Date(Date.now() + 60_000),
    } as never);

    const result = await login({ error: null }, formData({ email: baseUser.email, password: "x" }));

    expect(result.error).toMatch(/temporarily locked/i);
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("locks the account once MAX_FAILED_ATTEMPTS is reached on a wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    await login({ error: null }, formData({ email: baseUser.email, password: "wrong" }));

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) },
    });
  });

  it("increments the failed-attempt counter without locking below the threshold", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...baseUser, failedLoginAttempts: 1 } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const result = await login({ error: null }, formData({ email: baseUser.email, password: "wrong" }));

    expect(result.error).toBe("Invalid email or password.");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { failedLoginAttempts: 2, lockedUntil: null },
    });
  });
});

describe("login — authorized access", () => {
  it("creates a session, resets lockout state, and redirects to /admin on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      failedLoginAttempts: 2,
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    await expect(
      login({ error: null }, formData({ email: baseUser.email, password: "correct" })),
    ).rejects.toThrow("REDIRECT:/admin");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: baseUser.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: expect.any(Date) },
    });
    expect(createSession).toHaveBeenCalledWith(baseUser.id, expect.any(Object));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGIN", actorId: baseUser.id }) }),
    );
    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});

describe("logout", () => {
  it("destroys the session, writes an audit entry, and redirects to /login", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      collegeId: "college-1",
      name: "Editor",
      email: baseUser.email,
      roles: ["EDITOR"],
      permissions: new Set(),
    });

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(destroySession).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGOUT", actorId: "user-1" }) }),
    );
  });

  it("still destroys the session and redirects even with no resolvable user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(destroySession).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
