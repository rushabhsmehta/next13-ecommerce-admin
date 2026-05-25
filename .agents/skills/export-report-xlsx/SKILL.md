---
name: export-report-xlsx
description: Export any financial or operational report as a branded Excel spreadsheet, following the project's existing XLSX patterns with organization headers. Use when the user asks to export data to Excel or create spreadsheet reports.
context: fork
agent: general-purpose
argument-hint: <report-type> [date-range]
---

# Export Report as Excel

Generate a branded Excel spreadsheet for any financial or operational report.

**Leverages:** `anthropic-skills:xlsx`

## Input

- **$0** — Report type (e.g., "sales-ledger", "customer-statement", "gst-summary")
- **$1** — Date range or filters (optional)

## Live Project State

Existing export functions:
```
!`grep -rn "downloadAsExcel\|exportToCSV\|XLSX\." src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null`
```

Available report pages:
```
!`ls -d src/app/\(dashboard\)/reports/*/ src/app/\(dashboard\)/sales/ledger/ src/app/\(dashboard\)/purchases/ledger/ src/app/\(dashboard\)/customers/ledger/ 2>/dev/null`
```

## Steps

1. Identify the report type and check if an existing export function already exists for it
2. Read the existing export pattern from `src/app/(dashboard)/(routes)/inquiries/components/download-utils.ts`
3. Read the relevant data source page/component to understand the Prisma queries and data shape
4. Create the XLSX export function following this structure:
   - **Rows 1-7:** Organization header (name, address, phone, email, website, GST no., PAN no.)
   - **Row 8:** Report title + `"Generated on: " + format(new Date(), "dd/MM/yyyy HH:mm")`
   - **Row 9:** Empty spacer
   - **Row 10:** Column headers (bold)
   - **Row 11+:** Data rows with formatted values
   - **Last rows:** Summary/totals if applicable
5. Set column widths with `worksheet['!cols'] = [{ wch: 20 }, ...]`
6. Merge title cells with `worksheet['!merges']`
7. Wire the export to a "Download Excel" button using Shadcn `Button` + `Download` icon from `lucide-react`
8. Use `xlsx` library: `XLSX.utils.book_new()`, `XLSX.utils.sheet_add_aoa()`, `XLSX.writeFile()`

## Additional resources

- For the canonical XLSX pattern, see [references/xlsx-pattern.md](references/xlsx-pattern.md)
