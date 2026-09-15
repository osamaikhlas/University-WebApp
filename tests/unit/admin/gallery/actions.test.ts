import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    galleryAlbum: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    galleryItem: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    media: {
      create: vi.fn(),
      update: vi.fn(),
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
import {
  createAlbum,
  createItem,
  transitionAlbum,
  transitionItem,
  updateAlbum,
  updateItem,
} from "@/app/admin/gallery/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const album = { id: "album-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function fakeImage(name = "photo.jpg", type = "image/jpeg"): File {
  return new File(["bytes"], name, { type });
}

const storedUpload = {
  fileName: "photo.jpg",
  storedPath: "media/media-1/abc-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(saveUploadedFile).mockResolvedValue(storedUpload);
  vi.mocked(validateUpload).mockImplementation(() => {});
});

describe("createAlbum", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.galleryAlbum.create).mockResolvedValue({ id: "album-1" } as never);
    await expect(
      createAlbum({ error: null }, formData({ title: "Convocation 2026" })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });
});

describe("updateAlbum", () => {
  it("returns an error when the album doesn't exist", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(null);
    const result = await updateAlbum("missing", { error: null }, formData({ title: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionAlbum", () => {
  it("requires content_general:manage for submit_for_review (DRAFT -> SUBMITTED)", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "submit_for_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
    expect(prisma.galleryAlbum.update).toHaveBeenCalledWith({
      where: { id: "album-1" },
      data: expect.objectContaining({ status: "SUBMITTED" }),
    });
  });

  it("requires content_general:publish for start_review (SUBMITTED -> UNDER_REVIEW)", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "SUBMITTED",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "start_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });

  it("rejecting UNDER_REVIEW content requires a reason", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "UNDER_REVIEW",
    } as never);

    await expect(transitionAlbum("album-1", "reject", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1?workflowError=",
    );
    expect(prisma.galleryAlbum.update).not.toHaveBeenCalled();

    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);
    await expect(
      transitionAlbum("album-1", "reject", formData({ comment: "Needs better captions." })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1");
    expect(prisma.galleryAlbum.update).toHaveBeenCalledWith({
      where: { id: "album-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
  });

  it("requires content_general:publish for request_update (PUBLISHED -> UPDATE_REQUIRED)", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "request_update", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.galleryAlbum.update).toHaveBeenCalledWith({
      where: { id: "album-1" },
      data: expect.objectContaining({ status: "UPDATE_REQUIRED" }),
    });
  });

  it("requires content_general:manage for return_to_draft (UPDATE_REQUIRED -> DRAFT)", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "UPDATE_REQUIRED",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "return_to_draft", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("archive is legal from PUBLISHED and requires content_general:publish", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "archive", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.galleryAlbum.update).toHaveBeenCalledWith({
      where: { id: "album-1" },
      data: expect.objectContaining({ status: "ARCHIVED" }),
    });
  });
});

const validItemFields = { altText: "Students at the convocation ceremony" };

describe("createItem", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    vi.mocked(prisma.media.create).mockResolvedValue({ id: "media-1" } as never);
    vi.mocked(prisma.media.update).mockResolvedValue({} as never);
    vi.mocked(prisma.galleryItem.create).mockResolvedValue({ id: "item-1" } as never);

    await expect(
      createItem("album-1", { error: null }, formData({ ...validItemFields, image: fakeImage() })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1/items/item-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects missing alt text (accessibility requirement)", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    const result = await createItem(
      "album-1",
      { error: null },
      formData({ altText: "", image: fakeImage() }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.media.create).not.toHaveBeenCalled();
  });

  it("rejects a missing image", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    const result = await createItem("album-1", { error: null }, formData(validItemFields));
    expect(result.error).toBeTruthy();
    expect(prisma.media.create).not.toHaveBeenCalled();
  });

  it("rejects an image that fails validation without creating any record", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    vi.mocked(validateUpload).mockImplementation(() => {
      throw new UploadValidationError("Unsupported file type.");
    });

    const result = await createItem(
      "album-1",
      { error: null },
      formData({ ...validItemFields, image: fakeImage("doc.pdf", "application/pdf") }),
    );
    expect(result.error).toBe("Unsupported file type.");
    expect(prisma.media.create).not.toHaveBeenCalled();
  });

  it("returns an error when the album doesn't exist", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(null);
    const result = await createItem(
      "missing",
      { error: null },
      formData({ ...validItemFields, image: fakeImage() }),
    );
    expect(result.error).toBeTruthy();
  });

  it("creates the Media asset (IMAGE, uploaded, persisted) attached to the album before creating the item", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    vi.mocked(prisma.media.create).mockResolvedValue({ id: "media-1" } as never);
    vi.mocked(prisma.media.update).mockResolvedValue({} as never);
    vi.mocked(prisma.galleryItem.create).mockResolvedValue({ id: "item-1" } as never);

    const image = fakeImage();
    await expect(
      createItem("album-1", { error: null }, formData({ ...validItemFields, image })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1/items/item-1");

    expect(prisma.media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "GalleryAlbum",
        entityId: "album-1",
        altText: validItemFields.altText,
        mediaType: "IMAGE",
        uploadedById: "user-1",
      }),
    });
    expect(saveUploadedFile).toHaveBeenCalledWith("media", "media-1", image);
    expect(prisma.media.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: { storedPath: storedUpload.storedPath, mimeType: storedUpload.mimeType },
    });
    expect(prisma.galleryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ albumId: "album-1", mediaId: "media-1", order: 0 }),
    });
  });
});

