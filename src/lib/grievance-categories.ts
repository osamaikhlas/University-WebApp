/**
 * The fixed category list for grievance submissions, shared between the public form's
 * `<select>` (src/app/(public)/grievance/GrievanceForm.tsx) and the server-side Zod
 * validation (src/app/(public)/grievance/actions.ts) so the two can never drift — a category
 * value reaching the database is always one the admin UI's filter also knows about.
 */
export const GRIEVANCE_CATEGORIES = [
  "Academic",
  "Administrative",
  "Faculty",
  "Facilities",
  "Harassment",
  "Financial",
  "Other",
] as const;

export type GrievanceCategory = (typeof GRIEVANCE_CATEGORIES)[number];
