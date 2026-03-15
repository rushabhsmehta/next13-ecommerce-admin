# Financial Data Models — Full Reference

## Core Transaction Records

### SaleDetail
Customer invoice. Key fields:
- `id`, `tourPackageQueryId`, `customerId`
- `saleDate`, `salePrice`, `description`
- `gstAmount`, `gstPercentage`, `invoiceNumber`, `invoiceDate`
- `status`, `isGst`
- Tax: `cgstAmount`, `sgstAmount`, `igstAmount`, `gstin`, `hsnCode`
- Relations: `customer`, `tourPackageQuery`, `items[]` (SaleItem), `saleReturns[]`, `receiptAllocations[]` (ReceiptSaleAllocation), `linkedPurchases[]`

### PurchaseDetail
Supplier bill. Key fields:
- `id`, `tourPackageQueryId`, `supplierId`
- `purchaseDate`, `price`, `description`, `netPayable`
- `gstAmount`, `gstPercentage`, `billNumber`, `billDate`
- `status`, `tdsAmount`, `tdsChallanId`
- Tax: `cgstAmount`, `sgstAmount`, `igstAmount`, `gstin`, `hsnCode`
- Relations: `supplier`, `tourPackageQuery`, `items[]` (PurchaseItem), `purchaseReturns[]`, `paymentAllocations[]` (PaymentPurchaseAllocation)

## Money Movement Records

### ReceiptDetail
Money received from customer. Key fields:
- `id`, `customerId`, `bankAccountId?`, `cashAccountId?`
- `receiptDate`, `amount`, `receiptNumber`, `description`
- `paymentMethod` (cash, bank_transfer, cheque, upi, card)
- Relations: `customer`, `bankAccount?`, `cashAccount?`, `saleAllocations[]` (ReceiptSaleAllocation)

### PaymentDetail
Money paid to supplier. Key fields:
- `id`, `supplierId`, `bankAccountId?`, `cashAccountId?`
- `paymentDate`, `amount`, `paymentNumber`, `description`
- `paymentMethod`
- Relations: `supplier`, `bankAccount?`, `cashAccount?`, `purchaseAllocations[]` (PaymentPurchaseAllocation)

## Allocation Records

### ReceiptSaleAllocation
Links a receipt to a sale. Fields:
- `id`, `receiptDetailId`, `saleDetailId`, `allocatedAmount`, `note`
- Unique constraint: `(receiptDetailId, saleDetailId)`

### PaymentPurchaseAllocation
Links a payment to a purchase. Fields:
- `id`, `paymentDetailId`, `purchaseDetailId`, `allocatedAmount`, `note`
- Unique constraint: `(paymentDetailId, purchaseDetailId)`

## Account Records

### BankAccount
- `id`, `accountName`, `bankName`, `accountNumber` (unique), `ifscCode`, `branch`
- `openingBalance`, `currentBalance`, `isActive`
- Relations: `paymentDetails[]`, `receiptDetails[]`, `expenseDetails[]`, `incomeDetails[]`, `outgoingTransfers[]`, `incomingTransfers[]`

### CashAccount
- `id`, `accountName` (unique)
- `openingBalance`, `currentBalance`, `isActive`
- Relations: same as BankAccount

## Other Financial Records

### ExpenseDetail
- `id`, `expenseDate`, `amount`, `description`, `category`
- `bankAccountId?`, `cashAccountId?`, `supplierId?`, `tourPackageQueryId?`
- `gstAmount`, `tdsAmount`

### IncomeDetail
- `id`, `incomeDate`, `amount`, `description`, `category`
- `bankAccountId?`, `cashAccountId?`, `customerId?`, `tourPackageQueryId?`

### TransferDetail
- `id`, `transferDate`, `amount`, `description`
- `fromBankAccountId?`, `fromCashAccountId?`, `toBankAccountId?`, `toCashAccountId?`

## Key Calculations

```
Outstanding Receivable = SUM(salePrice + gstAmount) - SUM(receiptAllocations.allocatedAmount)
Outstanding Payable = SUM(netPayable ?? price + gstAmount) - SUM(paymentAllocations.allocatedAmount)
Account Balance = openingBalance + SUM(credits) - SUM(debits)
```
