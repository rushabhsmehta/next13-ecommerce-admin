"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "HOT_QUERY", label: "Hot Query" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "QUERY_SENT", label: "Query Sent" },
];

export const StatusFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams?.get('status') || 'ALL';

  const onStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }

    router.push(`/inquiries?${params.toString()}`);
  };
  // Function to get status badge styles
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      case "HOT_QUERY":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "QUERY_SENT":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Select
        value={currentStatus}
        onValueChange={onStatusChange}
      >        <SelectTrigger className="w-[130px]">
          {currentStatus !== "ALL" ? (
            <div className={`rounded-md px-2.5 py-1 text-xs font-medium ${getStatusBadgeStyle(currentStatus)} flex items-center w-full justify-center`}>
              <span>{statusOptions.find(s => s.value === currentStatus)?.label || "Unknown"}</span>
            </div>
          ) : (
            <SelectValue placeholder="Filter by status" />
          )}
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
                      status.value === "PENDING" ? "text-yellow-600" :
                        ""
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

