import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";

/**
 * Generated from the same route table the header/footer nav use, so the sitemap can never
 * drift from what's actually reachable on the public site (and never lists an admin route —
 * ADMIN_NAV_LINKS is a separate table this file never touches).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_NAV_LINKS.map((link) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}${link.href === "/" ? "" : link.href}`,
    lastModified: now,
    changeFrequency: link.href === "/" ? "daily" : "weekly",
    priority: link.href === "/" ? 1 : 0.6,
  }));
}
