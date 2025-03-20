Current structure:
- sales-section.tsx (Keep)
- purchases-section.tsx (Keep)
- expenses-section.tsx (Keep)
- incomes-section.tsx (Keep)
- receipts-section.tsx (Keep)
- payments-section.tsx (Keep)
- delete-confirmation.tsx (Keep)
- sale-form-dialog.tsx (Move to shared)
- purchase-form-dialog.tsx (Move to shared)
- expense-form-dialog.tsx (Move to shared)
- income-form-dialog.tsx (Move to shared)
- receipt-form-dialog.tsx (Move to shared)
- payment-form-dialog.tsx (Move to shared)

Proposed structure:
1. Move form dialog components to: /components/forms/[transaction-type]-form-dialog.tsx
2. Update the imports in all section components
3. Update the import paths in the wrapper components
