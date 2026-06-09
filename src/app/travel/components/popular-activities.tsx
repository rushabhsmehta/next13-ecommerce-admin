"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import { stripHtml } from "@/lib/html-utils";
import { locationDestinationPath } from "@/lib/location-slug";
import { useTravelPath } from "./travel-path-provider";

interface ActivityData {
  id: string;
  activityMasterTitle: string;
  activityMasterImages: { url: string }[];
  location: { id: string; label: string; slug: string | null } | null;
}

export function PopularActivities({
  activities,
}: {
  activities: ActivityData[];
}) {
  const { href: travelHref } = useTravelPath();

  if (activities.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 sm:mb-12">
          <div>
            <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Experiences
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
              Popular Activities
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg text-sm sm:text-base">
              Discover unforgettable experiences — from thrilling adventures to
              serene cultural encounters.
            </p>
          </div>
          <Link
            href={travelHref("/packages")}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-orange-600 font-semibold hover:gap-3 transition-all text-sm"
          >
            Explore Packages →
          </Link>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {activities.map((activity) => {
            const imageUrl = activity.activityMasterImages[0]?.url || "";
            const displayTitle = stripHtml(activity.activityMasterTitle) || "Activity";
            const href = activity.location
              ? travelHref(locationDestinationPath(activity.location))
              : travelHref("/packages");

            return (
              <Link key={activity.id} href={href} className="group block">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group-hover:-translate-y-1 border border-gray-100/80">
                  {/* Image */}
                  <div className="relative h-36 sm:h-44 overflow-hidden">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={displayTitle}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                        <Zap className="w-10 h-10 text-orange-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Location badge */}
                    {activity.location && (
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-white">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs font-medium drop-shadow-sm">
                          {activity.location.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                      {displayTitle}
                    </h3>
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
