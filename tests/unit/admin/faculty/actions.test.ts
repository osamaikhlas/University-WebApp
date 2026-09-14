import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    faculty: {
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
import { createFaculty, transitionFaculty, updateFaculty } from "@/app/admin/faculty/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const department = { id: "dept-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  name: "Dr. Ada Lovelace",
  departmentId: "dept-1",
  designation: "Professor",
  subjectsTaught: "Algorithms, Data Structures",
  email: "ada@example.invalid",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.department.findUnique).mockResolvedValue(department);
});

describe("createFaculty", () => {
  it("requires content_faculty:manage (not content_general)", async () => {
    vi.mocked(prisma.faculty.create).mockResolvedValue({ id: "fac-1" } as never);
    await expect(createFaculty({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/faculty/fac-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:manage");
  });

  it("splits the comma-separated subjects field into an array", async () => {
    vi.mocked(prisma.faculty.create).mockResolvedValue({ id: "fac-1" } as never);

    await expect(createFaculty({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/faculty/fac-1",
    );

    expect(prisma.faculty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectsTaught: ["Algorithms", "Data Structures"],
      }),
    });
  });

  it("rejects a malformed email", async () => {
    const result = await createFaculty(
      { error: null },
      formData({ ...validFields, email: "not-an-email" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.faculty.create).not.toHaveBeenCalled();
  });

  it("allows an empty subjectsTaught field (defaults to an empty array)", async () => {
    vi.mocked(prisma.faculty.create).mockResolvedValue({ id: "fac-1" } as never);
    const fields = { ...validFields } as Record<string, string>;
    delete fields.subjectsTaught;

    await expect(createFaculty({ error: null }, formData(fields))).rejects.toThrow(
      "REDIRECT:/admin/faculty/fac-1",
    );

    expect(prisma.faculty.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subjectsTaught: [] }) }),
    );
  });
});

describe("updateFaculty", () => {
  it("requires content_faculty:manage", async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({ id: "fac-1", collegeId: "college-1" } as never);
    vi.mocked(prisma.faculty.update).mockResolvedValue({} as never);

    await expect(updateFaculty("fac-1", { error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/faculty/fac-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:manage");
  });
});

describe("transitionFaculty", () => {
  it("requires content_faculty:publish for archive", async () => {
    vi.mocked(prisma.faculty.findUniqueOrThrow).mockResolvedValue({
      id: "fac-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.faculty.update).mockResolvedValue({} as never);

    await expect(transitionFaculty("fac-1", "archive", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/faculty/fac-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:publish");
    expect(prisma.faculty.update).toHaveBeenCalledWith({
      where: { id: "fac-1" },
      data: expect.objectContaining({ status: "ARCHIVED" }),
    });
  });
});
