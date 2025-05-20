"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PercentIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CellAction } from "./cell-action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

type Sale = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  customerName: string;
  customerContact: string;
  gstAmount?: number;
  gstPercentage?: number;
  items?: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
  }>;
};

interface SalesTableProps {
  data: Sale[];
}

export const SalesTable: React.FC<SalesTableProps> = ({ data }) => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const totalGst = data.reduce((sum, item) => sum + (item.gstAmount || 0), 0);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead className="text-center w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No sales found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <>
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.items && item.items.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleRow(item.id)}
                        >
                          {expandedRows[item.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{item.packageName}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.amount)}
                      {item.gstPercentage ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1 inline-flex items-center text-xs text-muted-foreground">
                                <PercentIcon className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Includes GST: {item.gstPercentage}%</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.gstAmount ? formatPrice(item.gstAmount) : '-'}
                      {item.gstPercentage ? ` (${item.gstPercentage}%)` : ''}
                    </TableCell>
                    <TableCell>
                      <CellAction data={item} />
                    </TableCell>
                  </TableRow>

                  {/* Expandable Row for Item Details */}
                  {expandedRows[item.id] && item.items && item.items.length > 0 && (
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
                              {item.items.map((itemDetail, index) => (
                                <tr key={index}>
                                  <td className="py-1">{itemDetail.productName}</td>
                                  <td className="text-right py-1">{itemDetail.quantity}</td>
                                  <td className="text-right py-1">{formatPrice(itemDetail.pricePerUnit)}</td>
                                  <td className="text-right py-1">{formatPrice(itemDetail.totalAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}              <TableRow>
                <TableCell></TableCell>
                <TableCell colSpan={4} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(totalAmount)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(totalGst)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

