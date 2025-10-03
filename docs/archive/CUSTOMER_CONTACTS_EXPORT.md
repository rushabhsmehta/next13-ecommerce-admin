# Customer Contacts CSV Export Feature

## Overview
This feature allows you to export customer contact information from both Inquiries and Tour Package Queries as CSV files. These exports include customer names, phone numbers, and associated partner details.

## Features Implemented

### 1. Inquiries Contacts Export
**Endpoint**: `/api/export/inquiries-contacts`  
**Page**: `/export-contacts`

**Exported Data:**
- Customer Name
- Mobile Number
- Location
- Status (Pending, Confirmed, Cancelled, etc.)
- Journey Date
- Inquiry Created Date
- Associate Partner Business Name
- Associate Contact Person Name
- Associate Mobile Number

**File Name Format**: `inquiries-contacts-YYYY-MM-DD.csv`

### 2. Tour Queries Contacts Export
**Endpoint**: `/api/export/queries-contacts`  
**Page**: `/export-contacts`

**Exported Data:**
- Query Number
- Customer Name (from Query)
- Mobile Number (from Query)
- Customer Name (from Original Inquiry)
- Mobile Number (from Original Inquiry)
- Location
- Tour Start Date
- Query Created Date
- Associate Partner Business Name
- Associate Contact Person Name
- Associate Mobile Number

**File Name Format**: `tour-queries-contacts-YYYY-MM-DD.csv`

## Files Created

### API Routes
1. **`src/app/api/export/inquiries-contacts/route.ts`**
   - Fetches all inquiries with customer and associate partner details
   - Generates CSV with proper formatting
   - Returns downloadable CSV file

2. **`src/app/api/export/queries-contacts/route.ts`**
   - Fetches all tour package queries with customer details
   - Includes both query customer info and original inquiry info
   - Generates CSV with proper formatting
   - Returns downloadable CSV file

### UI Page
3. **`src/app/(dashboard)/(routes)/export-contacts/page.tsx`**
   - User-friendly export interface
   - Two separate export buttons for Inquiries and Queries
   - Loading states during export
   - Success/error toast notifications
   - Information cards explaining what each export contains

## Usage Instructions

### Accessing the Export Page
1. Navigate to `/export-contacts` in your admin dashboard
2. You'll see two cards:
   - **Inquiries Contacts** (left card)
   - **Tour Queries Contacts** (right card)

### Exporting Inquiries Contacts
1. Click the "Export Inquiries CSV" button
2. Wait for the file to download (loading state shows "Exporting...")
3. File will automatically download as `inquiries-contacts-YYYY-MM-DD.csv`
4. Success toast notification confirms export

### Exporting Tour Queries Contacts
1. Click the "Export Queries CSV" button
2. Wait for the file to download (loading state shows "Exporting...")
3. File will automatically download as `tour-queries-contacts-YYYY-MM-DD.csv`
4. Success toast notification confirms export

## CSV Format Details

### Inquiries CSV Structure
```csv
Customer Name,Mobile Number,Location,Status,Journey Date,Inquiry Date,Associate Partner Business,Associate Contact Person,Associate Mobile
"John Doe","9876543210","Goa","PENDING","10/15/2025","10/01/2025","Travel Partners Ltd","Jane Smith","9123456789"
"Alice Johnson","9988776655","Kerala","CONFIRMED","11/20/2025","10/02/2025","Direct","",""
```

### Tour Queries CSV Structure
```csv
Query Number,Customer Name (Query),Mobile Number (Query),Customer Name (Inquiry),Mobile Number (Inquiry),Location,Tour Start Date,Query Created Date,Associate Partner Business,Associate Contact Person,Associate Mobile
"TPQ-001","John Doe","9876543210","John Doe","9876543210","Goa","10/15/2025","10/05/2025","Travel Partners Ltd","Jane Smith","9123456789"
```

## Technical Implementation

### API Route Pattern
Both API routes follow a similar pattern:

1. **Fetch Data**: Query Prisma with relevant relations (location, associatePartner, inquiry)
2. **Format CSV**: 
   - Create header row with column names
   - Map each record to CSV row with quoted values
   - Handle null/undefined values gracefully
3. **Return Response**: 
   - Set `Content-Type: text/csv`
   - Set `Content-Disposition` with filename
   - Return CSV string as response body

### Client-Side Download
The UI page uses the Fetch API and Blob API to:
1. Fetch the CSV from the API endpoint
2. Create a Blob from the response
3. Generate a temporary URL
4. Programmatically click a download link
5. Clean up the temporary URL

### Data Handling
- **Direct Customers**: Show "Direct" when no associate partner exists
- **Missing Fields**: Show empty strings for null/undefined values
- **Date Formatting**: Convert ISO dates to localized date strings
- **CSV Escaping**: All values wrapped in quotes to handle commas in names

