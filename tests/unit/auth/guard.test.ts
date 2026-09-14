import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    // Mirrors Next.js's real `redirect()`, which throws to halt rendering — callers below
    // a redirect() call never execute in production, so tests should observe the same.
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { requirePermission, requireUser } from "@/lib/auth/guard";

function makeUser(permissions: Permission[]): AuthenticatedUser {
  return {
    id: "user-1",
    collegeId: "college-1",
    name: "Test User",
    email: "test@example.invalid",
    roles: ["EDITOR"],
    permissions: new Set(permissions),
  };
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(redirect).mockClear();
});

describe("requireUser (unauthenticated access)", () => {
  it("redirects to /login when there is no session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("requireUser (authorized access)", () => {
  it("returns the current user without redirecting when a session exists", async () => {
    const user = makeUser(["dashboard:view"]);
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    await expect(requireUser()).resolves.toBe(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requirePermission (unauthenticated access)", () => {
  it("redirects to /login, not /admin/unauthorized, when there is no session at all", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(requirePermission("users:manage")).rejects.toThrow("REDIRECT:/login");
  });
});

describe("requirePermission (unauthorized access)", () => {
  it("redirects to /admin/unauthorized when authenticated but lacking the permission", async () => {
    const user = makeUser(["dashboard:view", "content_general:view"]);
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    await expect(requirePermission("users:manage")).rejects.toThrow(
      "REDIRECT:/admin/unauthorized",
    );
  });
});

describe("requirePermission (authorized access)", () => {
  it("returns the user, without redirecting, when the permission is granted", async () => {
    const user = makeUser(["dashboard:view", "users:manage"]);
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    await expect(requirePermission("users:manage")).resolves.toBe(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});
