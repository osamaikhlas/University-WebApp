import "server-only";

import { env } from "@/lib/env";
import type { College, Contact, Location } from "@prisma/client";

/**
 * Structured data (schema.org JSON-LD) for the homepage.
 *
 * Unlike the visible page, a search engine has no way to render `DemoDataNotice` next to a
 * JSON-LD field — there's no UI at all, just a machine trusting the value as fact. So this
 * builder is stricter than the rest of the site: it silently omits any field still backed by
 * `isPlaceholder: true` data instead of publishing it as structured fact (CLAUDE.md rules 1
 * and 14 apply doubly hard here). If the college itself is still a placeholder, this returns
 * `null` and no JSON-LD is emitted at all.
 */
export function buildCollegeJsonLd(
  college: Pick<College, "name" | "isPlaceholder"> | null,
  contacts: Pick<Contact, "type" | "value" | "isPlaceholder">[],
  location: Pick<Location, "address" | "isPlaceholder"> | null,
): Record<string, unknown> | null {
  if (!college || college.isPlaceholder) return null;

  const email = contacts.find((c) => c.type === "EMAIL" && !c.isPlaceholder)?.value;
  const phone = contacts.find((c) => c.type === "PHONE" && !c.isPlaceholder)?.value;
  const address = location && !location.isPlaceholder ? location.address : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: college.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    ...(email ? { email } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
  };
}

/** Safely serializes a JSON-LD object for embedding in a `<script>` tag. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  // Escapes "<" so a value like "</script><script>..." can't break out of the tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
