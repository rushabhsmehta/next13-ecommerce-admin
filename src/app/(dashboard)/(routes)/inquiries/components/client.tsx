"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InquiryColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {  FileIcon, FileSpreadsheet, Plus } from "lucide-react";
import { PeriodFilter } from "./period-filter";
import { StatusFilter } from "./status-filter";
import { downloadAsExcel, downloadAsPDF } from "@/app/(dashboard)/(routes)/inquiries/components/download-utils";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onAssociateChange = (associateId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (associateId) {
      params.set('associateId', associateId);
    } else {
      params.delete('associateId');
    }
    router.push(`/inquiries?${params.toString()}`);
  };

  const handleAddNewClick = () => {
    // Open the link in a new tab
    window.open(`/inquiries/new`, '_blank');
  };

  // Download handlers
  const handleExcelDownload = () => {
    const filename = `inquiries-${new Date().toISOString().split('T')[0]}`;
    downloadAsExcel(data, filename);
  };

  const handlePdfDownload = () => {
    const filename = `inquiries-${new Date().toISOString().split('T')[0]}`;
    downloadAsPDF(data, filename);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" />
        <div className="flex items-center gap-x-2">
          <PeriodFilter />
          <StatusFilter />
          <Select
            value={searchParams.get('associateId') || ''}
            onValueChange={onAssociateChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Associate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Associates</SelectItem>
              {associates.map((associate) => (
                <SelectItem key={associate.id} value={associate.id}>
                  {associate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Separate Excel and PDF Download Buttons */}
          <Button 
            variant="outline"
            onClick={handleExcelDownload}
            className="flex items-center gap-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          
          <Button 
            variant="outline"
            onClick={handlePdfDownload}
            className="flex items-center gap-x-2"
          >
            <FileIcon className="h-4 w-4" />
            PDF
          </Button>
          
          <Button onClick={handleAddNewClick}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>    
      <Separator />
      <DataTable searchKey="customerName" columns={columns} data={data} />
    </>
  );
};
