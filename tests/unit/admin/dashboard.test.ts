import { beforeEach, describe, expect, it, vi } from "vitest";

const MODELS_WITH_GROUPBY = [
  "collegeProfile",
  "department",
  "program",
  "faculty",
  "staff",
  "notice",
  "event",
  "seminar",
  "workshop",
  "academicCalendar",
  "timetable",
  "admission",
  "feeStructure",
  "enrollmentStatistic",
  "examination",
  "result",
  "document",
  "infrastructure",
  "activity",
  "club",
  "galleryAlbum",
  "scholarship",
  "studentSupport",
  "policy",
  "regulation",
  "affiliation",
  "contact",
  "location",
] as const;

const { prismaMock } = vi.hoisted(() => {
  const models: Record<string, { groupBy: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }> = {};
  for (const model of [
    "collegeProfile",
    "department",
    "program",
    "faculty",
    "staff",
    "notice",
    "event",
    "seminar",
    "workshop",
    "academicCalendar",
    "timetable",
    "admission",
    "feeStructure",
    "enrollmentStatistic",
    "examination",
    "result",
    "document",
    "infrastructure",
    "activity",
    "club",
    "galleryAlbum",
    "scholarship",
    "studentSupport",
    "policy",
    "regulation",
    "affiliation",
    "contact",
    "location",
  ]) {
    models[model] = { groupBy: vi.fn().mockResolvedValue([]), findMany: vi.fn().mockResolvedValue([]) };
  }
  return {
    prismaMock: {
      ...models,
      auditLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      reviewPeriodSetting: { findMany: vi.fn().mockResolvedValue([]) },
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/compliance", () => ({ getComplianceOverview: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getComplianceOverview } from "@/lib/compliance";
import {
  getComplianceSummary,
  getContentSummary,
  getDocumentExpiryWarnings,
  getRecentAuditActivity,
  getReviewWarnings,
  getStaleContent,
} from "@/lib/admin/dashboard";
import type { Permission } from "@/lib/auth/permissions";

function perms(...list: Permission[]): ReadonlySet<Permission> {
  return new Set(list);
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of MODELS_WITH_GROUPBY) {
    (prisma as never as Record<string, { groupBy: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }>)[
      model
    ].groupBy.mockResolvedValue([]);
    (prisma as never as Record<string, { groupBy: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }>)[
      model
    ].findMany.mockResolvedValue([]);
  }
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
  vi.mocked(prisma.reviewPeriodSetting.findMany).mockResolvedValue([]);
});

describe("getContentSummary", () => {
  it("only queries modules the caller holds :view on", async () => {
    await getContentSummary("college-1", perms("content_examinations:view"));

    expect(prisma.examination.groupBy).toHaveBeenCalled();
    expect(prisma.result.groupBy).toHaveBeenCalled();
    expect(prisma.department.groupBy).not.toHaveBeenCalled();
    expect(prisma.notice.groupBy).not.toHaveBeenCalled();
    expect(prisma.faculty.groupBy).not.toHaveBeenCalled();
  });

  it("sums PUBLISHED/DRAFT/SUBMITTED+UNDER_REVIEW across every visible module", async () => {
    vi.mocked(prisma.notice.groupBy).mockResolvedValue([
      { status: "PUBLISHED", _count: { _all: 3 } },
      { status: "DRAFT", _count: { _all: 2 } },
    ] as never);
    vi.mocked(prisma.event.groupBy).mockResolvedValue([
      { status: "PUBLISHED", _count: { _all: 1 } },
      { status: "SUBMITTED", _count: { _all: 4 } },
      { status: "UNDER_REVIEW", _count: { _all: 1 } },
    ] as never);

    const summary = await getContentSummary("college-1", perms("content_general:view"));

    expect(summary.published).toBe(4);
    expect(summary.draft).toBe(2);
    expect(summary.pendingReview).toBe(5);
  });

  it("never fabricates a number — an empty database yields all zeros", async () => {
    const summary = await getContentSummary("college-1", perms("content_general:view"));
    expect(summary).toEqual({ published: 0, draft: 0, pendingReview: 0 });
  });

  it("APPROVED and UPDATE_REQUIRED are counted in neither bucket (not published, not pending review)", async () => {
    vi.mocked(prisma.notice.groupBy).mockResolvedValue([
      { status: "APPROVED", _count: { _all: 5 } },
      { status: "UPDATE_REQUIRED", _count: { _all: 7 } },
    ] as never);

    const summary = await getContentSummary("college-1", perms("content_general:view"));
    expect(summary).toEqual({ published: 0, draft: 0, pendingReview: 0 });
  });
});

describe("getStaleContent", () => {
  // Notices, Faculty, and Academic Calendar are deliberately absent from this heuristic now
  // — they have real review-tracking instead (see getReviewWarnings below), so this covers
  // the remaining modules that don't (Department, Policy, Staff, ...).
  it("queries updatedAt strictly before the 180-day threshold", async () => {
    await getStaleContent("college-1", perms("content_general:view"));

    const call = vi.mocked(prisma.department.findMany).mock.calls[0]![0]! as {
      where: { collegeId: string; status: string; updatedAt: { lt: Date } };
    };
    expect(call.where).toMatchObject({ collegeId: "college-1", status: "PUBLISHED" });
    const before = call.where.updatedAt.lt;
    const daysAgo = (Date.now() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysAgo).toBeGreaterThan(179);
    expect(daysAgo).toBeLessThan(181);
  });

  it("merges rows from every visible module and sorts oldest-updated first", async () => {
    vi.mocked(prisma.department.findMany).mockResolvedValue([
      { id: "d1", name: "Newer stale department", updatedAt: new Date("2025-06-01"), publishedAt: null },
    ] as never);
    vi.mocked(prisma.policy.findMany).mockResolvedValue([
      { id: "p1", title: "Oldest stale policy", updatedAt: new Date("2024-01-01"), publishedAt: null },
    ] as never);

    const rows = await getStaleContent("college-1", perms("content_general:view"), 10);

    expect(rows.map((r) => r.title)).toEqual(["Oldest stale policy", "Newer stale department"]);
    expect(rows[0].module).toBe("Policies");
  });

  it("does not query modules without a natural title (e.g. fee structures)", async () => {
    await getStaleContent("college-1", perms("content_admissions:view"));
    expect(prisma.feeStructure.findMany).not.toHaveBeenCalled();
  });

  it("respects the permission filter, same as getContentSummary", async () => {
    await getStaleContent("college-1", perms("content_faculty:view"));
    expect(prisma.staff.findMany).toHaveBeenCalled();
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it("no longer covers Notices, Faculty, or Academic Calendar — they have real review tracking instead", async () => {
    await getStaleContent("college-1", perms("content_general:view", "content_faculty:view"));
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
    expect(prisma.academicCalendar.findMany).not.toHaveBeenCalled();
  });
});

describe("getReviewWarnings", () => {
  const publishedNotice = {
    id: "n1",
    title: "Old notice",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    publishedAt: new Date("2024-01-01"),
    lastReviewedAt: null,
    lastReviewedById: null,
  };

  it("only scans modules the caller holds :view on", async () => {
    await getReviewWarnings("college-1", perms("content_admissions:view"));
    expect(prisma.admission.findMany).toHaveBeenCalled();
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
  });

  it("flags a PUBLISHED notice overdue when its anchor date predates the configured period, using the default when no override exists", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([publishedNotice] as never);

    const summary = await getReviewWarnings("college-1", perms("content_general:view"));

    expect(summary.overdue).toHaveLength(1);
    expect(summary.overdue[0]).toMatchObject({ moduleKey: "notices", id: "n1", title: "Old notice" });
    expect(summary.countsByModule.notices).toBe(1);
  });

  it("respects a module-specific review period override instead of the default", async () => {
    const recentlyPublished = { ...publishedNotice, publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) };
    vi.mocked(prisma.notice.findMany).mockResolvedValue([recentlyPublished] as never);
    // A 5-day override means a notice published 10 days ago is overdue, even though the
    // 180-day default would not flag it.
    vi.mocked(prisma.reviewPeriodSetting.findMany).mockResolvedValue([
      { id: "s1", moduleKey: "notices", periodDays: 5, updatedAt: new Date(), updatedBy: null },
    ] as never);

    const summary = await getReviewWarnings("college-1", perms("content_general:view"));
    expect(summary.countsByModule.notices).toBe(1);
  });

  it("resolves the reviewer's display name from lastReviewedById", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { ...publishedNotice, lastReviewedAt: new Date("2024-01-01"), lastReviewedById: "user-1" },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "user-1", name: "Jane Reviewer" }] as never);

    const summary = await getReviewWarnings("college-1", perms("content_general:view"));
    expect(summary.overdue[0]?.reviewerName).toBe("Jane Reviewer");
  });

  it("countsByModule reflects the full overdue count even when the overdue list itself is capped by limit", async () => {
    const manyOldNotices = Array.from({ length: 5 }, (_, i) => ({ ...publishedNotice, id: `n${i}` }));
    vi.mocked(prisma.notice.findMany).mockResolvedValue(manyOldNotices as never);

    const summary = await getReviewWarnings("college-1", perms("content_general:view"), 2);
    expect(summary.overdue).toHaveLength(2);
    expect(summary.countsByModule.notices).toBe(5);
  });

  it("a record reviewed within the period is not flagged as overdue", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { ...publishedNotice, lastReviewedAt: new Date(), lastReviewedById: "user-1" },
    ] as never);

    const summary = await getReviewWarnings("college-1", perms("content_general:view"));
    expect(summary.overdue).toHaveLength(0);
    expect(summary.countsByModule.notices).toBe(0);
  });
});

