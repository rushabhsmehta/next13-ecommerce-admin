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
      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={imageUrl || "/placeholder-travel.jpg"}
            alt={name || "Tour Package"}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Category Badge */}
          {tourCategory && (
            <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-semibold rounded-full">
              {tourCategory}
            </span>
          )}

          {/* Duration */}
          {duration && (
            <span className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}

          {/* Location overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">{locationName}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-2">
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
                <span className="text-xs text-gray-500">Starting from</span>
                <p className="text-lg font-bold text-emerald-600">
                  ₹{Number(displayPrice).toLocaleString("en-IN")}
                  <span className="text-xs text-gray-500 font-normal">
                    /person
                  </span>
                </p>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Contact for pricing</span>
            )}
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium group-hover:gap-2 transition-all">
              View Details <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
