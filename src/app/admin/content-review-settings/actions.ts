"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { isReviewableModule, setReviewPeriodDays, ReviewSettingsError } from "@/lib/admin/review-settings";

export async function updateReviewPeriodAction(formData: FormData): Promise<void> {
  const user = await requirePermission("compliance:verify");

  const moduleKey = formData.get("moduleKey")?.toString();
  const periodDaysRaw = formData.get("periodDays")?.toString();
  const periodDays = periodDaysRaw ? Number.parseInt(periodDaysRaw, 10) : NaN;

  if (!moduleKey || !isReviewableModule(moduleKey)) {
    redirect(`/admin/content-review-settings?error=${encodeURIComponent("Unknown module.")}`);
  }

  try {
    await setReviewPeriodDays(moduleKey, periodDays, user.id);
  } catch (error) {
    if (!(error instanceof ReviewSettingsError)) throw error;
    redirect(`/admin/content-review-settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/content-review-settings");
}
