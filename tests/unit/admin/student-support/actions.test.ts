import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentSupport: {
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
  createStudentSupport,
  transitionStudentSupport,
  updateStudentSupport,
} from "@/app/admin/student-support/actions";

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

describe("createStudentSupport", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.studentSupport.create).mockResolvedValue({ id: "ss-1" } as never);
    await expect(
      createStudentSupport({ error: null }, formData({ name: "Counseling Services" })),
    ).rejects.toThrow("REDIRECT:/admin/student-support/ss-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT service with contactInfo captured", async () => {
    vi.mocked(prisma.studentSupport.create).mockResolvedValue({ id: "ss-1" } as never);

    await expect(
      createStudentSupport(
        { error: null },
        formData({ name: "Counseling Services", contactInfo: "counseling@college.edu.pk" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/student-support/ss-1");

    expect(prisma.studentSupport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Counseling Services",
        contactInfo: "counseling@college.edu.pk",
        status: "DRAFT",
      }),
    });
  });
});

describe("updateStudentSupport", () => {
  it("returns an error when the service doesn't exist", async () => {
    vi.mocked(prisma.studentSupport.findUnique).mockResolvedValue(null);
    const result = await updateStudentSupport("missing", { error: null }, formData({ name: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionStudentSupport", () => {
  it("requires content_general:manage for submit_for_review", async () => {
    vi.mocked(prisma.studentSupport.findUniqueOrThrow).mockResolvedValue({
      id: "ss-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.studentSupport.update).mockResolvedValue({} as never);

    await expect(
      transitionStudentSupport("ss-1", "submit_for_review", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/student-support/ss-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });
});
