"use client";

import { Plus, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Location } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { columns, DestinationColumn } from "./columns";

interface DestinationsClientProps {
  data: DestinationColumn[];
  selectedLocation?: Location | null;
}

export const DestinationsClient: React.FC<DestinationsClientProps> = ({
  data,
  selectedLocation,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams?.get("locationId");

  const title = selectedLocation
    ? `Destinations for ${selectedLocation.label} (${data.length})`
    : `Destinations (${data.length})`;

  const description = selectedLocation
    ? `Manage destinations for ${selectedLocation.label}`
    : "Manage destinations for your locations";

  const handleAddNew = () => {
    const newUrl = locationId
      ? `/destinations/new?locationId=${locationId}`
      : `/destinations/new`;
    router.push(newUrl);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedLocation && (
            <Button
              variant="outline"
              onClick={() => router.push("/locations")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Locations
            </Button>
          )}
          <Heading
            title={title}
            description={description}
          />
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};
