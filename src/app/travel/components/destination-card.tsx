"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { locationDestinationPath } from "@/lib/location-slug";
import { useTravelPath } from "./travel-path-provider";

interface DestinationCardProps {
  id: string;
  name: string;
  imageUrl: string;
  packageCount: number;
  slug?: string | null;
}

export function DestinationCard({
  id,
  name,
  imageUrl,
  packageCount,
  slug,
}: DestinationCardProps) {
  const { href } = useTravelPath();
  const hasImage = Boolean(imageUrl);
  const destinationHref = href(locationDestinationPath({ id, slug }));

  return (
    <Link href={destinationHref} className="group block">
      <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group-hover:-translate-y-1">
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-sm">
              {packageCount} {packageCount === 1 ? "Package" : "Packages"} Available
            </p>
            <span className="flex items-center gap-1 text-orange-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300">
              Explore <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
