import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WokThai — Dashboard",
  description: "Gestion des commandes et du menu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground antialiased ${geistSans.className}`}
      >
        <Providers>
          <div className="h-full min-h-0">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
