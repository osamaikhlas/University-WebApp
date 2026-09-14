import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    enrollmentStatistic: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    program: { findUnique: vi.fn() },
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
  createEnrollmentStatistic,
  transitionEnrollmentStatistic,
  updateEnrollmentStatistic,
} from "@/app/admin/enrollment-statistics/actions";

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
  academicYear: "2026-2027",
  totalEnrolled: "120",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
});

describe("createEnrollmentStatistic", () => {
  it("requires content_admissions:manage", async () => {
    vi.mocked(prisma.enrollmentStatistic.create).mockResolvedValue({ id: "es-1" } as never);
    await expect(createEnrollmentStatistic({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/enrollment-statistics/es-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:manage");
  });

  it("rejects a negative totalEnrolled", async () => {
    const result = await createEnrollmentStatistic(
      { error: null },
      formData({ ...validFields, totalEnrolled: "-5" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.enrollmentStatistic.create).not.toHaveBeenCalled();
  });

  it("leaves maleCount/femaleCount null when blank, rather than inventing zero", async () => {
    vi.mocked(prisma.enrollmentStatistic.create).mockResolvedValue({ id: "es-1" } as never);

    await expect(
      createEnrollmentStatistic({ error: null }, formData(validFields)),
    ).rejects.toThrow("REDIRECT:/admin/enrollment-statistics/es-1");

    expect(prisma.enrollmentStatistic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ maleCount: null, femaleCount: null, totalEnrolled: 120 }),
    });
  });

  it("accepts explicit maleCount/femaleCount", async () => {
    vi.mocked(prisma.enrollmentStatistic.create).mockResolvedValue({ id: "es-1" } as never);

    await expect(
      createEnrollmentStatistic(
        { error: null },
        formData({ ...validFields, maleCount: "70", femaleCount: "50" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/enrollment-statistics/es-1");

    expect(prisma.enrollmentStatistic.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ maleCount: 70, femaleCount: 50 }),
    });
  });

  it("rejects a program that doesn't belong to this college", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue({
      id: "prog-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createEnrollmentStatistic({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.enrollmentStatistic.create).not.toHaveBeenCalled();
  });
});

describe("updateEnrollmentStatistic", () => {
  it("returns an error when the record doesn't exist", async () => {
    vi.mocked(prisma.enrollmentStatistic.findUnique).mockResolvedValue(null);
    const result = await updateEnrollmentStatistic("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionEnrollmentStatistic", () => {
  it("requires content_admissions:manage for submit_for_review", async () => {
    vi.mocked(prisma.enrollmentStatistic.findUniqueOrThrow).mockResolvedValue({
      id: "es-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.enrollmentStatistic.update).mockResolvedValue({} as never);

    await expect(
      transitionEnrollmentStatistic("es-1", "submit_for_review", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/enrollment-statistics/es-1");
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:manage");
  });
});
