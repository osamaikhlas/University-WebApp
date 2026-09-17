import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mkdirMock, writeFileMock, readFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => {
  const fns = { mkdir: mkdirMock, writeFile: writeFileMock, readFile: readFileMock };
  return { ...fns, default: fns };
});

const { s3SendMock, S3ClientMock, PutObjectCommandMock, GetObjectCommandMock } = vi.hoisted(() => {
  const s3SendMock = vi.fn();
  class S3ClientMock {
    send = s3SendMock;
  }
  class PutObjectCommandMock {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class GetObjectCommandMock {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    s3SendMock,
    S3ClientMock: vi.fn(S3ClientMock),
    PutObjectCommandMock: vi.fn(PutObjectCommandMock),
    GetObjectCommandMock: vi.fn(GetObjectCommandMock),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: PutObjectCommandMock,
  GetObjectCommand: GetObjectCommandMock,
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("local disk backend (no STORAGE_S3_* configured — the dev default)", () => {
  it("writes and reads via the filesystem, under the storage root", async () => {
    delete process.env.STORAGE_S3_BUCKET;
    delete process.env.STORAGE_S3_ACCESS_KEY_ID;
    delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    vi.resetModules();
    const { writeObject, readObject, isUsingCloudStorage } = await import("@/lib/security/object-storage");

    expect(isUsingCloudStorage()).toBe(false);

    await writeObject("media/entity-1/file.png", Buffer.from("hello"));
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(path.join("media", "entity-1", "file.png")),
      Buffer.from("hello"),
    );

    readFileMock.mockResolvedValue(Buffer.from("stored bytes"));
    const result = await readObject("media/entity-1/file.png");
    expect(result).toEqual(Buffer.from("stored bytes"));
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  it("rejects a key that escapes the storage root", async () => {
    delete process.env.STORAGE_S3_BUCKET;
    vi.resetModules();
    const { readObject } = await import("@/lib/security/object-storage");

    await expect(readObject("../../etc/passwd")).rejects.toThrow(/Invalid storage key/);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});

describe("S3-compatible backend (STORAGE_S3_* configured — production)", () => {
  it("writes via PutObjectCommand and reads via GetObjectCommand, never touching the filesystem", async () => {
    process.env.STORAGE_S3_BUCKET = "test-bucket";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "test-key-id";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
    process.env.STORAGE_S3_ENDPOINT = "https://example-r2-endpoint.test";
    vi.resetModules();
    const { writeObject, readObject, isUsingCloudStorage } = await import("@/lib/security/object-storage");

    expect(isUsingCloudStorage()).toBe(true);

    s3SendMock.mockResolvedValueOnce({});
    await writeObject("media/entity-1/file.png", Buffer.from("hello"));
    expect(PutObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "media/entity-1/file.png",
      Body: Buffer.from("hello"),
    });
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();

    s3SendMock.mockResolvedValueOnce({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(Buffer.from("stored bytes"))) },
    });
    const result = await readObject("media/entity-1/file.png");
    expect(result).toEqual(Buffer.from("stored bytes"));
    expect(GetObjectCommandMock).toHaveBeenCalledWith({ Bucket: "test-bucket", Key: "media/entity-1/file.png" });
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("throws when the S3 object has no body", async () => {
    process.env.STORAGE_S3_BUCKET = "test-bucket";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "test-key-id";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
    vi.resetModules();
    const { readObject } = await import("@/lib/security/object-storage");

    s3SendMock.mockResolvedValueOnce({});
    await expect(readObject("media/missing/file.png")).rejects.toThrow(/not found/i);
  });
});

describe("misconfigured production (NODE_ENV=production, no STORAGE_S3_* set)", () => {
  it("refuses to silently fall back to local disk — throws instead of losing uploads", async () => {
    delete process.env.STORAGE_S3_BUCKET;
    delete process.env.STORAGE_S3_ACCESS_KEY_ID;
    delete process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { writeObject, readObject } = await import("@/lib/security/object-storage");

    await expect(writeObject("media/entity-1/file.png", Buffer.from("hello"))).rejects.toThrow(
      /STORAGE_S3_BUCKET/,
    );
    await expect(readObject("media/entity-1/file.png")).rejects.toThrow(/STORAGE_S3_BUCKET/);
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
