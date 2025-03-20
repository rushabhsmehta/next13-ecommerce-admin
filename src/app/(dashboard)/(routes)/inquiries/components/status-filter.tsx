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
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const StatusFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'ALL';

  const onStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }

    router.push(`/inquiries?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-x-2">
      <Select
        value={currentStatus}
        onValueChange={onStatusChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((status) => (
            <SelectItem 
              key={status.value} 
              value={status.value}
              className={
                status.value === "CONFIRMED" ? "text-green-600" :
                status.value === "CANCELLED" ? "text-red-600" :
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

