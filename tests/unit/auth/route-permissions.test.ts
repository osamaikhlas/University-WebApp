import { describe, expect, it } from "vitest";
import { ADMIN_NAV_LINKS } from "@/lib/navigation";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/auth/route-permissions";
import { PERMISSIONS } from "@/lib/auth/permissions";

describe("ADMIN_ROUTE_PERMISSIONS", () => {
  it("declares a required permission for every admin nav link", () => {
    for (const link of ADMIN_NAV_LINKS) {
      expect(ADMIN_ROUTE_PERMISSIONS[link.href], `missing entry for ${link.href}`).toBeDefined();
    }
  });

  it("only references real permission keys", () => {
    for (const permission of Object.values(ADMIN_ROUTE_PERMISSIONS)) {
      expect(PERMISSIONS).toContain(permission);
    }
  });

  it("has no entries for routes that aren't real admin nav links", () => {
    const navHrefs = new Set(ADMIN_NAV_LINKS.map((link) => link.href));
    for (const href of Object.keys(ADMIN_ROUTE_PERMISSIONS)) {
      expect(navHrefs.has(href), `${href} is not in ADMIN_NAV_LINKS`).toBe(true);
    }
  });
});
