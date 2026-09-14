import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { GRIEVANCE_ENCRYPTION_KEY: "a".repeat(64) },
}));

import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips plaintext through encryption and decryption", () => {
    const ciphertext = encryptSecret("someone@example.invalid");
    expect(ciphertext).not.toContain("someone@example.invalid");
    expect(decryptSecret(ciphertext)).toBe("someone@example.invalid");
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const a = encryptSecret("+92-300-0000000");
    const b = encryptSecret("+92-300-0000000");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("+92-300-0000000");
    expect(decryptSecret(b)).toBe("+92-300-0000000");
  });

  it("stores the value as iv:authTag:ciphertext hex triples", () => {
    const stored = encryptSecret("hello");
    const parts = stored.split(":");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("throws instead of returning corrupted plaintext when the ciphertext is tampered with", () => {
    const stored = encryptSecret("hello");
    const [iv, authTag, cipherText] = stored.split(":");
    const tampered = `${iv}:${authTag}:${cipherText.slice(0, -2)}00`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws a clear error on a malformed stored value", () => {
    expect(() => decryptSecret("not-a-valid-stored-value")).toThrow(/Malformed/);
  });
});

describe("when GRIEVANCE_ENCRYPTION_KEY is not configured", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws a clear error instead of silently storing plaintext", async () => {
    vi.doMock("@/lib/env", () => ({ env: {} }));
    const { encryptSecret: encryptWithoutKey } = await import("@/lib/security/crypto");
    expect(() => encryptWithoutKey("secret")).toThrow(/GRIEVANCE_ENCRYPTION_KEY/);
  });
});
