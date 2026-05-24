import type { Metadata } from "next";
import GhostBackground from "@/components/GhostBackground";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flintex — Three Agents. One Capital Pool.",
  description: "Three autonomous AI agents that manage your portfolio, create prediction markets, and find intelligent betting opportunities — all settled in USDC on Arc.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/flintex-icon.png", type: "image/png", sizes: "512x512" },
      { url: "/flintex-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/flintex-icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&family=Geist:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <GhostBackground />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
