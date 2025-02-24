"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

const columns = [
  {
    accessorKey: "associateName",
    header: "Associate Name",
  },
  {
    accessorKey: "totalBookings",
    header: "Total Bookings",
  },
  {
    accessorKey: "confirmedBookings",
    header: "Confirmed Bookings",
  },
  {
    accessorKey: "cancellations",
    header: "Cancellations",
  },
  {
    accessorKey: "revenue",
    header: "Revenue Generated",
  },
  {
    accessorKey: "commission",
    header: "Commission Earned",
  },
  {
    accessorKey: "performance",
    header: "Performance Rating",
  },
];

export default function AssociatePerformancePage() {
  const [dateRange, setDateRange] = useState<any>();
  const [associateFilter, setAssociateFilter] = useState<string>("all");

  // Mock data - Replace with actual API call
  const data = [
    {
      associateName: "John Doe",
      totalBookings: 45,
      confirmedBookings: 38,
      cancellations: 7,
      revenue: "$52,000",
      commission: "$5,200",
      performance: "Excellent",
    },
    // ... more data
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Associate Performance Report</h1>

      <div className="flex gap-4 items-center">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        <Select value={associateFilter} onValueChange={setAssociateFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Associate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Associates</SelectItem>
            <SelectItem value="active">Active Associates</SelectItem>
            <SelectItem value="inactive">Inactive Associates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Revenue</h3>
          <p className="text-2xl">$157,250</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Total Bookings</h3>
          <p className="text-2xl">324</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Average Performance</h3>
          <p className="text-2xl">4.2/5.0</p>
        </Card>
      </div>

      <DataTable columns={columns} data={data} searchKey={""} />
    </div>
  );
}
