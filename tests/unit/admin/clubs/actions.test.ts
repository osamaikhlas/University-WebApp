import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    faculty: { findUnique: vi.fn() },
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
import { createClub, transitionClub, updateClub } from "@/app/admin/clubs/actions";

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

describe("createClub", () => {
  it("requires content_faculty:manage", async () => {
    vi.mocked(prisma.club.create).mockResolvedValue({ id: "club-1" } as never);
    await expect(createClub({ error: null }, formData({ name: "Debate Society" }))).rejects.toThrow(
      "REDIRECT:/admin/clubs/club-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:manage");
  });

  it("creates a DRAFT club with no advisor by default", async () => {
    vi.mocked(prisma.club.create).mockResolvedValue({ id: "club-1" } as never);

    await expect(createClub({ error: null }, formData({ name: "Debate Society" }))).rejects.toThrow(
      "REDIRECT:/admin/clubs/club-1",
    );

    expect(prisma.club.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Debate Society", facultyAdvisorId: null, status: "DRAFT" }),
    });
  });

  it("rejects a faculty advisor that doesn't belong to this college", async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
      id: "fac-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createClub(
      { error: null },
      formData({ name: "Debate Society", facultyAdvisorId: "fac-1" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.club.create).not.toHaveBeenCalled();
  });

  it("accepts a valid faculty advisor", async () => {
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({ id: "fac-1", collegeId: "college-1" } as never);
    vi.mocked(prisma.club.create).mockResolvedValue({ id: "club-1" } as never);

    await expect(
      createClub({ error: null }, formData({ name: "Debate Society", facultyAdvisorId: "fac-1" })),
    ).rejects.toThrow("REDIRECT:/admin/clubs/club-1");

    expect(prisma.club.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ facultyAdvisorId: "fac-1" }),
    });
  });
});

describe("updateClub", () => {
  it("returns an error when the club doesn't exist", async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue(null);
    const result = await updateClub("missing", { error: null }, formData({ name: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionClub", () => {
  it("requires content_faculty:publish for approve", async () => {
    vi.mocked(prisma.club.findUniqueOrThrow).mockResolvedValue({
      id: "club-1",
      status: "PENDING_REVIEW",
    } as never);
    vi.mocked(prisma.club.update).mockResolvedValue({} as never);

    await expect(transitionClub("club-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/clubs/club-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_faculty:publish");
  });
});
