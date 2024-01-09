"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiAlert } from "@/components/ui/api-alert";

import { columns, ItineraryColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";

interface ItinerariesClientProps {
  data: ItineraryColumn[];
}

export const ItinerariesClient: React.FC<ItinerariesClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Itineraries (${data.length})`} description="Manage Itineraries for your store" />
        <Button onClick={() => router.push(`/${params.storeId}/itineraries/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="itineraryTitle" columns={columns} data={data} />
      <Heading title="API" description="API Calls for Itineraries" />
      <Separator />
      <ApiList entityName="itineraries" entityIdName="itineraryId" />
    </>
  );
};
