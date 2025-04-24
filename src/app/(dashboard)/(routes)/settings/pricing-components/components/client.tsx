"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";

import { columns } from "./columns";
import { PricingComponentColumn } from "./columns";

interface PricingComponentsClientProps {
  data: PricingComponentColumn[];
}

export const PricingComponentsClient: React.FC<PricingComponentsClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Pricing Components (${data.length})`} description="Manage pricing components for your tour packages" />
        <Button onClick={() => router.push('/settings/pricing-components/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="attributeName" columns={columns} data={data} />
      <Heading title="API" description="API calls for Pricing Components" />
      <Separator />
      <ApiList entityName="pricing-components" entityIdName="pricingComponentId" />
    </>
  );
};
