import React, { useState } from 'react';
import { format } from 'date-fns';
import { utcToLocal } from '@/lib/timezone-utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  date: Date | string;
  type: string;
  description: string;
  reference: string;
  amount: number;
  isInflow: boolean;
  note: string;
  transactionId?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  openingBalance: number;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, openingBalance }) => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' });
  
  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Function to navigate to the appropriate edit page based on transaction type
  const handleEditTransaction = (transaction: Transaction) => {
    const type = transaction.type.toLowerCase();
    
    if (type.startsWith('income')) {
      router.push(`/incomes/${transaction.id}`);
    } else if (type.startsWith('expense')) {
      router.push(`/expenses/${transaction.id}`);
    } else if (type === 'receipt') {
      router.push(`/receipts/${transaction.id}`);
    } else if (type === 'payment') {
      router.push(`/payments/${transaction.id}`);
    } else if (type === 'customer refund') {
      router.push(`/payments/${transaction.id}`);
    } else if (type === 'supplier refund') {
      router.push(`/receipts/${transaction.id}`);
    } else if (type.includes('transfer')) {
      router.push(`/transfers/${transaction.id}`);
    }
  };
  
  // Calculate running balance and totals
  const transactionsWithBalance = transactions.map((transaction, index) => {
    let runningBalance = openingBalance;
    for (let i = 0; i <= index; i++) {
      transactions[i].isInflow 
        ? runningBalance += transactions[i].amount 
        : runningBalance -= transactions[i].amount;
    }
    return { ...transaction, balance: runningBalance };
  });

  const totalInflow = transactions.filter(t => t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = transactions.filter(t => !t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const closingBalance = openingBalance + totalInflow - totalOutflow;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row */}
            <TableRow>
              <TableCell></TableCell>
              <TableCell colSpan={5} className="font-medium">Opening Balance</TableCell>
              <TableCell className="text-right font-medium">{formatter.format(openingBalance)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            
            {/* Transaction Rows with Expandable Details */}
            {transactionsWithBalance.map((transaction) => (
              <React.Fragment key={transaction.id}>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 p-0"
                      onClick={() => toggleRow(transaction.id)}
                    >
                      {expandedRows[transaction.id] 
                        ? <ChevronDown className="h-4 w-4" /> 
                        : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {format(utcToLocal(transaction.date) || new Date(transaction.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {transaction.type}
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right" onClick={() => toggleRow(transaction.id)}>
                    {transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right" onClick={() => toggleRow(transaction.id)}>
                    {!transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium" onClick={() => toggleRow(transaction.id)}>
                    {formatter.format(transaction.balance)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 p-0"
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Expandable Details */}
                {expandedRows[transaction.id] && (
                  <TableRow className="bg-muted/50">
                    <TableCell></TableCell>
                    <TableCell colSpan={7} className="py-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {transaction.reference && (
                          <div><span className="font-semibold">Reference:</span> {transaction.reference}</div>
                        )}
                        {transaction.note && (
                          <div><span className="font-semibold">Note:</span> {transaction.note}</div>
                        )}
                        {transaction.transactionId && (
                          <div><span className="font-semibold">Transaction ID:</span> {transaction.transactionId}</div>
                        )}
                        <div className="col-span-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Transaction
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
            
            {/* Totals Row */}
            <TableRow className="bg-slate-100 dark:bg-slate-800">
              <TableCell></TableCell>
              <TableCell colSpan={3} className="font-medium">Totals</TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(totalInflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(totalOutflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(closingBalance)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
