import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Star, ArrowRight } from "lucide-react";

interface PackageCardProps {
  id: string;
  name: string;
  slug: string | null;
  locationName: string;
  imageUrl: string;
  duration: string | null;
  price: string | null;
  pricePerAdult: string | null;
  tourCategory: string | null;
  itineraryCount: number;
}

export function PackageCard({
  id,
  name,
  slug,
  locationName,
  imageUrl,
  duration,
  price,
  pricePerAdult,
  tourCategory,
  itineraryCount,
}: PackageCardProps) {
  const displayPrice = pricePerAdult || price;
  const href = slug ? `/travel/packages/${slug}` : `/travel/packages/${id}`;

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group-hover:-translate-y-1 border border-gray-100/80">
        {/* Image */}
        <div className="relative h-52 sm:h-56 overflow-hidden">
          <Image
            src={imageUrl || "/placeholder-travel.jpg"}
            alt={name || "Tour Package"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Category Badge */}
          {tourCategory && (
            <span className="absolute top-3.5 left-3.5 px-3 py-1 bg-white/90 backdrop-blur-sm text-orange-700 text-xs font-semibold rounded-lg">
              {tourCategory}
            </span>
          )}

          {/* Duration */}
          {duration && (
            <span className="absolute top-3.5 right-3.5 px-3 py-1 bg-black/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}

          {/* Location overlay */}
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-white">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm font-medium drop-shadow-sm">{locationName}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 mb-2 leading-snug">
            {name || "Tour Package"}
          </h3>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            {itineraryCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {itineraryCount} Days Itinerary
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {displayPrice ? (
              <div>
                <span className="text-[11px] text-gray-400 uppercase tracking-wider">Starting from</span>
                <p className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  ₹{Number(displayPrice).toLocaleString("en-IN")}
                  <span className="text-xs text-gray-400 font-normal ml-0.5">
                    /person
                  </span>
                </p>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Contact for pricing</span>
            )}
            <span className="flex items-center gap-1 text-orange-600 text-sm font-medium group-hover:gap-2 transition-all">
              Details <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
