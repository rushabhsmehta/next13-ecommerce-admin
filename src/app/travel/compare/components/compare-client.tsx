"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitCompare, Loader2, MapPin, Clock, Trash2, X } from "lucide-react";
import { formatPackageDisplayName } from "@/lib/travel-display";
import {
  getSavedPackages,
  MAX_COMPARE_PACKAGES,
  removeSavedPackage,
  type TravelSavedPackage,
} from "@/lib/travel-saved-packages";
import { useTravelPath } from "../../components/travel-path-provider";

type ComparePackage = {
  id: string;
  tourPackageName: string | null;
  slug: string | null;
  numDaysNight: string | null;
  tourCategory: string | null;
  price: string | null;
  pricePerAdult: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  transport: string | null;
  isOfferActive?: boolean;
  offerBadge?: string | null;
  offerPrice?: string | null;
  location: { label: string | null } | null;
  images: { url: string }[];
  _count: { itineraries: number };
};

function formatComparePrice(pkg: ComparePackage): string {
  const raw = pkg.isOfferActive
    ? pkg.offerPrice || pkg.pricePerAdult || pkg.price
    : pkg.pricePerAdult || pkg.price;
  if (!raw) return "Contact for quote";
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return "Contact for quote";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

const COMPARE_ROWS: Array<{
  label: string;
  value: (pkg: ComparePackage) => string;
}> = [
  { label: "Destination", value: (p) => p.location?.label || "—" },
  { label: "Duration", value: (p) => p.numDaysNight || "—" },
  { label: "Category", value: (p) => p.tourCategory || "—" },
  { label: "Itinerary days", value: (p) => String(p._count.itineraries || "—") },
  { label: "Starting price", value: formatComparePrice },
  {
    label: "Offer",
    value: (p) =>
      p.isOfferActive ? p.offerBadge || "Active offer" : "—",
  },
  { label: "Pickup", value: (p) => p.pickup_location || "—" },
  { label: "Drop", value: (p) => p.drop_location || "—" },
  { label: "Transport", value: (p) => p.transport || "—" },
];

export function CompareClient() {
  const { href } = useTravelPath();
  const [saved, setSaved] = useState<TravelSavedPackage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packages, setPackages] = useState<ComparePackage[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSaved = useCallback(() => {
    const list = getSavedPackages();
    setSaved(list);
    setSelectedIds((prev) => {
      const valid = prev.filter((id) => list.some((p) => p.id === id));
      if (valid.length >= 2) return valid.slice(0, MAX_COMPARE_PACKAGES);
      return list.slice(0, MAX_COMPARE_PACKAGES).map((p) => p.id);
    });
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    async function loadCompare() {
      if (selectedIds.length < 2) {
        setPackages([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/travel/packages/compare?ids=${encodeURIComponent(selectedIds.join(","))}`
        );
        if (res.ok) {
          const data = await res.json();
          setPackages(data.packages ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadCompare();
  }, [selectedIds]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_COMPARE_PACKAGES) return prev;
      return [...prev, id];
    });
  }

  function handleRemove(id: string) {
    setSaved(removeSavedPackage(id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  if (saved.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mx-auto">
          <GitCompare className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Nothing to compare yet</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Save tours with the heart icon on any package page, then come back here to
          compare up to {MAX_COMPARE_PACKAGES} side by side.
        </p>
        <Link
          href={href("/packages")}
          className="inline-flex rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-orange-600 hover:to-red-600"
        >
          Browse packages
        </Link>
      </div>
    );
  }

  if (saved.length === 1) {
    return (
      <div className="text-center py-16 space-y-4">
        <GitCompare className="w-10 h-10 text-orange-400 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Save one more package</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          You need at least two saved tours to compare. You have one saved — add another
          from the packages list.
        </p>
        <Link
          href={href("/packages")}
          className="inline-flex rounded-full border border-orange-200 px-6 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50"
        >
          Find another package
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <p className="text-sm font-medium text-gray-900 mb-3">
          Select up to {MAX_COMPARE_PACKAGES} packages to compare
          <span className="text-gray-400 font-normal ml-2">
            ({selectedIds.length} selected)
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {saved.map((pkg) => {
            const selected = selectedIds.includes(pkg.id);
            const disabled = !selected && selectedIds.length >= MAX_COMPARE_PACKAGES;
            return (
              <button
                key={pkg.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleSelect(pkg.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? "border-orange-400 bg-orange-50 text-orange-700"
                    : disabled
                      ? "border-gray-100 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 text-gray-600 hover:border-orange-200"
                }`}
              >
                {formatPackageDisplayName(pkg.name)}
                {selected && <X className="w-3 h-3 opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedIds.length < 2 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          Select at least two packages above.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : packages.length < 2 ? (
        <p className="text-center text-gray-500 text-sm py-8">
          Could not load package details. Try again or re-save packages from their pages.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 font-medium text-gray-500 w-36 sticky left-0 bg-white z-10">
                  Compare
                </th>
                {packages.map((pkg) => (
                  <th key={pkg.id} className="p-4 text-left align-top min-w-[180px]">
                    <div className="relative w-full h-24 rounded-lg overflow-hidden bg-orange-100 mb-3">
                      {pkg.images[0]?.url ? (
                        <Image
                          src={pkg.images[0].url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      ) : null}
                    </div>
                    <p className="font-semibold text-gray-900 line-clamp-2">
                      {formatPackageDisplayName(pkg.tourPackageName)}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Link
                        href={href(`/packages/${pkg.slug || pkg.id}`)}
                        className="text-xs font-medium text-orange-600 hover:underline"
                      >
                        View package
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(pkg.id)}
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Remove from saved"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-gray-50 last:border-0">
                  <td className="p-4 font-medium text-gray-500 sticky left-0 bg-white z-10">
                    {row.label}
                  </td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="p-4 text-gray-800 align-top">
                      {row.value(pkg)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Prices shown when available in CRM
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Save packages with ♥ on detail pages
        </span>
      </p>
    </div>
  );
}
