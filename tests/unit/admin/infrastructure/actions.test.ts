import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    infrastructure: {
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
  createInfrastructure,
  transitionInfrastructure,
  updateInfrastructure,
} from "@/app/admin/infrastructure/actions";

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

describe("createInfrastructure", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.infrastructure.create).mockResolvedValue({ id: "infra-1" } as never);
    await expect(
      createInfrastructure({ error: null }, formData({ category: "LIBRARY", name: "Main Library" })),
    ).rejects.toThrow("REDIRECT:/admin/infrastructure/infra-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects an invalid category", async () => {
    const result = await createInfrastructure(
      { error: null },
      formData({ category: "NOT_A_CATEGORY", name: "Main Library" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.infrastructure.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT item with a valid category", async () => {
    vi.mocked(prisma.infrastructure.create).mockResolvedValue({ id: "infra-1" } as never);

    await expect(
      createInfrastructure({ error: null }, formData({ category: "LAB", name: "Chemistry Lab" })),
    ).rejects.toThrow("REDIRECT:/admin/infrastructure/infra-1");

    expect(prisma.infrastructure.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: "LAB", name: "Chemistry Lab", status: "DRAFT" }),
    });
  });
});

describe("updateInfrastructure", () => {
  it("returns an error when the item doesn't exist", async () => {
    vi.mocked(prisma.infrastructure.findUnique).mockResolvedValue(null);
    const result = await updateInfrastructure(
      "missing",
      { error: null },
      formData({ category: "OFFICE", name: "X" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionInfrastructure", () => {
  it("requires content_general:publish for archive", async () => {
    vi.mocked(prisma.infrastructure.findUniqueOrThrow).mockResolvedValue({
      id: "infra-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.infrastructure.update).mockResolvedValue({} as never);

    await expect(transitionInfrastructure("infra-1", "archive", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/infrastructure/infra-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
