"use client";

import Image from "next/image";
import Link from "next/link";
import { useTravelPath } from "../../../components/travel-path-provider";
import { useCallback, useEffect, useState } from "react";
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
  Download,
} from "lucide-react";
import { PackageCard } from "../../../components/package-card";
import { RichHtml } from "@/components/ui/rich-html";
import { formatOfferValidity } from "@/lib/package-offers";

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

function formatPrice(value: string | null | undefined) {
  if (!value) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

const SAVED_PACKAGES_KEY = "travel-saved-packages";

function loadSavedPackageIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_PACKAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((p) => p.id).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function toggleSavedPackage(pkg: { id: string; slug?: string | null; tourPackageName?: string | null }) {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SAVED_PACKAGES_KEY);
    const list: Array<{ id: string; slug?: string | null; name?: string | null }> = raw
      ? JSON.parse(raw)
      : [];
    const idx = list.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      localStorage.setItem(SAVED_PACKAGES_KEY, JSON.stringify(list));
      return false;
    }
    list.unshift({ id: pkg.id, slug: pkg.slug, name: pkg.tourPackageName });
    localStorage.setItem(SAVED_PACKAGES_KEY, JSON.stringify(list.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function PackageDetailClient({
  tourPackage,
  relatedPackages,
}: PackageDetailClientProps) {
  const { href } = useTravelPath();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"itinerary" | "inclusions" | "policies">("itinerary");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(["0"]));
  const [isSaved, setIsSaved] = useState(false);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryAdults, setEnquiryAdults] = useState("2");
  const [enquiryCouponCode, setEnquiryCouponCode] = useState("");
  const [enquiryRemarks, setEnquiryRemarks] = useState("");
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  const packageSlug = tourPackage.slug || tourPackage.id;
  const packagePath = href(`/packages/${packageSlug}`);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${packagePath}`
      : packagePath;

  useEffect(() => {
    setIsSaved(loadSavedPackageIds().includes(tourPackage.id));
  }, [tourPackage.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("coupon");
    if (code?.trim()) setEnquiryCouponCode(code.trim().toUpperCase());
  }, []);

  const handleShare = useCallback(async () => {
    const title = tourPackage.tourPackageName || "Tour Package";
    const text = `Check out ${title} on Aagam Holidays`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard");
    } catch {
      /* user cancelled share */
    }
  }, [shareUrl, tourPackage.tourPackageName]);

  const handleToggleSave = useCallback(() => {
    const saved = toggleSavedPackage(tourPackage);
    setIsSaved(saved);
  }, [tourPackage]);

  const isOfferActive = Boolean(tourPackage.isOfferActive);

  const handleEnquirySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setEnquiryError(null);
      const phone = enquiryPhone.replace(/\D/g, "");
      if (!enquiryName.trim()) {
        setEnquiryError("Please enter your name.");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setEnquiryError("Enter a valid 10-digit Indian mobile number.");
        return;
      }
      if (!tourPackage.locationId) {
        setEnquiryError("Destination information is missing.");
        return;
      }
      setEnquirySubmitting(true);
      try {
        const res = await fetch("/api/travel/enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: tourPackage.locationId,
            name: enquiryName.trim(),
            phone,
            numAdults: Number(enquiryAdults) || 2,
            couponCode: enquiryCouponCode.trim() || undefined,
            packageId: tourPackage.id,
            source: isOfferActive ? "offer" : "package_detail",
            remarks: [
              enquiryRemarks.trim(),
              tourPackage.tourPackageName
                ? `Package: ${tourPackage.tourPackageName}`
                : "",
              isOfferActive
                ? `Offer: ${tourPackage.offerTitle || tourPackage.offerBadge || "Active offer"}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });
        if (res.ok) {
          setEnquirySuccess(true);
        } else {
          setEnquiryError("Failed to submit enquiry. Please try again.");
        }
      } catch {
        setEnquiryError("Network error. Please try again.");
      }
      setEnquirySubmitting(false);
    },
    [
      enquiryAdults,
      enquiryCouponCode,
      enquiryName,
      enquiryPhone,
      enquiryRemarks,
      tourPackage.locationId,
      tourPackage.tourPackageName,
      tourPackage.id,
      tourPackage.offerTitle,
      tourPackage.offerBadge,
      isOfferActive,
    ]
  );

  const images = tourPackage.images || [];
  const itineraries = tourPackage.itineraries || [];
  const inclusions = parseJsonContent(tourPackage.inclusions);
  const exclusions = parseJsonContent(tourPackage.exclusions);
  const importantNotes = parseJsonContent(tourPackage.importantNotes);
  const cancellationPolicy = parseJsonContent(tourPackage.cancellationPolicy);
  const paymentPolicy = parseJsonContent(tourPackage.paymentPolicy);

  const displayPrice =
    formatPrice(
      isOfferActive
        ? tourPackage.offerPrice || tourPackage.pricePerAdult
        : tourPackage.pricePerAdult
    ) || formatPrice(tourPackage.price);
  const originalPrice = isOfferActive ? formatPrice(tourPackage.offerOriginalPrice) : null;
  const offerValidity = isOfferActive ? formatOfferValidity(tourPackage) : null;
  const offerTerms = Array.isArray(tourPackage.offerTerms) ? tourPackage.offerTerms : [];

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
    <div className="min-h-screen bg-white">
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
          <div className="absolute top-20 left-4 right-4 flex justify-between">
            <Link
              href={href("/packages")}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-xl rounded-xl text-white hover:bg-white/25 transition-all duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 bg-white/15 backdrop-blur-xl rounded-xl text-white hover:bg-white/25 transition-all duration-200"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleToggleSave}
                className={`p-2.5 backdrop-blur-xl rounded-xl transition-all duration-200 ${
                  isSaved
                    ? "bg-red-500/80 text-white"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
                aria-label={isSaved ? "Remove from saved" : "Save package"}
              >
                <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
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
              {isOfferActive && (
                <span className="ml-2 inline-block px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg mb-3">
                  {tourPackage.offerBadge || "Limited Offer"}
                </span>
              )}
              <RichHtml
                as="h1"
                html={tourPackage.tourPackageName || "Tour Package"}
                className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2 leading-tight"
              />
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
                              <RichHtml
                                as="h3"
                                html={day.itineraryTitle || `Day ${day.dayNumber || index + 1}`}
                                className="font-semibold text-gray-900 text-sm sm:text-base"
                              />
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
                            {/* Itinerary Images - shown prominently at top */}
                            {day.itineraryImages?.length > 0 && (
                              <div
                                className="grid gap-2 mb-4"
                                style={{ gridTemplateColumns: `repeat(${Math.min(day.itineraryImages.length, 3)}, 1fr)` }}
                              >
                                {day.itineraryImages.map((img: any) => (
                                  <div key={img.id} className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '100%' }}>
                                    <Image src={img.url} alt={`Day ${day.dayNumber || index + 1} itinerary image`} fill className="object-cover absolute inset-0" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {day.itineraryDescription && (
                              <RichHtml
                                as="div"
                                html={day.itineraryDescription}
                                className="text-gray-600 text-sm leading-relaxed mb-4 prose prose-sm max-w-none"
                              />
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
                                      <RichHtml
                                        as="p"
                                        html={activity.activityTitle}
                                        className="text-sm font-medium text-orange-800"
                                      />
                                    )}
                                    {activity.activityDescription && (
                                      <RichHtml
                                        as="p"
                                        html={activity.activityDescription}
                                        className="text-xs text-orange-700/70 mt-1"
                                      />
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
              {isOfferActive && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    {tourPackage.offerBadge || "Limited Offer"}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-gray-900">
                    {tourPackage.offerTitle || "Special package offer"}
                  </h2>
                  {tourPackage.offerSubtitle ? (
                    <p className="mt-1 text-sm text-amber-900/80">
                      {tourPackage.offerSubtitle}
                    </p>
                  ) : null}
                  {offerValidity ? (
                    <p className="mt-3 text-xs font-semibold text-amber-800">
                      {offerValidity}
                    </p>
                  ) : null}
                  {offerTerms.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-amber-900/80">
                      {offerTerms.slice(0, 3).map((term: string, index: number) => (
                        <li key={index}>• {term}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-lg shadow-orange-500/5">
                <div className="mb-6">
                  {displayPrice ? (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        {isOfferActive ? "Offer price" : "Starting from"}
                      </span>
                      <p className="text-3xl font-bold text-orange-700">
                        {"\u20B9"}{displayPrice}
                      </p>
                      {originalPrice && originalPrice !== displayPrice ? (
                        <p className="text-sm text-gray-400 line-through">
                          {"\u20B9"}{originalPrice}
                        </p>
                      ) : null}
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
                        <span className="font-medium">{"\u20B9"}{formatPrice(tourPackage.pricePerAdult)}</span>
                      </div>
                    )}
                    {tourPackage.pricePerChildOrExtraBed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Child / Extra Bed</span>
                        <span className="font-medium">{"\u20B9"}{formatPrice(tourPackage.pricePerChildOrExtraBed)}</span>
                      </div>
                    )}
                    {tourPackage.pricePerChild5to12YearsNoBed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Child (5-12, No Bed)</span>
                        <span className="font-medium">{"\u20B9"}{formatPrice(tourPackage.pricePerChild5to12YearsNoBed)}</span>
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
                  Enquire on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setShowEnquiryForm((v) => !v)}
                  className="mt-3 block w-full py-3.5 border border-orange-200 text-orange-700 text-center rounded-xl font-semibold hover:bg-orange-50 transition-all duration-200"
                >
                  {showEnquiryForm ? "Hide enquiry form" : "Submit enquiry form"}
                </button>
                <a
                  href={`/api/travel/package-brochure/${encodeURIComponent(packageSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download PDF brochure
                </a>

                {showEnquiryForm && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {enquirySuccess ? (
                      <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                        Enquiry submitted! Our team will contact you at {enquiryPhone} within 24 hours.
                      </p>
                    ) : (
                      <form onSubmit={handleEnquirySubmit} className="space-y-3">
                        <input
                          type="text"
                          placeholder="Your name *"
                          value={enquiryName}
                          onChange={(e) => setEnquiryName(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Mobile number *"
                          value={enquiryPhone}
                          onChange={(e) => setEnquiryPhone(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                          required
                        />
                        <input
                          type="number"
                          min={1}
                          placeholder="Adults"
                          value={enquiryAdults}
                          onChange={(e) => setEnquiryAdults(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Coupon code"
                          value={enquiryCouponCode}
                          onChange={(e) => setEnquiryCouponCode(e.target.value.toUpperCase())}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase"
                        />
                        <textarea
                          placeholder="Any preferences or questions"
                          value={enquiryRemarks}
                          onChange={(e) => setEnquiryRemarks(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm resize-none"
                        />
                        {enquiryError && (
                          <p className="text-sm text-red-600">{enquiryError}</p>
                        )}
                        <button
                          type="submit"
                          disabled={enquirySubmitting}
                          className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold disabled:opacity-60"
                        >
                          {enquirySubmitting ? "Submitting…" : "Submit enquiry"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
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
                  isOfferActive={pkg.isOfferActive}
                  offerBadge={pkg.offerBadge}
                  offerPrice={pkg.offerPrice}
                  offerOriginalPrice={pkg.offerOriginalPrice}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

