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
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
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

describe("createAlbum", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.galleryAlbum.create).mockResolvedValue({ id: "album-1" } as never);
    await expect(createAlbum({ error: null }, formData({ title: "Convocation 2026" }))).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
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
  it("requires content_general:publish for archive", async () => {
    vi.mocked(prisma.galleryAlbum.findUniqueOrThrow).mockResolvedValue({
      id: "album-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.galleryAlbum.update).mockResolvedValue({} as never);

    await expect(transitionAlbum("album-1", "archive", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});

const validItemFields = {
  url: "https://example.invalid/photo.jpg",
  altText: "Students at the convocation ceremony",
  mediaType: "IMAGE",
};

describe("createItem", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    vi.mocked(prisma.media.create).mockResolvedValue({ id: "media-1" } as never);
    vi.mocked(prisma.galleryItem.create).mockResolvedValue({ id: "item-1" } as never);

    await expect(createItem("album-1", { error: null }, formData(validItemFields))).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects missing alt text (accessibility requirement)", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    const result = await createItem(
      "album-1",
      { error: null },
      formData({ url: "https://example.invalid/photo.jpg", altText: "", mediaType: "IMAGE" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.media.create).not.toHaveBeenCalled();
  });

  it("returns an error when the album doesn't exist", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(null);
    const result = await createItem("missing", { error: null }, formData(validItemFields));
    expect(result.error).toBeTruthy();
  });

  it("creates the Media asset attached to the album before creating the item", async () => {
    vi.mocked(prisma.galleryAlbum.findUnique).mockResolvedValue(album);
    vi.mocked(prisma.media.create).mockResolvedValue({ id: "media-1" } as never);
    vi.mocked(prisma.galleryItem.create).mockResolvedValue({ id: "item-1" } as never);

    await expect(createItem("album-1", { error: null }, formData(validItemFields))).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1",
    );

    expect(prisma.media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "GalleryAlbum",
        entityId: "album-1",
        url: validItemFields.url,
        altText: validItemFields.altText,
        uploadedById: "user-1",
      }),
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

  it("updates both the underlying Media asset and the item's own fields", async () => {
    vi.mocked(prisma.galleryItem.findUnique).mockResolvedValue({
      id: "item-1",
      mediaId: "media-1",
    } as never);
    vi.mocked(prisma.media.update).mockResolvedValue({} as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    await expect(
      updateItem("album-1", "item-1", { error: null }, formData({ ...validItemFields, order: "3" })),
    ).rejects.toThrow("REDIRECT:/admin/gallery/album-1/items/item-1");

    expect(prisma.media.update).toHaveBeenCalledWith({
      where: { id: "media-1" },
      data: expect.objectContaining({ url: validItemFields.url, altText: validItemFields.altText }),
    });
    expect(prisma.galleryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: expect.objectContaining({ order: 3 }),
    });
  });
});

describe("transitionItem", () => {
  it("requires content_general:publish for approve", async () => {
    vi.mocked(prisma.galleryItem.findUniqueOrThrow).mockResolvedValue({
      id: "item-1",
      status: "PENDING_REVIEW",
    } as never);
    vi.mocked(prisma.galleryItem.update).mockResolvedValue({} as never);

    await expect(transitionItem("album-1", "item-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/gallery/album-1/items/item-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
