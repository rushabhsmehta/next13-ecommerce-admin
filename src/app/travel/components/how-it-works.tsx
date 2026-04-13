import { Search, Settings, CreditCard, Plane } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Browse Packages",
    description:
      "Explore our curated collection of domestic and international tour packages. Filter by destination, duration, or category.",
    gradient: "from-orange-500 to-red-500",
    lightBg: "from-orange-50 to-red-50",
  },
  {
    step: "02",
    icon: Settings,
    title: "Customize Your Trip",
    description:
      "Share your travel dates, group size, hotel preferences, and any special requirements. We tailor the perfect itinerary for you.",
    gradient: "from-red-500 to-purple-500",
    lightBg: "from-red-50 to-purple-50",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Confirm & Book",
    description:
      "Review your personalised itinerary, confirm your booking, and make a secure payment. We handle all the arrangements.",
    gradient: "from-purple-500 to-indigo-500",
    lightBg: "from-purple-50 to-indigo-50",
  },
  {
    step: "04",
    icon: Plane,
    title: "Travel & Enjoy",
    description:
      "Sit back and enjoy your journey! Our on-ground team and 24/7 support are always available throughout your trip.",
    gradient: "from-indigo-500 to-orange-500",
    lightBg: "from-indigo-50 to-orange-50",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50/50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Simple Process
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            How It Works
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Planning your dream trip with us is easy. Just follow these four
            simple steps and leave the rest to us.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-orange-200 via-purple-200 to-orange-200 z-0" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step number + icon */}
                <div className="relative z-10 mb-5">
                  {/* Outer ring */}
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-md border-2 border-orange-100 flex items-center justify-center group-hover:border-orange-300 transition-colors duration-300`}
                  >
                    {/* Inner icon bg */}
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${step.lightBg} group-hover:bg-gradient-to-br group-hover:${step.gradient} flex items-center justify-center transition-all duration-300`}
                    >
                      <Icon className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>

                  {/* Step number badge */}
                  <span
                    className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${step.gradient} text-white text-[10px] font-bold flex items-center justify-center shadow-sm`}
                  >
                    {index + 1}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
