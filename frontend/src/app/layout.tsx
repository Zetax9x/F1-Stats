import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Roboto_Mono, Titillium_Web, Orbitron } from "next/font/google";
import "./globals.css";
import { FooterStatus } from "./_components/footer-status";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const titilliumWeb = Titillium_Web({
  variable: "--font-titillium",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "F1 Stats",
  description: "Formula 1 stats, telemetry, team radio and live weekend data",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/storico", label: "Storico" },
  { href: "/telemetrie", label: "Telemetrie" },
  { href: "/team-radio", label: "Team Radio" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${robotoMono.variable} ${titilliumWeb.variable} ${orbitron.variable} min-h-screen bg-[#050814] text-slate-100 antialiased font-titillium`}
        suppressHydrationWarning
      >
        <header className="border-b-2 border-b-red-500 bg-white/95 shadow-[0_0_24px_rgba(0,0,0,0.40)]">
          <div className="flex w-full items-center justify-between px-6 py-3">
            <Link href="/" className="font-formula flex items-center gap-2 text-3xl font-semibold uppercase tracking-tight text-slate-900">
              <span className="h-5 w-1.5 rounded-full bg-red-500" />
              <span>
                F1 <span className="text-red-600">Stats</span>
              </span>
            </Link>
            <nav className="flex gap-4 text-m font-semibold uppercase tracking-wide">
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
        <main className="w-full px-6 pt-6 pb-6">{children}</main>
        <footer className="mt-auto w-full border-t border-zinc-800 bg-black/40 px-6 py-4 text-xs text-zinc-400">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <FooterStatus />
            <p className="text-[10px] sm:text-xs text-zinc-500">
              Formula 1, F1 e relativi marchi sono di proprietà dei rispettivi titolari. Progetto non
              ufficiale a solo scopo didattico.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
