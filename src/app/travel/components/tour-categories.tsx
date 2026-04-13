import type { ElementType } from "react";
import Link from "next/link";
import { Map, Globe, Heart, Mountain, Compass, Waves, Camera, Leaf } from "lucide-react";

interface CategoryData {
  tourCategory: string | null;
  _count: { id: number };
}

interface CategoryConfig {
  icon: ElementType;
  gradient: string;
  lightBg: string;
}

const categoryConfig: Record<string, CategoryConfig> = {
  Domestic: {
    icon: Map,
    gradient: "from-orange-500 to-red-500",
    lightBg: "from-orange-50 to-red-50",
  },
  International: {
    icon: Globe,
    gradient: "from-blue-500 to-indigo-500",
    lightBg: "from-blue-50 to-indigo-50",
  },
  Honeymoon: {
    icon: Heart,
    gradient: "from-pink-500 to-rose-500",
    lightBg: "from-pink-50 to-rose-50",
  },
  Adventure: {
    icon: Mountain,
    gradient: "from-emerald-500 to-teal-500",
    lightBg: "from-emerald-50 to-teal-50",
  },
  Beach: {
    icon: Waves,
    gradient: "from-cyan-500 to-sky-500",
    lightBg: "from-cyan-50 to-sky-50",
  },
  Hill: {
    icon: Leaf,
    gradient: "from-green-500 to-emerald-500",
    lightBg: "from-green-50 to-emerald-50",
  },
  Wildlife: {
    icon: Camera,
    gradient: "from-amber-500 to-orange-500",
    lightBg: "from-amber-50 to-orange-50",
  },
};

const defaultConfig: CategoryConfig = {
  icon: Compass,
  gradient: "from-purple-500 to-violet-500",
  lightBg: "from-purple-50 to-violet-50",
};

export function TourCategories({ categories }: { categories: CategoryData[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Browse by Type
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Explore Tour Categories
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Whether you seek adventure, romance, or cultural experiences — we
            have the perfect trip for every traveller.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {categories.map(({ tourCategory, _count }) => {
            if (!tourCategory) return null;
            const config = categoryConfig[tourCategory] ?? defaultConfig;
            const Icon = config.icon;

            return (
              <Link
                key={tourCategory}
                href={`/travel/packages?category=${encodeURIComponent(tourCategory)}`}
                className="group"
              >
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 group-hover:-translate-y-1 border border-gray-100/80 text-center">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${config.lightBg} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300`}
                  >
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 group-hover:text-orange-700 transition-colors duration-300" />
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {tourCategory}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {_count.id} {_count.id === 1 ? "package" : "packages"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
