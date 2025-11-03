"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { columns, HotelColumn } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";
import { HotelPricingImportDialog } from "./hotel-pricing-import-dialog";

interface HotelsClientProps {
  data: HotelColumn[];
}

export const HotelsClient: React.FC<HotelsClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Heading title={`Hotels (${data.length})`} description="Manage Hotels for your Website" />
        <div className="flex items-center gap-2">
          <HotelPricingImportDialog />
          <Button onClick={() => router.push(`/hotels/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>
      <Separator />
       <DataTableMultiple searchKeys={["name", "location"]} columns={columns} data={data} />

      {/*   <Heading title="API" description="API Calls for Hotels" />
      <Separator />
      <ApiList entityName="hotels" entityIdName="hotelId" /> */}
    </>
  );
};

