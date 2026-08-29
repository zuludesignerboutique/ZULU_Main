export interface CompanySettings {
  id: number;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  terms: string;
  footerNote: string;
  logoUrl: string;
  updatedAt: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
}

export interface BillItem {
  srNo: number;
  name: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  productCode?: string;
  size?: string;
}

export interface BillTotals {
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  amountInWords: string;
}

export interface PaymentInfo {
  method: string;
  transactionId: string;
  paidAmount: number;
  balanceAmount: number;
}

export interface BillData {
  billNumber: string;
  billDate: string;
  dueDate: string;
  company: CompanySettings;
  customer: CustomerInfo;
  items: BillItem[];
  totals: BillTotals;
  payment: PaymentInfo;
  notes: string;
  termsConditions: string;
}

export interface ManualBillRequest {
  company?: Partial<CompanySettings>;
  customer?: Partial<CustomerInfo>;
  items: Partial<BillItem>[];
  notes?: string;
  termsConditions?: string;
  billDate?: string;
  dueDate?: string;
}