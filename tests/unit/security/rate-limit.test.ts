import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitEntry: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpHash } from "@/lib/security/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getClientIpHash", () => {
  it("hashes the first address in x-forwarded-for", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    const hash = await getClientIpHash();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same IP", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    const a = await getClientIpHash();
    const b = await getClientIpHash();
    expect(a).toBe(b);
  });

  it("differs for different IPs", async () => {
    headersMock.mockResolvedValueOnce(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    const a = await getClientIpHash();
    headersMock.mockResolvedValueOnce(new Headers({ "x-forwarded-for": "203.0.113.8" }));
    const b = await getClientIpHash();
    expect(a).not.toBe(b);
  });
});

describe("checkRateLimit", () => {
  it("allows the first request and creates a fresh window", async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rateLimitEntry.upsert).mockResolvedValue({} as never);

    const result = await checkRateLimit({ key: "scope:id", max: 3, windowMs: 60_000 });

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitEntry.upsert).toHaveBeenCalled();
  });

  it("allows requests under the max within the current window", async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      key: "scope:id",
      count: 1,
      windowStart: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.rateLimitEntry.update).mockResolvedValue({} as never);

    const result = await checkRateLimit({ key: "scope:id", max: 3, windowMs: 60_000 });

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitEntry.update).toHaveBeenCalledWith({
      where: { key: "scope:id" },
      data: { count: { increment: 1 } },
    });
  });

  it("blocks once the count reaches max within the window", async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      key: "scope:id",
      count: 3,
      windowStart: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await checkRateLimit({ key: "scope:id", max: 3, windowMs: 60_000 });

    expect(result.allowed).toBe(false);
    expect(prisma.rateLimitEntry.update).not.toHaveBeenCalled();
  });

  it("resets the window once it has expired, even if the prior count was at the max", async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      key: "scope:id",
      count: 3,
      windowStart: new Date(Date.now() - 120_000),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.rateLimitEntry.upsert).mockResolvedValue({} as never);

    const result = await checkRateLimit({ key: "scope:id", max: 3, windowMs: 60_000 });

    expect(result.allowed).toBe(true);
    expect(prisma.rateLimitEntry.upsert).toHaveBeenCalledWith({
      where: { key: "scope:id" },
      update: { count: 1, windowStart: expect.any(Date) },
      create: { key: "scope:id", count: 1, windowStart: expect.any(Date) },
    });
  });
});
