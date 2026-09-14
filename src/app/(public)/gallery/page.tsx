import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getGalleryAlbums } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
};

export default async function GalleryPage() {
  const albums = await getGalleryAlbums();

  return (
    <PublicPageShell title="Gallery" description="Photo gallery of the college.">
      <div className="flex flex-col gap-8">
        {albums.some((album) => album.isPlaceholder) ? <DemoDataNotice /> : null}
        {albums.length === 0 ? (
          <EmptyState title="No gallery albums have been published yet." />
        ) : (
          albums.map((album) => (
            <section key={album.id} aria-labelledby={`album-${album.id}-heading`}>
              <h2 id={`album-${album.id}-heading`} className="text-lg font-semibold">
                {album.title}
              </h2>
              {album.description ? (
                <p className="mt-1 text-sm text-foreground/70">{album.description}</p>
              ) : null}

              {album.items.length === 0 ? (
                <p className="mt-3 text-sm text-foreground/60">
                  No photos in this album yet.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {album.items.map((item) => (
                    <li key={item.id}>
                      <Card className="overflow-hidden p-0">
                        {/* eslint-disable-next-line @next/next/no-img-element -- demo/college-supplied media URLs are arbitrary, not from a configured Next Image domain */}
                        <img
                          src={item.media.url}
                          alt={item.media.altText}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                        {item.caption ? (
                          <p className="p-2 text-xs text-foreground/60">{item.caption}</p>
                        ) : null}
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </PublicPageShell>
  );
}
