"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiAlert } from "@/components/ui/api-alert";

import { columns, ActivityMasterColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";

interface ActivitiesMasterClientProps {
  data: ActivityMasterColumn[];
}

export const ActivitiesMasterClient: React.FC<ActivitiesMasterClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();

  const handleAddNewClick = () => {
    // Open the link in a new tab
    window.open(`/${params.storeId}/activitiesMaster/new`, '_blank');
  };


  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Activities (${data.length})`} description="Manage Activities for your store" />
        <Button onClick={handleAddNewClick}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
    <DataTable searchKey="activityMasterTitle" columns={columns} data={data} />
      {/*   <Heading title="API" description="API Calls for Activities" />
      <Separator />
      <ApiList entityName="activitiesMaster" entityIdName="activityMasterId" /> */}
    </>
  );
};
