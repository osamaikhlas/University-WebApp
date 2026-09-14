import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://www.example-college.edu.pk" },
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";

describe("sitemap", () => {
  it("includes exactly one entry per public route, with absolute URLs", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(PUBLIC_NAV_LINKS.length);
    for (const entry of entries) {
      expect(entry.url.startsWith("https://www.example-college.edu.pk")).toBe(true);
    }
  });

  it("never includes an admin or login route", () => {
    const entries = sitemap();
    expect(entries.some((entry) => entry.url.includes("/admin"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("/login"))).toBe(false);
  });

  it("gives the homepage the highest priority", () => {
    const home = sitemap().find((entry) => entry.url === "https://www.example-college.edu.pk");
    expect(home?.priority).toBe(1);
  });
});

describe("robots", () => {
  it("disallows /admin and /login while allowing everything else", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(["/admin", "/login"]);
  });

  it("points at the absolute sitemap URL", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://www.example-college.edu.pk/sitemap.xml");
  });
});
