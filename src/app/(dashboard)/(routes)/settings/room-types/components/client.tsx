"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";

import { columns } from "./columns";

interface RoomTypesClientProps {
  data: any[];
}

export const RoomTypesClient: React.FC<RoomTypesClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Room Types (${data.length})`}
          description="Manage room types for your accommodations"
        />
        <Button onClick={() => router.push(`/settings/room-types/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable columns={columns} data={data} searchKey="name" />
    </>
  );
};
