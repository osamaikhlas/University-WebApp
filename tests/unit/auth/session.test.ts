import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStore)),
}));

import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  createSession,
  destroySession,
  getCurrentUser,
} from "@/lib/auth/session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReturnValue(undefined);
});

describe("createSession", () => {
  it("stores only a hash of a high-entropy token, and sets it as an httpOnly cookie", async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({} as never);

    await createSession("user-1", { userAgent: "vitest", ipAddress: "127.0.0.1" });

    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    const createArgs = vi.mocked(prisma.session.create).mock.calls[0][0];
    expect(createArgs.data.userId).toBe("user-1");
    expect(createArgs.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createArgs.data.userAgent).toBe("vitest");
    expect(new Date(createArgs.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [cookieName, token, options] = cookieStore.set.mock.calls[0];
    expect(cookieName).toBe(SESSION_COOKIE_NAME);
    expect(hashToken(token)).toBe(createArgs.data.tokenHash);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
});

describe("destroySession", () => {
  it("revokes the matching database row and clears the cookie", async () => {
    cookieStore.get.mockReturnValue({ value: "raw-token" });

    await destroySession();

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("raw-token") },
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("still clears the cookie even if there was none to begin with", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await destroySession();

    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });
});

describe("getCurrentUser", () => {
  it("returns null when there is no session cookie at all", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("returns null and clears the cookie when the session token doesn't match any row", async () => {
    cookieStore.get.mockReturnValue({ value: "stale-token" });
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("returns null, deletes the row, and clears the cookie for an expired session", async () => {
    cookieStore.get.mockReturnValue({ value: "expired-token" });
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "user-1", status: "ACTIVE", roles: [] },
    } as never);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: "session-1" } });
    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("returns null for a valid, unexpired session belonging to a suspended user", async () => {
    cookieStore.get.mockReturnValue({ value: "some-token" });
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 10_000),
      user: { id: "user-1", status: "SUSPENDED", roles: [] },
    } as never);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the flattened user + permission set for a valid session", async () => {
    cookieStore.get.mockReturnValue({ value: "good-token" });
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        collegeId: "college-1",
        name: "Editor Person",
        email: "editor@example.invalid",
        status: "ACTIVE",
        roles: [
          {
            role: {
              name: "EDITOR",
              permissions: [
                { permission: { key: "dashboard:view" } },
                { permission: { key: "content_general:view" } },
              ],
            },
          },
        ],
      },
    } as never);

    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-1",
      collegeId: "college-1",
      name: "Editor Person",
      email: "editor@example.invalid",
      roles: ["EDITOR"],
      permissions: new Set(["dashboard:view", "content_general:view"]),
    });
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
