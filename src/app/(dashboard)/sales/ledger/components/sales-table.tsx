"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PercentIcon } from "lucide-react"; 
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
};

interface SalesTableProps {
  data: Sale[];
}

export const SalesTable: React.FC<SalesTableProps> = ({ data }) => {
  const router = useRouter();
  
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const totalGst = data.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={7} className="h-24 text-center">
                No sales found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((item) => (
                <TableRow key={item.id}>
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
              ))}
              <TableRow>
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

