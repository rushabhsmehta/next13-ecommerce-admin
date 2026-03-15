# Dashboard Page Template

## Server Component (page.tsx)

```tsx
import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { formatPrice } from "@/lib/utils";
import { ModuleClient } from "./components/client";
import { ModuleColumn } from "./components/columns";

export default async function ModulePage() {
  const items = await prismadb.model.findMany({
    include: {
      // Add relations needed for display
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedItems: ModuleColumn[] = items.map((item) => ({
    id: item.id,
    // Map fields, format dates and prices:
    // date: format(item.createdAt, "MMMM do, yyyy"),
    // amount: formatPrice(item.amount),
  }));

  return (
    <div className="flex-col">
      <div className="space-y-4 p-4">
        <ModuleClient data={formattedItems} />
      </div>
    </div>
  );
}
```

## Client Component (components/client.tsx)

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { columns, ModuleColumn } from "./columns";

interface ModuleClientProps {
  data: ModuleColumn[];
}

export const ModuleClient: React.FC<ModuleClientProps> = ({ data }) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Items (${data.length})`}
          description="Manage your items"
        />
        <Button onClick={() => router.push(`/module/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};
```

## Column Definitions (components/columns.tsx)

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";

export type ModuleColumn = {
  id: string;
  name: string;
  // ... other display fields
  createdAt: string;
};

export const columns: ColumnDef<ModuleColumn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  // ... more columns
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
```
