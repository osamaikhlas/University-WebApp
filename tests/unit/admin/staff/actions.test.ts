import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    staff: {
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
import { createStaff, transitionStaff, updateStaff } from "@/app/admin/staff/actions";

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

describe("createStaff", () => {
  it("requires content_faculty:manage (staff shares Faculty's domain)", async () => {
    vi.mocked(prisma.staff.create).mockResolvedValue({ id: "staff-1" } as never);
    await expect(
      createStaff({ error: null }, formData({ name: "Jane Doe", designation: "Office Assistant" })),
    ).rejects.toThrow("REDIRECT:/admin/staff/staff-1");
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:manage");
  });

  it("rejects a missing designation", async () => {
    const result = await createStaff(
      { error: null },
      formData({ name: "Jane Doe", designation: "" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.staff.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT record with department optional", async () => {
    vi.mocked(prisma.staff.create).mockResolvedValue({ id: "staff-1" } as never);

    await expect(
      createStaff({ error: null }, formData({ name: "Jane Doe", designation: "Office Assistant" })),
    ).rejects.toThrow("REDIRECT:/admin/staff/staff-1");

    expect(prisma.staff.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Jane Doe",
        designation: "Office Assistant",
        department: null,
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateStaff", () => {
  it("returns an error when the staff record doesn't exist", async () => {
    vi.mocked(prisma.staff.findUnique).mockResolvedValue(null);
    const result = await updateStaff(
      "missing",
      { error: null },
      formData({ name: "Jane Doe", designation: "Office Assistant" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionStaff", () => {
  it("rejects an illegal transition without throwing an unhandled error", async () => {
    vi.mocked(prisma.staff.findUniqueOrThrow).mockResolvedValue({
      id: "staff-1",
      status: "DRAFT",
    } as never);

    await expect(transitionStaff("staff-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/staff/staff-1",
    );
    expect(prisma.staff.update).not.toHaveBeenCalled();
  });
});