const baseComplianceRow = {
  description: "",
  circularReference: "",
  ownerId: null,
  updatedAt: new Date(),
  rule: {} as never,
  evidenceCount: 0,
  lastVerification: null,
};

describe("getComplianceSummary", () => {
  it("computes percent as VERIFIED count / total, not average completeness", async () => {
    vi.mocked(getComplianceOverview).mockResolvedValue([
      { ...baseComplianceRow, id: "1", itemNumber: 1, title: "A", status: "VERIFIED", completeness: { percent: 100, checks: [] } },
      { ...baseComplianceRow, id: "2", itemNumber: 2, title: "B", status: "VERIFIED", completeness: { percent: 100, checks: [] } },
      { ...baseComplianceRow, id: "3", itemNumber: 3, title: "C", status: "IN_PROGRESS", completeness: { percent: 90, checks: [] } },
      { ...baseComplianceRow, id: "4", itemNumber: 4, title: "D", status: "NOT_APPLICABLE", completeness: { percent: 0, checks: [] } },
    ] as never);

    const summary = await getComplianceSummary();

    expect(summary.verifiedCount).toBe(2);
    expect(summary.totalCount).toBe(4);
    expect(summary.percent).toBe(50); // 2/4, not swayed by item 3's 90% completeness
  });

  it("excludes VERIFIED and NOT_APPLICABLE from needsAttention, ordered worst-first", async () => {
    vi.mocked(getComplianceOverview).mockResolvedValue([
      { ...baseComplianceRow, id: "1", itemNumber: 1, title: "Never started", status: "NOT_STARTED", completeness: { percent: 0, checks: [] } },
      { ...baseComplianceRow, id: "2", itemNumber: 2, title: "Regressed", status: "NEEDS_UPDATE", completeness: { percent: 80, checks: [] } },
      { ...baseComplianceRow, id: "3", itemNumber: 3, title: "Fine", status: "VERIFIED", completeness: { percent: 100, checks: [] } },
      { ...baseComplianceRow, id: "4", itemNumber: 4, title: "N/A", status: "NOT_APPLICABLE", completeness: { percent: 0, checks: [] } },
      { ...baseComplianceRow, id: "5", itemNumber: 5, title: "Awaiting review", status: "READY_FOR_REVIEW", completeness: { percent: 100, checks: [] } },
    ] as never);

    const summary = await getComplianceSummary();

    expect(summary.needsAttention.map((r) => r.title)).toEqual(["Regressed", "Awaiting review", "Never started"]);
  });
});

