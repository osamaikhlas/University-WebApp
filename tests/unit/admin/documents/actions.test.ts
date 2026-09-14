import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
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
import { createDocument, transitionDocument, updateDocument } from "@/app/admin/documents/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  title: "Admission Form 2026",
  fileUrl: "https://example.invalid/admission-form.pdf",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
});

describe("createDocument", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-1" } as never);
    await expect(createDocument({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a non-URL fileUrl", async () => {
    const result = await createDocument(
      { error: null },
      formData({ ...validFields, fileUrl: "not-a-url" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("stamps the general (College) entityType/entityId and the creator as uploadedBy", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-1" } as never);

    await expect(createDocument({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "College",
        entityId: "college-1",
        uploadedById: "user-1",
        status: "DRAFT",
      }),
    });
  });

  it("leaves sizeBytes null when omitted, rather than inventing a 0-byte size", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-1" } as never);

    await expect(createDocument({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sizeBytes: null }),
    });
  });
});

describe("updateDocument", () => {
  it("returns an error when the document doesn't exist", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);
    const result = await updateDocument("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionDocument", () => {
  it("requires content_general:manage for submit_for_review", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({} as never);

    await expect(transitionDocument("doc-1", "submit_for_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });
});
