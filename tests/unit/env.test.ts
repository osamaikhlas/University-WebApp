import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    const result = parseEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXT_PUBLIC_SITE_NAME: "Example College",
    });

    expect(result.NODE_ENV).toBe("test");
    expect(result.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(result.NEXT_PUBLIC_SITE_NAME).toBe("Example College");
  });

  it("defaults NODE_ENV to development when omitted", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });

    expect(result.NODE_ENV).toBe("development");
  });

  it("defaults NEXT_PUBLIC_SITE_NAME to a marked placeholder when omitted", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });

    expect(result.NEXT_PUBLIC_SITE_NAME).toMatch(/PLACEHOLDER/);
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "not-a-url" })).toThrowError(/DATABASE_URL/);
  });

  it("throws when NODE_ENV is not one of the allowed values", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "staging",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      }),
    ).toThrow();
  });
});
