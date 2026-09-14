import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collegeProfile: {
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
  createCollegeProfile,
  transitionCollegeProfile,
  updateCollegeProfile,
} from "@/app/admin/college-profile/actions";

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

describe("createCollegeProfile", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.collegeProfile.create).mockResolvedValue({ id: "profile-1" } as never);

    await expect(
      createCollegeProfile({ error: null }, formData({ overview: "A great college." })),
    ).rejects.toThrow("REDIRECT:/admin/college-profile");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("redirects to edit instead of creating a second profile when one already exists", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue({ id: "existing-profile" } as never);

    await expect(
      createCollegeProfile({ error: null }, formData({ overview: "A great college." })),
    ).rejects.toThrow("REDIRECT:/admin/college-profile/edit");
    expect(prisma.collegeProfile.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT profile scoped to the primary college", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.collegeProfile.create).mockResolvedValue({ id: "profile-1" } as never);

    await expect(
      createCollegeProfile(
        { error: null },
        formData({ overview: "A great college.", establishedYear: "1990" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/college-profile");

    expect(prisma.collegeProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collegeId: "college-1",
        overview: "A great college.",
        establishedYear: 1990,
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });

  it("rejects an out-of-range established year", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue(null);
    const result = await createCollegeProfile(
      { error: null },
      formData({ establishedYear: "1200" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.collegeProfile.create).not.toHaveBeenCalled();
  });
});

describe("updateCollegeProfile", () => {
  it("looks the profile up by collegeId, not a submitted id (there's only ever one)", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue({
      id: "profile-1",
      overview: "Old overview",
    } as never);
    vi.mocked(prisma.collegeProfile.update).mockResolvedValue({ id: "profile-1" } as never);

    await expect(
      updateCollegeProfile({ error: null }, formData({ overview: "New overview" })),
    ).rejects.toThrow("REDIRECT:/admin/college-profile");

    expect(prisma.collegeProfile.findUnique).toHaveBeenCalledWith({ where: { collegeId: "college-1" } });
    expect(prisma.collegeProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-1" },
      data: expect.objectContaining({ overview: "New overview" }),
    });
  });

  it("returns an error when no profile exists yet", async () => {
    vi.mocked(prisma.collegeProfile.findUnique).mockResolvedValue(null);
    const result = await updateCollegeProfile({ error: null }, formData({ overview: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionCollegeProfile", () => {
  it("requires content_general:publish for publish and redirects to the single profile page", async () => {
    vi.mocked(prisma.collegeProfile.findUniqueOrThrow).mockResolvedValue({
      id: "profile-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.collegeProfile.update).mockResolvedValue({} as never);

    await expect(
      transitionCollegeProfile("profile-1", "publish", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/college-profile");
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
