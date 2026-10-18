/**
 * Al-Shams Craft ERP - Pure Accounting & Business Math Engine
 * Independent pure functions tested thoroughly with Vitest
 */

/**
 * 1. حساب متوسط التكلفة المرجح (Weighted Average Cost - WAC)
 * يُستخدم عند شراء خامات جديدة وإضافتها للمخزن لتسعير المخزون كأصل
 */
export function calculateWeightedAverageCost(
  currentStock: number,
  currentWac: number,
  purchasedQty: number,
  purchaseUnitPrice: number
): number {
  const validCurrentStock = Math.max(0, Number(currentStock) || 0);
  const validCurrentWac = Math.max(0, Number(currentWac) || 0);
  const validPurchasedQty = Math.max(0, Number(purchasedQty) || 0);
  const validUnitPrice = Math.max(0, Number(purchaseUnitPrice) || 0);

  const totalQty = validCurrentStock + validPurchasedQty;
  if (totalQty <= 0) return 0;

  const totalValuation = validCurrentStock * validCurrentWac + validPurchasedQty * validUnitPrice;
  const newWac = totalValuation / totalQty;
  // Round to 3 decimal places for precision
  return Math.round(newWac * 1000) / 1000;
}

/**
 * 2. احتساب إجماليات الفاتورة مع الخصم والشحن وضريبة القيمة المضافة والمرتجعات
 */
export interface InvoiceCalculationResult {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  shipping: number;
  vatAmount: number;
  returnsTotal: number;
  totalAmount: number;
}

export function calculateInvoiceTotals(
  subtotal: number,
  discount: number,
  shipping: number,
  vatEnabled: boolean,
  vatPercent: number,
  returnsTotal: number = 0
): InvoiceCalculationResult {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const safeDiscount = Math.min(safeSubtotal, Math.max(0, Number(discount) || 0));
  const subtotalAfterDiscount = safeSubtotal - safeDiscount;
  const safeShipping = Math.max(0, Number(shipping) || 0);
  const safeReturns = Math.max(0, Number(returnsTotal) || 0);

  let vatAmount = 0;
  if (vatEnabled) {
    const rate = Math.max(0, Number(vatPercent) || 0) / 100;
    vatAmount = Math.round(subtotalAfterDiscount * rate * 100) / 100;
  }

  const grossTotal = subtotalAfterDiscount + safeShipping + vatAmount;
  const netTotal = Math.max(0, Math.round((grossTotal - safeReturns) * 100) / 100);

  return {
    subtotal: safeSubtotal,
    discount: safeDiscount,
    subtotalAfterDiscount,
    shipping: safeShipping,
    vatAmount,
    returnsTotal: safeReturns,
    totalAmount: netTotal,
  };
}

/**
 * 3. تحديد حالة الفاتورة (غير مدفوعة / مدفوعة جزئياً / مدفوعة)
 */
export type InvoicePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export function determineInvoiceStatus(
  totalAmount: number,
  paidAmount: number
): InvoicePaymentStatus {
  const total = Math.max(0, Number(totalAmount) || 0);
  const paid = Math.max(0, Number(paidAmount) || 0);

  if (total <= 0) return 'paid';
  if (paid <= 0) return 'unpaid';
  if (paid >= total - 0.009) return 'paid';
  return 'partially_paid';
}

/**
 * 4. رصيد العميل:
 * "عليه X" (مطلوب منه) / "له X" (رصيد زيادة له عندنا)
 */
export interface CustomerBalanceResult {
  rawBalance: number; // positive = عليه, negative = له
  amount: number;
  statusText: string;
  isDebtor: boolean; // مطلوب منه
  isCreditor: boolean; // له رصيد زائد
  isSettled: boolean; // خالص
}

