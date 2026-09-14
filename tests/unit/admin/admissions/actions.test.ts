import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    admission: {
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
import { createAdmission, transitionAdmission, updateAdmission } from "@/app/admin/admissions/actions";

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
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
});

describe("createAdmission", () => {
  it("requires content_admissions:manage", async () => {
    vi.mocked(prisma.admission.create).mockResolvedValue({ id: "adm-1" } as never);
    await expect(createAdmission({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/admissions/adm-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:manage");
  });

  it("rejects a program that doesn't belong to this college", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue({
      id: "prog-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createAdmission({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.admission.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid applicationStartDate", async () => {
    const result = await createAdmission(
      { error: null },
      formData({ ...validFields, applicationStartDate: "not-a-date" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.admission.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT admission cycle with dates parsed", async () => {
    vi.mocked(prisma.admission.create).mockResolvedValue({ id: "adm-1" } as never);

    await expect(
      createAdmission(
        { error: null },
        formData({
          ...validFields,
          eligibilityCriteria: "Minimum 60% in intermediate.",
          applicationStartDate: "2026-06-01",
          applicationEndDate: "2026-07-01",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/admissions/adm-1");

    expect(prisma.admission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        academicYear: "2026-2027",
        eligibilityCriteria: "Minimum 60% in intermediate.",
        applicationStartDate: new Date("2026-06-01"),
        applicationEndDate: new Date("2026-07-01"),
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateAdmission", () => {
  it("returns an error when the admission doesn't exist", async () => {
    vi.mocked(prisma.admission.findUnique).mockResolvedValue(null);
    const result = await updateAdmission("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionAdmission", () => {
  it("requires content_admissions:publish for approve", async () => {
    vi.mocked(prisma.admission.findUniqueOrThrow).mockResolvedValue({
      id: "adm-1",
      status: "PENDING_REVIEW",
    } as never);
    vi.mocked(prisma.admission.update).mockResolvedValue({} as never);

    await expect(transitionAdmission("adm-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/admissions/adm-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:publish");
  });
});
