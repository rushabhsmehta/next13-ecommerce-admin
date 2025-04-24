"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { PricingAttributeColumn } from "./columns";

import { columns } from "./columns";
interface PricingAttributesClientProps {
  data: PricingAttributeColumn[];
}

export const PricingAttributesClient: React.FC<PricingAttributesClientProps> = ({
  data
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Pricing Attributes (${data.length})`} description="Manage pricing attributes for your products" />
        <Button onClick={() => router.push('/settings/pricing-attributes/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API calls for Pricing Attributes" />
      <Separator />
      <ApiList entityName="pricing-attributes" entityIdName="pricingAttributeId" />
    </>
  );
};
