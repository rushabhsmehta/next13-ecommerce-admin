"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Sale {
  id: string;
  saleDate: Date;
  salePrice: number;
  gstAmount: number | null;
  invoiceNumber: string | null;
  status: string | null;
  isGst: boolean;
  customer: { id: string; name: string } | null;
  items: { id: string }[];
  receiptAllocations: { allocatedAmount: number }[];
}

interface Customer {
  id: string;
  name: string;
}

interface SalesPageClientProps {
  sales: Sale[];
  customers: Customer[];
}

function getBalance(sale: Sale): number {
  const total = sale.salePrice + (sale.gstAmount || 0);
  const collected = sale.receiptAllocations.reduce((s, r) => s + r.allocatedAmount, 0);
  return Math.max(0, total - collected);
}

function getPaymentStatus(sale: Sale): "paid" | "partial" | "pending" {
  const total = sale.salePrice + (sale.gstAmount || 0);
  const collected = sale.receiptAllocations.reduce((s, r) => s + r.allocatedAmount, 0);
  if (collected >= total) return "paid";
  if (collected > 0) return "partial";
  return "pending";
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-800" },
  pending: { label: "Pending", className: "bg-red-100 text-red-800" },
};

function SalesTable({ data }: { data: Sale[] }) {
  const router = useRouter();
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No sales found
              </TableCell>
            </TableRow>
          )}
          {data.map((sale) => {
            const balance = getBalance(sale);
            const payStatus = getPaymentStatus(sale);
            const badge = STATUS_BADGE[payStatus];
            return (
              <TableRow key={sale.id} className="hover:bg-muted/30">
                <TableCell className="whitespace-nowrap">
                  {format(new Date(sale.saleDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{sale.customer?.name || "N/A"}</TableCell>
                <TableCell>{sale.invoiceNumber || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(sale.salePrice + (sale.gstAmount || 0))}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {balance > 0 ? (
                    <span className="text-amber-600">{formatPrice(balance)}</span>
                  ) : (
                    <span className="text-green-600 text-sm">Nil</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`py-1 px-2 rounded-md text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/sales/${sale.id}`)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function SalesPageClient({ sales, customers }: SalesPageClientProps) {
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (search && !s.invoiceNumber?.toLowerCase().includes(search.toLowerCase())) return false;
      if (customerId !== "all" && s.customer?.id !== customerId) return false;
      if (payStatus !== "all" && getPaymentStatus(s) !== payStatus) return false;
      if (startDate && new Date(s.saleDate) < new Date(startDate)) return false;
      if (endDate && new Date(s.saleDate) > new Date(endDate)) return false;
      return true;
    });
  }, [sales, search, customerId, payStatus, startDate, endDate]);

  const hasFilters = search || customerId !== "all" || payStatus !== "all" || startDate || endDate;

  const clearFilters = () => {
    setSearch("");
    setCustomerId("all");
    setPayStatus("all");
    setStartDate("");
    setEndDate("");
  };

  const gstSales = filtered.filter((s) => s.isGst !== false);
  const nonGstSales = filtered.filter((s) => s.isGst === false);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-48"
          />
        </div>

        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={payStatus} onValueChange={setPayStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36"
          title="From date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36"
          title="To date"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}

        <Badge variant="secondary" className="ml-auto">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="gst">GST ({gstSales.length})</TabsTrigger>
          <TabsTrigger value="non-gst">Non-GST ({nonGstSales.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <SalesTable data={filtered} />
        </TabsContent>
        <TabsContent value="gst">
          <SalesTable data={gstSales} />
        </TabsContent>
        <TabsContent value="non-gst">
          <SalesTable data={nonGstSales} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
