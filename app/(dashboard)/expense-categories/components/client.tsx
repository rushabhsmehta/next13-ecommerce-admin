"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

import { columns, ExpenseCategoryColumn } from "./columns";
import { ApiList } from "@/components/ui/api-list";

interface ExpenseCategoryClientProps {
  data: ExpenseCategoryColumn[]
}

export const ExpenseCategoryClient: React.FC<ExpenseCategoryClientProps> = ({
  data
}) => {
  const router = useRouter();
  
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Expense Categories (${data.length})`} description="Manage expense categories" />
        <Button onClick={() => router.push(`/expense-categories/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
      <Heading title="API" description="API calls for Expense Categories" />
      <Separator />
      <ApiList entityName="expense-categories" entityIdName="categoryId" />
    </>
  );
};
