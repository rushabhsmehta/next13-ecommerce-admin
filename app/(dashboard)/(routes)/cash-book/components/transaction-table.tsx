import React from 'react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from "@/components/ui/table";

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

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions,
  openingBalance
}) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  // Calculate running balance
  const transactionsWithBalance = transactions.map((transaction, index) => {
    let runningBalance = openingBalance;
    
    for (let i = 0; i <= index; i++) {
      if (transactions[i].isInflow) {
        runningBalance += transactions[i].amount;
      } else {
        runningBalance -= transactions[i].amount;
      }
    }
    
    return {
      ...transaction,
      balance: runningBalance
    };
  });

  // Calculate totals
  const totalInflow = transactions
    .filter(t => t.isInflow)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalOutflow = transactions
    .filter(t => !t.isInflow)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const closingBalance = openingBalance + totalInflow - totalOutflow;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="font-medium">Opening Balance</TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(openingBalance)}
              </TableCell>
            </TableRow>
            
            {transactionsWithBalance.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  {transaction.type}
                </TableCell>
                <TableCell>
                  {transaction.description}
                  {transaction.note && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Note: {transaction.note}
                    </div>
                  )}
                  {transaction.transactionId && (
                    <div className="text-xs text-muted-foreground">
                      Trans ID: {transaction.transactionId}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {transaction.reference}
                </TableCell>
                <TableCell className="text-right">
                  {transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {!transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatter.format(transaction.balance)}
                </TableCell>
              </TableRow>
            ))}
            
            <TableRow className="bg-slate-100 dark:bg-slate-800">
              <TableCell colSpan={4} className="font-medium">Totals</TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(totalInflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(totalOutflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(closingBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
