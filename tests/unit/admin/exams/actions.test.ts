import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    examination: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    program: { findUnique: vi.fn() },
    notice: { findUnique: vi.fn() },
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
import {
  createExamination,
  transitionExamination,
  updateExamination,
} from "@/app/admin/exams/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const program = { id: "prog-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  programId: "prog-1",
  examType: "Mid-term",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
});

describe("createExamination", () => {
  it("requires content_examinations:manage", async () => {
    vi.mocked(prisma.examination.create).mockResolvedValue({ id: "exam-1" } as never);
    await expect(createExamination({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/exams/exam-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_examinations:manage");
  });

  it("creates a DRAFT examination with no linked notice by default", async () => {
    vi.mocked(prisma.examination.create).mockResolvedValue({ id: "exam-1" } as never);

    await expect(createExamination({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/exams/exam-1",
    );

    expect(prisma.examination.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ examType: "Mid-term", noticeId: null, status: "DRAFT" }),
    });
  });

  it("rejects a notice that doesn't belong to this college", async () => {
    vi.mocked(prisma.notice.findUnique).mockResolvedValue({
      id: "notice-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createExamination(
      { error: null },
      formData({ ...validFields, noticeId: "notice-1" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.examination.create).not.toHaveBeenCalled();
  });

  it("accepts a valid linked notice", async () => {
    vi.mocked(prisma.notice.findUnique).mockResolvedValue({
      id: "notice-1",
      collegeId: "college-1",
    } as never);
    vi.mocked(prisma.examination.create).mockResolvedValue({ id: "exam-1" } as never);

    await expect(
      createExamination({ error: null }, formData({ ...validFields, noticeId: "notice-1" })),
    ).rejects.toThrow("REDIRECT:/admin/exams/exam-1");

    expect(prisma.examination.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ noticeId: "notice-1" }),
    });
  });

  it("rejects an invalid scheduleStartDate", async () => {
    const result = await createExamination(
      { error: null },
      formData({ ...validFields, scheduleStartDate: "not-a-date" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.examination.create).not.toHaveBeenCalled();
  });
});

describe("updateExamination", () => {
  it("returns an error when the examination doesn't exist", async () => {
    vi.mocked(prisma.examination.findUnique).mockResolvedValue(null);
    const result = await updateExamination("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionExamination", () => {
  it("does not throw an unhandled error on an illegal transition", async () => {
    vi.mocked(prisma.examination.findUniqueOrThrow).mockResolvedValue({
      id: "exam-1",
      status: "DRAFT",
    } as never);

    await expect(transitionExamination("exam-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/exams/exam-1",
    );
    expect(prisma.examination.update).not.toHaveBeenCalled();
  });
});
