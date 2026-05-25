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

- **$0** — Report type (e.g., `sales-ledger`, `customer-statement`, `gst-summary`, `inquiry-export`)
- **$1** — Date range or filters (optional)

## Live Project State

Existing export functions:
```
!`grep -rn "downloadAsExcel\|exportToCSV\|XLSX\." src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | head -20`
```

Report / ledger pages:
```
!`ls -d src/app/\(dashboard\)/reports/*/ src/app/\(dashboard\)/*/ledger/ 2>/dev/null | head -20`
```

## Steps

1. Check for an existing export on the target page before adding a duplicate
2. Read reference export: `src/app/(dashboard)/(routes)/inquiries/components/download-utils.ts` (org header pattern)
3. Read the page's Prisma queries / formatted row shape
4. Build workbook:
   - **Rows 1–7:** Organization header (name, address, phone, email, website, GST, PAN)
   - **Row 8:** Report title + `Generated on: ` + `format(new Date(), "dd/MM/yyyy HH:mm")`
   - **Row 9:** Spacer
   - **Row 10:** Bold column headers
   - **Row 11+:** Data (`formatPrice()` for money, `formatSafeDate()` for dates)
   - **Footer rows:** Totals / summary when applicable
5. `worksheet['!cols']`, `worksheet['!merges']` as needed
6. Wire **Download Excel** with Shadcn `Button` + `Download` icon; `XLSX.writeFile()` client-side
7. For large datasets, consider server-side generation via `src/app/api/export/` instead of blocking the browser

## Additional resources

- [references/xlsx-pattern.md](references/xlsx-pattern.md)
