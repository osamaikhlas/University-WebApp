import { beforeEach, describe, expect, it, vi } from "vitest";

const college = { id: "college-1", isPlaceholder: true };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    college: { findFirst: vi.fn() },
    notice: { findMany: vi.fn(), findFirst: vi.fn() },
    faculty: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    program: { findMany: vi.fn() },
    scholarship: { findMany: vi.fn() },
    policy: { findMany: vi.fn() },
    result: { findMany: vi.fn() },
    document: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getDocuments,
  getFacultyMembers,
  getImportantAnnouncement,
  getNotices,
  getResults,
  getUpcomingEvents,
  searchSite,
} from "@/lib/content";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.college.findFirst).mockResolvedValue(college as never);
});

describe("getNotices", () => {
  it("only queries PUBLISHED notices for the primary college", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
    await getNotices();

    expect(prisma.notice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collegeId: college.id, status: "PUBLISHED" },
      }),
    );
  });

  it("returns an empty array without querying content tables when there is no college yet", async () => {
    vi.mocked(prisma.college.findFirst).mockResolvedValue(null);
    const result = await getNotices();
    expect(result).toEqual([]);
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
  });
});

describe("getImportantAnnouncement", () => {
  it("only considers notices that haven't expired (null or future expiryDate)", async () => {
    vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);
    await getImportantAnnouncement();

    const call = vi.mocked(prisma.notice.findFirst).mock.calls[0]![0]!;
    expect(call.where).toMatchObject({
      collegeId: college.id,
      status: "PUBLISHED",
      OR: [{ expiryDate: null }, { expiryDate: { gte: expect.any(Date) } }],
    });
  });

  it("returns null without querying when there is no college yet", async () => {
    vi.mocked(prisma.college.findFirst).mockResolvedValue(null);
    const result = await getImportantAnnouncement();
    expect(result).toBeNull();
    expect(prisma.notice.findFirst).not.toHaveBeenCalled();
  });
});

describe("getUpcomingEvents", () => {
  it("only includes events starting now or later, soonest first", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    await getUpcomingEvents(3);

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          collegeId: college.id,
          status: "PUBLISHED",
          startDate: { gte: expect.any(Date) },
        },
        orderBy: { startDate: "asc" },
        take: 3,
      }),
    );
  });
});

describe("getFacultyMembers", () => {
  it("filters to PUBLISHED and includes department", async () => {
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([]);
    await getFacultyMembers();

    expect(prisma.faculty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collegeId: college.id, status: "PUBLISHED" },
        include: { department: true },
      }),
    );
  });
});

describe("getResults", () => {
  it("requires both status PUBLISHED and isPublic true", async () => {
    vi.mocked(prisma.result.findMany).mockResolvedValue([]);
    await getResults();

    expect(prisma.result.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collegeId: college.id, status: "PUBLISHED", isPublic: true },
      }),
    );
  });
});

describe("getDocuments", () => {
  it("only returns PUBLISHED documents for the college", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocuments();

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { collegeId: college.id, status: "PUBLISHED" } }),
    );
  });
});

describe("searchSite", () => {
  it("returns no results and issues no queries for a blank query", async () => {
    const results = await searchSite("   ");
    expect(results).toEqual([]);
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
  });

  it("only searches PUBLISHED rows and maps each module to its own href", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { title: "Sample Notice", body: "body text" },
    ] as never);
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    vi.mocked(prisma.program.findMany).mockResolvedValue([]);
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scholarship.findMany).mockResolvedValue([]);
    vi.mocked(prisma.policy.findMany).mockResolvedValue([]);

    const results = await searchSite("Sample");

    expect(prisma.notice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ collegeId: college.id, status: "PUBLISHED" }),
      }),
    );
    expect(results).toEqual([
      { type: "Notice", title: "Sample Notice", snippet: "body text", href: "/notices" },
    ]);
  });
});
