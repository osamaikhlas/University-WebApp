import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: {
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
import { createActivity, transitionActivity, updateActivity } from "@/app/admin/activities/actions";

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

describe("createActivity", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.activity.create).mockResolvedValue({ id: "act-1" } as never);
    await expect(
      createActivity({ error: null }, formData({ title: "Blood Drive" })),
    ).rejects.toThrow("REDIRECT:/admin/activities/act-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT activity with no category by default", async () => {
    vi.mocked(prisma.activity.create).mockResolvedValue({ id: "act-1" } as never);

    await expect(
      createActivity({ error: null }, formData({ title: "Blood Drive" })),
    ).rejects.toThrow("REDIRECT:/admin/activities/act-1");

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Blood Drive", category: null, status: "DRAFT" }),
    });
  });
});

describe("updateActivity", () => {
  it("returns an error when the activity doesn't exist", async () => {
    vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);
    const result = await updateActivity("missing", { error: null }, formData({ title: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionActivity", () => {
  it("does not throw an unhandled error on an illegal transition", async () => {
    vi.mocked(prisma.activity.findUniqueOrThrow).mockResolvedValue({
      id: "act-1",
      status: "DRAFT",
    } as never);

    await expect(transitionActivity("act-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/activities/act-1",
    );
    expect(prisma.activity.update).not.toHaveBeenCalled();
  });
});
