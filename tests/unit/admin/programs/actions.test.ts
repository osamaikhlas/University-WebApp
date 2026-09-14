import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: {
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
import { createProgram, transitionProgram, updateProgram } from "@/app/admin/programs/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const department = { id: "dept-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  name: "BS Computer Science",
  departmentId: "dept-1",
  level: "UNDERGRADUATE",
  durationYears: "4",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.department.findUnique).mockResolvedValue(department);
});

describe("createProgram", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.program.create).mockResolvedValue({ id: "prog-1" } as never);
    await expect(createProgram({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/programs/prog-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects an invalid level enum value", async () => {
    const result = await createProgram(
      { error: null },
      formData({ ...validFields, level: "NOT_A_LEVEL" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.program.create).not.toHaveBeenCalled();
  });

  it("rejects a department that doesn't belong to this college", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "dept-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createProgram({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.program.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT program with the coerced numeric duration", async () => {
    vi.mocked(prisma.program.create).mockResolvedValue({ id: "prog-1" } as never);

    await expect(createProgram({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/programs/prog-1",
    );

    expect(prisma.program.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "BS Computer Science",
        departmentId: "dept-1",
        level: "UNDERGRADUATE",
        durationYears: 4,
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateProgram", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue({ id: "prog-1", collegeId: "college-1" } as never);
    vi.mocked(prisma.program.update).mockResolvedValue({} as never);

    await expect(updateProgram("prog-1", { error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/programs/prog-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("returns an error when the program doesn't exist", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue(null);
    const result = await updateProgram("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionProgram", () => {
  it("requires content_general:publish for publish", async () => {
    vi.mocked(prisma.program.findUniqueOrThrow).mockResolvedValue({
      id: "prog-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.program.update).mockResolvedValue({} as never);

    await expect(transitionProgram("prog-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/programs/prog-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.program.update).toHaveBeenCalledWith({
      where: { id: "prog-1" },
      data: expect.objectContaining({ status: "PUBLISHED" }),
    });
  });
});
