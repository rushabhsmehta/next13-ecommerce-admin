import { BankAccount, CashAccount, Customer, ExpenseCategory, IncomeCategory, Supplier, TaxSlab, TourPackage, UnitOfMeasure } from "@prisma/client";

// Common interfaces for dialog components
export interface TransactionFormProps {
  initialData: {
    id?: string;
    [key: string]: any;
    confirmedTourPackageQueries?: Array<{
      id: string;
      tourPackageQueryName: string;
      isFeatured: boolean;
      [key: string]: any;
    }>;
  };
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
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  confirmedTourPackageQueries?: Array<{
    id: string;
    tourPackageQueryName: string;
    isFeatured: boolean;
    [key: string]: any;
  }>;
}

export interface ReceiptFormProps extends TransactionFormProps {
  customers: Customer[];
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  confirmedTourPackageQueries?: Array<{
    id: string;
    tourPackageQueryName: string;
    isFeatured: boolean;
    [key: string]: any;
  }>;
}

export interface ExpenseFormProps extends TransactionFormProps {
  expenseCategories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export interface IncomeFormProps {
  initialData: any;
  incomeCategories: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  bankAccounts: {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
    openingBalance: number;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  cashAccounts: {
    id: string;
    accountName: string;
    openingBalance: number;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  onSuccess?: () => void;
  submitButtonText?: string; // Add this line to include the submitButtonText property
}

// Common base interface for all financial form props
interface BaseFinancialFormProps {
  tourPackageQueryId?: string;
  onSuccess: () => void;
  submitButtonText?: string;
}