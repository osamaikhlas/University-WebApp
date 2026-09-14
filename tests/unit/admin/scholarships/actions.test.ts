import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scholarship: {
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
import {
  createScholarship,
  transitionScholarship,
  updateScholarship,
} from "@/app/admin/scholarships/actions";

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

describe("createScholarship", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.scholarship.create).mockResolvedValue({ id: "sch-1" } as never);
    await expect(
      createScholarship({ error: null }, formData({ name: "Need-Based Grant" })),
    ).rejects.toThrow("REDIRECT:/admin/scholarships/sch-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT scholarship with eligibility captured", async () => {
    vi.mocked(prisma.scholarship.create).mockResolvedValue({ id: "sch-1" } as never);

    await expect(
      createScholarship(
        { error: null },
        formData({ name: "Need-Based Grant", eligibility: "Household income below threshold" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/scholarships/sch-1");

    expect(prisma.scholarship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Need-Based Grant",
        eligibility: "Household income below threshold",
        status: "DRAFT",
      }),
    });
  });
});

describe("updateScholarship", () => {
  it("returns an error when the scholarship doesn't exist", async () => {
    vi.mocked(prisma.scholarship.findUnique).mockResolvedValue(null);
    const result = await updateScholarship("missing", { error: null }, formData({ name: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionScholarship", () => {
  it("does not throw an unhandled error on an illegal transition", async () => {
    vi.mocked(prisma.scholarship.findUniqueOrThrow).mockResolvedValue({
      id: "sch-1",
      status: "DRAFT",
    } as never);

    await expect(transitionScholarship("sch-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/scholarships/sch-1",
    );
    expect(prisma.scholarship.update).not.toHaveBeenCalled();
  });
});
