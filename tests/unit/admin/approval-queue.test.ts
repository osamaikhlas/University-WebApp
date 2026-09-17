import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: { findMany: vi.fn() },
    program: { findMany: vi.fn() },
    notice: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    seminar: { findMany: vi.fn() },
    workshop: { findMany: vi.fn() },
    academicCalendar: { findMany: vi.fn() },
    timetable: { findMany: vi.fn() },
    document: { findMany: vi.fn() },
    infrastructure: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
    galleryAlbum: { findMany: vi.fn() },
    galleryItem: { findMany: vi.fn() },
    scholarship: { findMany: vi.fn() },
    studentSupport: { findMany: vi.fn() },
    policy: { findMany: vi.fn() },
    regulation: { findMany: vi.fn() },
    affiliation: { findMany: vi.fn() },
    contact: { findMany: vi.fn() },
    collegeProfile: { findMany: vi.fn() },
    location: { findMany: vi.fn() },
    faculty: { findMany: vi.fn() },
    staff: { findMany: vi.fn() },
    club: { findMany: vi.fn() },
    admission: { findMany: vi.fn() },
    feeStructure: { findMany: vi.fn() },
    enrollmentStatistic: { findMany: vi.fn() },
    examination: { findMany: vi.fn() },
    result: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/content", () => ({ getPrimaryCollege: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { getApprovalQueue } from "@/lib/admin/approval-queue";
import type { Permission } from "@/lib/auth/permissions";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrimaryCollege).mockResolvedValue({ id: "college-1" } as never);
  // Every model defaults to an empty result; individual tests override the ones they exercise.
  for (const model of Object.values(prisma)) {
    if (typeof model === "object" && model && "findMany" in model) {
      vi.mocked((model as { findMany: ReturnType<typeof vi.fn> }).findMany).mockResolvedValue([]);
    }
  }
});

describe("getApprovalQueue", () => {
  it("returns nothing when there is no college yet", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue(null);
    const result = await getApprovalQueue(new Set<Permission>(["content_general:publish"]));
    expect(result).toEqual([]);
  });

  it("only queries domains the caller holds :publish for — never a domain it can't publish", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { id: "notice-1", title: "Pending Notice", status: "SUBMITTED", updatedAt: new Date("2026-01-02") },
    ] as never);

    // Only content_general:publish granted — content_faculty/admissions/examinations modules
    // (Faculty, Admissions, Examinations, ...) must never be queried at all.
    const result = await getApprovalQueue(new Set<Permission>(["content_general:publish"]));

    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
    expect(prisma.admission.findMany).not.toHaveBeenCalled();
    expect(prisma.examination.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({ id: "notice-1", title: "Pending Notice", moduleLabel: "Notices" }),
    ]);
  });

  it("sorts the combined queue newest-updated first", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { id: "notice-older", title: "Older", status: "SUBMITTED", updatedAt: new Date("2026-01-01") },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      { id: "event-newer", title: "Newer", status: "UNDER_REVIEW", updatedAt: new Date("2026-02-01") },
    ] as never);

    const result = await getApprovalQueue(new Set<Permission>(["content_general:publish"]));
    expect(result.map((r) => r.id)).toEqual(["event-newer", "notice-older"]);
  });
});
