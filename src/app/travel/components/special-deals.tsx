"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, MapPin, Tag } from "lucide-react";
import { stripHtml } from "@/lib/html-utils";
import { formatOfferValidity } from "@/lib/package-offers";
import { useTravelPath } from "./travel-path-provider";

interface DealPackage {
  id: string;
  tourPackageName: string | null;
  slug: string | null;
  price: string | null;
  pricePerAdult: string | null;
  numDaysNight: string | null;
  tourCategory: string | null;
  isOfferActive?: boolean;
  offerTitle?: string | null;
  offerSubtitle?: string | null;
  offerBadge?: string | null;
  offerPrice?: string | null;
  offerOriginalPrice?: string | null;
  offerStartsAt?: Date | string | null;
  offerEndsAt?: Date | string | null;
  location: { label: string };
  images: { url: string }[];
  _count: { itineraries: number };
}

function formatPrice(value: string | null | undefined) {
  if (!value) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SpecialDeals({ deals }: { deals: DealPackage[] }) {
  const { href: travelHref } = useTravelPath();

  if (deals.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/40 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 sm:mb-12">
          <div>
            <span className="text-amber-600 font-semibold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Best Value
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
              Special Deals & Offers
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg text-sm sm:text-base">
              Handpicked packages offering the best value - great experiences at
              unbeatable prices.
            </p>
          </div>
          <Link
            href={travelHref("/offers")}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-amber-600 font-semibold hover:gap-3 transition-all text-sm"
          >
            View All Offers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {deals.map((pkg) => {
            const displayPrice =
              formatPrice(pkg.offerPrice) ||
              formatPrice(pkg.pricePerAdult) ||
              formatPrice(pkg.price);
            const originalPrice = formatPrice(pkg.offerOriginalPrice);
            const displayName =
              stripHtml(pkg.offerTitle || pkg.tourPackageName || "") || "Tour Package";
            const subtitle = pkg.offerSubtitle?.trim();
            const validity = formatOfferValidity(pkg);
            const href = travelHref(
              pkg.slug ? `/packages/${pkg.slug}` : `/packages/${pkg.id}`
            );
            const hasImage = Boolean(pkg.images[0]?.url);

            return (
              <Link key={pkg.id} href={href} className="group block">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 group-hover:-translate-y-1 border border-gray-100/80">
                  <div className="relative h-48 overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={pkg.images[0].url}
                        alt={displayName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg">
                      {pkg.offerBadge || "Limited Offer"}
                    </span>

                    {pkg.numDaysNight && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pkg.numDaysNight}
                      </span>
                    )}

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium drop-shadow-sm">
                        {pkg.location.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-2 mb-3 leading-snug">
                      {displayName}
                    </h3>
                    {subtitle ? (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                        {subtitle}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {displayPrice ? (
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                            Starting from
                          </span>
                          <p className="text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                            {"\u20B9"}
                            {displayPrice}
                            <span className="text-xs text-gray-400 font-normal ml-0.5">
                              /person
                            </span>
                          </p>
                          {originalPrice && originalPrice !== displayPrice ? (
                            <p className="text-xs text-gray-400 line-through">
                              {"\u20B9"}{originalPrice}
                            </p>
                          ) : null}
                          {validity ? (
                            <p className="text-[10px] text-amber-700 mt-1">
                              {validity}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Contact for price
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium group-hover:gap-1.5 transition-all">
                        Details <ArrowRight className="w-3 h-3" />
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
