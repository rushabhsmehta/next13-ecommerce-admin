"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PackageCard } from "../../components/package-card";
import { useRouter } from "next/navigation";
import { useTravelPath } from "../../components/travel-path-provider";

interface Package {
  id: string;
  tourPackageName: string | null;
  slug: string | null;
  price: string | null;
  pricePerAdult: string | null;
  numDaysNight: string | null;
  tourCategory: string | null;
  isOfferActive?: boolean;
  offerBadge?: string | null;
  offerPrice?: string | null;
  offerOriginalPrice?: string | null;
  location: { id: string; label: string };
  images: { url: string }[];
  _count: { itineraries: number };
}

interface PackagesListClientProps {
  packages: Package[];
  locations: { id: string; label: string }[];
  categories: string[];
  initialCategory?: string;
  initialSearch?: string;
  initialLocation?: string;
  initialOffer?: boolean;
}

type SortOption = "featured" | "name-asc" | "price-low" | "price-high";

function formatPrice(value: string | null) {
  if (!value) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return amount;
}

export function PackagesListClient({
  packages,
  locations,
  categories,
  initialCategory,
  initialSearch,
  initialLocation,
  initialOffer,
}: PackagesListClientProps) {
  const router = useRouter();
  const { href } = useTravelPath();
  const [activeCategory, setActiveCategory] = useState(initialCategory || "all");
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [activeLocation, setActiveLocation] = useState(initialLocation || "all");
  const [offerOnly, setOfferOnly] = useState(Boolean(initialOffer));
  const [activeSort, setActiveSort] = useState<SortOption>("featured");
  const [showFilters, setShowFilters] = useState(false);

  const pushFilters = (next: {
    category?: string;
    search?: string;
    location?: string;
    offer?: boolean;
  }) => {
    const params = new URLSearchParams();
    const category = next.category ?? activeCategory;
    const search = next.search ?? searchQuery;
    const location = next.location ?? activeLocation;
    const offer = next.offer ?? offerOnly;

    if (category !== "all") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    if (location !== "all") params.set("location", location);
    if (offer) params.set("offer", "1");

    const query = params.toString();
    router.push(query ? href(`/packages?${query}`) : href("/packages"));
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    pushFilters({ category });
  };

  const handleLocationChange = (location: string) => {
    setActiveLocation(location);
    pushFilters({ location });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushFilters({ search: searchQuery });
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setSearchQuery("");
    setActiveLocation("all");
    setOfferOnly(false);
    setActiveSort("featured");
    router.push(href("/packages"));
  };

  const sortedPackages = [...packages].sort((left, right) => {
    const leftPrice = formatPrice(left.pricePerAdult) ?? formatPrice(left.price);
    const rightPrice = formatPrice(right.pricePerAdult) ?? formatPrice(right.price);

    switch (activeSort) {
      case "name-asc":
        return (left.tourPackageName || "").localeCompare(right.tourPackageName || "");
      case "price-low":
        if (leftPrice === null && rightPrice === null) return 0;
        if (leftPrice === null) return 1;
        if (rightPrice === null) return -1;
        return leftPrice - rightPrice;
      case "price-high":
        if (leftPrice === null && rightPrice === null) return 0;
        if (leftPrice === null) return 1;
        if (rightPrice === null) return -1;
        return rightPrice - leftPrice;
      case "featured":
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="mb-6 sm:mb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Tour Packages
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              Explore our curated collection of {packages.length} tour packages
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Showing {sortedPackages.length} results
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4 mb-3 sm:mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages by name or destination..."
            className="w-full pl-12 pr-10 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300 shadow-sm transition-all text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                pushFilters({ search: "" });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </form>

        <label className="flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
          <SlidersHorizontal className="w-5 h-5 text-orange-500" />
          <select
            value={activeSort}
            onChange={(e) => setActiveSort(e.target.value as SortOption)}
            className="bg-transparent text-sm sm:text-base text-gray-700 focus:outline-none"
            aria-label="Sort packages"
          >
            <option value="featured">Sort: Featured</option>
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="price-low">Sort: Price Low to High</option>
            <option value="price-high">Sort: Price High to Low</option>
          </select>
        </label>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 shadow-sm active:scale-[0.98] transition-transform"
        >
          <SlidersHorizontal className="w-5 h-5" /> Filters
        </button>
      </div>

      <div className={`${showFilters ? "block" : "hidden"} sm:block mb-3 sm:mb-6`}>
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 min-w-[220px]">
            Destination
            <select
              value={activeLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="all">All Destinations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {activeCategory === "all" ? "All categories" : activeCategory}
            </span>
            {(activeCategory !== "all" || searchQuery || activeLocation !== "all" || offerOnly) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-nowrap gap-2 mb-6 sm:mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <button
          onClick={() => {
            const next = !offerOnly;
            setOfferOnly(next);
            pushFilters({ offer: next });
          }}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            offerOnly
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
          }`}
        >
          Offers
        </button>
        <button
          onClick={() => handleCategoryChange("all")}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-orange-50 hover:border-orange-200"
          }`}
        >
          All Packages
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === cat
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-orange-50 hover:border-orange-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-16 sm:py-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 sm:w-8 sm:h-8 text-orange-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No packages found
          </h3>
          <p className="text-gray-500 text-sm">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {sortedPackages.map((pkg) => (
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
      )}
    </div>
  );
}
