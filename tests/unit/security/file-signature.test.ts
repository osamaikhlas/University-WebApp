import { describe, expect, it } from "vitest";
import { matchesDeclaredType } from "@/lib/security/file-signature";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("matchesDeclaredType", () => {
  it("accepts a real PDF signature and rejects non-PDF bytes claiming to be one", () => {
    expect(matchesDeclaredType("application/pdf", ascii("%PDF-1.4\n"))).toBe(true);
    expect(matchesDeclaredType("application/pdf", ascii("<html>not a pdf</html>"))).toBe(false);
  });

  it("accepts a real JPEG signature and rejects mismatched bytes", () => {
    expect(matchesDeclaredType("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(matchesDeclaredType("image/jpeg", ascii("GIF89a"))).toBe(false);
  });

  it("accepts a real PNG signature and rejects mismatched bytes", () => {
    expect(
      matchesDeclaredType("image/png", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe(true);
    expect(matchesDeclaredType("image/png", ascii("%PDF-1.4"))).toBe(false);
  });

  it("accepts real GIF signatures (87a and 89a) and rejects mismatched bytes", () => {
    expect(matchesDeclaredType("image/gif", ascii("GIF87a"))).toBe(true);
    expect(matchesDeclaredType("image/gif", ascii("GIF89a"))).toBe(true);
    expect(matchesDeclaredType("image/gif", bytes(0xff, 0xd8, 0xff))).toBe(false);
  });

  it("accepts a real WEBP (RIFF/WEBP) signature and rejects mismatched bytes", () => {
    const webp = new Uint8Array(16);
    webp.set(ascii("RIFF"), 0);
    webp.set(ascii("WEBP"), 8);
    expect(matchesDeclaredType("image/webp", webp)).toBe(true);
    expect(matchesDeclaredType("image/webp", ascii("RIFFxxxxAVI "))).toBe(false);
  });

  it("accepts the legacy OLE2 signature for .doc/.xls/.ppt and rejects mismatched bytes", () => {
    const ole2 = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(matchesDeclaredType("application/msword", ole2)).toBe(true);
    expect(matchesDeclaredType("application/vnd.ms-excel", ole2)).toBe(true);
    expect(matchesDeclaredType("application/vnd.ms-powerpoint", ole2)).toBe(true);
    expect(matchesDeclaredType("application/msword", ascii("%PDF-1.4"))).toBe(false);
  });

  it("accepts the ZIP signature for .docx/.xlsx/.pptx and rejects mismatched bytes", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04);
    expect(
      matchesDeclaredType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        zip,
      ),
    ).toBe(true);
    expect(
      matchesDeclaredType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip),
    ).toBe(true);
    expect(
      matchesDeclaredType(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        zip,
      ),
    ).toBe(true);
    expect(
      matchesDeclaredType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ascii("<html></html>"),
      ),
    ).toBe(false);
  });

  it("never objects to text/plain (no reliable signature) or an unknown MIME type", () => {
    expect(matchesDeclaredType("text/plain", ascii("anything at all"))).toBe(true);
    expect(matchesDeclaredType("application/x-something-unlisted", ascii("anything"))).toBe(true);
  });

  it("treats too-short byte content as a mismatch rather than throwing", () => {
    expect(matchesDeclaredType("image/png", bytes(0x89, 0x50))).toBe(false);
    expect(matchesDeclaredType("application/pdf", bytes())).toBe(false);
  });
});
