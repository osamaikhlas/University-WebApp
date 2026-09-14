import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
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
import { createEvent, transitionEvent, updateEvent } from "@/app/admin/events/actions";

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

describe("createEvent", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.event.create).mockResolvedValue({ id: "event-1" } as never);
    await expect(
      createEvent({ error: null }, formData({ title: "Sports Day", startDate: "2026-10-01" })),
    ).rejects.toThrow("REDIRECT:/admin/events/event-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a missing startDate (required, unlike endDate)", async () => {
    const result = await createEvent({ error: null }, formData({ title: "Sports Day" }));
    expect(result.error).toBeTruthy();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT event with the required startDate parsed", async () => {
    vi.mocked(prisma.event.create).mockResolvedValue({ id: "event-1" } as never);

    await expect(
      createEvent(
        { error: null },
        formData({ title: "Sports Day", startDate: "2026-10-01", location: "Main Ground" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/events/event-1");

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Sports Day",
        startDate: expect.any(Date),
        endDate: null,
        location: "Main Ground",
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateEvent", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "event-1" } as never);
    vi.mocked(prisma.event.update).mockResolvedValue({} as never);

    await expect(
      updateEvent("event-1", { error: null }, formData({ title: "X", startDate: "2026-10-01" })),
    ).rejects.toThrow("REDIRECT:/admin/events/event-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });
});

describe("transitionEvent", () => {
  it("requires content_general:manage for submit_for_review only", async () => {
    vi.mocked(prisma.event.findUniqueOrThrow).mockResolvedValue({
      id: "event-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.event.update).mockResolvedValue({} as never);

    await expect(transitionEvent("event-1", "submit_for_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/events/event-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({ status: "SUBMITTED" }),
    });
  });
});
