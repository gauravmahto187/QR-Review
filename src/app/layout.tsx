import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Boostup AI Smart QR",
  description: "A mobile-first Google Review automation platform for businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
