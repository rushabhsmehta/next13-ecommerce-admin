"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  MapPin,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  X as XIcon,
  ArrowLeft,
  Share2,
  Heart,
  Star,
  Plane,
  Hotel,
  Camera,
} from "lucide-react";
import { PackageCard } from "../../../components/package-card";

interface PackageDetailClientProps {
  tourPackage: any;
  relatedPackages: any[];
}

function parseJsonContent(content: any): string[] {
  if (!content) return [];
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      return [content];
    }
  }
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item?.content) return item.content;
        if (item?.text) return item.text;
        return JSON.stringify(item);
      })
      .filter(Boolean);
  }
  if (typeof content === "object" && content !== null) {
    // Handle Tiptap JSON format
    if (content.type === "doc" && content.content) {
      return content.content
        .map((node: any) => {
          if (node.type === "paragraph" && node.content) {
            return node.content.map((c: any) => c.text || "").join("");
          }
          if (node.type === "bulletList" && node.content) {
            return node.content
              .map((li: any) =>
                li.content?.map((p: any) =>
                  p.content?.map((c: any) => c.text || "").join("")
                ).join("")
              )
              .filter(Boolean);
          }
          return "";
        })
        .flat()
        .filter(Boolean);
    }
  }
  return [];
}

export function PackageDetailClient({
  tourPackage,
  relatedPackages,
}: PackageDetailClientProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"itinerary" | "inclusions" | "policies">("itinerary");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(["0"]));

  const images = tourPackage.images || [];
  const itineraries = tourPackage.itineraries || [];
  const inclusions = parseJsonContent(tourPackage.inclusions);
  const exclusions = parseJsonContent(tourPackage.exclusions);
  const importantNotes = parseJsonContent(tourPackage.importantNotes);
  const cancellationPolicy = parseJsonContent(tourPackage.cancellationPolicy);
  const paymentPolicy = parseJsonContent(tourPackage.paymentPolicy);

  const displayPrice = tourPackage.pricePerAdult || tourPackage.price;

  const toggleDay = (index: string) => {
    const next = new Set(expandedDays);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedDays(next);
  };

  return (
    <div className="min-h-screen pt-16 bg-white">
      {/* Image Gallery */}
      <div className="relative">
        <div className="relative h-[45vh] sm:h-[55vh] lg:h-[60vh] overflow-hidden">
          {images.length > 0 ? (
            <Image
              src={images[activeImageIndex]?.url}
              alt={tourPackage.tourPackageName || "Tour Package"}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500 via-red-600 to-purple-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Back Button & Actions */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <Link
              href="/travel/packages"
              className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-xl rounded-xl text-white hover:bg-white/25 transition-all duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="flex gap-2">
              <button className="p-2.5 bg-white/15 backdrop-blur-xl rounded-xl text-white hover:bg-white/25 transition-all duration-200" aria-label="Share">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 bg-white/15 backdrop-blur-xl rounded-xl text-white hover:bg-white/25 transition-all duration-200" aria-label="Save">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Package Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {tourPackage.tourCategory && (
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg mb-3">
                  {tourPackage.tourCategory}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                {tourPackage.tourPackageName || "Tour Package"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-white/90 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {tourPackage.location?.label}
                </span>
                {tourPackage.numDaysNight && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {tourPackage.numDaysNight}
                  </span>
                )}
                {itineraries.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {itineraries.length} Days
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-10">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img: any, i: number) => (
                <button
                  key={img.id || i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                    i === activeImageIndex
                      ? "border-orange-500 shadow-lg shadow-orange-500/20"
                      : "border-white/50 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide">
              {[
                { key: "itinerary" as const, label: "Itinerary", icon: Calendar },
                { key: "inclusions" as const, label: "Inclusions & Exclusions", icon: Check },
                { key: "policies" as const, label: "Policies", icon: Star },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Itinerary Tab */}
            {activeTab === "itinerary" && (
              <div className="space-y-3 sm:space-y-4">
                {itineraries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">
                    Detailed itinerary coming soon.
                  </p>
                ) : (
                  itineraries.map((day: any, index: number) => {
                    const isExpanded = expandedDays.has(String(index));
                    return (
                      <div
                        key={day.id}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200/50 transition-colors"
                      >
                        <button
                          onClick={() => toggleDay(String(index))}
                          className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-orange-50/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-100 to-red-50 text-orange-600 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm">
                              D{day.dayNumber || index + 1}
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                                {day.itineraryTitle || `Day ${day.dayNumber || index + 1}`}
                              </h3>
                              {day.hotel && (
                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Hotel className="w-3 h-3" /> {day.hotel.name}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">
                            {day.itineraryDescription && (
                              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                {day.itineraryDescription}
                              </p>
                            )}

                            {/* Activities */}
                            {day.activities?.length > 0 && (
                              <div className="space-y-3 mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                  <Camera className="w-4 h-4 text-orange-500" /> Activities
                                </h4>
                                {day.activities.map((activity: any) => (
                                  <div
                                    key={activity.id}
                                    className="bg-orange-50/60 rounded-xl p-3"
                                  >
                                    {activity.activityTitle && (
                                      <p className="text-sm font-medium text-orange-800">
                                        {activity.activityTitle}
                                      </p>
                                    )}
                                    {activity.activityDescription && (
                                      <p className="text-xs text-orange-700/70 mt-1">
                                        {activity.activityDescription}
                                      </p>
                                    )}
                                    {activity.activityImages?.length > 0 && (
                                      <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
                                        {activity.activityImages.map((img: any) => (
                                          <div key={img.id} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                                            <Image src={img.url} alt="" fill className="object-cover" />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Itinerary Images */}
                            {day.itineraryImages?.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {day.itineraryImages.map((img: any) => (
                                  <div key={img.id} className="relative w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image src={img.url} alt="" fill className="object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Inclusions & Exclusions Tab */}
            {activeTab === "inclusions" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {inclusions.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      Inclusions
                    </h3>
                    <ul className="space-y-2">
                      {inclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {exclusions.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <XIcon className="w-4 h-4 text-red-600" />
                      </div>
                      Exclusions
                    </h3>
                    <ul className="space-y-2">
                      {exclusions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <XIcon className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {importantNotes.length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Important Notes</h3>
                    <ul className="space-y-2">
                      {importantNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Policies Tab */}
            {activeTab === "policies" && (
              <div className="space-y-8">
                {cancellationPolicy.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                      Cancellation Policy
                    </h3>
                    <ul className="space-y-2">
                      {cancellationPolicy.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 pl-4 border-l-2 border-orange-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {paymentPolicy.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                      Payment Policy
                    </h3>
                    <ul className="space-y-2">
                      {paymentPolicy.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 pl-4 border-l-2 border-orange-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Pricing Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg shadow-orange-500/5">
                <div className="mb-6">
                  {displayPrice ? (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Starting from</span>
                      <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        ₹{Number(displayPrice).toLocaleString("en-IN")}
                      </p>
                      <span className="text-sm text-gray-500">per person</span>
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-gray-700">
                      Contact for Pricing
                    </p>
                  )}
                </div>

                {/* Quick Info */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-100">
                  {tourPackage.numDaysNight && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-600">
                        Duration: {tourPackage.numDaysNight}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600">
                      {tourPackage.location?.label}
                    </span>
                  </div>
                  {tourPackage.transport && (
                    <div className="flex items-center gap-3 text-sm">
                      <Plane className="w-4 h-4 text-orange-500" />
                      <span className="text-gray-600">
                        Transport: {tourPackage.transport}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing Breakdown */}
                {(tourPackage.pricePerAdult || tourPackage.pricePerChildOrExtraBed || tourPackage.pricePerChild5to12YearsNoBed) && (
                  <div className="space-y-2 mb-6 pb-6 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700">Pricing Details</h4>
                    {tourPackage.pricePerAdult && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Per Adult</span>
                        <span className="font-medium">₹{Number(tourPackage.pricePerAdult).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {tourPackage.pricePerChildOrExtraBed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Child / Extra Bed</span>
                        <span className="font-medium">₹{Number(tourPackage.pricePerChildOrExtraBed).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {tourPackage.pricePerChild5to12YearsNoBed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Child (5-12, No Bed)</span>
                        <span className="font-medium">₹{Number(tourPackage.pricePerChild5to12YearsNoBed).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || ""}?text=Hi, I'm interested in the tour package: ${tourPackage.tourPackageName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 text-white text-center rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 active:scale-[0.98]"
                >
                  Enquire Now
                </a>
                <p className="text-xs text-gray-400 text-center mt-3">
                  No payment required. Get a customized quote.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Packages */}
        {relatedPackages.length > 0 && (
          <div className="mt-14 sm:mt-16 pt-8 sm:pt-10 border-t border-gray-100">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
              Similar Packages
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {relatedPackages.map((pkg: any) => (
                <PackageCard
                  key={pkg.id}
                  id={pkg.id}
                  name={pkg.tourPackageName || "Tour Package"}
                  slug={pkg.slug}
                  locationName={pkg.location.label}
                  imageUrl={pkg.images[0]?.url || ""}
                  duration={pkg.numDaysNight}
                  price={pkg.price}
                  pricePerAdult={pkg.pricePerAdult}
                  tourCategory={pkg.tourCategory}
                  itineraryCount={pkg._count.itineraries}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
