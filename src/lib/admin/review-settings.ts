import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * Configurable review period per content module (the "make the review period configurable"
 * requirement). Every module below shares one default (`DEFAULT_REVIEW_PERIOD_DAYS`) unless an
 * admin has set an explicit override in `ReviewPeriodSetting` — see `getReviewPeriods`.
 *
 * Scoped to the 5 content modules this session's task explicitly calls out warnings for
 * (Notices, Timetables, Academic Calendar, Admissions, Faculty) — Documents already has its
 * own, more precise freshness signal (`expiryDate`) and isn't part of this list. The engine
 * itself (`computeReviewFreshness`, `markContentReviewed`) is generic and not tied to this
 * specific list, so extending review tracking to more modules later is a small, additive
 * change (new schema columns + a registry entry), not a redesign.
 */
export const REVIEWABLE_MODULES = [
  "notices",
  "timetables",
  "academicCalendar",
  "admissions",
  "faculty",
] as const;

export type ReviewableModule = (typeof REVIEWABLE_MODULES)[number];

export function isReviewableModule(value: string): value is ReviewableModule {
  return (REVIEWABLE_MODULES as readonly string[]).includes(value);
}

export const REVIEWABLE_MODULE_LABELS: Record<ReviewableModule, string> = {
  notices: "Notices",
  timetables: "Timetables",
  academicCalendar: "Academic Calendar",
  admissions: "Admissions",
  faculty: "Faculty",
};

/** Used for any reviewable module with no explicit `ReviewPeriodSetting` row — matches the
 * threshold the dashboard's older updatedAt-based staleness heuristic already used, so the
 * default behavior here isn't a surprising change from what these modules' content owners are
 * already used to. */
export const DEFAULT_REVIEW_PERIOD_DAYS = 180;

/** All 5 modules' current review periods in one query, falling back to the default for any
 * module with no override row — the shape the dashboard's bulk overdue-review scan needs. */
export async function getReviewPeriods(): Promise<Record<ReviewableModule, number>> {
  const rows = await prisma.reviewPeriodSetting.findMany({
    where: { moduleKey: { in: [...REVIEWABLE_MODULES] } },
  });
  const overrides = new Map(rows.map((r) => [r.moduleKey, r.periodDays]));

  const result = {} as Record<ReviewableModule, number>;
  for (const key of REVIEWABLE_MODULES) {
    result[key] = overrides.get(key) ?? DEFAULT_REVIEW_PERIOD_DAYS;
  }
  return result;
}

export async function getReviewPeriodDays(moduleKey: ReviewableModule): Promise<number> {
  const row = await prisma.reviewPeriodSetting.findUnique({ where: { moduleKey } });
  return row?.periodDays ?? DEFAULT_REVIEW_PERIOD_DAYS;
}

export type ReviewPeriodSettingDetail = {
  moduleKey: ReviewableModule;
  label: string;
  periodDays: number;
  isOverride: boolean;
  updatedAt: Date | null;
  updatedByName: string | null;
};

/** Full detail for the `/admin/content-review-settings` admin screen: every reviewable
 * module's current period (override or default), whether it's actually an explicit override,
 * and who last changed it. */
export async function getReviewPeriodSettingsDetail(): Promise<ReviewPeriodSettingDetail[]> {
  const rows = await prisma.reviewPeriodSetting.findMany({
    where: { moduleKey: { in: [...REVIEWABLE_MODULES] } },
  });
  const byModule = new Map(rows.map((r) => [r.moduleKey, r]));

  const updaterIds = [...new Set(rows.map((r) => r.updatedBy).filter((id): id is string => Boolean(id)))];
  const updaters = updaterIds.length
    ? await prisma.user.findMany({ where: { id: { in: updaterIds } }, select: { id: true, name: true } })
    : [];
  const updaterNames = new Map(updaters.map((u) => [u.id, u.name]));

  return REVIEWABLE_MODULES.map((moduleKey) => {
    const row = byModule.get(moduleKey);
    return {
      moduleKey,
      label: REVIEWABLE_MODULE_LABELS[moduleKey],
      periodDays: row?.periodDays ?? DEFAULT_REVIEW_PERIOD_DAYS,
      isOverride: Boolean(row),
      updatedAt: row?.updatedAt ?? null,
      updatedByName: row?.updatedBy ? (updaterNames.get(row.updatedBy) ?? null) : null,
    };
  });
}

export class ReviewSettingsError extends Error {}

/** Sets (or clears, back to the default) a module's review period. Writes an audit entry so a
 * change to the review cadence itself — which retroactively affects every record's computed
 * "next review due" date — is traceable like any other admin action (CLAUDE.md rule 8). */
export async function setReviewPeriodDays(
  moduleKey: ReviewableModule,
  periodDays: number,
  actorId: string,
): Promise<void> {
  if (!Number.isInteger(periodDays) || periodDays < 1 || periodDays > 3650) {
    throw new ReviewSettingsError("Review period must be a whole number of days between 1 and 3650.");
  }

  const before = await prisma.reviewPeriodSetting.findUnique({ where: { moduleKey } });

  await prisma.reviewPeriodSetting.upsert({
    where: { moduleKey },
    create: { moduleKey, periodDays, updatedBy: actorId },
    update: { periodDays, updatedBy: actorId },
  });

  await logAudit({
    actorId,
    action: "UPDATE",
    entityType: "ReviewPeriodSetting",
    entityId: moduleKey,
    before: { periodDays: before?.periodDays ?? DEFAULT_REVIEW_PERIOD_DAYS },
    after: { periodDays },
  });
}
