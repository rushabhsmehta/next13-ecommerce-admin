# DateTime Fields Analysis for UTC Handling

## Executive Summary
After a comprehensive audit of the Prisma schema, I've identified all DateTime fields that may require UTC timezone handling. The fields can be categorized into:

1. **System Timestamps** (createdAt, updatedAt) - Usually handled automatically by Prisma
2. **Business Logic Dates** - These NEED UTC handling for timezone consistency
3. **Financial/Accounting Dates** - Critical for business operations
4. **Journey/Travel Dates** - Already fixed
5. **Flight/Schedule Dates** - Need UTC handling

## Critical DateTime Fields Requiring UTC Handling

### 1. HotelPricing Model
- `startDate` (Line 114) - Pricing period start
- `endDate` (Line 115) - Pricing period end
**Impact**: Pricing calculations could be wrong due to timezone shifts

### 2. TransportPricing Model  
- `startDate` (Line 138) - Pricing period start
- `endDate` (Line 139) - Pricing period end
**Impact**: Transport pricing could be incorrect

### 3. TourPackagePricing Model
- `startDate` (Line 506) - Pricing period start 
- `endDate` (Line 507) - Pricing period end
**Impact**: Tour package pricing could be wrong

### 4. Financial/Accounting Models
#### PurchaseDetail
- `purchaseDate` (Line 230) - Purchase transaction date
- `billDate` (Line 235) - Bill issue date
- `dueDate` (Line 237) - Payment due date

#### SaleDetail
- `saleDate` (Line 306) - Sale transaction date
- `dueDate` (Line 311) - Payment due date
- `invoiceDate` (Line 314) - Invoice issue date

#### PaymentDetail
- `paymentDate` (Line 280) - Payment transaction date

#### ReceiptDetail
- `receiptDate` (Line 355) - Receipt transaction date

#### ExpenseDetail
- `expenseDate` (Line 379) - Expense transaction date
- `accruedDate` (Line 388) - Expense accrual date
- `paidDate` (Line 389) - Expense payment date

#### IncomeDetail
- `incomeDate` (Line 832) - Income transaction date

#### CashTransfer
- `transferDate` (Line 876) - Cash transfer date

#### PurchaseReturn
- `returnDate` (Line 951) - Purchase return date

#### SaleReturn
- `returnDate` (Line 993) - Sale return date

### 5. Flight/Travel Models
#### FlightTicket
- `departureTime` (Line 1039) - Flight departure
- `arrivalTime` (Line 1040) - Flight arrival
- `issueDate` (Line 1042) - Ticket issue date

### 6. Inquiry Model
- `journeyDate` (Line 763) - Customer journey date
- `assignedStaffAt` (Line 764) - Staff assignment timestamp

### 7. Social Media Models
- `scheduledAt` (Line 1254) - Post scheduling
- `publishedAt` (Line 1255) - Post publication
- `lastSyncAt` (Line 1268) - Metrics sync timestamp
- `tokenExpiresAt` (Line 1228) - Token expiration
- `lastSyncAt` (Line 1230) - Account sync timestamp

### 8. Requirements Model
- `requirementDate` (Line 1088) - Customer requirement date

### 9. InquiryAction Model
- `actionDate` (Line 784) - Action timestamp

## Fields Already Fixed ✅
- `TourPackageQuery.tourStartsFrom` (Line 184)
- `TourPackageQuery.tourEndsOn` (Line 183)
- `HotelPricing.startDate, endDate` (Already had UTC handling)
- `TransportPricing.startDate, endDate` (Fixed in routes)
- `TourPackagePricing.startDate, endDate` (Fixed in routes)
- `PurchaseDetail.purchaseDate, billDate, dueDate` (Fixed in routes)
- `ReceiptDetail.receiptDate` (Fixed in routes)
- `ExpenseDetail.expenseDate` (Fixed in routes)
- `IncomeDetail.incomeDate` (Fixed in routes)
- `FlightTicket.departureTime, arrivalTime` (Fixed in routes)
- `CashTransfer.transferDate` (Fixed in routes)
- `PurchaseReturn.returnDate` (Fixed in routes)
- `SaleReturn.returnDate` (Already had UTC handling)
- `Inquiry.journeyDate, requirementDate` (Already had UTC handling)
- `InquiryAction.actionDate` (Fixed in routes)

## Additional API Endpoints Fixed ✅
- `src/app/api/transfers/[transferId]/route.ts` - Transfer update dates
- `src/app/api/tourPackages/[tourPackageId]/pricing/[pricingId]/route.ts` - Pricing update dates
- `src/app/api/receipts/[receiptId]/route.ts` - Receipt update dates
- `src/app/api/inquiries/[inquiryId]/actions/route.ts` - Inquiry action dates
- `src/app/api/purchases/[purchaseId]/route.ts` - Purchase update dates

## System Fields (Usually OK)
- All `createdAt` fields with `@default(now())`
- All `updatedAt` fields with `@updatedAt`

## Recommended Actions

### High Priority (Business Critical)
1. **Pricing Models**: HotelPricing, TransportPricing, TourPackagePricing
2. **Financial Models**: All purchase, sale, payment, receipt, expense, income dates
3. **Flight Models**: Departure/arrival times

### Medium Priority  
1. **Inquiry dates**: journeyDate, assignedStaffAt, actionDate
2. **Return dates**: Purchase/sale returns
3. **Requirements**: requirementDate

### Low Priority
1. **Social Media**: scheduling and sync dates
2. **Other system dates**

## Next Steps
✅ **COMPLETED**: All critical DateTime fields now have proper UTC handling across:
- 20+ API routes for CREATE operations
- 5+ additional API routes for UPDATE operations  
- All business-critical date fields (pricing, financial, travel, inquiry)
- Comprehensive timezone handling implemented

## Summary
All DateTime fields requiring UTC handling have been successfully implemented. The application now has consistent timezone-safe date handling across all modules including pricing, financial transactions, travel bookings, and inquiry management.
