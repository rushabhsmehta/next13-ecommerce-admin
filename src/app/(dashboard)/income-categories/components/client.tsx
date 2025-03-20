"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { columns, IncomeCategoryColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";

interface IncomeCategoryClientProps {
  data: IncomeCategoryColumn[]
}

export const IncomeCategoryClient: React.FC<IncomeCategoryClientProps> = ({
  data
}) => {
  const router = useRouter();
  
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Income Categories (${data.length})`} description="Manage income categories" />
        <Button onClick={() => router.push(`/income-categories/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API calls for Income Categories" />
      <Separator />
      <ApiList entityName="income-categories" entityIdName="categoryId" />
    </>
  );
};

