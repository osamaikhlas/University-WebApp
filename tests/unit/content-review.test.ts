import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/admin/review-settings", () => ({ getReviewPeriodDays: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getReviewPeriodDays } from "@/lib/admin/review-settings";
import { computeReviewFreshness, getReviewDisplayData, markContentReviewed } from "@/lib/content-review";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeReviewFreshness", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("anchors on lastReviewedAt when present", () => {
    const record = {
      createdAt: new Date("2020-01-01"),
      updatedAt: new Date("2025-06-01"),
      publishedAt: new Date("2020-06-01"),
      lastReviewedAt: new Date("2025-12-01"),
    };
    const freshness = computeReviewFreshness(record, 180, now);
    expect(freshness.nextReviewDue).toEqual(new Date("2026-05-30"));
    expect(freshness.isOverdue).toBe(false);
  });

  it("falls back to publishedAt when never reviewed", () => {
    const record = {
      createdAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-06-01"),
      publishedAt: new Date("2025-01-01"),
      lastReviewedAt: null,
    };
    const freshness = computeReviewFreshness(record, 180, now);
    expect(freshness.nextReviewDue).toEqual(new Date("2025-06-30"));
    expect(freshness.isOverdue).toBe(true);
  });

  it("falls back to createdAt when never published or reviewed", () => {
    const record = {
      createdAt: new Date("2025-11-01"),
      updatedAt: new Date("2025-11-01"),
      publishedAt: null,
      lastReviewedAt: null,
    };
    const freshness = computeReviewFreshness(record, 180, now);
    expect(freshness.isOverdue).toBe(false);
  });

  it("a due date exactly at `now` is not yet overdue (strict less-than)", () => {
    const record = { createdAt: now, updatedAt: now, publishedAt: null, lastReviewedAt: null };
    const freshness = computeReviewFreshness(record, 0, now);
    expect(freshness.isOverdue).toBe(false);
  });
});

describe("markContentReviewed", () => {
  it("calls update with a fresh timestamp and the actor's id, then logs a MARK_REVIEWED audit entry", async () => {
    const update = vi.fn().mockResolvedValue({});

    await markContentReviewed({
      entityType: "Notice",
      entityId: "n1",
      actorId: "actor-1",
      update,
    });

    expect(update).toHaveBeenCalledWith({ lastReviewedAt: expect.any(Date), lastReviewedById: "actor-1" });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor-1",
        action: "MARK_REVIEWED",
        entityType: "Notice",
        entityId: "n1",
      }),
    );
  });
});

describe("getReviewDisplayData", () => {
  it("resolves the reviewer's name when lastReviewedById is set", async () => {
    vi.mocked(getReviewPeriodDays).mockResolvedValue(180);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Jane Reviewer" } as never);

    const data = await getReviewDisplayData("notices", {
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      publishedAt: new Date("2025-01-01"),
      lastReviewedAt: new Date("2025-06-01"),
      lastReviewedById: "user-1",
    });

    expect(data.reviewerName).toBe("Jane Reviewer");
    expect(data.periodDays).toBe(180);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-1" }, select: { name: true } });
  });

  it("reviewerName is null when the record has never been reviewed", async () => {
    vi.mocked(getReviewPeriodDays).mockResolvedValue(180);

    const data = await getReviewDisplayData("notices", {
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      publishedAt: null,
      lastReviewedAt: null,
      lastReviewedById: null,
    });

    expect(data.reviewerName).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
