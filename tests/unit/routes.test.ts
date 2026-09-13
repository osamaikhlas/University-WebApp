import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV_LINKS, PUBLIC_NAV_LINKS } from "@/lib/navigation";

const APP_DIR = path.resolve(__dirname, "../../src/app");

function pagePathFor(href: string): string {
  if (href === "/") return path.join(APP_DIR, "(public)", "page.tsx");
  if (href === "/admin") return path.join(APP_DIR, "admin", "page.tsx");

  const segments = href.replace(/^\//, "").split("/");
  const isAdmin = segments[0] === "admin";
  const rest = isAdmin ? segments.slice(1) : segments;
  const base = isAdmin ? path.join(APP_DIR, "admin") : path.join(APP_DIR, "(public)");

  return path.join(base, ...rest, "page.tsx");
}

describe("public route structure", () => {
  it("matches the scope documented in CLAUDE.md (29 sections including Home)", () => {
    expect(PUBLIC_NAV_LINKS).toHaveLength(29);
  });

  it("has a page.tsx for every public nav link", () => {
    for (const link of PUBLIC_NAV_LINKS) {
      const file = pagePathFor(link.href);
      expect(fs.existsSync(file), `missing page for ${link.href} at ${file}`).toBe(true);
    }
  });

  it("has no duplicate hrefs", () => {
    const hrefs = PUBLIC_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("admin route structure", () => {
  it("matches the scope documented in CLAUDE.md (23 sections including Dashboard)", () => {
    expect(ADMIN_NAV_LINKS).toHaveLength(23);
  });

  it("has a page.tsx for every admin nav link", () => {
    for (const link of ADMIN_NAV_LINKS) {
      const file = pagePathFor(link.href);
      expect(fs.existsSync(file), `missing page for ${link.href} at ${file}`).toBe(true);
    }
  });

  it("has no duplicate hrefs", () => {
    const hrefs = ADMIN_NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
