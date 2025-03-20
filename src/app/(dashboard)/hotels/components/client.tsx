"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiAlert } from "@/components/ui/api-alert";

import { columns, HotelColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface HotelsClientProps {
  data: HotelColumn[];
}

export const HotelsClient: React.FC<HotelsClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Hotels (${data.length})`} description="Manage Hotels for your Website" />
        <Button onClick={() => router.push(`/hotels/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
       <DataTableMultiple searchKeys={["name", "location"]} columns={columns} data={data} />

      {/*   <Heading title="API" description="API Calls for Hotels" />
      <Separator />
      <ApiList entityName="hotels" entityIdName="hotelId" /> */}
    </>
  );
};

