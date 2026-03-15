# Advanced Dashboard Page Patterns

## Cell Actions (components/cell-action.tsx)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { AlertModal } from "@/components/modals/alert-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleColumn } from "./columns";

interface CellActionProps {
  data: ModuleColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copied to clipboard.");
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/module/${data.id}`);
      router.refresh();
      toast.success("Item deleted.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data.id)}>
            <Copy className="mr-2 h-4 w-4" /> Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/module/${data.id}`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
```

## Filtering with useState + useMemo

```tsx
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Inside client component:
const [search, setSearch] = useState("");
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");

const filtered = useMemo(() => {
  return data.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (startDate && new Date(item.date) < new Date(startDate)) return false;
    if (endDate && new Date(item.date) > new Date(endDate)) return false;
    return true;
  });
}, [data, search, startDate, endDate]);

const hasFilters = search || startDate || endDate;

// JSX:
<div className="flex flex-wrap items-center gap-2 mb-4">
  <Input
    placeholder="Search..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="max-w-sm"
  />
  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
  {hasFilters && (
    <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }}>
      <X className="mr-2 h-4 w-4" /> Clear
    </Button>
  )}
</div>
```

## Export Toolbar

```tsx
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { exportToCSV } from "@/lib/utils/csv-export";

const exportRows = useMemo(
  () => data.map((item) => ({
    Name: item.name,
    Amount: item.amount,
    Date: item.date,
  })),
  [data]
);

const downloadExcel = () => {
  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, "export.xlsx");
};

const toolbar = (
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={() => exportToCSV(exportRows, "export")}>
      <Download className="mr-2 h-4 w-4" /> CSV
    </Button>
    <Button variant="outline" size="sm" onClick={downloadExcel}>
      <Download className="mr-2 h-4 w-4" /> Excel
    </Button>
  </div>
);

// Pass to DataTable:
<DataTable searchKey="name" columns={columns} data={filtered} toolbar={toolbar} />
```

## Tabs for Data Segmentation

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Segment data
const activeItems = filtered.filter((i) => i.status === "active");
const archivedItems = filtered.filter((i) => i.status === "archived");

// JSX:
<Tabs defaultValue="all">
  <TabsList className="mb-4">
    <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
    <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
    <TabsTrigger value="archived">Archived ({archivedItems.length})</TabsTrigger>
  </TabsList>
  <TabsContent value="all">
    <DataTable columns={columns} data={filtered} searchKey="name" />
  </TabsContent>
  <TabsContent value="active">
    <DataTable columns={columns} data={activeItems} searchKey="name" />
  </TabsContent>
  <TabsContent value="archived">
    <DataTable columns={columns} data={archivedItems} searchKey="name" />
  </TabsContent>
</Tabs>
```
