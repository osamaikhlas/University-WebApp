import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getContacts, getLocation } from "@/lib/content";

/**
 * Combines the former separate Location and Contact homepage sections into one "Location"
 * section (address, map, contact details, office hours) per the brief — still backed by the
 * same getLocation()/getContacts() queries, just presented together since they describe the
 * same thing (how to find/reach the college).
 */
export async function LocationSection() {
  const [location, contacts] = await Promise.all([getLocation(), getContacts()]);
  if (!location && contacts.length === 0) return null;

  const anyPlaceholder = (location?.isPlaceholder ?? false) || contacts.some((c) => c.isPlaceholder);

  return (
    <section aria-labelledby="location-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-8 py-[var(--pub-section-y)]">
          <SectionHeading id="location-heading" eyebrow="Find Us" title="Visit the campus" viewAllHref="/contact" viewAllLabel="Full contact details" />
          {anyPlaceholder ? <PublicDemoNotice /> : null}

          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            {location?.mapEmbedUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-[var(--pub-radius-lg)] border border-[var(--pub-border)]">
                <iframe
                  src={location.mapEmbedUrl}
                  title="Campus location map"
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col justify-center rounded-[var(--pub-radius-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface-alt)] px-8">
                <p className="pub-font-display text-lg text-[var(--pub-ink)]">
                  {location?.address ?? "Location not yet published."}
                </p>
              </div>
            )}

            {contacts.length > 0 ? (
              <ul className="flex flex-col divide-y divide-[var(--pub-border)] border-t border-[var(--pub-border)] lg:border-t-0">
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex items-baseline justify-between gap-4 py-3.5 text-sm first:pt-0">
                    <span className="font-medium text-[var(--pub-ink)]">
                      {contact.label ?? contact.type}
                    </span>
                    <span className="text-right text-[var(--pub-ink-muted)]">{contact.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
