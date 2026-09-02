import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Boostup AI Smart QR",
  description: "A mobile-first Google Review automation platform for businesses.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Boostup",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
