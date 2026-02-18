import {
  Shield,
  Headphones,
  Heart,
  Sparkles,
  Star,
  MessageCircle,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Handcrafted Itineraries",
    description:
      "Every trip is meticulously planned by our travel experts to ensure unforgettable experiences.",
    lightBg: "from-orange-50 to-red-50",
    hoverGradient: "group-hover:from-orange-500 group-hover:to-red-500",
  },
  {
    icon: Shield,
    title: "Safe & Secure Travel",
    description:
      "Your safety is our priority. We ensure all tours meet the highest safety standards.",
    lightBg: "from-red-50 to-purple-50",
    hoverGradient: "group-hover:from-red-500 group-hover:to-purple-600",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Our dedicated support team is available round the clock to assist you during your journey.",
    lightBg: "from-purple-50 to-indigo-50",
    hoverGradient: "group-hover:from-purple-600 group-hover:to-purple-700",
  },
  {
    icon: Heart,
    title: "Personalized Experience",
    description:
      "Customize your tour to match your preferences. We make your dream vacation a reality.",
    lightBg: "from-orange-50 to-amber-50",
    hoverGradient: "group-hover:from-orange-500 group-hover:to-amber-500",
  },
  {
    icon: Star,
    title: "Best Price Guarantee",
    description:
      "Get the best value for your money with our competitive pricing and exclusive deals.",
    lightBg: "from-amber-50 to-orange-50",
    hoverGradient: "group-hover:from-amber-500 group-hover:to-orange-600",
  },
  {
    icon: MessageCircle,
    title: "Live Trip Chat",
    description:
      "Stay connected with your tour group and our operations team through our in-app chat.",
    lightBg: "from-red-50 to-orange-50",
    hoverGradient: "group-hover:from-red-500 group-hover:to-orange-500",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50/50 via-white to-purple-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Why Travel With Us
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            The Aagam Holidays Difference
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            We go above and beyond to make sure every journey is exceptional,
            from planning to your return home.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 hover:-translate-y-1 group border border-gray-100/60"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${feature.lightBg} rounded-xl flex items-center justify-center mb-5 ${feature.hoverGradient} transition-all duration-300`}>
                <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-orange-600 group-hover:text-white transition-colors duration-300`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
