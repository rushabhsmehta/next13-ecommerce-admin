import prismadb from "@/lib/prismadb";
import { LocationForm } from "./components/location-form";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";
import Link from "next/link";

const LocationPage = async ({
  params
}: {
  params: { locationId: string }
}) => {
  const location = await prismadb.location.findUnique({
    where: {
      id: params.locationId
    }
  });

  return (
    <>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div />
            <Link href={`/transport-pricing?locationId=${params.locationId}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Manage Transport Pricing
              </Button>
            </Link>
          </div>
          <LocationForm initialData={location} />
        </div>
      </div>
    </>
  );
}

export default LocationPage;
