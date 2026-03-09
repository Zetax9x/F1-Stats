import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "F1 Stats",
  description: "Formula 1 stats, telemetry, team radio and live weekend data",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/storico", label: "Storico" },
  { href: "/weekend", label: "Weekend" },
  { href: "/telemetrie", label: "Telemetrie" },
  { href: "/team-radio", label: "Team Radio" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        <header className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              F1 Stats
            </Link>
            <nav className="flex gap-6">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
