import { describe, expect, it } from "vitest";
import { optionalDateField, requiredDateField, toDateInputValue } from "@/lib/admin/zod-helpers";

describe("requiredDateField", () => {
  it("parses a valid YYYY-MM-DD string into a Date", () => {
    const result = requiredDateField.safeParse("2026-09-14");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeInstanceOf(Date);
  });

  it("rejects an empty string", () => {
    expect(requiredDateField.safeParse("").success).toBe(false);
  });

  it("rejects a garbage string", () => {
    expect(requiredDateField.safeParse("not-a-date").success).toBe(false);
  });
});

describe("optionalDateField", () => {
  it("allows undefined", () => {
    const result = optionalDateField.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("parses a valid date when given", () => {
    const result = optionalDateField.safeParse("2026-12-01");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeInstanceOf(Date);
  });

  it("rejects a garbage string rather than silently ignoring it", () => {
    expect(optionalDateField.safeParse("not-a-date").success).toBe(false);
  });
});

describe("toDateInputValue", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date("2026-09-14T12:00:00.000Z"))).toBe("2026-09-14");
  });

  it("returns an empty string for null/undefined", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
  });
});
