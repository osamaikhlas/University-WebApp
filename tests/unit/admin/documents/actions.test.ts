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
vi.mock("@/lib/security/upload-storage", () => ({
  saveUploadedFile: vi.fn(),
  validateUpload: vi.fn(),
  UploadValidationError: class UploadValidationError extends Error {},
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
import { saveUploadedFile, validateUpload, UploadValidationError } from "@/lib/security/upload-storage";
import { createDocument, transitionDocument, updateDocument } from "@/app/admin/documents/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;

function formData(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function fakeFile(name: string, type: string, content = "content"): File {
  return new File([content], name, { type });
}

const validFields = { title: "Admission Form 2026" };
const validFile = fakeFile("admission-form.pdf", "application/pdf");

const storedUpload = {
  fileName: "admission-form.pdf",
  storedPath: "document/doc-1/abc-admission-form.pdf",
  mimeType: "application/pdf",
  sizeBytes: 7,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(saveUploadedFile).mockResolvedValue(storedUpload);
  vi.mocked(validateUpload).mockImplementation(() => {});
});

describe("createDocument", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-1" } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({ id: "doc-1" } as never);

    await expect(
      createDocument({ error: null }, formData({ ...validFields, file: validFile })),
    ).rejects.toThrow("REDIRECT:/admin/documents/doc-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a submission with no file", async () => {
    const result = await createDocument({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects a file that fails validation (e.g. unsupported type) without creating a record", async () => {
    vi.mocked(validateUpload).mockImplementation(() => {
      throw new UploadValidationError("Unsupported file type.");
    });

    const result = await createDocument(
      { error: null },
      formData({ ...validFields, file: fakeFile("virus.exe", "application/x-msdownload") }),
    );
    expect(result.error).toBe("Unsupported file type.");
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects expiryDate earlier than publishDate", async () => {
    const result = await createDocument(
      { error: null },
      formData({
        ...validFields,
        file: validFile,
        publishDate: "2026-06-01",
        expiryDate: "2026-01-01",
      }),
    );
    expect(result.error).toMatch(/expiry date/i);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it("stamps the general (College) entityType/entityId and the creator as uploadedBy, then persists the upload", async () => {
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-1" } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({ id: "doc-1" } as never);

    await expect(
      createDocument({ error: null }, formData({ ...validFields, file: validFile })),
    ).rejects.toThrow("REDIRECT:/admin/documents/doc-1");

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "College",
        entityId: "college-1",
        uploadedById: "user-1",
        status: "DRAFT",
      }),
    });
    expect(saveUploadedFile).toHaveBeenCalledWith("document", "doc-1", validFile);
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        storedPath: storedUpload.storedPath,
        fileName: storedUpload.fileName,
        mimeType: storedUpload.mimeType,
        sizeBytes: storedUpload.sizeBytes,
      }),
    });
  });
});

describe("updateDocument", () => {
  it("returns an error when the document doesn't exist", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);
    const result = await updateDocument("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });

  it("updates metadata only, without touching the file, when no new file is given", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue({ id: "doc-1" } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({ id: "doc-1" } as never);

    await expect(
      updateDocument("doc-1", { error: null }, formData({ title: "Updated title" })),
    ).rejects.toThrow("REDIRECT:/admin/documents/doc-1");

    expect(saveUploadedFile).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.not.objectContaining({ storedPath: expect.anything() }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE" }) }),
    );
  });

  it("replaces the file, bumps version, and logs FILE_REPLACED when a new file is given", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue({ id: "doc-1" } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({ id: "doc-1" } as never);

    await expect(
      updateDocument("doc-1", { error: null }, formData({ ...validFields, file: validFile })),
    ).rejects.toThrow("REDIRECT:/admin/documents/doc-1");

    expect(saveUploadedFile).toHaveBeenCalledWith("document", "doc-1", validFile);
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        storedPath: storedUpload.storedPath,
        version: { increment: 1 },
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "FILE_REPLACED" }) }),
    );
  });
});

describe("transitionDocument", () => {
  it("requires content_general:manage for submit_for_review", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "DRAFT",
      storedPath: "document/doc-1/x.pdf",
    } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({} as never);

    await expect(transitionDocument("doc-1", "submit_for_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("refuses to publish a document with no file uploaded", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "APPROVED",
      storedPath: null,
    } as never);

    await expect(transitionDocument("doc-1", "publish", new FormData())).rejects.toThrow(
      /workflowError=/,
    );
    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it("records the approver on approve", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "UNDER_REVIEW",
      storedPath: "document/doc-1/x.pdf",
    } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({} as never);

    await expect(transitionDocument("doc-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { approvedById: "user-1", approvedAt: expect.any(Date) },
    });
  });

  it("clears the approver when a document is rejected back to draft", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "UNDER_REVIEW",
      storedPath: "document/doc-1/x.pdf",
    } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({} as never);

    await expect(
      transitionDocument("doc-1", "reject", formData({ comment: "Needs a real signature." })),
    ).rejects.toThrow("REDIRECT:/admin/documents/doc-1");

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { approvedById: null, approvedAt: null },
    });
  });

  it("archive is legal from any non-archived status and requires content_general:publish", async () => {
    vi.mocked(prisma.document.findUniqueOrThrow).mockResolvedValue({
      id: "doc-1",
      status: "PUBLISHED",
      storedPath: "document/doc-1/x.pdf",
    } as never);
    vi.mocked(prisma.document.update).mockResolvedValue({} as never);

    await expect(transitionDocument("doc-1", "archive", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/documents/doc-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({ status: "ARCHIVED" }),
    });
  });
});
