import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://recordflow-delta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RecordFlow — Record your screen, share in seconds",
    template: "%s — RecordFlow",
  },
  description:
    "Free browser screen recorder with webcam bubble, mic narration, and instant share links. No installs, no watermarks — a fast Loom alternative.",
  keywords: [
    "screen recorder",
    "free screen recorder",
    "browser screen recording",
    "loom alternative",
    "screen and webcam recorder",
    "share screen recording link",
  ],
  applicationName: "RecordFlow",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "RecordFlow",
    title: "RecordFlow — Record your screen, share in seconds",
    description:
      "Free browser screen recorder with webcam bubble and instant share links. No installs, no watermarks.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecordFlow — Record your screen, share in seconds",
    description:
      "Free browser screen recorder with webcam bubble and instant share links.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
