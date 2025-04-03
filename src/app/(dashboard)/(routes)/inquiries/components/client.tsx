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
import { FileIcon, FileSpreadsheet, Plus, Filter } from "lucide-react";
import { PeriodFilter } from "./period-filter";
import { StatusFilter } from "./status-filter";
import { downloadAsExcel, downloadAsPDF } from "@/app/(dashboard)/(routes)/inquiries/components/download-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileInquiryCard } from "./mobile-inquiry-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
  organization: any;
  isAssociateUser?: boolean;
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates,
  organization,
  isAssociateUser = false
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");

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
    downloadAsExcel(data, filename, organization);
  };

  const handlePdfDownload = () => {
    const filename = `inquiries-${new Date().toISOString().split('T')[0]}`;
    downloadAsPDF(data, filename, organization);
  };

  // Filter data based on search query for mobile view
  const filteredData = searchQuery 
    ? data.filter(item => 
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerMobileNumber.includes(searchQuery) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data;

  // Filter component for mobile view
  const FiltersContent = () => (
    <div className="flex flex-col space-y-4 py-4">
      <PeriodFilter />
      <StatusFilter />
      
      {!isAssociateUser && (
        <Select
          value={searchParams.get('associateId') || ''}
          onValueChange={onAssociateChange}
        >
          <SelectTrigger className="w-full">
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
      )}
    </div>
  );

  return (
    <>
      <div className={`flex flex-col ${isMobile ? 'space-y-4' : 'items-center justify-between'} md:flex-row md:items-center md:justify-between`}>
        <div className="mb-4 md:mb-0">
          <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" />
        </div>
        
        {isMobile ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile filter dialog */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-x-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Apply filters to narrow down your results
                  </SheetDescription>
                </SheetHeader>
                <FiltersContent />
              </SheetContent>
            </Sheet>
            
            {/* Action buttons in a row */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button onClick={handleAddNewClick} size="sm" className="flex-1">
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleExcelDownload}
                size="sm"
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={handlePdfDownload}
                size="sm"
                className="flex-1"
              >
                <FileIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <PeriodFilter />
            <StatusFilter />
            
            {!isAssociateUser && (
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
            )}
            
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
        )}
      </div>    
      <Separator className="my-4" />
      
      {/* Mobile Search Input */}
      {isMobile && (
        <div className="mb-4">
          <Input
            placeholder="Search name, phone, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      )}
      
      {/* Render mobile card view or desktop data table based on screen size */}
      {isMobile ? (
        <MobileInquiryCard data={filteredData} />
      ) : (
        <DataTable searchKey="customerName" columns={columns} data={data} />
      )}
    </>
  );
};
