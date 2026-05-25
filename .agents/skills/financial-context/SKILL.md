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
!`grep -n "^model \(Sale\|Purchase\|Receipt\|Payment\|Expense\|Income\|Bank\|Cash\|Transfer\|Allocation\|SaleReturn\|PurchaseReturn\)" schema.prisma`
```

## Live API Routes

```
!`ls -1 src/app/api/receipts/ src/app/api/payments/ src/app/api/sales/ src/app/api/purchases/ src/app/api/expenses/ src/app/api/incomes/ src/app/api/transfers/ src/app/api/mobile/finance/ 2>/dev/null | head -40`
```

## Before making changes, read these key files:

1. **Schema** — `schema.prisma` models:
   - `SaleDetail`, `PurchaseDetail` — invoices / bills
   - `ReceiptDetail`, `PaymentDetail` — collections / disbursements
   - `ReceiptSaleAllocation`, `PaymentPurchaseAllocation` — allocations
   - `BankAccount`, `CashAccount` — `currentBalance`
   - `ExpenseDetail`, `IncomeDetail`, `TransferDetail`
   - `SaleReturn`, `PurchaseReturn` — credit notes / supplier credits

2. **API Routes** — `src/app/api/`:
   - `receipts/`, `payments/`, `sales/`, `purchases/`, `expenses/`, `incomes/`, `transfers/`
   - `credit-notes/`, `supplier-credits/`
   - Mobile read surface: `src/app/api/mobile/finance/` (variant UX; authorize by org role server-side)

3. **Dashboard** — `src/app/(dashboard)/accounts/`, `sales/`, `purchases/`, `fetchaccounts/`, ledgers, cash/bank books

4. **Helpers** — `src/lib/transaction-service.ts`, `src/lib/transaction-schemas.ts`, `src/lib/gst-utils.ts`, `src/lib/tds.ts`

## Key Business Rules

- `BankAccount.currentBalance` and `CashAccount.currentBalance` update atomically in payment/receipt/transfer create/delete routes
- Outstanding receivable ≈ `(salePrice + gstAmount) - SUM(receiptAllocations.allocatedAmount)`
- Outstanding payable ≈ `(netPayable ?? price + gstAmount) - SUM(paymentAllocations.allocatedAmount)`
- GST: `gstAmount`, `cgstAmount`, `sgstAmount`, `igstAmount`, `gstPercentage`, `gstin`, `hsnCode`
- Currency INR — `formatPrice()` from `@/lib/utils`
- Dates — `dateToUtc()` from `@/lib/timezone-utils` before storing date-only fields
- Finance mutations require `FINANCE`, `ADMIN`, or `OWNER` (`requireFinanceOrAdmin`)
- **Aagam Accounts** mobile app (`APP_VARIANT=finance`) must not expose CRM/chat/WhatsApp write paths — backend RBAC still required on every API

## Additional resources

- [references/financial-models.md](references/financial-models.md)
