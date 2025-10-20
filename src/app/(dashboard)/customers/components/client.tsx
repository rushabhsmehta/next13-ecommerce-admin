"use client";

import { useMemo } from "react";
import { Download, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, CustomerColumn } from "./columns";

interface CustomerClientProps {
  data: CustomerColumn[];
}

export const CustomerClient: React.FC<CustomerClientProps> = ({
  data
}) => {
  const router = useRouter();

  const exportRows = useMemo(
    () =>
      data.map((customer) => ({
        Name: customer.name,
        Contact: customer.contact,
        Email: customer.email,
        "Associate Partner": customer.associatePartner,
        "Date Added": customer.createdAt,
      })),
    [data]
  );

  const downloadCsv = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.setAttribute("download", `customers-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `customers-${today}.xlsx`);
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={downloadCsv}>
        <Download className="mr-2 h-4 w-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadExcel}>
        <Download className="mr-2 h-4 w-4" /> Excel
      </Button>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Customers (${data.length})`} description="Manage Customers for your Aagam Holidays Website" />
        <Button onClick={() => router.push(`/customers/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} toolbar={toolbar} />
    </>
  );
};

