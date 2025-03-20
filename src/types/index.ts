import { BankAccount, CashAccount, Customer, ExpenseCategory, IncomeCategory, Supplier, TaxSlab, TourPackage, UnitOfMeasure } from "@prisma/client";

// Common interfaces for dialog components
export interface TransactionFormProps {
  initialData: any;
  onSuccess: () => void;
  submitButtonText?: string;
}

export interface PurchaseFormProps extends TransactionFormProps {
  taxSlabs: TaxSlab[];
  units: UnitOfMeasure[];
  suppliers: Supplier[];
}

export interface SaleFormProps extends TransactionFormProps {
  taxSlabs: TaxSlab[];
  units: UnitOfMeasure[];
  customers: Customer[];
}

export interface PaymentFormProps extends TransactionFormProps {
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export interface ReceiptFormProps extends TransactionFormProps {
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export interface ExpenseFormProps extends TransactionFormProps {
  expenseCategories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export interface IncomeFormProps {
  initialData: any;
  incomeCategories: IncomeCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  onSuccess?: () => void; // Make onSuccess optional by adding a question mark
}

// Common base interface for all financial form props
interface BaseFinancialFormProps {
  tourPackageQueryId?: string;
  onSuccess: () => void;
  submitButtonText?: string;
}

