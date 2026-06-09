import { GitCompare } from "lucide-react";
import { CompareClient } from "./components/compare-client";

export const metadata = {
  title: "Compare Packages | Aagam Holidays",
  description:
    "Compare saved tour packages side by side — destination, duration, category, and pricing at a glance.",
};

export default function ComparePackagesPage() {
  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 text-orange-600 font-semibold text-sm uppercase tracking-wider">
            <GitCompare className="w-4 h-4" />
            Compare
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            Compare saved packages
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-xl mx-auto">
            Shortlist up to three tours and see destination, duration, and pricing
            in one view before you enquire.
          </p>
        </div>
        <CompareClient />
      </div>
    </div>
  );
}
