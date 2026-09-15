import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notice: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/content", () => ({ getPrimaryCollege: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
import { createNotice, markNoticeReviewed, transitionNotice, updateNotice } from "@/app/admin/notices/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
});

describe("createNotice", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.notice.create).mockResolvedValue({ id: "notice-1" } as never);
    await expect(
      createNotice({ error: null }, formData({ title: "Exam schedule", body: "Details here." })),
    ).rejects.toThrow("REDIRECT:/admin/notices/notice-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a missing body", async () => {
    const result = await createNotice({ error: null }, formData({ title: "X", body: "" }));
    expect(result.error).toBeTruthy();
    expect(prisma.notice.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT notice with optional dates parsed", async () => {
    vi.mocked(prisma.notice.create).mockResolvedValue({ id: "notice-1" } as never);

    await expect(
      createNotice(
        { error: null },
        formData({
          title: "Exam schedule",
          body: "Details here.",
          category: "exams",
          publishDate: "2026-09-14",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/notices/notice-1");

    expect(prisma.notice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Exam schedule",
        body: "Details here.",
        category: "exams",
        publishDate: expect.any(Date),
        expiryDate: null,
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });

  it("rejects an invalid publishDate rather than silently ignoring it", async () => {
    const result = await createNotice(
      { error: null },
      formData({ title: "X", body: "Y", publishDate: "not-a-date" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.notice.create).not.toHaveBeenCalled();
  });
});

describe("updateNotice", () => {
  it("returns an error when the notice doesn't exist", async () => {
    vi.mocked(prisma.notice.findUnique).mockResolvedValue(null);
    const result = await updateNotice(
      "missing",
      { error: null },
      formData({ title: "X", body: "Y" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionNotice", () => {
  it("requires content_general:publish for publish", async () => {
    vi.mocked(prisma.notice.findUniqueOrThrow).mockResolvedValue({
      id: "notice-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.notice.update).mockResolvedValue({} as never);

    await expect(transitionNotice("notice-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/notices/notice-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.notice.update).toHaveBeenCalledWith({
      where: { id: "notice-1" },
      data: expect.objectContaining({ status: "PUBLISHED" }),
    });
  });
});

describe("markNoticeReviewed", () => {
  it("requires content_general:publish (not manage) and records lastReviewedAt/lastReviewedById", async () => {
    vi.mocked(prisma.notice.update).mockResolvedValue({} as never);

    await expect(markNoticeReviewed("notice-1")).rejects.toThrow("REDIRECT:/admin/notices/notice-1");

    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.notice.update).toHaveBeenCalledWith({
      where: { id: "notice-1" },
      data: { lastReviewedAt: expect.any(Date), lastReviewedById: "user-1" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "MARK_REVIEWED", entityType: "Notice", entityId: "notice-1" }),
    });
  });
});
