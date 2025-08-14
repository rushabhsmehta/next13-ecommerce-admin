"use client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export interface TdsRow {
  id: string;
  sectionCode: string;
  description?: string | null;
  thresholdAmount?: number | null;
  rateIndividual?: number | null;
  rateCompany?: number | null;
  rateWithPan?: number | null;
  rateWithoutPan?: number | null;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  isIncomeTaxTds: boolean;
  isGstTds: boolean;
}

export const tdsColumns: ColumnDef<TdsRow & { active?: boolean }>[] = [
  {
    accessorKey: 'sectionCode',
    header: 'Section',
    cell: ({ row }) => <span className="font-medium">{row.original.sectionCode}</span>
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => <span className="line-clamp-2 max-w-[240px] text-xs text-muted-foreground">{row.original.description}</span>
  },
  {
    accessorKey: 'rateWithPan',
    header: 'Rate (PAN)',
    cell: ({ row }) => row.original.rateWithPan ?? '-'
  },
  {
    accessorKey: 'rateWithoutPan',
    header: 'Rate (No PAN)',
    cell: ({ row }) => row.original.rateWithoutPan ?? '-'
  },
  {
    accessorKey: 'thresholdAmount',
    header: 'Threshold',
    cell: ({ row }) => row.original.thresholdAmount ? row.original.thresholdAmount.toFixed(2) : '-'
  },
  {
    accessorKey: 'effectiveFrom',
    header: 'From',
    cell: ({ row }) => format(new Date(row.original.effectiveFrom), 'dd-MMM-yy')
  },
  {
    accessorKey: 'effectiveTo',
    header: 'To',
    cell: ({ row }) => row.original.effectiveTo ? format(new Date(row.original.effectiveTo), 'dd-MMM-yy') : '—'
  },
  {
    accessorKey: 'isGstTds',
    header: 'Type',
    cell: ({ row }) => row.original.isGstTds ? 'GST' : 'Income Tax'
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const original = row.original;
      const meta: any = table?.options?.meta;
      return (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => meta?.onEdit?.(original)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => meta?.onDelete?.(original)}>Delete</Button>
        </div>
      );
    }
  }
];
