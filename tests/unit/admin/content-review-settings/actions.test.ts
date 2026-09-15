import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/admin/review-settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/review-settings")>(
    "@/lib/admin/review-settings",
  );
  return { ...actual, setReviewPeriodDays: vi.fn() };
});
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { requirePermission } from "@/lib/auth/guard";
import { ReviewSettingsError, setReviewPeriodDays } from "@/lib/admin/review-settings";
import { updateReviewPeriodAction } from "@/app/admin/content-review-settings/actions";

const fakeUser = { id: "actor-1", collegeId: "college-1", permissions: new Set() } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
});

describe("updateReviewPeriodAction", () => {
  it("requires compliance:verify", async () => {
    await expect(
      updateReviewPeriodAction(formData({ moduleKey: "notices", periodDays: "90" })),
    ).rejects.toThrow("REDIRECT:/admin/content-review-settings");
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
  });

  it("rejects an unknown module key without calling setReviewPeriodDays", async () => {
    await expect(
      updateReviewPeriodAction(formData({ moduleKey: "documents", periodDays: "90" })),
    ).rejects.toThrow(/error=/);
    expect(setReviewPeriodDays).not.toHaveBeenCalled();
  });

  it("calls setReviewPeriodDays with the parsed period and the actor's id, then redirects back", async () => {
    vi.mocked(setReviewPeriodDays).mockResolvedValue(undefined);

    await expect(
      updateReviewPeriodAction(formData({ moduleKey: "notices", periodDays: "90" })),
    ).rejects.toThrow("REDIRECT:/admin/content-review-settings");

    expect(setReviewPeriodDays).toHaveBeenCalledWith("notices", 90, "actor-1");
  });

  it("surfaces a ReviewSettingsError as a redirect with an error message, not a crash", async () => {
    vi.mocked(setReviewPeriodDays).mockRejectedValue(new ReviewSettingsError("Invalid period."));

    await expect(
      updateReviewPeriodAction(formData({ moduleKey: "notices", periodDays: "-1" })),
    ).rejects.toThrow(/error=Invalid%20period/);
  });
});
