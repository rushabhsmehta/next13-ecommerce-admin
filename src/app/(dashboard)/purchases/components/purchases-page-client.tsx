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

interface Purchase {
  id: string;
  purchaseDate: Date;
  price: number;
  gstAmount: number | null;
  netPayable: number | null;
  billNumber: string | null;
  status: string | null;
  isGst: boolean;
  supplier: { id: string; name: string } | null;
  paymentAllocations: { allocatedAmount: number }[];
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchasesPageClientProps {
  purchases: Purchase[];
  suppliers: Supplier[];
}

function getTotal(purchase: Purchase): number {
  return purchase.netPayable ?? purchase.price + (purchase.gstAmount || 0);
}

function getBalance(purchase: Purchase): number {
  const total = getTotal(purchase);
  const paid = purchase.paymentAllocations.reduce((s, p) => s + p.allocatedAmount, 0);
  return Math.max(0, total - paid);
}

function getPaymentStatus(purchase: Purchase): "paid" | "partial" | "pending" {
  const total = getTotal(purchase);
  const paid = purchase.paymentAllocations.reduce((s, p) => s + p.allocatedAmount, 0);
  if (paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-800" },
  pending: { label: "Pending", className: "bg-red-100 text-red-800" },
};

function PurchasesTable({ data }: { data: Purchase[] }) {
  const router = useRouter();
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Bill No</TableHead>
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
                No purchases found
              </TableCell>
            </TableRow>
          )}
          {data.map((purchase) => {
            const balance = getBalance(purchase);
            const payStatus = getPaymentStatus(purchase);
            const badge = STATUS_BADGE[payStatus];
            return (
              <TableRow key={purchase.id} className="hover:bg-muted/30">
                <TableCell className="whitespace-nowrap">
                  {format(new Date(purchase.purchaseDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{purchase.supplier?.name || "N/A"}</TableCell>
                <TableCell>{purchase.billNumber || "—"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(getTotal(purchase))}
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
                    onClick={() => router.push(`/purchases/${purchase.id}`)}
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

export function PurchasesPageClient({ purchases, suppliers }: PurchasesPageClientProps) {
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (search && !p.billNumber?.toLowerCase().includes(search.toLowerCase())) return false;
      if (supplierId !== "all" && p.supplier?.id !== supplierId) return false;
      if (payStatus !== "all" && getPaymentStatus(p) !== payStatus) return false;
      if (startDate && new Date(p.purchaseDate) < new Date(startDate)) return false;
      if (endDate && new Date(p.purchaseDate) > new Date(endDate)) return false;
      return true;
    });
  }, [purchases, search, supplierId, payStatus, startDate, endDate]);

  const hasFilters = search || supplierId !== "all" || payStatus !== "all" || startDate || endDate;

  const clearFilters = () => {
    setSearch("");
    setSupplierId("all");
    setPayStatus("all");
    setStartDate("");
    setEndDate("");
  };

  const gstPurchases = filtered.filter((p) => p.isGst !== false);
  const nonGstPurchases = filtered.filter((p) => p.isGst === false);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bill no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-48"
          />
        </div>

        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
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
          <TabsTrigger value="gst">GST ({gstPurchases.length})</TabsTrigger>
          <TabsTrigger value="non-gst">Non-GST ({nonGstPurchases.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <PurchasesTable data={filtered} />
        </TabsContent>
        <TabsContent value="gst">
          <PurchasesTable data={gstPurchases} />
        </TabsContent>
        <TabsContent value="non-gst">
          <PurchasesTable data={nonGstPurchases} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
