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
  },
  {
    icon: Shield,
    title: "Safe & Secure Travel",
    description:
      "Your safety is our priority. We ensure all tours meet the highest safety standards.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Our dedicated support team is available round the clock to assist you during your journey.",
  },
  {
    icon: Heart,
    title: "Personalized Experience",
    description:
      "Customize your tour to match your preferences. We make your dream vacation a reality.",
  },
  {
    icon: Star,
    title: "Best Price Guarantee",
    description:
      "Get the best value for your money with our competitive pricing and exclusive deals.",
  },
  {
    icon: MessageCircle,
    title: "Live Trip Chat",
    description:
      "Stay connected with your tour group and our operations team through our in-app chat.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
            Why Travel With Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">
            The Aagam Holidays Difference
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            We go above and beyond to make sure every journey is exceptional,
            from planning to your return home.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mb-5 group-hover:from-emerald-500 group-hover:to-teal-500 transition-colors">
                <feature.icon className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
