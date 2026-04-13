import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    trip: "Kerala Backwaters & Munnar",
    rating: 5,
    quote:
      "Absolutely magical experience! The houseboat stay on the backwaters was a dream come true. Every detail was perfectly arranged — from the food to the transfers. Aagam Holidays made our anniversary trip truly unforgettable.",
    avatar: "PS",
    gradient: "from-orange-400 to-red-400",
  },
  {
    name: "Rahul & Neha Mehta",
    location: "Ahmedabad",
    trip: "Rajasthan Heritage Tour",
    rating: 5,
    quote:
      "Best-organised trip we've ever been on. The hotels were fantastic, the guide was incredibly knowledgeable, and the itinerary balanced sightseeing and leisure perfectly. We've already booked our next trip with them!",
    avatar: "RM",
    gradient: "from-purple-400 to-indigo-400",
  },
  {
    name: "Anjali & Vikram Singh",
    location: "Delhi",
    trip: "Goa Honeymoon Package",
    rating: 5,
    quote:
      "The team made our honeymoon absolutely perfect. From the beachfront villa to the candlelit dinner surprise, every moment was special. The 24/7 support gave us complete peace of mind. Highly recommend!",
    avatar: "AV",
    gradient: "from-pink-400 to-rose-400",
  },
  {
    name: "Suresh Patel",
    location: "Surat",
    trip: "Ladakh Adventure Trip",
    rating: 5,
    quote:
      "An incredible adventure through some of the most breathtaking landscapes in India. The team handled all the permits and logistics seamlessly. Pangong Lake at sunrise is something I'll never forget. Thank you!",
    avatar: "SP",
    gradient: "from-emerald-400 to-teal-400",
  },
];

export function Testimonials() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-14">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Traveller Stories
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            What Our Customers Say
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Real stories from real travellers. We are proud to have made
            thousands of journeys extraordinary.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 hover:-translate-y-1 border border-gray-100/80 flex flex-col"
            >
              {/* Quote icon */}
              <div className="mb-4">
                <Quote className="w-7 h-7 text-orange-200 fill-orange-100" />
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              {/* Quote Text */}
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-5 line-clamp-5">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-4 mt-auto">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white text-xs font-bold">
                      {testimonial.avatar}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-orange-600 truncate">
                      {testimonial.trip}
                    </p>
                    <p className="text-xs text-gray-400">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
