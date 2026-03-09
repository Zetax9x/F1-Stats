"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const dashboardLinks = [
  { href: "/storico", label: "Storico", description: "Anni, meeting, sessioni, risultati e giri" },
  { href: "/live", label: "Live", description: "Live data del weekend attuale" },
  { href: "/telemetrie", label: "Telemetrie", description: "Speed, throttle, brake per sessione e pilota" },
  { href: "/team-radio", label: "Team Radio", description: "Audio pilota–team per sessione" },
];

const heroSlides = [
  {
    id: 1,
    kicker: "F1 2025 Australian Grand Prix",
    title: "Race in 30",
    description: "Rivivi il weekend con risultati, telemetrie e team radio.",
    ctaLabel: "Apri weekend",
    ctaHref: "/live",
    imageUrl: "/hero1.jpeg",
  },
  {
    id: 2,
    kicker: "Storico",
    title: "Anni, meeting, sessioni",
    description: "Esplora la storia recente della F1 con classifiche e giri.",
    ctaLabel: "Vai a Storico",
    ctaHref: "/storico",
    imageUrl: "/hero2.jpeg",
  },
  {
    id: 3,
    kicker: "Telemetry & Radio",
    title: "Dentro il giro perfetto",
    description: "Confronta speed, throttle e brake e ascolta il team radio.",
    ctaLabel: "Apri telemetrie",
    ctaHref: "/telemetrie",
    imageUrl: "/hero3.jpeg",
  },
];

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-sans -mt-6">
      <section className="relative -mx-6 h-64 overflow-hidden sm:h-80 md:h-104">
        <div
          className="relative h-full w-full"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(5,8,20,0.98) 0%, rgba(5,8,20,0.9) 30%, rgba(5,8,20,0.4) 55%, rgba(5,8,20,0.0) 75%), url(${heroSlides[activeSlide].imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-center px-8 py-10 sm:px-14 md:px-20">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
              {heroSlides[activeSlide].kicker}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              {heroSlides[activeSlide].title}
            </h2>
            <p className="mt-3 max-w-md text-sm text-zinc-200 sm:text-base">
              {heroSlides[activeSlide].description}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={heroSlides[activeSlide].ctaHref}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(0,0,0,0.6)] transition-colors hover:bg-red-500"
              >
                {heroSlides[activeSlide].ctaLabel}
              </Link>
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-4 left-8 flex gap-2 sm:bottom-6 sm:left-14">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeSlide ? "w-6 bg-white" : "w-2.5 bg-zinc-500/70 hover:bg-zinc-300"
                }`}
                aria-label={`Vai allo slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-linear-to-l from-[#050814] via-[#050814]/60 to-transparent" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Sezioni</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {dashboardLinks.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <h3 className="font-semibold">{label}</h3>
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
