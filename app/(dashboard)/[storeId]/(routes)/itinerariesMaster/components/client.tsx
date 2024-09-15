"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiAlert } from "@/components/ui/api-alert";

import { columns, ItineraryMasterColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface ItinerariesMasterClientProps {
  data: ItineraryMasterColumn[];
}

export const ItinerariesMasterClient: React.FC<ItinerariesMasterClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Itineraries (${data.length})`} description="Manage Itineraries for your store" />
        <Button onClick={() => router.push(`/${params.storeId}/itinerariesMaster/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
       <DataTableMultiple searchKeys={["itineraryMasterTitle","locationLabel"]} columns={columns} data={data} />
    {/*     <Heading title="API" description="API Calls for Itineraries" />
      <Separator />
      <ApiList entityName="itineraries" entityIdName="itineraryMasterId" /> */}
    </>
  );
};