export function calculateCustomerBalance(
  invoicesTotal: number,
  paymentsTotal: number,
  returnsTotal: number = 0
): CustomerBalanceResult {
  const invoices = Math.max(0, Number(invoicesTotal) || 0);
  const payments = Math.max(0, Number(paymentsTotal) || 0);
  const returns = Math.max(0, Number(returnsTotal) || 0);

  // الرصيد = إجمالي الفواتير - المرتجعات - المدفوعات
  const netDue = invoices - returns;
  const diff = Math.round((netDue - payments) * 100) / 100;

  if (Math.abs(diff) < 0.01) {
    return {
      rawBalance: 0,
      amount: 0,
      statusText: 'خالص (لا يوجد مستحقات)',
      isDebtor: false,
      isCreditor: false,
      isSettled: true,
    };
  }

  if (diff > 0) {
    return {
      rawBalance: diff,
      amount: diff,
      statusText: `عليه ${diff}`,
      isDebtor: true,
      isCreditor: false,
      isSettled: false,
    };
  }

  const excess = Math.abs(diff);
  return {
    rawBalance: diff,
    amount: excess,
    statusText: `له ${excess}`,
    isDebtor: false,
    isCreditor: true,
    isSettled: false,
  };
}

/**
 * 5. رصيد المورد:
 * "له X" (مطلوب منك) / "عليه X" (دفعت له زيادة)
 */
export interface SupplierBalanceResult {
  rawBalance: number; // positive = له مطلوب منك, negative = عليه دفعت له زيادة
  amount: number;
  statusText: string;
  isPayable: boolean; // له مطلوب منا سداده
  isAdvance: boolean; // دفعنا له بالزيادة
  isSettled: boolean;
}

export function calculateSupplierBalance(
  supplierInvoicesTotal: number,
  paymentsTotal: number
): SupplierBalanceResult {
  const invoices = Math.max(0, Number(supplierInvoicesTotal) || 0);
  const payments = Math.max(0, Number(paymentsTotal) || 0);

  // الرصيد = فواتير المورد - ما سددناه له
  const diff = Math.round((invoices - payments) * 100) / 100;

  if (Math.abs(diff) < 0.01) {
    return {
      rawBalance: 0,
      amount: 0,
      statusText: 'خالص (لا توجد مستحقات للمورد)',
      isPayable: false,
      isAdvance: false,
      isSettled: true,
    };
  }

  if (diff > 0) {
    return {
      rawBalance: diff,
      amount: diff,
      statusText: `له ${diff}`,
      isPayable: true,
      isAdvance: false,
      isSettled: false,
    };
  }

  const excess = Math.abs(diff);
  return {
    rawBalance: diff,
    amount: excess,
    statusText: `عليه ${excess}`,
    isPayable: false,
    isAdvance: true,
    isSettled: false,
  };
}

/**
 * 6. احتساب صافي الراتب الشهري:
 * أساسي + إضافي + حوافز − خصومات − سلف مستردة = الصافي المستحق
 */
export function calculateNetSalary(
  baseWage: number,
  overtime: number,
  bonuses: number,
  deductions: number,
  advanceRepayment: number
): number {
  const base = Math.max(0, Number(baseWage) || 0);
  const ot = Math.max(0, Number(overtime) || 0);
  const bon = Math.max(0, Number(bonuses) || 0);
  const ded = Math.max(0, Number(deductions) || 0);
  const adv = Math.max(0, Number(advanceRepayment) || 0);

  const earnings = base + ot + bon;
  const cuts = ded + adv;
  const net = earnings - cuts;
  return Math.max(0, Math.round(net * 100) / 100);
}

/**
 * 7. تحديد حالة صرف الراتب (لم يُصرف / صُرف جزئياً — متبقي X / تم الصرف)
 */
export interface SalaryPayoutStatus {
  status: 'unpaid' | 'partially_paid' | 'paid';
  statusText: string;
  remaining: number;
}

export function determineSalaryPayoutStatus(
  netSalary: number,
  paidAmount: number
): SalaryPayoutStatus {
  const net = Math.max(0, Number(netSalary) || 0);
  const paid = Math.max(0, Number(paidAmount) || 0);
  const remaining = Math.max(0, Math.round((net - paid) * 100) / 100);

  if (net <= 0 || remaining <= 0.009) {
    return {
      status: 'paid',
      statusText: 'تم الصرف بالكامل',
      remaining: 0,
    };
  }

  if (paid <= 0) {
    return {
      status: 'unpaid',
      statusText: 'لم يُصرف',
      remaining: net,
    };
  }

  return {
    status: 'partially_paid',
    statusText: `صُرف جزئياً — متبقي ${remaining}`,
    remaining,
  };
}

