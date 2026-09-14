import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    timetable: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    program: { findUnique: vi.fn() },
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
import { createTimetable, transitionTimetable, updateTimetable } from "@/app/admin/timetables/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;
const program = { id: "prog-1", collegeId: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validFields = {
  programId: "prog-1",
  classGroup: "Semester 1 - Section A",
  effectiveFrom: "2026-09-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(prisma.program.findUnique).mockResolvedValue(program);
});

describe("createTimetable", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.timetable.create).mockResolvedValue({ id: "tt-1" } as never);
    await expect(createTimetable({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/timetables/tt-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a program that doesn't belong to this college", async () => {
    vi.mocked(prisma.program.findUnique).mockResolvedValue({
      id: "prog-1",
      collegeId: "some-other-college",
    } as never);
    const result = await createTimetable({ error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
    expect(prisma.timetable.create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON in structuredSchedule", async () => {
    const result = await createTimetable(
      { error: null },
      formData({ ...validFields, structuredSchedule: "{not valid json" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.timetable.create).not.toHaveBeenCalled();
  });

  it("accepts and parses valid JSON in structuredSchedule", async () => {
    vi.mocked(prisma.timetable.create).mockResolvedValue({ id: "tt-1" } as never);
    const schedule = { monday: [{ time: "09:00", course: "SAMP-101" }] };

    await expect(
      createTimetable(
        { error: null },
        formData({ ...validFields, structuredSchedule: JSON.stringify(schedule) }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/timetables/tt-1");

    expect(prisma.timetable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ structuredSchedule: schedule }),
    });
  });

  it("leaves structuredSchedule undefined when omitted (never invents a schedule)", async () => {
    vi.mocked(prisma.timetable.create).mockResolvedValue({ id: "tt-1" } as never);

    await expect(createTimetable({ error: null }, formData(validFields))).rejects.toThrow(
      "REDIRECT:/admin/timetables/tt-1",
    );

    expect(prisma.timetable.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ structuredSchedule: undefined }),
    });
  });
});

describe("updateTimetable", () => {
  it("returns an error when the timetable doesn't exist", async () => {
    vi.mocked(prisma.timetable.findUnique).mockResolvedValue(null);
    const result = await updateTimetable("missing", { error: null }, formData(validFields));
    expect(result.error).toBeTruthy();
  });
});

describe("transitionTimetable", () => {
  it("requires content_general:publish for reject", async () => {
    vi.mocked(prisma.timetable.findUniqueOrThrow).mockResolvedValue({
      id: "tt-1",
      status: "PENDING_REVIEW",
    } as never);
    vi.mocked(prisma.timetable.update).mockResolvedValue({} as never);

    await expect(transitionTimetable("tt-1", "reject", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/timetables/tt-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.timetable.update).toHaveBeenCalledWith({
      where: { id: "tt-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
  });
});
