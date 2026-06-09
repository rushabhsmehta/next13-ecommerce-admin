import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { TRAVEL_GUIDES } from "@/lib/travel-guides";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";

export const metadata = {
  title: "Travel Guides | Aagam Holidays",
  description:
    "Practical travel planning tips, destination advice, and tour planning checklists from the Aagam Holidays team.",
};

export default async function TravelGuidesPage() {
  const basePath = await getServerTravelBasePath();

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            Travel Guides
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Plan smarter before you book
          </h1>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Honest, practical advice from our coordinators — seasons, regions,
            and what to clarify before you confirm a tour.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {TRAVEL_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={travelHref(`/guides/${guide.slug}`, basePath)}
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg hover:border-orange-100 transition-all"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
                <BookOpen className="w-3.5 h-3.5" />
                {guide.category}
              </div>
              <h2 className="mt-3 text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                {guide.title}
              </h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                {guide.excerpt}
              </p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {guide.readMinutes} min read
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
