import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/SkipLink";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "[PLACEHOLDER] Affiliated College Portal",
    template: "%s | [PLACEHOLDER] Affiliated College Portal",
  },
  description:
    "Official website of an affiliated college — content pending. Built per Shah Abdul Latif University, Khairpur circular I.C/SALU/KHP/-662.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Visually hidden until focused — lets keyboard/screen-reader users jump past the
            header/nav straight to the page's main content. Targets #main-content, set on
            each layout's <main> below. */}
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
