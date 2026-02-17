"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PackageCard } from "../../components/package-card";
import { useRouter } from "next/navigation";

interface Package {
  id: string;
  tourPackageName: string | null;
  slug: string | null;
  price: string | null;
  pricePerAdult: string | null;
  numDaysNight: string | null;
  tourCategory: string | null;
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
}

export function PackagesListClient({
  packages,
  locations,
  categories,
  initialCategory,
  initialSearch,
  initialLocation,
}: PackagesListClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(initialCategory || "all");
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [showFilters, setShowFilters] = useState(false);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (searchQuery) params.set("search", searchQuery);
    if (initialLocation) params.set("location", initialLocation);
    router.push(`/travel/packages?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (searchQuery) params.set("search", searchQuery);
    if (initialLocation) params.set("location", initialLocation);
    router.push(`/travel/packages?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Tour Packages
        </h1>
        <p className="text-gray-500 mt-2">
          Explore our curated collection of {packages.length} tour packages
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search packages by name or destination..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                router.push("/travel/packages");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 shadow-sm"
        >
          <SlidersHorizontal className="w-5 h-5" /> Filters
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-2">
        <button
          onClick={() => handleCategoryChange("all")}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeCategory === "all"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          All Packages
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === cat
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      {packages.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No packages found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
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
      )}
    </div>
  );
}
