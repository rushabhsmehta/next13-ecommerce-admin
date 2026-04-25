"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Destination {
  id: string;
  label: string;
  imageUrl: string;
  slug: string | null;
  _count: { tourPackages: number };
}

export function DestinationCarousel({
  destinations,
}: {
  destinations: Destination[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  if (destinations.length === 0) return null;

  const scrollBy = (direction: "left" | "right") => {
    const node = scrollerRef.current;
    if (!node) return;

    const amount = Math.min(node.clientWidth * 0.8, 360);
    node.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50/70 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10">
          <div>
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
              Browse by Destination
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
              Discover Where to Go Next
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl text-sm sm:text-base">
              Swipe through compact destination tiles to jump straight into the
              tours that fit each place.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy("left")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
              aria-label="Scroll destinations left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy("right")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
              aria-label="Scroll destinations right"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide"
        >
          {destinations.slice(0, 10).map((destination) => {
            const href = destination.slug
              ? `/travel/destinations/${destination.slug}`
              : `/travel/destinations/${destination.id}`;

            return (
              <Link
                key={destination.id}
                href={href}
                className="group block min-w-[11rem] sm:min-w-[13rem] lg:min-w-[14rem] snap-start"
              >
                <div className="relative aspect-square overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-orange-500/10">
                  {destination.imageUrl ? (
                    <Image
                      src={destination.imageUrl}
                      alt={destination.label}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 44vw, (max-width: 1200px) 24vw, 18vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-purple-600" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {destination.label}
                        </h3>
                        <p className="mt-1 text-xs text-white/75">
                          {destination._count.tourPackages}{" "}
                          {destination._count.tourPackages === 1
                            ? "package"
                            : "packages"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        Explore
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
