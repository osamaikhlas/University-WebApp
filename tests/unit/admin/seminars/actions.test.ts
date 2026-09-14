import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    seminar: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    department: { findUnique: vi.fn() },
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
import { createSeminar, transitionSeminar, updateSeminar } from "@/app/admin/seminars/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const department = { id: "dept-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.department.findUnique).mockResolvedValue(department);
});

describe("createSeminar", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.seminar.create).mockResolvedValue({ id: "sem-1" } as never);
    await expect(
      createSeminar(
        { error: null },
        formData({ title: "AI in Education", startDate: "2026-10-01" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/seminars/sem-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("allows an omitted department (college-wide seminar)", async () => {
    vi.mocked(prisma.seminar.create).mockResolvedValue({ id: "sem-1" } as never);

    await expect(
      createSeminar(
        { error: null },
        formData({ title: "AI in Education", startDate: "2026-10-01" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/seminars/sem-1");

    expect(prisma.department.findUnique).not.toHaveBeenCalled();
    expect(prisma.seminar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: null }),
    });
  });

  it("rejects a department that doesn't belong to this college", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "dept-1",
      collegeId: "some-other-college",
    } as never);

    const result = await createSeminar(
      { error: null },
      formData({ title: "AI in Education", startDate: "2026-10-01", departmentId: "dept-1" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.seminar.create).not.toHaveBeenCalled();
  });

  it("creates with a valid department", async () => {
    vi.mocked(prisma.seminar.create).mockResolvedValue({ id: "sem-1" } as never);

    await expect(
      createSeminar(
        { error: null },
        formData({
          title: "AI in Education",
          startDate: "2026-10-01",
          departmentId: "dept-1",
          speaker: "Dr. Smith",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/seminars/sem-1");

    expect(prisma.seminar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ departmentId: "dept-1", speaker: "Dr. Smith" }),
    });
  });
});

describe("updateSeminar", () => {
  it("returns an error when the seminar doesn't exist", async () => {
    vi.mocked(prisma.seminar.findUnique).mockResolvedValue(null);
    const result = await updateSeminar(
      "missing",
      { error: null },
      formData({ title: "X", startDate: "2026-10-01" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionSeminar", () => {
  it("requires content_general:publish for request_update", async () => {
    vi.mocked(prisma.seminar.findUniqueOrThrow).mockResolvedValue({
      id: "sem-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.seminar.update).mockResolvedValue({} as never);

    await expect(transitionSeminar("sem-1", "request_update", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/seminars/sem-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
