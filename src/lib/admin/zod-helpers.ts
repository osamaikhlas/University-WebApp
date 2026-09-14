import { z } from "zod";

/**
 * Shared date-field validators for CMS module forms. HTML `<input type="date">` submits a
 * plain `"YYYY-MM-DD"` string; these validate it's a real date and convert it to the `Date`
 * Prisma expects, in one place, since Notices/Events/Seminars/Workshops/Academic
 * Calendar/Timetables all need this.
 */
export const requiredDateField = z
  .string()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date")
  .transform((value) => new Date(value));

export const optionalDateField = z
  .string()
  .optional()
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date")
  .transform((value) => (value ? new Date(value) : undefined));

/** Formats a `Date` for an `<input type="date">` `defaultValue` (`"YYYY-MM-DD"`). */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
