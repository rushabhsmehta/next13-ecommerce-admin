"use client";

import Link from "next/link";
import { MapPin, Package, Sparkles } from "lucide-react";
import { useTravelPath } from "./travel-path-provider";

export function HomeHeroBanner() {
  const { href } = useTravelPath();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-purple-700 px-4 pb-7 pt-20 sm:px-6 sm:pb-8 sm:pt-24 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="absolute -right-16 top-0 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-amber-200 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Handcrafted journeys across India &amp; abroad
        </span>
        <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
          Your next unforgettable holiday starts here
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
          Curated tour packages, expert itineraries, and personalised support from
          Ahmedabad&apos;s trusted travel team — Aagam Holidays.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={href("/packages")}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-lg transition hover:bg-orange-50"
          >
            <Package className="h-4 w-4" />
            Browse Packages
          </Link>
          <Link
            href={href("/destinations")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <MapPin className="h-4 w-4" />
            Explore Destinations
          </Link>
        </div>
      </div>
    </section>
  );
}
