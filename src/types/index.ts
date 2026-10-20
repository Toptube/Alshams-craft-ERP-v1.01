export type Gender = 'male' | 'female';

export type CraftCategory =
  | 'رانر'
  | 'ستائر'
  | 'سجاد'
  | 'كوشن'
  | 'جدارية'
  | 'بوف'
  | 'كرسي'
  | 'أرجوحة'
  | 'نجف وإضاءة'
  | 'شنطة أو كلاتش';

export type Shape3DType =
  | 'flat'
  | 'circle'
  | 'cylinder'
  | 'square'
  | 'rectangle';

export type EmployeePaymentType = 'monthly' | 'daily' | 'piece_rate' | 'fixed_salary';
export type EmployeeTier = 'مبتدئ' | 'متوسط' | 'خبير' | string;
export type PaymentMethod = 'cash' | 'instapay' | 'wallet' | 'bank' | string;
export type TreasuryType = 'cash' | 'instapay' | 'wallet' | 'bank' | 'main' | string;
export type InvoiceStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'delivered'
  | 'in_progress'
  | 'shipping'
  | 'ready'
  | 'pending'
  | 'new'
  | string;
export type WorkOrderStatus = 'open' | 'completed' | 'cancelled';

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
  currency: string;
  currencySymbol: string;
  phoneLength: number;
}

// 1. Workshop & User Profile
export interface WorkshopProfile {
  id: string; // workshopId == uid
  workshopId?: string;
  tenantId?: string;
  ownerUid: string;
  email: string;
  brandName: string;
  artistName: string;
  gender: Gender;
  phoneNumber: string;
  country: string;
  callingCode?: string;
  currency: string;
  currencySymbol: string;
  selectedCrafts: string[]; // Craft IDs enabled by artisan e.g. ['macrame', 'crochet']
  defaultVatPercent: number; // default 14%
  commercialRegister?: string; // Optional
  taxCardNumber?: string; // Optional
  showTaxInfoOnInvoice: boolean;
  logoBase64?: string; // Artisan workshop logo (<=256px, <=150KB)
  logoUrl?: string;
  accountPasswordHash?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    store?: string;
    website?: string;
  };
  familyNickname?: string;
  welcomeShown?: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export function getDefaultFamilyNickname(artistName?: string, gender?: Gender): string {
  const firstName = (artistName || '').trim().split(/\s+/)[0] || (gender === 'female' ? 'فنانة' : 'فنان');
  return gender === 'female' ? `${firstName} الشمساوية` : `${firstName} الشمساوي`;
}

export type UserProfile = WorkshopProfile;

