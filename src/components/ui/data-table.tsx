"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[],
  searchKey?: string;
  searchPlaceholder?: string;
  onEditRow?: (row: TData) => void;
  onDeleteRow?: (row: TData) => Promise<void> | void;
  toolbar?: React.ReactNode;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search",
  onEditRow,
  onDeleteRow,
  toolbar,
  enableRowSelection = false,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const columnsWithSelection = useMemo(() => {
    if (!enableRowSelection) return columns;
    const selectCol: ColumnDef<TData, any> = {
      id: '__select__',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={table.getIsAllPageRowsSelected()}
          onChange={e => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={e => row.toggleSelected(e.target.checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    return [selectCol, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: columnsWithSelection as any,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    state: { columnFilters, rowSelection },
    getRowId: (row: any) => row.id ?? row.ID ?? row.Id ?? row._id ?? String(Math.random()),
    initialState: { pagination: { pageSize: 100 } },
    meta: {
      onEdit: onEditRow,
      onDelete: onDeleteRow,
    }
  });

  useEffect(() => { if (onRowSelectionChange) onRowSelectionChange(rowSelection); }, [rowSelection, onRowSelectionChange]);

  return (
    <div>
      <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        )}
        {toolbar}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
    </div>
  )
}

