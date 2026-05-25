---
name: financial-context
description: Financial domain context for the accounting system — accounts, sales, purchases, payments, receipts, expenses, incomes, allocations, and balance management. Use when working on any financial feature.
user-invocable: false
allowed-tools: Read, Grep, Glob
---

# Financial Domain Context

Load this context when working on financial features (accounts, sales, purchases, payments, receipts, expenses, incomes).

## Live Schema — Financial Models

```
!`grep -n "^model \(Sale\|Purchase\|Receipt\|Payment\|Expense\|Income\|Bank\|Cash\|Transfer\|Allocation\)" schema.prisma`
```

## Live API Routes

```
!`ls -1 src/app/api/receipts/ src/app/api/payments/ src/app/api/sales/ src/app/api/purchases/ src/app/api/expenses/ src/app/api/incomes/ src/app/api/transfers/ 2>/dev/null | head -40`
```

## Before making changes, read these key files:

1. **Schema** — Read the relevant models in `schema.prisma`:
   - `SaleDetail`, `PurchaseDetail` — core transaction records
   - `ReceiptDetail`, `PaymentDetail` — money movement records
   - `ReceiptSaleAllocation`, `PaymentPurchaseAllocation` — allocation links
   - `BankAccount`, `CashAccount` — account balances
   - `ExpenseDetail`, `IncomeDetail` — expense/income records
   - `TransferDetail` — inter-account transfers

2. **API Routes** — Check the relevant routes in `src/app/api/`:
   - `receipts/` — Creates receipts, updates bank/cash balances, manages allocations
   - `payments/` — Creates payments, updates balances, manages allocations
   - `sales/` — Creates/updates sale invoices
   - `purchases/` — Creates/updates purchase bills
   - `expenses/` — Expense management
   - `incomes/` — Income management
   - `transfers/` — Inter-account transfers

3. **Dashboard Pages** — Check current implementations:
   - `src/app/(dashboard)/accounts/` — Financial dashboard overview
   - `src/app/(dashboard)/sales/` — Sales list with filters
   - `src/app/(dashboard)/purchases/` — Purchases list with filters
   - `src/app/(dashboard)/fetchaccounts/` — Per-query financial breakdown

## Key Business Rules

- `BankAccount.currentBalance` and `CashAccount.currentBalance` are updated atomically in API routes when payments/receipts/transfers are created or deleted
- Allocations link receipts→sales and payments→purchases with `allocatedAmount`
- Outstanding = total invoice amount minus sum of allocations
- GST fields: `gstAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `gstPercentage`, `gstin`, `hsnCode`
- Currency is INR — always use `formatPrice()` from `@/lib/utils`
- Dates should be converted with `dateToUtc()` from `@/lib/timezone-utils` before storing

## Additional resources

- For full financial model definitions, see [references/financial-models.md](references/financial-models.md)