// 2. Treasuries (الخزن)
export interface TreasuryItem {
  id: string;
  workshopId: string;
  name: string;
  type: TreasuryType;
  balance: number;
  isMain: boolean;
  accountNumber?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface TreasuryTransaction {
  id: string;
  workshopId?: string;
  tenantId?: string;
  treasuryId?: string;
  treasuryName?: string;
  safeType?: string;
  type:
    | 'deposit'
    | 'withdrawal'
    | 'transfer_in'
    | 'transfer_out'
    | 'invoice_payment'
    | 'expense'
    | 'salary_payout'
    | 'supplier_payment'
    | 'advance_payout'
    | 'customer_refund'
    | 'expense_payroll'
    | 'expense_admin'
    | string;
  amount: number;
  balanceAfter: number;
  relatedTreasuryId?: string;
  relatedTreasuryName?: string;
  referenceType?: 'invoice' | 'supplier_invoice' | 'expense' | 'payroll' | 'transfer' | 'advance' | string;
  referenceId?: string;
  description?: string;
  notes: string;
  date: string;
  createdAt: number;
  createdBy: string;
}

// 3. Revenues & Expenses
export interface ExpenseItem {
  id: string;
  workshopId?: string;
  tenantId?: string;
  safeType?: string;
  month?: string;
  paymentDate?: string;
  category: 'admin_costs' | 'transport' | 'marketing' | 'maintenance' | 'other' | string;
  categoryNameAr?: string;
  title: string;
  amount: number;
  treasuryId?: string;
  treasuryName?: string;
  adminDetails?: {
    rent: number;
    water: number;
    electricity: number;
    officeFees: number;
  };
  periodId?: string;
  notes?: string;
  date?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface RevenueItem {
  id: string;
  workshopId: string;
  category: 'sales' | 'consultation' | 'training' | 'other';
  title: string;
  amount: number;
  treasuryId: string;
  treasuryName: string;
  invoiceId?: string;
  periodId?: string;
  notes: string;
  date: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// 4. Customers & Customer Invoices
export interface CustomerRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  city?: string;
  address?: string;
  totalInvoiced?: number;
  totalPaid?: number;
  totalReturned?: number;
  totalPurchases?: number;
  outstandingBalance?: number;
  currentBalance?: number; // positive = عليه مطلوب منه, negative = له رصيد عندنا
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface InvoiceLineItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  craftId?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  unitCostCalculated?: number;
}

export interface InvoicePaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  treasuryId: string;
  treasuryName: string;
  notes?: string;
  createdAt: number;
}

export interface InvoiceReturnRecord {
  id: string;
  date: string;
  items: Array<{
    lineItemId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  refundMethod: 'credit_balance' | 'treasury_refund';
  treasuryId?: string;
  treasuryName?: string;
  notes?: string;
  createdAt: number;
}

export interface InvoiceRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  invoiceNumber?: string; // INV-0001
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  productName?: string;
  items?: InvoiceLineItem[];
  subtotal?: number;
  discount?: number;
  shipping?: number;
  vatEnabled?: boolean;
  vatPercent?: number; // 14%
  vatAmount?: number;
  returnsTotal?: number;
  totalAmount?: number;
  finalTotal?: number;
  paidAmount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  status?: InvoiceStatus;
  deliveryDate?: string;
  depositPhases?: any;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedEmployeeWage?: number;
  safeType?: string;
  price?: number;
  totalItemsPrice?: number;
  shippingCost?: number;
  paymentStatus?: string;
  paymentMethod?: PaymentMethod | string;
  payments?: InvoicePaymentRecord[];
  returns?: InvoiceReturnRecord[];
  periodId?: string;
  isLocked?: boolean;
  notes?: string;
  date?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

// 5. Suppliers & Supplier Invoices
export interface SupplierRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  name?: string;
  companyName?: string;
  supplierName?: string;
  phone?: string;
  phoneNumber?: string;
  contactNumber?: string;
  materialSpecialty?: string;
  materialType?: string;
  address?: string;
  totalInvoiced?: number;
  totalPaid?: number;
  totalPurchases?: number;
  outstandingBalance?: number;
  currentBalance?: number; // positive = له مطلوب منك, negative = عليه دفعت له زيادة
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface SupplierInvoiceItem {
  id?: string;
  materialId?: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface SupplierInvoiceRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  safeType?: string;
  invoiceNumber: string; // SUP-0001
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  items: SupplierInvoiceItem[];
  subtotal?: number;
  shipping?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status?: InvoiceStatus;
  paymentMethod?: PaymentMethod | string;
  payments?: InvoicePaymentRecord[];
  periodId?: string;
  isLocked?: boolean;
  notes?: string;
  date: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

// 6. Warehouses & Stock Movements
export interface WarehouseRecord {
  id: 'materials' | 'products';
  workshopId: string;
  name: string;
  type: 'raw_materials' | 'finished_products';
  totalValue: number;
  itemCount: number;
}

export interface RawMaterialItem {
  id: string;
  workshopId?: string;
  tenantId?: string;
  supplierId?: string;
  materialName: string;
  category: string;
  unit: string;
  currentStock: number;
  costPerUnit: number; // Weighted Average Cost
  costPerGram: number;
  supplierName?: string;
  warehouseLocation?: string;
  lastPurchaseDate?: string;
  minAlertThreshold: number; // حد الطلب الأدنى
  reorderLevel?: number;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface FinishedProductItem {
  id: string;
  workshopId: string;
  productName: string;
  craftId: string;
  category: string;
  currentStock: number;
  costPerUnit: number; // COGS
  sellingPrice: number;
  productImageUrl?: string;
  minAlertThreshold: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export type StockMovementType =
  | 'purchase'
  | 'purchase_in'
  | 'work_order_pull'
  | 'work_order_return'
  | 'production'
  | 'production_out'
  | 'sale'
  | 'customer_return'
  | 'waste'
  | 'audit_adjustment'
  | string;

export interface StockMovementRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  warehouseId?: 'materials' | 'products';
  itemId: string;
  itemName?: string;
  materialName?: string;
  type: StockMovementType;
  typeNameAr?: string;
  quantity: number;
  direction?: 'in' | 'out';
  balanceAfter?: number;
  unitCost: number;
  totalCost?: number;
  totalValuation?: number;
  referenceType?: 'work_order' | 'invoice' | 'supplier_invoice' | 'audit' | string;
  referenceId?: string;
  notes: string;
  date: string;
  createdAt?: number;
  createdBy?: string;
}

// 7. Work Orders (أوامر التشغيل)
export interface WorkOrderRecord {
  id: string;
  workshopId: string;
  orderNumber: string; // WO-0001
  productName: string;
  craftId: string;
  category: string;
  targetQuantity: number;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedEmployeeWage?: number;
  status: WorkOrderStatus;
  pulledMaterials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    unit: string;
  }>;
  returnedMaterials: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    unit: string;
  }>;
  finishedProductsProduced: number;
  scrapItems: Array<{
    materialId: string;
    materialName: string;
    wasteQty: number;
    wasteCost: number;
    unit: string;
  }>;
  totalConsumedMaterialsCost: number;
  totalLaborCost: number;
  totalProductionCost: number;
  unitCostCalculated: number;
  closingNotes?: string;
  notes?: string;
  startDate: string;
  completedDate?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// 8. Human Resources (HR & Payroll)
export interface EmployeeProfile {
  id: string;
  workshopId?: string;
  tenantId?: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  role?: string;
  specialty?: string;
  tier?: string;
  hireDate?: string;
  paymentType: EmployeePaymentType;
  pieceRatePercentage?: number;
  baseWage?: number;
  baseSalary?: number;
  currentAdvanceBalance?: number;
  totalEarned?: number;
  totalPaid?: number;
  currentBalance?: number;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface EmployeeAdvanceRecord {
  id: string;
  workshopId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  treasuryId: string;
  treasuryName: string;
  repaymentInstallmentsCount: number;
  monthlyDeduction: number;
  remainingBalance: number;
  notes: string;
  date: string;
  createdAt: number;
  createdBy: string;
}

export interface PayrollRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  employeeId: string;
  employeeName: string;
  monthYear?: string; // 'YYYY-MM'
  baseWage?: number;
  overtime?: number;
  bonuses?: number;
  deductions?: number;
  advanceRepayment?: number;
  netSalary?: number;
  paidAmount?: number;
  remainingAmount?: number;
  status?: 'unpaid' | 'partially_paid' | 'paid';
  payouts?: Array<{
    id: string;
    date: string;
    amount: number;
    method: PaymentMethod;
    treasuryId: string;
    treasuryName: string;
    notes?: string;
  }>;
  periodId?: string;
  isLocked?: boolean;
  amount?: number;
  type?: string;
  date?: string;
  safeType?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  registeredAsOperatingExpense?: boolean;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

// 9. Periods & Closing (الفترات المحاسبية وقفل الشهر)
export interface AccountingPeriodRecord {
  id: string; // 'YYYY-MM'
  workshopId: string;
  periodName: string;
  isClosed: boolean;
  closedAt?: number;
  closedBy?: string;
  reopenedAt?: number;
  reopenedReason?: string;
  summary: {
    salesTotal: number;
    cogsTotal: number;
    grossProfit: number;
    expensesTotal: number;
    wagesTotal: number;
    netProfit: number;
    isProfit: boolean;
    invoicesCount: number;
    workOrdersCount: number;
  };
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// 10. Audit / Activity Logs
export interface ActivityLogItem {
  id: string;
  workshopId?: string;
  tenantId?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userEmail: string;
  reason?: string;
  timestamp: number;
  details?: string;
  authorizedByPassword?: boolean;
}

// 11. Notifications
export interface NotificationItem {
  id: string;
  workshopId?: string;
  tenantId?: string;
  type:
    | 'stock_depletion'
    | 'upcoming_delivery'
    | 'upcoming_deposit'
    | 'overdue_deposit'
    | 'milestone_usage'
    | 'milestone_sales'
    | 'system'
    | string;
  title: string;
  message: string;
  isRead: boolean;
  relatedItemId?: string;
  relatedOrderId?: string;
  createdAt: number;
}

// 12. Macramé & Calculator Core Types
export interface CordTypeOption {
  id: string;
  name: string;
  defaultPricePerKg: number;
  densityFactor: number;
  defaultThicknessMm: number;
}

export interface ExtraMaterialRow {
  id: string;
  materialDbId?: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  totalCost: number;
}

export interface CalculationInput {
  category: CraftCategory;
  productName: string;
  shape3D: Shape3DType;
  widthCm: number;
  diameterCm: number;
  baseDiameterCm: number;
  sideHeightCm: number;
  totalLengthCm: number;
  fringeLengthCm: number;
  cordTypeId: string;
  cordThicknessMm: number;
  pricePerKg: number;
  curtainRodCost: number;
  cushionCoverCost: number;
  fiberCost: number;
  bagAccessoriesCost: number;
  extraMaterials: ExtraMaterialRow[];
  laborWage: number;
  assignedEmployeeId?: string;
  packagingCost: number;
  transitFees: number;
  adminExpensesShare: number;
  profitMarginPercent: number;
  manualOverrideStrands?: number;
  manualOverrideStrandLength?: number;
  manualOverrideTotalWeightKg?: number;
  personalNotes: string;
  productImageUrl?: string;
}

export interface CalculationOutput {
  baseStrandsCount: number;
  workingCordsCount: number;
  singleStrandLengthCm: number;
  totalYarnLengthMeters: number;
  totalWeightKg: number;
  totalWeightGrams: number;
  yarnCost: number;
  extraMaterialsTotalCost: number;
  totalDirectMaterialsCost: number;
  insulatedProfitAmount: number;
  laborWage: number;
  packagingCost: number;
  transitFees: number;
  adminExpensesShare: number;
  finalSellingPrice: number;
  isOverridden: {
    strands: boolean;
    strandLength: boolean;
    weight: boolean;
  };
}

export interface SavedProductRecord {
  id: string;
  workshopId?: string;
  tenantId?: string;
  productName: string;
  craftId?: string;
  category: CraftCategory | string;
  input: CalculationInput;
  output: CalculationOutput;
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type InventoryStockItem = RawMaterialItem;

// Compatibility aliases for legacy Dexie and sub-views
export type ExpenseRecord = ExpenseItem;
export type AdminCostRecord = ExpenseItem;
export type CustomerProfile = CustomerRecord;
export type CustomerOrder = InvoiceRecord;
export type OrderLineItem = InvoiceLineItem;
export type SupplierProfile = SupplierRecord;
export type SupplierPurchaseInvoice = SupplierInvoiceRecord;
export type SafeType = TreasuryType;
export type SafeTransaction = TreasuryTransaction;
export type InventoryTransaction = StockMovementRecord;
export type EmployeePayoutRecord = PayrollRecord;
export type SystemActivityLog = ActivityLogItem;
export type AuthUserRecord = {
  id: string;
  email: string;
  name?: string;
  passwordHash?: string;
  brandName?: string;
  artistName?: string;
  workshopId?: string;
  tenantId?: string;
  role?: string;
  createdAt?: number;
};

export interface ChatMessage {
  id: string;
  sender: 'user' | 'falcon' | string;
  text: string;
  timestamp: number;
  actionChip?: string;
}

export interface AIVisionAnalysis {
  modelDetectedName?: string;
  complexityLevel?: string;
  yarnType?: string;
  totalWeightGrams?: number;
  estWorkHours?: number;
  competitionPricing?: {
    minMarketPrice?: number;
    recommendedFairPrice?: number;
    maxMarketPrice?: number;
    avgMarketPrice?: number;
    [key: string]: any;
  };
  stitchPatterns: string[];
  productionGuide: string[];
  svgSchematic?: string;
  [key: string]: any;
}
