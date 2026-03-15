# XLSX Export Pattern Reference

## Canonical Pattern (from download-utils.ts)

```typescript
import * as XLSX from "xlsx";
import { format } from "date-fns";

export function downloadAsExcel(
  data: ExportRow[],
  filename: string,
  organization?: Organization
) {
  const wb = XLSX.utils.book_new();

  // Build header rows (organization info)
  const headerRows: any[][] = [];
  if (organization) {
    headerRows.push([organization.name || ""]);
    headerRows.push([organization.address || ""]);
    headerRows.push([`Phone: ${organization.phone || ""}`]);
    headerRows.push([`Email: ${organization.email || ""}`]);
    headerRows.push([`Website: ${organization.website || ""}`]);
    headerRows.push([`GST No: ${organization.gstin || ""}`]);
    headerRows.push([`PAN: ${organization.pan || ""}`]);
  }

  // Report title
  headerRows.push([`${filename} — Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}`]);
  headerRows.push([]); // spacer row

  // Create worksheet from header rows
  const ws = XLSX.utils.aoa_to_sheet(headerRows);

  // Add data below headers
  XLSX.utils.sheet_add_json(ws, data, {
    origin: `A${headerRows.length + 1}`,
    skipHeader: false,
  });

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // Column A
    { wch: 15 }, // Column B
    { wch: 20 }, // Column C
    // ... more columns as needed
  ];

  // Merge title cell across columns
  ws["!merges"] = [
    { s: { r: headerRows.length - 2, c: 0 }, e: { r: headerRows.length - 2, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

## Organization Interface

```typescript
interface Organization {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstin?: string;
  pan?: string;
  logo?: string;
}
```

## Button Pattern

```tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

<Button onClick={() => downloadAsExcel(data, "Sales Report", organization)}>
  <Download className="mr-2 h-4 w-4" />
  Download Excel
</Button>
```

## CSV Fallback (src/lib/utils/csv-export.ts)

```typescript
export function exportToCSV(data: Record<string, any>[], filename: string) {
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.includes(",") ? `"${val}"` : val;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```