/**
 * 8. احتساب الأرباح والخسائر:
 * مجمل الربح = الإيرادات - تكلفة البضاعة المباعة (COGS)
 * صافي الربح = مجمل الربح - المصروفات الإدارية والتشغيلية - الأجور المدفوعة
 */
export interface ProfitAndLossResult {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: number;
  wages: number;
  netProfit: number;
  netMarginPercent: number;
  isProfit: boolean;
}

export function calculateProfitAndLoss(
  revenue: number,
  cogs: number,
  expenses: number,
  wages: number
): ProfitAndLossResult {
  const rev = Math.max(0, Number(revenue) || 0);
  const cost = Math.max(0, Number(cogs) || 0);
  const exp = Math.max(0, Number(expenses) || 0);
  const w = Math.max(0, Number(wages) || 0);

  const grossProfit = Math.round((rev - cost) * 100) / 100;
  const grossMarginPercent = rev > 0 ? Math.round((grossProfit / rev) * 1000) / 10 : 0;

  const totalOverhead = exp + w;
  const netProfit = Math.round((grossProfit - totalOverhead) * 100) / 100;
  const netMarginPercent = rev > 0 ? Math.round((netProfit / rev) * 1000) / 10 : 0;

  return {
    revenue: rev,
    cogs: cost,
    grossProfit,
    grossMarginPercent,
    expenses: exp,
    wages: w,
    netProfit,
    netMarginPercent,
    isProfit: netProfit >= 0,
  };
}

/**
 * 9. تسوية المخزون ومنع الرصيد السالب (Negative Stock Prevention)
 */
export function calculateStockAdjustment(
  currentStock: number,
  direction: 'in' | 'out',
  quantity: number
): { newStock: number; error?: string } {
  const current = Number(currentStock) || 0;
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return { newStock: current, error: 'الكمية يجب أن تكون أكبر من الصفر' };
  }

  if (direction === 'in') {
    return { newStock: Math.round((current + qty) * 1000) / 1000 };
  }

  if (current - qty < -0.0001) {
    return {
      newStock: current,
      error: `الرصيد المتاح بالمخزن (${current}) غير كافٍ لصرف كمية (${qty})، يُمنع الرصيد السالب.`,
    };
  }

  return { newStock: Math.max(0, Math.round((current - qty) * 1000) / 1000) };
}

/**
 * 10. حساب هالك الخامات في أمر التشغيل (Scrap & Waste Calculation)
 */
export interface WorkOrderMaterialConsumption {
  materialId: string;
  materialName: string;
  pulledQty: number;
  returnedQty: number;
  unitCost: number;
}

export interface WorkOrderWasteSummary {
  materialId: string;
  materialName: string;
  actualUsedQty: number;
  wasteQty: number;
  wasteCost: number;
}

export function calculateWorkOrderWaste(
  pulledQty: number,
  returnedQty: number,
  standardExpectedQty: number,
  unitCost: number
): { actualConsumedQty: number; wasteQty: number; wasteCost: number } {
  const pulled = Math.max(0, Number(pulledQty) || 0);
  const returned = Math.max(0, Number(returnedQty) || 0);
  const expected = Math.max(0, Number(standardExpectedQty) || 0);
  const cost = Math.max(0, Number(unitCost) || 0);

  const actualConsumed = Math.max(0, pulled - returned);
  const wasteQty = Math.max(0, Math.round((actualConsumed - expected) * 1000) / 1000);
  const wasteCost = Math.round(wasteQty * cost * 100) / 100;

  return {
    actualConsumedQty: Math.round(actualConsumed * 1000) / 1000,
    wasteQty,
    wasteCost,
  };
}
