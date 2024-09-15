import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { ActivityColumn, columns } from "./columns";

interface ActivitiesClientProps {
  data: ActivityColumn[];
}

export const ActivitiesClient: React.FC<ActivitiesClientProps> = ({
  data
}) => {
  const params = useParams();

  const handleAddNewClick = () => {
    // Open the link in a new tab
    window.open(`/${params.storeId}/activities/new`, '_blank');
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
      <DataTable searchKey="activityTitle" columns={columns} data={data} />
      {/* <Heading title="API" description="API Calls for Activities" />
      <Separator />
      <ApiList entityName="activities" entityIdName="activityId" /> */}
    </>
  );
};
