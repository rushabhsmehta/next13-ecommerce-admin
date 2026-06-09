import Link from "next/link";
import { FileQuestion, Home, MapPin, Package } from "lucide-react";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";

export default async function TravelNotFound() {
  const basePath = await getServerTravelBasePath();
  const home = travelHref("/", basePath);
  const packages = travelHref("/packages", basePath);
  const destinations = travelHref("/destinations", basePath);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex items-center gap-3 text-gray-400">
        <FileQuestion className="h-12 w-12 text-orange-300" />
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold text-gray-900">Page Not Found</h2>
          <p className="text-lg text-gray-500">404</p>
        </div>
      </div>
      <p className="mt-4 max-w-md text-center text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved. Try
        browsing our packages or destinations instead.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={home}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
        <Link
          href={packages}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-orange-200 hover:text-orange-600"
        >
          <Package className="h-4 w-4" />
          Tour Packages
        </Link>
        <Link
          href={destinations}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-orange-200 hover:text-orange-600"
        >
          <MapPin className="h-4 w-4" />
          Destinations
        </Link>
      </div>
    </div>
  );
}
