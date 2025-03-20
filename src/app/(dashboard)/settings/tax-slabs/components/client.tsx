"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";

import { columns, TaxSlabColumn } from "./columns";

interface TaxSlabClientProps {
  data: TaxSlabColumn[];
}

export const TaxSlabClient: React.FC<TaxSlabClientProps> = ({ data }) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Tax Slabs (${data.length})`}
          description="Manage tax rates for products and services"
        />
        <Button onClick={() => router.push(`/settings/tax-slabs/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable columns={columns} data={data} searchKey="name" />
    </>
  );
};