describe("updateItem", () => {
  it("returns an error when the item doesn't exist", async () => {
    vi.mocked(prisma.galleryItem.findUnique).mockResolvedValue(null);
    const result = await updateItem("album-1", "missing", { error: null }, formData(validItemFields));
    expect(result.error).toBeTruthy();
  });

  it("updates only metadata when no replacement image is given", async () => {
    vi.mocked(prisma.galleryItem.findUnique).mockResolvedValue({
      id: "item-1",
      mediaId: "media-1",
    } as never);
    vi.mocked(prisma.media.update).mockResolvedValue({} as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    await expect(
      updateItem("album-1", "item-1", { error: null }, formData({ ...validItemFields, order: "3" })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1/items/item-1");

    expect(saveUploadedFile).not.toHaveBeenCalled();
    expect(prisma.media.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: expect.objectContaining({ altText: validItemFields.altText }),
    });
    expect(prisma.galleryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({ order: 3 }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE" }) }),
    );
  });

  it("replaces the image and logs FILE_REPLACED when a new image is given", async () => {
    vi.mocked(prisma.galleryItem.findUnique).mockResolvedValue({
      id: "item-1",
      mediaId: "media-1",
    } as never);
    vi.mocked(prisma.media.update).mockResolvedValue({} as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    const image = fakeImage("new-photo.png", "image/png");
    await expect(
      updateItem("album-1", "item-1", { error: null }, formData({ ...validItemFields, image })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1/items/item-1");

    expect(saveUploadedFile).toHaveBeenCalledWith("media", "media-1", image);
    expect(prisma.media.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: expect.objectContaining({
        storedPath: storedUpload.storedPath,
        mimeType: storedUpload.mimeType,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "FILE_REPLACED" }) }),
    );
  });
});

describe("transitionItem", () => {
  it("requires content_general:publish for approve (UNDER_REVIEW -> APPROVED)", async () => {
    vi.mocked(prisma.galleryItem.findUniqueOrThrow).mockResolvedValue({
      id: "item-1",
      status: "UNDER_REVIEW",
    } as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    await expect(transitionItem("album-1", "item-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.galleryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({ status: "APPROVED" }),
    });
  });

  it("rejecting UNDER_REVIEW content without a reason is refused", async () => {
    vi.mocked(prisma.galleryItem.findUniqueOrThrow).mockResolvedValue({
      id: "item-1",
      status: "UNDER_REVIEW",
    } as never);

    await expect(transitionItem("album-1", "item-1", "reject", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1?workflowError=",
    );
    expect(prisma.galleryItem.update).not.toHaveBeenCalled();
  });

  it("unpublish takes a PUBLISHED item back to APPROVED", async () => {
    vi.mocked(prisma.galleryItem.findUniqueOrThrow).mockResolvedValue({
      id: "item-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    await expect(transitionItem("album-1", "item-1", "unpublish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1",
    );
    expect(prisma.galleryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({ status: "APPROVED" }),
    });
  });
});
