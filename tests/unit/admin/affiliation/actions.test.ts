import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    affiliation: {
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
  createAffiliation,
  transitionAffiliation,
  updateAffiliation,
} from "@/app/admin/affiliation/actions";

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

describe("createAffiliation", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.affiliation.create).mockResolvedValue({ id: "aff-1" } as never);
    await expect(
      createAffiliation({ error: null }, formData({ universityName: "SALU" })),
    ).rejects.toThrow("REDIRECT:/admin/affiliation/aff-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT affiliation with no program by default (college-wide)", async () => {
    vi.mocked(prisma.affiliation.create).mockResolvedValue({ id: "aff-1" } as never);

    await expect(
      createAffiliation({ error: null }, formData({ universityName: "SALU" })),
    ).rejects.toThrow("REDIRECT:/admin/affiliation/aff-1");

    expect(prisma.affiliation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ universityName: "SALU", programId: null, status: "DRAFT" }),
    });
  });

  it("rejects a program that doesn't belong to this college", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue({
      id: "prog-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createAffiliation(
      { error: null },
      formData({ universityName: "SALU", programId: "prog-1" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.affiliation.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid validFrom date", async () => {
    const result = await createAffiliation(
      { error: null },
      formData({ universityName: "SALU", validFrom: "not-a-date" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.affiliation.create).not.toHaveBeenCalled();
  });
});

describe("updateAffiliation", () => {
  it("returns an error when the affiliation doesn't exist", async () => {
    vi.mocked(prisma.affiliation.findUnique).mockResolvedValue(null);
    const result = await updateAffiliation(
      "missing",
      { error: null },
      formData({ universityName: "X" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionAffiliation", () => {
  it("rejecting without a reason is refused and does not update the record", async () => {
    vi.mocked(prisma.affiliation.findUniqueOrThrow).mockResolvedValue({
      id: "aff-1",
      status: "UNDER_REVIEW",
    } as never);

    await expect(transitionAffiliation("aff-1", "reject", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/affiliation/aff-1?workflowError=",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.affiliation.update).not.toHaveBeenCalled();
  });

  it("requires content_general:publish for reject and stores the reason", async () => {
    vi.mocked(prisma.affiliation.findUniqueOrThrow).mockResolvedValue({
      id: "aff-1",
      status: "UNDER_REVIEW",
    } as never);
    vi.mocked(prisma.affiliation.update).mockResolvedValue({} as never);

    await expect(
      transitionAffiliation("aff-1", "reject", formData({ comment: "Missing signed agreement." })),
    ).rejects.toThrow("REDIRECT:/admin/affiliation/aff-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.affiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "REJECT", comment: "Missing signed agreement." }),
      }),
    );
  });
});
