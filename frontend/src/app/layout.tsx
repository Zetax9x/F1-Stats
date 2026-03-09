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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#050814] text-slate-100 antialiased`}
      >
        <header className="border-b-2 border-b-red-500 bg-white/95 shadow-[0_0_24px_rgba(0,0,0,0.40)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
              <span className="h-5 w-1.5 rounded-full bg-red-500" />
              <span>
                F1 <span className="text-red-600">Stats</span>
              </span>
            </Link>
            <nav className="flex gap-4 text-xs font-semibold uppercase tracking-wide">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-3 py-1 text-slate-700 transition-colors hover:bg-red-600 hover:text-white"
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
