import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

// Bricolage Grotesque, only the two weights we use (700 headings, 800 amounts), subset to Latin, Latin Extended,
// Yoruba vowels with dots, ₦ and typographic punctuation: ~47 KB for both weights.
// How to rebuild these files: docs/setup.md, "Fonts".
const bricolage = localFont({
  src: [
    { path: "./fonts/bricolage-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/bricolage-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

// Inter as one variable file (weights 400-700, optical size fixed at 14), same character set: ~47 KB instead of ~132 KB.
const inter = localFont({
  src: [{ path: "./fonts/inter-var.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kudi Log",
  description: "Know where your money went. Every day.",
  applicationName: "Kudi Log",
  // iOS home-screen app: full screen, our own title under the icon.
  appleWebApp: { capable: true, title: "Kudi Log", statusBarStyle: "default" },
  formatDetection: { telephone: false }, // amounts like 1500 shouldn't turn into phone links
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F2EC" },
    { media: "(prefers-color-scheme: dark)", color: "#101412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${bricolage.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