## Security Considerations

### Data Privacy
⚠️ **Important**: These exports contain sensitive personal information:
- Customer phone numbers
- Customer names
- Associate partner contact details

**Best Practices:**
1. Restrict access to this page to authorized personnel only
2. Handle downloaded files securely
3. Delete exports when no longer needed
4. Comply with data protection regulations (GDPR, etc.)
5. Consider adding authentication checks to API routes

### Recommended Enhancements
```typescript
// Add to API routes for production
import { auth } from '@clerk/nextjs';

export async function GET(req: Request) {
  const { userId } = auth();
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Check user role/permissions
  // ... existing code
}
```

## Use Cases

1. **Marketing Campaigns**: Export customer contacts for WhatsApp/SMS campaigns
2. **Follow-ups**: Get contact lists for follow-up calls or messages
3. **Partner Management**: Track which inquiries came from which associate partners
4. **Data Analysis**: Import into CRM or analytics tools
5. **Backup**: Regular exports for data backup purposes
6. **Reports**: Generate reports for management on customer acquisition

## Opening CSV Files

### Microsoft Excel
1. Open Excel
2. File → Open → Select the CSV file
3. Data should automatically populate into columns

### Google Sheets
1. Open Google Sheets
2. File → Import → Upload
3. Select the CSV file
4. Choose "Import data"

### Handling Special Characters
If you see encoding issues:
- Excel: Use "Data → From Text/CSV" and select UTF-8 encoding
- Google Sheets: Usually handles encoding automatically

## Extending the Feature

### Adding More Fields
To add more fields to the export, modify the API route:

```typescript
// In route.ts
const csvHeaders = [
  // ... existing headers,
  'New Field Name'
].join(',');

const csvRows = records.map(record => [
  // ... existing fields,
  `"${record.newField || ''}"`
].join(','));
```

### Filtering Data
Add query parameters to filter exports:

```typescript
// Example: Filter by date range or status
const { searchParams } = new URL(req.url);
const status = searchParams.get('status');
const fromDate = searchParams.get('fromDate');

const inquiries = await prismadb.inquiry.findMany({
  where: {
    ...(status && { status }),
    ...(fromDate && { createdAt: { gte: new Date(fromDate) } })
  },
  // ... rest of query
});
```

### Scheduling Automated Exports
Consider integrating with a cron job or background task to:
- Generate exports daily/weekly
- Email exports to specified recipients
- Upload to cloud storage (S3, Google Drive)

## Testing

### Manual Testing
1. **Test Inquiries Export**:
   - Create a few test inquiries with different associate partners
   - Export CSV and verify all data is present
   - Check that "Direct" appears for inquiries without partners

2. **Test Queries Export**:
   - Create test tour package queries
   - Some with inquiries, some without
   - Export and verify both query and inquiry customer data appears

3. **Test Edge Cases**:
   - Export with no data (should return CSV with headers only)
   - Export with special characters in names
   - Export with very long customer names
   - Export with missing phone numbers

### Data Validation
After export, verify:
- ✅ All columns are properly aligned
- ✅ No data is truncated
- ✅ Dates are formatted correctly
- ✅ Phone numbers are complete
- ✅ Special characters display correctly
- ✅ File opens in Excel/Sheets without errors

## Troubleshooting

### CSV Not Downloading
- Check browser console for errors
- Verify API route returns 200 status
- Check network tab for response

### Data Missing in Export
- Verify Prisma relations are included in query
- Check if data exists in database
- Review CSV formatting logic

### Encoding Issues
- Ensure UTF-8 encoding in API response
- Add BOM (Byte Order Mark) if needed: `\ufeff` at start of CSV

### Permission Errors
- Verify Prisma client has read access
- Check database connection
- Ensure API route is accessible

## Future Enhancements

### Potential Features
1. **Date Range Filtering**: Export only inquiries/queries from specific date range
2. **Status Filtering**: Export only specific status (PENDING, CONFIRMED, etc.)
3. **Location Filtering**: Export contacts for specific locations only
4. **Combined Export**: Single CSV with both inquiries and queries
5. **Excel Format**: Export as .xlsx with formatting
6. **Email Export**: Send CSV via email instead of download
7. **Scheduled Reports**: Automated weekly/monthly exports
8. **Custom Fields**: Let users choose which columns to include
9. **Analytics**: Show preview of record count before export
10. **Audit Log**: Track who exported what and when

---

**Status**: ✅ Implemented and Ready to Use  
**Date**: October 1, 2025  
**Access**: Navigate to `/export-contacts` in admin dashboard  
**Security**: ⚠️ Contains sensitive data - restrict access appropriately
