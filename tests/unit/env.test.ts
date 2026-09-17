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

  it("accepts a valid 64-hex-character GRIEVANCE_ENCRYPTION_KEY", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      GRIEVANCE_ENCRYPTION_KEY: "a".repeat(64),
    });
    expect(result.GRIEVANCE_ENCRYPTION_KEY).toBe("a".repeat(64));
  });

  it("allows GRIEVANCE_ENCRYPTION_KEY to be omitted entirely", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });
    expect(result.GRIEVANCE_ENCRYPTION_KEY).toBeUndefined();
  });

  it("throws when GRIEVANCE_ENCRYPTION_KEY is the wrong length or not hex", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        GRIEVANCE_ENCRYPTION_KEY: "too-short",
      }),
    ).toThrowError(/GRIEVANCE_ENCRYPTION_KEY/);
  });

  it("defaults NEXT_PUBLIC_SITE_URL to localhost when omitted", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("accepts a valid absolute NEXT_PUBLIC_SITE_URL", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXT_PUBLIC_SITE_URL: "https://www.example-college.edu.pk",
    });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe("https://www.example-college.edu.pk");
  });

  it("throws when NEXT_PUBLIC_SITE_URL is not a valid URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        NEXT_PUBLIC_SITE_URL: "not-a-url",
      }),
    ).toThrowError(/NEXT_PUBLIC_SITE_URL/);
  });

  it("allows STORAGE_S3_* to be omitted, including in production — enforced at use-time by object-storage.ts, not here (next build sets NODE_ENV=production and must never require these)", () => {
    const result = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });
    expect(result.STORAGE_S3_BUCKET).toBeUndefined();
  });

  it("accepts a fully-configured S3 backend", () => {
    const result = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      STORAGE_S3_BUCKET: "prod-bucket",
      STORAGE_S3_ACCESS_KEY_ID: "key-id",
      STORAGE_S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(result.STORAGE_S3_BUCKET).toBe("prod-bucket");
  });

  it("rejects a non-URL STORAGE_S3_ENDPOINT", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        STORAGE_S3_ENDPOINT: "not-a-url",
      }),
    ).toThrowError(/STORAGE_S3_ENDPOINT/);
  });
});
