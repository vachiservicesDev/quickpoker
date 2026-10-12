import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quickpoker.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QuickPoker: free planning poker online, no sign-up",
    template: "%s | QuickPoker",
  },
  description:
    "Free planning poker and Sprint Retrospective boards for Scrum teams. Create a room, share the link and estimate together. No sign-up, works behind company firewalls and VPNs.",
  keywords: ["planning poker", "free planning poker", "scrum poker", "pointing poker", "agile estimation", "story points", "retrospective", "retro board", "sprint retrospective", "scrum retro"],
  openGraph: {
    type: "website",
    siteName: "QuickPoker",
    title: "QuickPoker: free planning poker online, no sign-up",
    description: "Create a room, share the link and estimate together. Works behind company firewalls and VPNs.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plex.variable} ${plexMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-canvas focus:px-4 focus:py-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