describe("getDocumentExpiryWarnings", () => {
  it("only returns PUBLISHED documents expiring within the warning window or already expired", async () => {
    await getDocumentExpiryWarnings("college-1");

    const call = vi.mocked(prisma.document.findMany).mock.calls[0]![0]!;
    expect(call.where).toMatchObject({
      collegeId: "college-1",
      status: "PUBLISHED",
      expiryDate: { not: null, lte: expect.any(Date) },
    });
  });

  it("flags an already-past expiryDate as expired, a future one as expiring soon", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { id: "d1", title: "Expired doc", expiryDate: past },
      { id: "d2", title: "Expiring soon doc", expiryDate: future },
    ] as never);

    const rows = await getDocumentExpiryWarnings("college-1");

    expect(rows.find((r) => r.id === "d1")!.isExpired).toBe(true);
    expect(rows.find((r) => r.id === "d2")!.isExpired).toBe(false);
  });
});

describe("getRecentAuditActivity", () => {
  it("falls back to a generic label when there is no actor (e.g. an anonymous public submission)", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      { id: "a1", actor: null, action: "CREATE", entityType: "Grievance", entityId: "g1", comment: null, createdAt: new Date() },
    ] as never);

    const rows = await getRecentAuditActivity();
    expect(rows[0].actorName).toBe("System / anonymous");
  });

  it("uses the actor's real name when present", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "a1",
        actor: { name: "Jane Reviewer" },
        action: "PUBLISH",
        entityType: "Notice",
        entityId: "n1",
        comment: null,
        createdAt: new Date(),
      },
    ] as never);

    const rows = await getRecentAuditActivity();
    expect(rows[0].actorName).toBe("Jane Reviewer");
  });
});
