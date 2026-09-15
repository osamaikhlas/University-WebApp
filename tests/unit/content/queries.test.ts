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
    regulation: { findMany: vi.fn() },
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
  isDocumentPubliclyVisible,
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
  it("only returns PUBLISHED documents for the college, within their publish/expiry window", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocuments();

    const call = vi.mocked(prisma.document.findMany).mock.calls[0]![0]!;
    expect(call.where).toMatchObject({
      collegeId: college.id,
      status: "PUBLISHED",
      AND: [
        { OR: [{ publishDate: null }, { publishDate: { lte: expect.any(Date) } }] },
        { OR: [{ expiryDate: null }, { expiryDate: { gte: expect.any(Date) } }] },
      ],
    });
  });
});

describe("isDocumentPubliclyVisible", () => {
  it("is false for anything other than PUBLISHED", () => {
    expect(
      isDocumentPubliclyVisible({ status: "DRAFT", publishDate: null, expiryDate: null }),
    ).toBe(false);
    expect(
      isDocumentPubliclyVisible({ status: "ARCHIVED", publishDate: null, expiryDate: null }),
    ).toBe(false);
  });

  it("is false when publishDate is in the future", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      isDocumentPubliclyVisible({ status: "PUBLISHED", publishDate: future, expiryDate: null }),
    ).toBe(false);
  });

  it("is false when expiryDate is in the past", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      isDocumentPubliclyVisible({ status: "PUBLISHED", publishDate: null, expiryDate: past }),
    ).toBe(false);
  });

  it("is true for PUBLISHED with no dates, or dates within the current window", () => {
    expect(
      isDocumentPubliclyVisible({ status: "PUBLISHED", publishDate: null, expiryDate: null }),
    ).toBe(true);
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      isDocumentPubliclyVisible({ status: "PUBLISHED", publishDate: past, expiryDate: future }),
    ).toBe(true);
  });
});

describe("searchSite", () => {
  function mockAllTablesEmpty() {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    vi.mocked(prisma.program.findMany).mockResolvedValue([]);
    vi.mocked(prisma.faculty.findMany).mockResolvedValue([]);
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    vi.mocked(prisma.policy.findMany).mockResolvedValue([]);
    vi.mocked(prisma.regulation.findMany).mockResolvedValue([]);
  }

  beforeEach(() => {
    mockAllTablesEmpty();
  });

  it("returns no results and issues no queries for a blank query", async () => {
    const response = await searchSite({ query: "   " });
    expect(response).toEqual({ results: [], totalCount: 0, totalPages: 1, page: 1 });
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
  });

  it("only searches PUBLISHED rows and maps each module to its own href", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { title: "Sample Notice", body: "body text" },
    ] as never);

    const response = await searchSite({ query: "Sample" });

    expect(prisma.notice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ collegeId: college.id, status: "PUBLISHED" }),
      }),
    );
    expect(response.results).toEqual([
      {
        type: "notices",
        typeLabel: "Notices",
        title: "Sample Notice",
        snippet: "body text",
        href: "/notices",
      },
    ]);
    expect(response.totalCount).toBe(1);
  });

  it("searches documents within their publish/expiry window", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([
      { title: "Sample Circular", description: "a circular" },
    ] as never);

    await searchSite({ query: "Sample" });

    const call = vi.mocked(prisma.document.findMany).mock.calls[0]![0]!;
    expect(call.where).toMatchObject({
      collegeId: college.id,
      status: "PUBLISHED",
      AND: [
        { OR: [{ publishDate: null }, { publishDate: { lte: expect.any(Date) } }] },
        { OR: [{ expiryDate: null }, { expiryDate: { gte: expect.any(Date) } }] },
      ],
    });
  });

  it("matches static pages by title or description", async () => {
    const response = await searchSite({ query: "grievance" });
    expect(response.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "pages", title: "Grievance", href: "/grievance" }),
      ]),
    );
  });

  it("regulations are searchable", async () => {
    vi.mocked(prisma.regulation.findMany).mockResolvedValue([
      { title: "Sample Regulation", body: "regulation text" },
    ] as never);

    const response = await searchSite({ query: "Sample" });
    expect(response.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "regulations", title: "Sample Regulation", href: "/rules" }),
      ]),
    );
  });

  it("a category filter queries only that category's table", async () => {
    await searchSite({ query: "Sample", category: "notices" });

    expect(prisma.notice.findMany).toHaveBeenCalled();
    expect(prisma.event.findMany).not.toHaveBeenCalled();
    expect(prisma.program.findMany).not.toHaveBeenCalled();
    expect(prisma.faculty.findMany).not.toHaveBeenCalled();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
    expect(prisma.policy.findMany).not.toHaveBeenCalled();
    expect(prisma.regulation.findMany).not.toHaveBeenCalled();
  });

  it("a category filter of 'pages' matches no database rows, only the static page", async () => {
    const response = await searchSite({ query: "grievance", category: "pages" });
    expect(prisma.notice.findMany).not.toHaveBeenCalled();
    expect(response.results).toEqual([
      expect.objectContaining({ type: "pages", title: "Grievance" }),
    ]);
  });

  it("ranks an exact title match above a partial title match, above a snippet-only match", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue([
      { title: "Sample", body: "unrelated" },
      { title: "A Sample Notice About Something", body: "unrelated" },
      { title: "Unrelated Title", body: "mentions sample only in the body" },
    ] as never);

    const response = await searchSite({ query: "Sample" });

    expect(response.results.map((r) => r.title)).toEqual([
      "Sample",
      "A Sample Notice About Something",
      "Unrelated Title",
    ]);
  });

  it("paginates the combined, ranked result list", async () => {
    vi.mocked(prisma.notice.findMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => ({ title: `Sample ${i}`, body: null })) as never,
    );

    const pageOne = await searchSite({ query: "Sample", pageSize: 10, page: 1 });
    expect(pageOne.results).toHaveLength(10);
    expect(pageOne.totalCount).toBe(15);
    expect(pageOne.totalPages).toBe(2);

    const pageTwo = await searchSite({ query: "Sample", pageSize: 10, page: 2 });
    expect(pageTwo.results).toHaveLength(5);
    // No overlap between the two pages.
    const titlesOne = new Set(pageOne.results.map((r) => r.title));
    const titlesTwo = new Set(pageTwo.results.map((r) => r.title));
    for (const title of titlesTwo) expect(titlesOne.has(title)).toBe(false);
  });
});
