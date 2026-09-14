import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    regulation: {
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
import { createRegulation, transitionRegulation, updateRegulation } from "@/app/admin/regulations/actions";

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

describe("createRegulation", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.regulation.create).mockResolvedValue({ id: "reg-1" } as never);
    await expect(
      createRegulation({ error: null }, formData({ title: "Code of Conduct" })),
    ).rejects.toThrow("REDIRECT:/admin/regulations/reg-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT regulation with regulatingBody captured", async () => {
    vi.mocked(prisma.regulation.create).mockResolvedValue({ id: "reg-1" } as never);

    await expect(
      createRegulation(
        { error: null },
        formData({ title: "Code of Conduct", regulatingBody: "HEC" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/regulations/reg-1");

    expect(prisma.regulation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Code of Conduct", regulatingBody: "HEC", status: "DRAFT" }),
    });
  });
});

describe("updateRegulation", () => {
  it("returns an error when the regulation doesn't exist", async () => {
    vi.mocked(prisma.regulation.findUnique).mockResolvedValue(null);
    const result = await updateRegulation("missing", { error: null }, formData({ title: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionRegulation", () => {
  it("does not throw an unhandled error on an illegal transition", async () => {
    vi.mocked(prisma.regulation.findUniqueOrThrow).mockResolvedValue({
      id: "reg-1",
      status: "ARCHIVED",
    } as never);

    await expect(transitionRegulation("reg-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/regulations/reg-1",
    );
    expect(prisma.regulation.update).not.toHaveBeenCalled();
  });
});
