import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    location: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
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
import { createLocation, transitionLocation, updateLocation } from "@/app/admin/location/actions";

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
  vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
});

describe("createLocation", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.location.create).mockResolvedValue({ id: "loc-1" } as never);
    await expect(
      createLocation({ error: null }, formData({ address: "123 Main St" })),
    ).rejects.toThrow("REDIRECT:/admin/location");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("redirects to edit instead of creating a second location", async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({ id: "loc-1" } as never);

    await expect(
      createLocation({ error: null }, formData({ address: "123 Main St" })),
    ).rejects.toThrow("REDIRECT:/admin/location/edit");
    expect(prisma.location.create).not.toHaveBeenCalled();
  });

  it("leaves latitude/longitude null when blank, rather than inventing 0,0", async () => {
    vi.mocked(prisma.location.create).mockResolvedValue({ id: "loc-1" } as never);

    await expect(
      createLocation({ error: null }, formData({ address: "123 Main St" })),
    ).rejects.toThrow("REDIRECT:/admin/location");

    expect(prisma.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ latitude: null, longitude: null }),
    });
  });

  it("rejects an out-of-range latitude", async () => {
    const result = await createLocation(
      { error: null },
      formData({ address: "123 Main St", latitude: "500" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.location.create).not.toHaveBeenCalled();
  });
});

describe("updateLocation", () => {
  it("returns an error when no location exists yet", async () => {
    const result = await updateLocation({ error: null }, formData({ address: "X" }));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionLocation", () => {
  it("requires content_general:publish for publish", async () => {
    vi.mocked(prisma.location.findUniqueOrThrow).mockResolvedValue({
      id: "loc-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.location.update).mockResolvedValue({} as never);

    await expect(transitionLocation("loc-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/location",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
