import { beforeEach, describe, expect, it, vi } from "vitest";

const { mkdirMock, writeFileMock, readFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => {
  const fns = { mkdir: mkdirMock, writeFile: writeFileMock, readFile: readFileMock };
  return { ...fns, default: fns };
});

import {
  UploadValidationError,
  isAllowedUploadType,
  maxUploadBytes,
  readUploadedFile,
  saveUploadedFile,
  validateUpload,
} from "@/lib/security/upload-storage";

function makeFile(name: string, content: string, type: string): File {
  return new File([content], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
});

describe("validateUpload", () => {
  it("rejects an empty file", () => {
    expect(() => validateUpload("document", makeFile("empty.pdf", "", "application/pdf"))).toThrow(
      UploadValidationError,
    );
  });

  it("rejects a document over the 25MB cap", () => {
    const big = new File([new Uint8Array(26 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    expect(() => validateUpload("document", big)).toThrow(/25MB/);
  });

  it("rejects a media file over the 10MB cap", () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    expect(() => validateUpload("media", big)).toThrow(/10MB/);
  });

  it("rejects a document type not on the document allow-list", () => {
    expect(() =>
      validateUpload("document", makeFile("script.exe", "content", "application/x-msdownload")),
    ).toThrow(/Unsupported file type/);
  });

  it("rejects a media type not on the media allow-list (e.g. a PDF)", () => {
    expect(() => validateUpload("media", makeFile("doc.pdf", "content", "application/pdf"))).toThrow(
      /Unsupported file type/,
    );
  });

  it("accepts every type on each kind's allow-list", () => {
    for (const type of [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "image/jpeg",
      "image/png",
    ]) {
      expect(() => validateUpload("document", makeFile("f", "content", type))).not.toThrow();
    }
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(() => validateUpload("media", makeFile("f", "content", type))).not.toThrow();
    }
  });
});

describe("isAllowedUploadType / maxUploadBytes", () => {
  it("reports the same allow-list validateUpload enforces", () => {
    expect(isAllowedUploadType("document", "application/pdf")).toBe(true);
    expect(isAllowedUploadType("document", "video/mp4")).toBe(false);
    expect(isAllowedUploadType("media", "image/png")).toBe(true);
    expect(isAllowedUploadType("media", "application/pdf")).toBe(false);
  });

  it("reports the size caps validateUpload enforces", () => {
    expect(maxUploadBytes("document")).toBe(25 * 1024 * 1024);
    expect(maxUploadBytes("media")).toBe(10 * 1024 * 1024);
  });
});

describe("saveUploadedFile", () => {
  it("rejects an invalid file without writing anything", async () => {
    await expect(
      saveUploadedFile("document", "doc-1", makeFile("virus.exe", "content", "application/x-msdownload")),
    ).rejects.toThrow(UploadValidationError);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("persists a valid file under <kind>/<entityId>/<uuid>-<sanitized name>", async () => {
    const pdfContent = "%PDF-1.4\n%%EOF";
    const result = await saveUploadedFile(
      "document",
      "doc-1",
      makeFile("my report (final)!!.pdf", pdfContent, "application/pdf"),
    );

    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalled();
    expect(result.fileName).toBe("my report (final)!!.pdf");
    expect(result.storedPath).toMatch(/^document[/\\]doc-1[/\\][0-9a-f-]+-my_report__final___\.pdf$/);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.sizeBytes).toBe(pdfContent.length);
  });

  it("rejects a file whose actual bytes don't match its declared type (content-sniffing spoof)", async () => {
    // Claims to be a PNG (served inline by the Media route — see
    // src/app/api/files/media/[id]/route.ts) but the bytes are plain HTML — the disguised-
    // upload attack this check exists to close (found during the 2026-09-15 security review).
    await expect(
      saveUploadedFile(
        "media",
        "media-1",
        makeFile("photo.png", "<html><script>alert(1)</script></html>", "image/png"),
      ),
    ).rejects.toThrow(/contents don't match/);
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});

describe("readUploadedFile", () => {
  it("reads back a previously stored relative path", async () => {
    readFileMock.mockResolvedValue(Buffer.from("hello"));
    const buffer = await readUploadedFile("document/doc-1/abc-file.pdf");
    expect(buffer.toString()).toBe("hello");
  });

  it("rejects a path that escapes the storage root", async () => {
    // Message now comes from the shared object-storage.ts backend (local disk/S3), not this
    // module directly — the containment check itself is unchanged.
    await expect(readUploadedFile("../../etc/passwd")).rejects.toThrow(/Invalid storage key/);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
