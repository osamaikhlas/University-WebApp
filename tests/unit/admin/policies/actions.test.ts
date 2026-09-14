import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    policy: {
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
import { createPolicy, transitionPolicy, updatePolicy } from "@/app/admin/policies/actions";

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

describe("createPolicy", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.policy.create).mockResolvedValue({ id: "pol-1" } as never);
    await expect(
      createPolicy({ error: null }, formData({ title: "Attendance Policy" })),
    ).rejects.toThrow("REDIRECT:/admin/policies/pol-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT policy", async () => {
    vi.mocked(prisma.policy.create).mockResolvedValue({ id: "pol-1" } as never);

    await expect(
      createPolicy({ error: null }, formData({ title: "Attendance Policy", category: "Academic" })),
    ).rejects.toThrow("REDIRECT:/admin/policies/pol-1");

    expect(prisma.policy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Attendance Policy", category: "Academic", status: "DRAFT" }),
    });
  });
});

describe("updatePolicy", () => {
  it("returns an error when the policy doesn't exist", async () => {
    vi.mocked(prisma.policy.findUnique).mockResolvedValue(null);
    const result = await updatePolicy("missing", { error: null }, formData({ title: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionPolicy", () => {
  it("requires content_general:manage for submit_for_review", async () => {
    vi.mocked(prisma.policy.findUniqueOrThrow).mockResolvedValue({ id: "pol-1", status: "DRAFT" } as never);
    vi.mocked(prisma.policy.update).mockResolvedValue({} as never);

    await expect(transitionPolicy("pol-1", "submit_for_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/policies/pol-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });
});
