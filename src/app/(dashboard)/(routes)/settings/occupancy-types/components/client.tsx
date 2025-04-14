"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";

import { columns } from "./columns";

interface OccupancyTypesClientProps {
  data: any[];
}

export const OccupancyTypesClient: React.FC<OccupancyTypesClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Occupancy Types (${data.length})`}
          description="Manage occupancy types for your accommodations"
        />
        <Button onClick={() => router.push(`/settings/occupancy-types/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable columns={columns} data={data} searchKey="name" />
    </>
  );
};
