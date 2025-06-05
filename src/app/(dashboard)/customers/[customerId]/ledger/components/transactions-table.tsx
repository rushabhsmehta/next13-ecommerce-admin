"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type CustomerTransaction = {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  isInflow: boolean;
  reference?: string; // Make reference optional
  packageId?: string;
  packageName?: string;
  paymentMode?: string;
  accountName?: string;
  balance: number;
  items?: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
  }>;
  itemsSummary?: string;
};

interface TransactionsTableProps {
  data: CustomerTransaction[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ data }) => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Calculate totals
  const totalReceipts = data.filter(t => t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const totalSales = data.filter(t => !t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const finalBalance = data.length > 0 ? data[data.length - 1].balance : 0;

  const navigateToTransaction = (transaction: CustomerTransaction) => {
    // Navigate to the appropriate transaction page based on the type
    if (transaction.type === "Sale") {
      router.push(`/sales/${transaction.id}`);
    } else if (transaction.type === "Receipt") {
      router.push(`/receipts/${transaction.id}`);
    }
  };
  const handleGenerateVoucher = (transaction: CustomerTransaction) => {
    if (transaction.type === "Sale") {
      router.push(`/sales/${transaction.id}/voucher`);
    } else if (transaction.type === "Receipt") {
      router.push(`/receipts/${transaction.id}/voucher`);
    }
  };

  return (
    <div className="rounded-md border">      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Date</TableHead>            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Receipt/Return</TableHead>
            <TableHead className="text-right">Sale</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((transaction) => (
                <>
                  <TableRow key={`${transaction.type}-${transaction.id}`}>
                    <TableCell>
                      {transaction.type === "Sale" && transaction.items && transaction.items.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleRow(transaction.id)}
                        >
                          {expandedRows[transaction.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>
                      {transaction.description}
                      {transaction.packageName && <div className="text-xs text-muted-foreground mt-1">Package: {transaction.packageName}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.isInflow ? formatPrice(transaction.amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!transaction.isInflow ? formatPrice(transaction.amount) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(transaction.balance)}
                    </TableCell>
                    <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}/voucher`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Voucher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>                </TableRow>
                  
                  {/* Expandable Row for Item Details */}
                  {expandedRows[transaction.id] && transaction.items && transaction.items.length > 0 && (
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={8} className="p-2">
                        <div className="pl-8 py-2">
                          <h5 className="font-medium mb-2">Items:</h5>
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-left py-1">Item</th>
                                <th className="text-right py-1">Qty</th>
                                <th className="text-right py-1">Unit Price</th>
                                <th className="text-right py-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transaction.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="py-1">{item.productName}</td>
                                  <td className="text-right py-1">{item.quantity}</td>
                                  <td className="text-right py-1">{formatPrice(item.pricePerUnit)}</td>
                                  <td className="text-right py-1">{formatPrice(item.totalAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>              ))}
            </>
          )}
          
          {/* Totals Row */}
          {data.length > 0 && (
            <TableRow className="bg-slate-100 dark:bg-slate-800">
              <TableCell></TableCell>
              <TableCell colSpan={3} className="font-medium">Totals</TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(totalReceipts)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(totalSales)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(finalBalance)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
