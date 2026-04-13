import Image from "next/image";
import { Building2, MapPin } from "lucide-react";

interface HotelData {
  id: string;
  name: string;
  images: { url: string }[];
  location: { label: string; slug: string | null } | null;
}

export function FeaturedHotels({ hotels }: { hotels: HotelData[] }) {
  if (hotels.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Accommodations
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Featured Hotels
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Carefully selected hotels and resorts that form part of our premium
            tour packages — comfort and quality guaranteed.
          </p>
        </div>

        {/* Hotels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {hotels.map((hotel) => {
            const imageUrl = hotel.images[0]?.url || "";

            return (
              <div
                key={hotel.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1 border border-gray-100/80"
              >
                {/* Image */}
                <div className="relative h-52 sm:h-56 overflow-hidden">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={hotel.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-orange-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Location badge */}
                  {hotel.location && (
                    <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-white">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium drop-shadow-sm">
                        {hotel.location.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-orange-500 group-hover:to-amber-500 transition-all duration-300">
                      <Building2 className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {hotel.name}
                      </h3>
                      {hotel.location && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hotel.location.label}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
