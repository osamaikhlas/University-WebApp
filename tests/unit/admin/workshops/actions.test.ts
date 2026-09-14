import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workshop: {
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
import { createWorkshop, transitionWorkshop, updateWorkshop } from "@/app/admin/workshops/actions";

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

describe("createWorkshop", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.workshop.create).mockResolvedValue({ id: "wk-1" } as never);
    await expect(
      createWorkshop({ error: null }, formData({ title: "Resume Writing", startDate: "2026-10-01" })),
    ).rejects.toThrow("REDIRECT:/admin/workshops/wk-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT workshop with facilitator and no department by default", async () => {
    vi.mocked(prisma.workshop.create).mockResolvedValue({ id: "wk-1" } as never);

    await expect(
      createWorkshop(
        { error: null },
        formData({ title: "Resume Writing", startDate: "2026-10-01", facilitator: "Career Office" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/workshops/wk-1");

    expect(prisma.workshop.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Resume Writing",
        facilitator: "Career Office",
        departmentId: null,
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateWorkshop", () => {
  it("returns an error when the workshop doesn't exist", async () => {
    vi.mocked(prisma.workshop.findUnique).mockResolvedValue(null);
    const result = await updateWorkshop(
      "missing",
      { error: null },
      formData({ title: "X", startDate: "2026-10-01" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionWorkshop", () => {
  it("does not throw an unhandled error on an illegal transition", async () => {
    vi.mocked(prisma.workshop.findUniqueOrThrow).mockResolvedValue({
      id: "wk-1",
      status: "ARCHIVED",
    } as never);

    await expect(transitionWorkshop("wk-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/workshops/wk-1",
    );
    expect(prisma.workshop.update).not.toHaveBeenCalled();
  });
});
