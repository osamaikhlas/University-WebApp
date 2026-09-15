import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    reviewPeriodSetting: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_REVIEW_PERIOD_DAYS,
  REVIEWABLE_MODULES,
  ReviewSettingsError,
  getReviewPeriodDays,
  getReviewPeriodSettingsDetail,
  getReviewPeriods,
  isReviewableModule,
  setReviewPeriodDays,
} from "@/lib/admin/review-settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.reviewPeriodSetting.findMany).mockResolvedValue([]);
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
});

describe("isReviewableModule", () => {
  it("accepts every declared module and rejects anything else", () => {
    for (const key of REVIEWABLE_MODULES) expect(isReviewableModule(key)).toBe(true);
    expect(isReviewableModule("documents")).toBe(false);
    expect(isReviewableModule("not-a-module")).toBe(false);
  });
});

describe("getReviewPeriods", () => {
  it("uses the default for every module with no override row", async () => {
    const periods = await getReviewPeriods();
    for (const key of REVIEWABLE_MODULES) expect(periods[key]).toBe(DEFAULT_REVIEW_PERIOD_DAYS);
  });

  it("uses an override's periodDays for the module it belongs to, default for the rest", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findMany).mockResolvedValue([
      { id: "s1", moduleKey: "notices", periodDays: 30, updatedAt: new Date(), updatedBy: null },
    ] as never);

    const periods = await getReviewPeriods();
    expect(periods.notices).toBe(30);
    expect(periods.faculty).toBe(DEFAULT_REVIEW_PERIOD_DAYS);
  });
});

describe("getReviewPeriodDays", () => {
  it("returns the default when no override exists", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findUnique).mockResolvedValue(null);
    expect(await getReviewPeriodDays("timetables")).toBe(DEFAULT_REVIEW_PERIOD_DAYS);
  });

  it("returns the override's periodDays when one exists", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findUnique).mockResolvedValue({ periodDays: 90 } as never);
    expect(await getReviewPeriodDays("timetables")).toBe(90);
  });
});

describe("setReviewPeriodDays", () => {
  it("rejects a non-positive period without writing anything", async () => {
    await expect(setReviewPeriodDays("notices", 0, "actor-1")).rejects.toThrow(ReviewSettingsError);
    expect(prisma.reviewPeriodSetting.upsert).not.toHaveBeenCalled();
  });

  it("rejects a non-integer period", async () => {
    await expect(setReviewPeriodDays("notices", 30.5, "actor-1")).rejects.toThrow(ReviewSettingsError);
  });

  it("rejects an unreasonably large period", async () => {
    await expect(setReviewPeriodDays("notices", 999999, "actor-1")).rejects.toThrow(ReviewSettingsError);
  });

  it("upserts the override and logs an audit entry with before/after periodDays", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findUnique).mockResolvedValue({ periodDays: 180 } as never);

    await setReviewPeriodDays("notices", 60, "actor-1");

    expect(prisma.reviewPeriodSetting.upsert).toHaveBeenCalledWith({
      where: { moduleKey: "notices" },
      create: { moduleKey: "notices", periodDays: 60, updatedBy: "actor-1" },
      update: { periodDays: 60, updatedBy: "actor-1" },
    });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor-1",
        action: "UPDATE",
        entityType: "ReviewPeriodSetting",
        entityId: "notices",
        before: { periodDays: 180 },
        after: { periodDays: 60 },
      }),
    );
  });

  it("before periodDays falls back to the default when there was no prior override", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findUnique).mockResolvedValue(null);

    await setReviewPeriodDays("notices", 60, "actor-1");

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ before: { periodDays: DEFAULT_REVIEW_PERIOD_DAYS } }),
    );
  });
});

describe("getReviewPeriodSettingsDetail", () => {
  it("marks a module with no row as not an override, using the default period", async () => {
    const detail = await getReviewPeriodSettingsDetail();
    const notices = detail.find((d) => d.moduleKey === "notices")!;
    expect(notices.isOverride).toBe(false);
    expect(notices.periodDays).toBe(DEFAULT_REVIEW_PERIOD_DAYS);
    expect(notices.updatedByName).toBeNull();
  });

  it("resolves the updater's display name for a module with an override", async () => {
    vi.mocked(prisma.reviewPeriodSetting.findMany).mockResolvedValue([
      { id: "s1", moduleKey: "notices", periodDays: 45, updatedAt: new Date("2026-01-01"), updatedBy: "user-1" },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "user-1", name: "Jane Principal" }] as never);

    const detail = await getReviewPeriodSettingsDetail();
    const notices = detail.find((d) => d.moduleKey === "notices")!;
    expect(notices.isOverride).toBe(true);
    expect(notices.periodDays).toBe(45);
    expect(notices.updatedByName).toBe("Jane Principal");
  });

  it("returns exactly one row per reviewable module", async () => {
    const detail = await getReviewPeriodSettingsDetail();
    expect(detail.map((d) => d.moduleKey).sort()).toEqual([...REVIEWABLE_MODULES].sort());
  });
});
