import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feeStructure: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    program: { findUnique: vi.fn() },
    admission: { findUnique: vi.fn() },
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
  createFeeStructure,
  transitionFeeStructure,
  updateFeeStructure,
} from "@/app/admin/fee-structures/actions";

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
  feeType: "Tuition",
  amount: "50000",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
});

describe("createFeeStructure", () => {
  it("requires content_admissions:manage", async () => {
    vi.mocked(prisma.feeStructure.create).mockResolvedValue({ id: "fee-1" } as never);
    await expect(createFeeStructure({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/fee-structures/fee-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:manage");
  });

  it("rejects a non-positive amount", async () => {
    const result = await createFeeStructure({ error: null }, formData({ ...validFields, amount: "0" }));
    expect(result.error).toBeTruthy();
    expect(prisma.feeStructure.create).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric amount", async () => {
    const result = await createFeeStructure(
      { error: null },
      formData({ ...validFields, amount: "not-a-number" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.feeStructure.create).not.toHaveBeenCalled();
  });

  it("defaults currency to PKR when omitted", async () => {
    vi.mocked(prisma.feeStructure.create).mockResolvedValue({ id: "fee-1" } as never);

    await expect(createFeeStructure({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/fee-structures/fee-1",
    );

    expect(prisma.feeStructure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 50000, currency: "PKR", admissionId: null }),
    });
  });

  it("rejects an admission cycle that doesn't belong to this college", async () => {
    vi.mocked(prisma.admission.findUnique).mockResolvedValue({
      id: "adm-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createFeeStructure(
      { error: null },
      formData({ ...validFields, admissionId: "adm-1" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.feeStructure.create).not.toHaveBeenCalled();
  });

  it("accepts a valid admission cycle", async () => {
    vi.mocked(prisma.admission.findUnique).mockResolvedValue({
      id: "adm-1",
      collegeId: "college-1",
    } as never);
    vi.mocked(prisma.feeStructure.create).mockResolvedValue({ id: "fee-1" } as never);

    await expect(
      createFeeStructure({ error: null }, formData({ ...validFields, admissionId: "adm-1" })),
    ).rejects.toThrow("REDIRECT:/admin/fee-structures/fee-1");

    expect(prisma.feeStructure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ admissionId: "adm-1" }),
    });
  });
});

describe("updateFeeStructure", () => {
  it("returns an error when the fee structure doesn't exist", async () => {
    vi.mocked(prisma.feeStructure.findUnique).mockResolvedValue(null);
    const result = await updateFeeStructure("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionFeeStructure", () => {
  it("requires content_admissions:publish for publish", async () => {
    vi.mocked(prisma.feeStructure.findUniqueOrThrow).mockResolvedValue({
      id: "fee-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.feeStructure.update).mockResolvedValue({} as never);

    await expect(transitionFeeStructure("fee-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/fee-structures/fee-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_admissions:publish");
    expect(prisma.feeStructure.update).toHaveBeenCalledWith({
      where: { id: "fee-1" },
      data: expect.objectContaining({ status: "PUBLISHED", publishedBy: "user-1" }),
    });
  });
});
