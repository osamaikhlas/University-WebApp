import type { Permission } from "@/lib/auth/permissions";

/**
 * Which permission domain each CMS module belongs to (src/lib/auth/permissions.ts,
 * docs/permission-matrix.md). College Profile, Departments, and Programs are general
 * institutional content (the `content_general` domain EDITOR/REVIEWER own); Faculty and
 * Staff are the `content_faculty` domain FACULTY_EDITOR owns and REVIEWER/PRINCIPAL
 * publish — the same domain the public `/faculty` and `/staff` route permissions already
 * use (src/lib/auth/route-permissions.ts).
 *
 * `view`: list/view pages. `manage`: create, edit, submit for review. `publish`: approve,
 * reject, publish, archive — the higher-trust actions no `manage`-only role also holds,
 * which is what makes self-approval structurally impossible (see docs/permission-matrix.md
 * "Design principles" §1) rather than something each action has to separately check for.
 */
export type ModulePermissions = {
  view: Permission;
  manage: Permission;
  publish: Permission;
};

export const MODULE_PERMISSIONS = {
  collegeProfile: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  departments: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  programs: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  faculty: {
    view: "content_faculty:view",
    manage: "content_faculty:manage",
    publish: "content_faculty:publish",
  },
  staff: {
    view: "content_faculty:view",
    manage: "content_faculty:manage",
    publish: "content_faculty:publish",
  },
  notices: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  events: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  seminars: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  workshops: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  academicCalendar: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  timetables: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  admissions: {
    view: "content_admissions:view",
    manage: "content_admissions:manage",
    publish: "content_admissions:publish",
  },
  feeStructures: {
    view: "content_admissions:view",
    manage: "content_admissions:manage",
    publish: "content_admissions:publish",
  },
  enrollmentStatistics: {
    view: "content_admissions:view",
    manage: "content_admissions:manage",
    publish: "content_admissions:publish",
  },
  examinations: {
    view: "content_examinations:view",
    manage: "content_examinations:manage",
    publish: "content_examinations:publish",
  },
  results: {
    view: "content_examinations:view",
    manage: "content_examinations:manage",
    publish: "content_examinations:publish",
  },
  documents: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  infrastructure: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  activities: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  clubs: {
    view: "content_faculty:view",
    manage: "content_faculty:manage",
    publish: "content_faculty:publish",
  },
  gallery: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  scholarships: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  studentSupport: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  policies: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  regulations: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  affiliation: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  contact: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
  location: {
    view: "content_general:view",
    manage: "content_general:manage",
    publish: "content_general:publish",
  },
} as const satisfies Record<string, ModulePermissions>;

export type ModuleName = keyof typeof MODULE_PERMISSIONS;
