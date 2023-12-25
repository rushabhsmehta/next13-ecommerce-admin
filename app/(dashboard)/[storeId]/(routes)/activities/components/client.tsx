"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiAlert } from "@/components/ui/api-alert";

import { columns, ActivityColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";

interface ActivitiesClientProps {
  data: ActivityColumn[];
}

export const ActivitiesClient: React.FC<ActivitiesClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Activites (${data.length})`} description="Manage Activities for your store" />
        <Button onClick={() => router.push(`/${params.storeId}/activites/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="title" columns={columns} data={data} />
      <Heading title="API" description="API Calls for Activities" />
      <Separator />
      <ApiList entityName="activities" entityIdName="activityId" />
    </>
  );
};
