import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    academicCalendar: {
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
  createAcademicCalendarEntry,
  transitionAcademicCalendarEntry,
  updateAcademicCalendarEntry,
} from "@/app/admin/academic-calendar/actions";

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

describe("createAcademicCalendarEntry", () => {
  it("requires content_general:manage", async () => {
    vi.mocked(prisma.academicCalendar.create).mockResolvedValue({ id: "cal-1" } as never);
    await expect(
      createAcademicCalendarEntry(
        { error: null },
        formData({ title: "Semester Start", startDate: "2026-09-01" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/academic-calendar/cal-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("creates a DRAFT entry with academicYear captured", async () => {
    vi.mocked(prisma.academicCalendar.create).mockResolvedValue({ id: "cal-1" } as never);

    await expect(
      createAcademicCalendarEntry(
        { error: null },
        formData({
          title: "Semester Start",
          startDate: "2026-09-01",
          academicYear: "2026-2027",
          category: "semester",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/academic-calendar/cal-1");

    expect(prisma.academicCalendar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Semester Start",
        academicYear: "2026-2027",
        category: "semester",
        status: "DRAFT",
        isPlaceholder: false,
      }),
    });
  });
});

describe("updateAcademicCalendarEntry", () => {
  it("returns an error when the entry doesn't exist", async () => {
    vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(null);
    const result = await updateAcademicCalendarEntry(
      "missing",
      { error: null },
      formData({ title: "X", startDate: "2026-09-01" }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("transitionAcademicCalendarEntry", () => {
  it("requires content_general:publish for approve", async () => {
    vi.mocked(prisma.academicCalendar.findUniqueOrThrow).mockResolvedValue({
      id: "cal-1",
      status: "UNDER_REVIEW",
    } as never);
    vi.mocked(prisma.academicCalendar.update).mockResolvedValue({} as never);

    await expect(
      transitionAcademicCalendarEntry("cal-1", "approve", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/academic-calendar/cal-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
  });
});
