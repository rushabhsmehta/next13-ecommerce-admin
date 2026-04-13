import { MapPin, Package, Users, Award } from "lucide-react";

interface StatsProps {
  destinationCount: number;
  packageCount: number;
}

const getStats = (destinationCount: number, packageCount: number) => [
  {
    icon: Users,
    value: "10,000+",
    label: "Happy Travellers",
    description: "Satisfied customers trust us",
    gradient: "from-orange-500 to-red-500",
    lightBg: "from-orange-50 to-red-50",
  },
  {
    icon: MapPin,
    value: `${destinationCount}+`,
    label: "Destinations",
    description: "Across India & abroad",
    gradient: "from-red-500 to-purple-500",
    lightBg: "from-red-50 to-purple-50",
  },
  {
    icon: Package,
    value: `${packageCount}+`,
    label: "Tour Packages",
    description: "Curated experiences",
    gradient: "from-purple-500 to-indigo-500",
    lightBg: "from-purple-50 to-indigo-50",
  },
  {
    icon: Award,
    value: "10+",
    label: "Years of Experience",
    description: "Trusted travel experts",
    gradient: "from-indigo-500 to-orange-500",
    lightBg: "from-indigo-50 to-orange-50",
  },
];

export function StatsSection({ destinationCount, packageCount }: StatsProps) {
  const stats = getStats(destinationCount, packageCount);

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-14">
          <span className="text-orange-400 font-semibold text-sm uppercase tracking-wider">
            Our Track Record
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-2">
            Numbers That Speak for Themselves
          </h2>
          <p className="text-gray-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Years of crafting extraordinary journeys have earned us the trust of
            thousands of travellers across India and beyond.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-7 text-center hover:bg-white/10 transition-all duration-300 group hover:-translate-y-1"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>

                {/* Value */}
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>

                {/* Label */}
                <div className="text-sm sm:text-base font-semibold text-white mb-1">
                  {stat.label}
                </div>

                {/* Description */}
                <div className="text-xs text-gray-400">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
