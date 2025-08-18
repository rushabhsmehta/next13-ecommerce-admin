"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InquiryColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { InquiriesDataTable } from "./inquiries-data-table";
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
import { useEffect, useState } from "react";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
  organization: any;
  isAssociateUser?: boolean;
  accessError?: string;
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates,
  organization,
  isAssociateUser = false,
  accessError
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobileHook = useIsMobile();
  // Add this fallback state to ensure consistent behavior
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Keep a local copy of rows so we can update optimistically without refresh
  const [rows, setRows] = useState<InquiryColumn[]>(data);

  // Listen for updates from row-level components
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; nextFollowUpDate: string | null }>;
      const payload = ce.detail;
      setRows(prev => prev.map(r => r.id === payload.id ? { ...r, nextFollowUpDate: payload.nextFollowUpDate } : r));
    };
    window.addEventListener('inquiry:nextFollowUpUpdated', handler as EventListener);
    return () => window.removeEventListener('inquiry:nextFollowUpUpdated', handler as EventListener);
  }, []);
  
  // Use both the hook and a direct check for extra reliability
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };
    
    // Check immediately
    checkMobile();
    
    // Add event listener for resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Combine results from hook and direct check for more reliability
  const isMobileView = isMobile || isMobileHook;

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
    ? rows.filter(item => 
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerMobileNumber.includes(searchQuery) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rows;

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
      {/* Use both CSS-based and JS-based responsive designs for better reliability */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" className="mb-4 md:mb-0" />
        
        {/* Mobile controls - visible by default on small screens via CSS, hidden on larger screens */}
        <div className="flex flex-wrap items-center gap-2 md:hidden">
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
        
        {/* Desktop controls - hidden by default on small screens via CSS, visible on larger screens */}
        <div className="hidden md:flex items-center gap-x-2">
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
      </div>
      
      <Separator className="my-4" />
      
      {/* Access Error Alert */}
      {accessError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                {accessError}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Search Input - now using CSS for responsive visibility */}
      {!accessError && (
        <>
          <div className="mb-4 md:hidden">
            <Input
              placeholder="Search name, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* For content display, still use JS-based detection as a fallback */}
          <div className="block md:hidden">
            <MobileInquiryCard data={filteredData} isAssociateUser={isAssociateUser} />
          </div>          <div className="hidden md:block">
              <InquiriesDataTable
                columns={columns}
                data={filteredData}
              />
          </div>
        </>
      )}
      
      {/* Show no data message when there's an access error */}
      {accessError && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            No inquiries available.
          </p>
        </div>
      )}
    </>
  );
};
