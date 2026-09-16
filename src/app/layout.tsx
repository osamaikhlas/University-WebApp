import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/SkipLink";
import { getPrimaryCollege } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display face for the public site's headlines only (src/app/globals.css's
// `.pub-font-display`, consumed by src/components/public/**) — the admin portal never
// references `--font-display`, so loading it here has no visual effect on admin pages.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";
const FALLBACK_DESCRIPTION =
  "Official website of an affiliated college — content pending. Built per Shah Abdul Latif University, Khairpur circular I.C/SALU/KHP/-662.";

// Every other page's <title> falls back to this template (`%s | <site name>`) unless it sets
// its own `title` metadata — the homepage is the only page that overrides it outright (see
// src/app/(public)/page.tsx's `{ absolute: title }`), so this is the one place that needs to
// read the real college name for every other page's tab title to stop saying "[PLACEHOLDER]"
// once real, non-placeholder college data exists (CLAUDE.md rules 1, 14).
export async function generateMetadata(): Promise<Metadata> {
  const college = await getPrimaryCollege();
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;

  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description: FALLBACK_DESCRIPTION,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {/* Visually hidden until focused — lets keyboard/screen-reader users jump past the
            header/nav straight to the page's main content. Targets #main-content, set on
            each layout's <main> below. */}
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
