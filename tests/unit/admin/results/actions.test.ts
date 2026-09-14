import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    result: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    program: { findUnique: vi.fn() },
    examination: { findUnique: vi.fn() },
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
import { createResult, transitionResult, updateResult } from "@/app/admin/results/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const program = { id: "prog-1", collegeId: "college-1" } as never;
const examination = { id: "exam-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  programId: "prog-1",
  examinationId: "exam-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
  vi.mocked(prisma.examination.findUnique).mockResolvedValue(examination);
});

describe("createResult", () => {
  it("requires content_examinations:manage", async () => {
    vi.mocked(prisma.result.create).mockResolvedValue({ id: "res-1" } as never);
    await expect(createResult({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/results/res-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_examinations:manage");
  });

  it("defaults isPublic to false when the checkbox is unchecked (absent from formData)", async () => {
    vi.mocked(prisma.result.create).mockResolvedValue({ id: "res-1" } as never);

    await expect(createResult({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/results/res-1",
    );

    expect(prisma.result.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPublic: false }),
    });
  });

  it("sets isPublic true when the checkbox is checked", async () => {
    vi.mocked(prisma.result.create).mockResolvedValue({ id: "res-1" } as never);
    const data = formData({ ...validFields, isPublic: "on" });

    await expect(createResult({ error: null }, data)).rejects.toThrow(
      "REDIRECT:/admin/results/res-1",
    );

    expect(prisma.result.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPublic: true }),
    });
  });

  it("rejects an examination that doesn't belong to this college", async () => {
    vi.mocked(prisma.examination.findUnique).mockResolvedValue({
      id: "exam-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createResult({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.result.create).not.toHaveBeenCalled();
  });

  it("rejects a malformed externalLink", async () => {
    const result = await createResult(
      { error: null },
      formData({ ...validFields, externalLink: "not-a-url" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.result.create).not.toHaveBeenCalled();
  });
});

describe("updateResult", () => {
  it("returns an error when the result doesn't exist", async () => {
    vi.mocked(prisma.result.findUnique).mockResolvedValue(null);
    const result = await updateResult("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionResult", () => {
  it("requires content_examinations:publish for request_update", async () => {
    vi.mocked(prisma.result.findUniqueOrThrow).mockResolvedValue({
      id: "res-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.result.update).mockResolvedValue({} as never);

    await expect(transitionResult("res-1", "request_update", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/results/res-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_examinations:publish");
  });
});
