"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { getFeaturedTravelGuides } from "@/lib/travel-guides";
import { useTravelPath } from "./travel-path-provider";

const featured = getFeaturedTravelGuides(3);

export function TravelGuidesPreview() {
  const { href } = useTravelPath();

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
              Travel Guides
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
              Plan with confidence
            </h2>
            <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-xl">
              Practical advice on seasons, regions, and what to ask before you book.
            </p>
          </div>
          <Link
            href={href("/guides")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            View all guides
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((guide) => (
            <Link
              key={guide.slug}
              href={href(`/guides/${guide.slug}`)}
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-orange-100 transition-all"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <BookOpen className="w-3.5 h-3.5" />
                {guide.category}
              </span>
              <h3 className="mt-2 font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                {guide.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 line-clamp-2 flex-1">
                {guide.excerpt}
              </p>
              <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {guide.readMinutes} min read
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
