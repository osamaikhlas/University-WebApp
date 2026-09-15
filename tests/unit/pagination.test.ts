import { describe, expect, it } from "vitest";
import { getSkipTake, getTotalPages, parsePage } from "@/lib/pagination";

describe("parsePage", () => {
  it("defaults to 1 for undefined/missing input", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it("parses a valid numeric string", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("takes the first value of an array param", () => {
    expect(parsePage(["4", "5"])).toBe(4);
  });

  it("falls back to 1 for non-numeric, zero, or negative input", () => {
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
  });
});

describe("getSkipTake", () => {
  it("computes skip/take for a given page and page size", () => {
    expect(getSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
    expect(getSkipTake(2, 20)).toEqual({ skip: 20, take: 20 });
    expect(getSkipTake(3, 10)).toEqual({ skip: 20, take: 10 });
  });
});

describe("getTotalPages", () => {
  it("rounds up and never returns less than 1", () => {
    expect(getTotalPages(0, 20)).toBe(1);
    expect(getTotalPages(20, 20)).toBe(1);
    expect(getTotalPages(21, 20)).toBe(2);
    expect(getTotalPages(45, 20)).toBe(3);
  });
});
