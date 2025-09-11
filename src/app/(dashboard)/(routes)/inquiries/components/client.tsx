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
import { useEffect, useState, useTransition, useMemo } from "react";
import { parseISO, isSameDay } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "./pagination";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
  operationalStaffs?: { id: string; name: string }[];
  organization: any;
  isAssociateUser?: boolean;
  accessError?: string;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates,
  operationalStaffs,
  organization,
  isAssociateUser = false,
  accessError,
  pagination
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobileHook = useIsMobile();
  const [isPending, startTransition] = useTransition();
  // Persist filters in local state to avoid flicker when updating URL
  const [localAssociateId, setLocalAssociateId] = useState<string>('');
  const [localAssignedStaffId, setLocalAssignedStaffId] = useState<string>('');
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPeriod, setLocalPeriod] = useState<string>('');
  // Add this fallback state to ensure consistent behavior
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Keep a local copy of rows so we can update optimistically without refresh
  const [rows, setRows] = useState<InquiryColumn[]>(data);

  // Initialize state from searchParams on client side
  useEffect(() => {
    setLocalAssociateId(searchParams.get('associateId') || '');
    setLocalAssignedStaffId(searchParams.get('assignedStaffId') || '');
    setLocalStatus(searchParams.get('status') || '');
    setLocalPeriod(searchParams.get('period') || '');
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

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

  // Sync local rows when server-provided data changes (e.g., after filter/navigation)
  useEffect(() => {
    setRows(data);
  }, [data]);
  
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
    // update local state immediately to prevent flicker
    setLocalAssociateId(associateId || '');
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (associateId) params.set('associateId', associateId); else params.delete('associateId');
      params.set('page', '1'); // Reset to first page
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const handleAddNewClick = () => {
    // Open the link in a new tab
    window.open(`/inquiries/new`, '_blank');
  };

  // Follow-ups only toggle
  const followUpsOnly = searchParams.get('followUpsOnly') === '1';
  const onToggleFollowUpsOnly = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('followUpsOnly', '1');
    } else {
      params.delete('followUpsOnly');
    }
    params.set('page', '1'); // Reset to first page
    startTransition(() => {
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  // No Tour Package Query toggle
  const noTourPackageQuery = searchParams.get('noTourPackageQuery') === '1';
  const onToggleNoTPQ = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('noTourPackageQuery', '1');
    } else {
      params.delete('noTourPackageQuery');
    }
    params.set('page', '1'); // Reset to first page
    startTransition(() => {
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const onAssignedStaffChange = (staffId: string) => {
    setLocalAssignedStaffId(staffId || '');
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (staffId) params.set('assignedStaffId', staffId); else params.delete('assignedStaffId');
      params.set('page', '1'); // Reset to first page
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const onStatusChangeLocal = (status: string) => {
    setLocalStatus(status || '');
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (status && status !== 'ALL') params.set('status', status); else params.delete('status');
      params.set('page', '1'); // Reset to first page
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const onPeriodChangeLocal = (period: string) => {
    setLocalPeriod(period || '');
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (period && period !== 'ALL') {
        params.set('period', period);
      } else {
        params.delete('period');
        params.delete('startDate');
        params.delete('endDate');
      }
      params.set('page', '1'); // Reset to first page
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }
      params.set('page', '1'); // Reset to first page
      router.replace(`/inquiries?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    // Reset local state and URL params
    setLocalAssociateId('');
    setLocalAssignedStaffId('');
    setLocalStatus('');
    setLocalPeriod('');
    const params = new URLSearchParams();
    startTransition(() => router.replace(`/inquiries?${params.toString()}`));
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

  // For mobile view, we'll use server-side filtered data directly
  const displayData = rows;

  // Follow-up counters
  const totalFollowUps = useMemo(() => {
    return rows.filter(r => r.nextFollowUpDateIso && r.nextFollowUpDateIso !== null && r.status !== 'CANCELLED' && r.status !== 'CONFIRMED').length;
  }, [rows]);

  const todayFollowUps = useMemo(() => {
    const today = new Date();
    return rows.filter(r => {
      if (!r.nextFollowUpDateIso) return false;
      try {
        const d = parseISO(r.nextFollowUpDateIso as string);
        return isSameDay(d, today) && r.status !== 'CANCELLED' && r.status !== 'CONFIRMED';
      } catch (e) {
        return false;
      }
    }).length;
  }, [rows]);

  // Filter component for mobile view
  const FiltersContent = () => (
    <div className="flex flex-col space-y-4 py-4">
      <PeriodFilter />
      <StatusFilter />
      {/* Assigned staff filter for mobile pane */}
      {!isAssociateUser && operationalStaffs && (
        <Select
          value={localAssignedStaffId}
          onValueChange={(v) => onAssignedStaffChange(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Assigned Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Staff</SelectItem>
            {operationalStaffs.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center space-x-2">
  <Checkbox id="followups-only" checked={followUpsOnly} onCheckedChange={(v: any) => onToggleFollowUpsOnly(!!v)} />
        <label htmlFor="followups-only" className="text-sm">Follow-ups only</label>
  {isPending && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="no-tpq" checked={noTourPackageQuery} onCheckedChange={(v: any) => onToggleNoTPQ(!!v)} />
        <label htmlFor="no-tpq" className="text-sm">No Tour Package Query</label>
        {isPending && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>
      
      {!isAssociateUser && (
        <Select
          value={localAssociateId}
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
      <div className="flex flex-col space-y-4">
        {/* Main heading and Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heading title={`Inquiries (${pagination?.totalCount || data.length})`} description="Manage inquiries" />
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700">Follow-ups: {totalFollowUps}</Badge>
              <Badge className="bg-green-50 text-green-700">Today: {todayFollowUps}</Badge>
            </div>
          </div>
          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-x-2">
            <Button variant="outline" onClick={handleExcelDownload} className="flex items-center gap-x-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={handlePdfDownload} className="flex items-center gap-x-2">
              <FileIcon className="h-4 w-4" /> PDF
            </Button>
            <Button onClick={handleAddNewClick}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-x-2">
          <PeriodFilter />
          <StatusFilter />
          {!isAssociateUser && (
            <Select value={localAssociateId} onValueChange={onAssociateChange}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select Associate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Associates</SelectItem>
                {associates.map((associate) => (
                  <SelectItem key={associate.id} value={associate.id}>{associate.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isAssociateUser && operationalStaffs && (
            <Select value={localAssignedStaffId} onValueChange={(v) => onAssignedStaffChange(v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Assigned Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Staff</SelectItem>
                {operationalStaffs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" onClick={clearAllFilters} className="ml-auto">Clear</Button>
        </div>

        {/* Desktop Search and Toggles */}
        <div className="hidden md:flex items-center gap-2">
          <Input
            placeholder="Search name, phone, location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[340px]"
          />
          <div className="px-3 py-1 rounded-full border bg-white flex items-center gap-2">
            <Checkbox id="followups-pill-desktop" checked={followUpsOnly} onCheckedChange={(v: any) => onToggleFollowUpsOnly(!!v)} />
            <label htmlFor="followups-pill-desktop" className="text-sm">Follow-ups only</label>
          </div>
          <div className="px-3 py-1 rounded-full border bg-white flex items-center gap-2">
            <Checkbox id="no-tpq-pill-desktop" checked={noTourPackageQuery} onCheckedChange={(v: any) => onToggleNoTPQ(!!v)} />
            <label htmlFor="no-tpq-pill-desktop" className="text-sm">No Tour Package Query</label>
          </div>
          {isPending && <span className="text-xs text-muted-foreground">Updating…</span>}
        </div>

        {/* Mobile controls */}
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
                <div className="flex justify-end items-center space-x-2 mt-4">
                  <Button variant="ghost" onClick={clearAllFilters}>Clear</Button>
                </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center ml-2">
            <Checkbox id="followups-only-mobile" checked={followUpsOnly} onCheckedChange={(v: any) => onToggleFollowUpsOnly(!!v)} />
            <label htmlFor="followups-only-mobile" className="text-sm ml-2">Follow-ups only</label>
            {isPending && <span className="text-xs text-muted-foreground ml-2">Updating…</span>}
          </div>
          <div className="flex items-center ml-2">
            <Checkbox id="no-tpq-mobile" checked={noTourPackageQuery} onCheckedChange={(v: any) => onToggleNoTPQ(!!v)} />
            <label htmlFor="no-tpq-mobile" className="text-sm ml-2">No Tour Package Query</label>
            {isPending && <span className="text-xs text-muted-foreground ml-2">Updating…</span>}
          </div>
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
      </div>
      <Separator />
      
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* For content display, still use JS-based detection as a fallback */}
          <div className="block md:hidden">
            <MobileInquiryCard data={displayData} isAssociateUser={isAssociateUser} />
          </div>
          <div className="hidden md:block">
            <InquiriesDataTable
              columns={columns}
              data={displayData}
            />
          </div>
          
          {/* Pagination Controls */}
          {pagination && pagination.totalCount > 0 && (
            <div className="mt-4">
              <Pagination {...pagination} />
            </div>
          )}
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
