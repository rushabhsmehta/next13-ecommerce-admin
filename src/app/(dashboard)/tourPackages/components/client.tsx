"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";

import { TourPackageColumn, columns, createColumns } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface TourPackagesClientProps {
  data: TourPackageColumn[];
  readOnly?: boolean;
};

export const TourPackagesClient: React.FC<TourPackagesClientProps> = ({
  data,
  readOnly = false
}) => {
  const params = useParams();
  const router = useRouter();

  const dynamicColumns = createColumns(readOnly);

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Tour Packages (${data.length})`} description="Manage tour packages for your Website" />
        {!readOnly && (
          <Button onClick={() => router.push(`/tourPackages/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        )}
      </div>
      <Separator />
     <DataTableMultiple searchKeys={["tourPackageName", "location"]} columns={dynamicColumns} data={data} />

    {/*     <Heading title="API" description="API Calls for Tour Packages" />
      <Separator />
      <ApiList entityName="tourPackages" entityIdName="tourPackageId" /> */}
    </>
  );
};

