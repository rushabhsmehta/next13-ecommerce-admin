import { BankAccount, CashAccount, Customer, ExpenseCategory, ExpenseDetail, IncomeCategory, IncomeDetail, PaymentDetail, PurchaseDetail, PurchaseItem, PurchaseReturn, PurchaseReturnItem, ReceiptDetail, SaleDetail, SaleItem, SaleReturn, SaleReturnItem, Supplier, TaxSlab, UnitOfMeasure } from "@prisma/client";


export interface SidebarItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface TransactionBase {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  reference?: string;
  balance: number;
}

export interface FormattedTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  inflow: number;
  outflow: number;
  balance: number;
  reference?: string;
}

// Common base interface for all financial form props
interface BaseFinancialFormProps {
  tourPackageQueryId?: string;
  onSuccess: () => void;
  submitButtonText?: string;
}

// Purchase form props
export interface PurchaseFormProps extends BaseFinancialFormProps {
  initialData?: PurchaseDetail & {
    items?: PurchaseItem[];
    supplier?: Supplier;
    tourPackageQueryName?: string;
  };
  taxSlabs?: TaxSlab[];
  units?: UnitOfMeasure[];
  suppliers?: Supplier[];
}

// Sale form props
export interface SaleFormProps extends BaseFinancialFormProps {
  initialData?: SaleDetail & {
    items?: SaleItem[];
    customer?: Customer;
    tourPackageQueryName?: string;
  };
  taxSlabs?: TaxSlab[];
  units?: UnitOfMeasure[];
  customers?: Customer[];
}

// Payment form props
export interface PaymentFormProps extends BaseFinancialFormProps {
  initialData?: PaymentDetail & {
    supplier?: Supplier;
  };
  suppliers?: Supplier[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
}

// Receipt form props
export interface ReceiptFormProps extends BaseFinancialFormProps {
  initialData?: ReceiptDetail & {
    customer?: Customer;
  };
  customers?: Customer[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
}

// Expense form props
export interface ExpenseFormProps extends BaseFinancialFormProps {
  initialData?: ExpenseDetail & {
    expenseCategory?: ExpenseCategory;
  };
  expenseCategories?: ExpenseCategory[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
}

// Income form props
export interface IncomeFormProps extends BaseFinancialFormProps {
  initialData?: IncomeDetail & {
    incomeCategory?: IncomeCategory;
  };
  incomeCategories?: IncomeCategory[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
}

// Purchase return form props
export interface PurchaseReturnFormProps extends BaseFinancialFormProps {
  initialData?: PurchaseReturn & {
    items?: PurchaseReturnItem[];
    purchaseDetail?: PurchaseDetail & {
      supplier?: Supplier;
    };
  };
  taxSlabs?: TaxSlab[];
  units?: UnitOfMeasure[];
  suppliers?: Supplier[];
}

// Sale return form props
export interface SaleReturnFormProps extends BaseFinancialFormProps {
  initialData?: SaleReturn & {
    items?: SaleReturnItem[];
    saleDetail?: SaleDetail & {
      customer?: Customer;
    };
  };
  taxSlabs?: TaxSlab[];
  units?: UnitOfMeasure[];
  customers?: Customer[];
  sales?: any[];
  selectedSaleId?: string;
  onClose?: () => void;
}

// Common wrapper props interface
export interface FormWrapperProps {
  isModal?: boolean;
  redirectPath?: string;
}