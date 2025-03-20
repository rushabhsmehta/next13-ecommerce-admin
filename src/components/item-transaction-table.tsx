import { formatPrice } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Item {
  id: string;
  productName: string;
  description?: string | null;
  quantity: number;
  pricePerUnit: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  totalAmount: number;
  unitOfMeasure?: {
    abbreviation: string;
  } | null;
  taxSlab?: {
    percentage: number;
    name: string;
  } | null;
}

interface ItemTransactionTableProps {
  items: Item[];
}

export function ItemTransactionTable({ items }: ItemTransactionTableProps) {
  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
  
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0
  );
  
  const totalTax = items.reduce(
    (sum, item) => sum + (item.taxAmount || 0),
    0
  );
  
  const grandTotal = items.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Tax</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.productName}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {item.quantity} {item.unitOfMeasure?.abbreviation || ''}
              </TableCell>
              <TableCell className="text-right">
                {formatPrice(item.pricePerUnit)}
              </TableCell>
              <TableCell className="text-right">
                {item.discountAmount ? (
                  <div>
                    {formatPrice(item.discountAmount)}
                    {item.discountPercent ? (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.discountPercent}%)
                      </span>
                    ) : null}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                {item.taxAmount ? (
                  <div>
                    {formatPrice(item.taxAmount)}
                    {item.taxSlab ? (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.taxSlab.percentage}%)
                      </span>
                    ) : null}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(item.totalAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>Subtotal</TableCell>
            <TableCell className="text-right">{formatPrice(subtotal)}</TableCell>
          </TableRow>
          {totalDiscount > 0 && (
            <TableRow>
              <TableCell colSpan={5}>Discount</TableCell>
              <TableCell className="text-right">{formatPrice(totalDiscount)}</TableCell>
            </TableRow>
          )}
          {totalTax > 0 && (
            <TableRow>
              <TableCell colSpan={5}>Tax</TableCell>
              <TableCell className="text-right">{formatPrice(totalTax)}</TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={5} className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold">{formatPrice(grandTotal)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

