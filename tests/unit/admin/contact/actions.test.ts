import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
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
import { createContact, transitionContact, updateContact } from "@/app/admin/contact/actions";

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

describe("createContact", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.contact.create).mockResolvedValue({ id: "con-1" } as never);
    await expect(
      createContact({ error: null }, formData({ type: "EMAIL", value: "info@college.edu.pk" })),
    ).rejects.toThrow("REDIRECT:/admin/contact/con-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects an invalid type", async () => {
    const result = await createContact(
      { error: null },
      formData({ type: "FAX", value: "12345" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT contact", async () => {
    vi.mocked(prisma.contact.create).mockResolvedValue({ id: "con-1" } as never);

    await expect(
      createContact({ error: null }, formData({ type: "PHONE", value: "+92-300-1234567" })),
    ).rejects.toThrow("REDIRECT:/admin/contact/con-1");

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "PHONE", value: "+92-300-1234567", status: "DRAFT" }),
    });
  });
});

describe("updateContact", () => {
  it("returns an error when the contact doesn't exist", async () => {
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(null);
    const result = await updateContact(
      "missing",
      { error: null },
      formData({ type: "EMAIL", value: "x@example.com" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionContact", () => {
  it("requires content_general:publish for publish", async () => {
    vi.mocked(prisma.contact.findUniqueOrThrow).mockResolvedValue({
      id: "con-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.contact.update).mockResolvedValue({} as never);

    await expect(transitionContact("con-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/contact/con-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: "con-1" },
      data: expect.objectContaining({ status: "PUBLISHED", publishedBy: "user-1" }),
    });
  });
});
