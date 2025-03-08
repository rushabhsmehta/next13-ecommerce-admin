"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { columns, TourPackageQueryColumn } from "./columns";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
}

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Tour Packages (${data.length})`} description="Manage tour packages for your store" />
        <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API Calls for Tour Package Query" />
      <Separator />
      <ApiList entityName="tourPackageQuery" entityIdName="tourPackageQueryId" />
    </>
  );
};