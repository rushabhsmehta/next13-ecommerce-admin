"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";

import { TourPackageQueryColumn, columns } from "./columns";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
};

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Tour Package Query (${data.length})`} description="Manage tour package Query for your Website" />
        <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
       <DataTable searchKey="name" columns={columns} data={data} />
     {/*    <Heading title="API" description="API Calls for Tour Package Query" />
      <Separator />
      <ApiList entityName="tourPackageQuery" entityIdName="tourPackageQueryId" /> */}
    </>
  );
};

