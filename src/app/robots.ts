import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated-only areas: never useful to a crawler, and login-gated anyway
      // (src/lib/auth/guard.ts), but excluding them keeps them out of search results too.
      disallow: ["/admin", "/login"],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
