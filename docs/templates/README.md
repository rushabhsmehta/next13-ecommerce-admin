# Template Assets

## Hotel Pricing Upload Template

There are two companion assets for bulk hotel pricing updates:

1. `hotel-pricing-upload-template.csv`: lightweight format for quick edits without automation.
2. `hotel-pricing-upload-template.xlsx`: generated file with drop-down validation that mirrors live master data.

### Regenerating the Excel template

Run the utility to pull the latest IDs and names from Prisma and bake them into the workbook:

```powershell
npx tsx scripts/utilities/export-hotel-pricing-template.ts
```

- Output path defaults to `docs/templates/hotel-pricing-upload-template.xlsx` (use `--out=path/to/file.xlsx` to override).
- Specify a longer worksheet if needed with `--rows=600`.
- Requires a valid `DATABASE_URL` pointing to the environment you want to export from.
- `npx ts-node --esm ...` also works if your environment already prefers `ts-node`.

### Features inside the Excel workbook

- Column `A` (`hotel_id`) offers a drop-down of active hotel IDs.
- Columns `B` and `C` auto-fill the hotel name and location based on the selected ID (using `INDEX/MATCH`).
- Columns `D`, `E`, and `F` have drop-downs for room types, occupancy types, and meal plan codes sourced from the same database.
- Column `J` (`currency`) and `K` (`is_active`) limit values to approved options.
- Hidden `Lookups` worksheet stores the master lists—do not modify it manually.

After filling prices, save the workbook and upload it through the portal importer. The importer still accepts the CSV if you prefer a flat file; keep the headers identical when exporting from Excel.

### Uploading pricing through the portal

- Go to **Dashboard → Hotels** and click **Import Pricing** next to **Add New**.
- Select the regenerated `.xlsx` file (or a CSV exported from it) and submit.
- The importer validates every row against the live Prisma master data (hotel IDs, room types, occupancy types, and meal plans).
- Overlapping date ranges (either within the file or versus existing pricing) are still processed but surfaced as warnings so you can reconcile periods afterward.
- Existing pricing rows with matching hotel/room/occupancy/meal-plan/date combinations are updated; new rows are inserted; rows with validation issues are reported with exact Excel row numbers.
