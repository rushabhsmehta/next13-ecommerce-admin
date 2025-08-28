'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { QueryLink } from "./query-link"
import { ChevronDown, ChevronRight, UserRound } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import axios from "axios"
import { toast } from "react-hot-toast"
import { TourPackageQuery } from "@prisma/client"
import { CompactStaffAssignment } from "@/components/compact-staff-assignment"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "HOT_QUERY", label: "Hot Query" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "QUERY_SENT", label: "Query Sent" },
];

const StatusCell = ({ row }: { row: any }) => {
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(row.original.status);
  const router = useRouter();

  const onStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      await axios.patch(`/api/inquiries/${row.original.id}/status`, {
        status: newStatus
      });
      setCurrentStatus(newStatus);
      toast.success("Status updated");
      row.original.status = newStatus;
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };
  const getStatusStyles = (status: string) => {
    switch(status) {
      case "CONFIRMED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      case "HOT_QUERY":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "QUERY_SENT":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }
  };

  return (
    <div className="flex items-center">
      <Select
        value={currentStatus}
        onValueChange={onStatusChange}
        disabled={loading}
      >
        <SelectTrigger className="p-0 h-auto border-0 bg-transparent shadow-none w-[130px] hover:bg-transparent focus:ring-0">
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyles(currentStatus)} flex items-center w-full justify-center`}>
            <span>{statusOptions.find(s => s.value === currentStatus)?.label || "Unknown Status"}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((status) => (
            <SelectItem
              key={status.value}
              value={status.value}
              className={
                status.value === "CONFIRMED" ? "text-green-600" :
                status.value === "CANCELLED" ? "text-red-600" :
                status.value === "HOT_QUERY" ? "text-orange-600" :
                status.value === "QUERY_SENT" ? "text-blue-600" :
                "text-yellow-600"
              }
            >
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const NextFollowUpCell = ({ row }: { row: any }) => {
  const router = useRouter();
  const inquiry = row.original;
  const [updating, setUpdating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [actionType, setActionType] = useState<string>("CALL");
  const [remarks, setRemarks] = useState<string>("");
  // Keep the raw ISO value separate from the display value to avoid parsing/formatting drift
  const [isoValue, setIsoValue] = useState<string | null>(inquiry.nextFollowUpDateIso || null);
  const [open, setOpen] = useState(false);
  const recentActions = (inquiry as any).actionHistory?.slice(0,3) || [];

  const saveDate = async (iso: string | null) => {
    try {
      setUpdating(true);
      await axios.patch(`/api/inquiries/${inquiry.id}`, { nextFollowUpDate: iso });
      toast.success('Follow-up updated');
      setIsoValue(iso);
      let display: string | null = null;
      if (iso) {
        const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso);
        if (m) {
          const y = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10) - 1;
          const dnum = parseInt(m[3], 10);
          display = format(new Date(y, mo, dnum), 'dd MMM yyyy');
        } else {
          display = format(new Date(iso), 'dd MMM yyyy');
        }
      }
      // Update row cache: keep both display string and ISO for subsequent renders
      (row.original as any).nextFollowUpDate = display;
      (row.original as any).nextFollowUpDateIso = iso;
      try {
        window.dispatchEvent(new CustomEvent('inquiry:nextFollowUpUpdated', { detail: { id: inquiry.id, nextFollowUpDate: display } }));
      } catch (err) {}
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setUpdating(false);
    }
  };

  // Prefer already formatted display string from server; fallback to ISO-derived formatting
  const displayValue = (row.original as any).nextFollowUpDate || (isoValue ? (() => {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(isoValue);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const dnum = parseInt(m[3], 10);
      return format(new Date(y, mo, dnum), 'dd MMM yyyy');
    }
    return format(new Date(isoValue), 'dd MMM yyyy');
  })() : null);

  return (
    <div className="flex flex-col gap-1 min-w-[170px]">
      <div className="text-xs font-medium">
        {displayValue || <span className="text-muted-foreground">Not set</span>}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={updating}
              className="text-[10px] px-2 py-1 rounded border bg-white hover:bg-slate-50"
            >
              {displayValue ? 'Change' : 'Set'}
            </button>
            {displayValue && (
              <button
                type="button"
                onClick={() => saveDate(null)}
                disabled={updating}
                className="text-[10px] px-2 py-1 rounded border bg-white hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[520px] md:w-[560px] p-0">
          <div className="flex flex-col md:flex-row">
            <div className="p-3 md:border-r md:w-[55%]">
        <Calendar
                mode="single"
                selected={isoValue ? (() => {
                  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(isoValue);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) - 1;
                    const dnum = parseInt(m[3], 10);
                    return new Date(y, mo, dnum);
                  }
                  return new Date(isoValue);
                })() : undefined}
                onSelect={(d: Date | undefined) => {
                  if (!d) return;
                  // Send date-only string to server to avoid timezone-related shifts
                  const apiDateOnly = format(d, 'yyyy-MM-dd');
                  saveDate(apiDateOnly);
                  setOpen(false);
                }}
                disabled={() => false}
                initialFocus
              />
            </div>
            <div className="p-3 md:w-[45%] max-h-[360px] flex flex-col gap-2">
              <div className="text-xs font-semibold tracking-wide">Recent Actions</div>
              <div className="space-y-1 overflow-y-auto pr-1 text-xs">
                {recentActions.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">No actions</div>
                )}
                {recentActions.map((a: any, i: number) => (
                  <div key={i} className="rounded border bg-slate-50 p-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-medium uppercase text-[10px] tracking-wide">{a.type}</span>
                      <span className="text-[10px] text-muted-foreground">{a.timestamp}</span>
                    </div>
                    {a.remarks && <div className="text-[10px] leading-snug line-clamp-3">{a.remarks}</div>}
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="text-[11px] font-semibold mb-1">Add Action</div>
                <div className="flex items-center gap-2 mb-2">
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Type"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">Call</SelectItem>
                      <SelectItem value="MESSAGE">Message</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="NOTE">Note</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className={`text-[10px] px-2 py-1 rounded ${actionType==='CALL'?'bg-green-50 text-green-700':actionType==='MESSAGE'?'bg-blue-50 text-blue-700':actionType==='EMAIL'?'bg-yellow-50 text-yellow-700':'bg-slate-50 text-slate-700'}`}
                    onClick={() => setActionType('CALL')}
                  >CALL</button>
                  <button type="button" className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700" onClick={() => setActionType('MESSAGE')}>MSG</button>
                  <button type="button" className="text-[10px] px-2 py-1 rounded bg-yellow-50 text-yellow-700" onClick={() => setActionType('EMAIL')}>EMAIL</button>
                </div>
                <Textarea
                  placeholder="Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="text-xs h-16"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={adding || !remarks.trim()}
                    onClick={async () => {
                      try {
                        setAdding(true);
                        const payload = { actionType, remarks: remarks.trim(), actionDate: new Date().toISOString() };
                        await axios.post(`/api/inquiries/${inquiry.id}/actions`, payload);
                        toast.success('Action added');
                        // Update local recent list optimistically
                        const newItem = { type: actionType, remarks: remarks.trim(), timestamp: format(new Date(), 'dd MMM yyyy HH:mm') };
                        (row.original as any).actionHistory = [newItem, ...((row.original as any).actionHistory || [])].slice(0, 5);
                        setRemarks("");
                      } catch (e) {
                        toast.error('Failed to add action');
                      } finally {
                        setAdding(false);
                      }
                    }}
                    className="text-[11px] px-3 py-1 rounded border bg-white hover:bg-slate-50"
                  >{adding ? 'Adding…' : 'Add'}</button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export type InquiryColumn = {
  id: string
  customerName: string
  customerMobileNumber: string
  location: string
  associatePartner: string
  status: string
  journeyDate: string
  createdAt: string
  assignedToStaffId: string | null
  assignedStaffName: string | null
  assignedStaffAt: string | null
  tourPackageQueries: TourPackageQuery[]
  nextFollowUpDate?: string | null
  // Raw ISO value for precise updates/sorting
  nextFollowUpDateIso?: string | null
  actionHistory?: Array<{ type: string; timestamp: string; remarks?: string }>
}

export const columns: ColumnDef<InquiryColumn>[] = [
  {
    accessorKey: "customerName",
    header: "Customer Details",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="space-y-1">
          <div className="font-medium">{customer.customerName}</div>
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>{customer.customerMobileNumber}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{customer.location}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                <line x1="16" x2="16" y1="2" y2="6"></line>
                <line x1="8" x2="8" y1="2" y2="6"></line>
                <line x1="3" x2="21" y1="10" y2="10"></line>
              </svg>
              <span className="text-blue-600">Created: {customer.createdAt}</span>
            </div>
          </div>
        </div>
      );
    },
    size: 180,
  },
  {
    accessorKey: "associatePartner",
    header: "Associate Partner",
  },  {
    accessorKey: "status",
    header: ({ column }) => {
      const currentFilter = column.getFilterValue() as string;
      
      // Get label for the current filter
      const getCurrentStatusLabel = () => {
        if (!currentFilter) return "All Status";
        const option = statusOptions.find(s => s.value === currentFilter);
        return option ? option.label : "Filter status";
      };
      
      // Get styling for status badges
      const getStatusBadgeStyle = (status: string) => {
        switch(status) {
          case "CONFIRMED":
            return "bg-green-50 text-green-700 border border-green-200";
          case "CANCELLED":
            return "bg-red-50 text-red-700 border border-red-200";
          case "HOT_QUERY":
            return "bg-orange-50 text-orange-700 border border-orange-200";
          case "QUERY_SENT":
            return "bg-blue-50 text-blue-700 border border-blue-200";
          case "PENDING":
            return "bg-yellow-50 text-yellow-700 border border-yellow-200";
          default:
            return "";
        }
      };

      return (
        <Select
          value={currentFilter || "ALL"}
          onValueChange={(value) => {
            column.setFilterValue(value === "ALL" ? "" : value);
          }}        >        <SelectTrigger className="w-[130px]">
            {currentFilter ? (
              <div className={`rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadgeStyle(currentFilter)} flex items-center w-full justify-center`}>
                <span>{getCurrentStatusLabel()}</span>
              </div>
            ) : (
              <SelectValue placeholder="Filter status" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem
                key={status.value}
                value={status.value}
                className={
                  status.value === "CONFIRMED" ? "text-green-600" :
                  status.value === "CANCELLED" ? "text-red-600" :
                  status.value === "HOT_QUERY" ? "text-orange-600" :
                  status.value === "QUERY_SENT" ? "text-blue-600" :
                  "text-yellow-600"
                }
              >
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
    cell: ({ row }) => <StatusCell row={row} />,
    filterFn: (row, id, value) => value ? row.getValue(id) === value : true
  },
  {
    accessorKey: "journeyDate",
    header: "Journey Date",
  },  
  {
    accessorKey: "nextFollowUpDate",
    header: "Next Follow Up",
    cell: ({ row }) => <NextFollowUpCell row={row} />,
  },
  {
    accessorKey: "tourPackageQueries",
    header: "Tour Package Queries",
    cell: ({ row }) => {
      const queries = row.original.tourPackageQueries;
      if (!queries || queries.length === 0) return "No queries";

      return (
        <ol className="list-decimal pl-4">
          {queries.map((query) => (
            <li key={query.id} className="my-1">
              <QueryLink query={query} url={`/tourPackageQuery/${query.id}`} />
            </li>
          ))}
        </ol>
      );
    }
  },  {
    accessorKey: "assignedStaffName",
    header: "Assigned Staff",
    cell: ({ row }) => {
      const inquiry = row.original;
      return (
        <div className="flex items-center gap-2">
          {inquiry.assignedStaffName && (
            <span className="text-sm text-slate-700 flex items-center">
              <UserRound className="h-3 w-3 mr-1.5 text-slate-500" />
              {inquiry.assignedStaffName}
            </span>
          )}
          <CompactStaffAssignment
            inquiryId={inquiry.id}
            assignedStaffId={inquiry.assignedToStaffId}
            onAssignmentComplete={() => {
              toast.success("Staff assignment updated");
              // Refresh the page to update the data
              window.location.reload();
            }}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />
  }
]
