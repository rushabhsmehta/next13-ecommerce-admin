"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Package, Search } from "lucide-react";
import { formatPackageDisplayName } from "@/lib/travel-display";
import { locationDestinationPath } from "@/lib/location-slug";
import { useTravelPath } from "./travel-path-provider";

type SearchPackage = {
  type: "package";
  id: string;
  slug: string | null;
  name: string | null;
  duration: string | null;
  location: string;
  imageUrl?: string;
};

type SearchDestination = {
  type: "destination";
  id: string;
  slug: string | null;
  name: string;
  packageCount: number;
  imageUrl?: string;
};

type TravelSearchBoxProps = {
  variant?: "desktop" | "mobile";
  autoFocus?: boolean;
  onNavigate?: () => void;
};

export function TravelSearchBox({
  variant = "desktop",
  autoFocus = false,
  onNavigate,
}: TravelSearchBoxProps) {
  const router = useRouter();
  const { href } = useTravelPath();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<SearchPackage[]>([]);
  const [destinations, setDestinations] = useState<SearchDestination[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasResults = packages.length > 0 || destinations.length > 0;
  const showDropdown = open && query.trim().length >= 2 && (loading || hasResults);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPackages([]);
      setDestinations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/travel/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setPackages(data?.results?.packages ?? []);
          setDestinations(data?.results?.destinations ?? []);
        })
        .catch(() => {
          setPackages([]);
          setDestinations([]);
        })
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToFullSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    router.push(href(`/packages?search=${encodeURIComponent(q)}`));
    setOpen(false);
    onNavigate?.();
  }, [query, router, href, onNavigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToFullSearch();
  };

  const closeAndNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  const submitLabel = variant === "mobile" ? "Go" : "Search";

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/95 px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 flex-shrink-0 text-orange-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search packages, destinations..."
            className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            autoFocus={autoFocus}
            aria-label="Search travel packages"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            role="combobox"
          />
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:shadow-md hover:shadow-orange-500/20"
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-orange-500/10"
          role="listbox"
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>
          ) : !hasResults ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              No matches. Press Search to browse all packages.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {destinations.length > 0 ? (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Destinations
                  </p>
                  {destinations.map((dest) => (
                    <Link
                      key={dest.id}
                      href={href(locationDestinationPath(dest))}
                      onClick={closeAndNavigate}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-orange-50"
                      role="option"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-orange-100">
                        {dest.imageUrl ? (
                          <Image
                            src={dest.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <MapPin className="m-auto h-4 w-4 text-orange-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {dest.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {dest.packageCount}{" "}
                          {dest.packageCount === 1 ? "package" : "packages"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              {packages.length > 0 ? (
                <div className="px-2 pt-1">
                  <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Packages
                  </p>
                  {packages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={href(
                        pkg.slug ? `/packages/${pkg.slug}` : `/packages/${pkg.id}`
                      )}
                      onClick={closeAndNavigate}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-orange-50"
                      role="option"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-orange-100">
                        {pkg.imageUrl ? (
                          <Image
                            src={pkg.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <Package className="m-auto h-4 w-4 text-orange-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {formatPackageDisplayName(pkg.name)}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {pkg.location}
                          {pkg.duration ? ` · ${pkg.duration}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={goToFullSearch}
                className="w-full border-t border-gray-100 px-4 py-2.5 text-left text-xs font-semibold text-orange-600 hover:bg-orange-50"
              >
                View all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
