"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";

import { columns, AssociatePartnerColumn } from "./columns";

interface AssociatePartnersClientProps {
  data: AssociatePartnerColumn[];
}

export const AssociatePartnersClient: React.FC<AssociatePartnersClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Associate Partners (${data.length})`}
          description="Manage associate partners"
        />
        <Button onClick={() => router.push(`/associate-partners/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API calls for Associate Partners" />
      <Separator />
      <ApiList entityName="associate-partners" entityIdName="associatePartnerId" />
    </>
  );
};

