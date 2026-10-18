import { describe, it, expect } from 'vitest';
import {
  calculateWeightedAverageCost,
  calculateInvoiceTotals,
  determineInvoiceStatus,
  calculateCustomerBalance,
  calculateSupplierBalance,
  calculateNetSalary,
  determineSalaryPayoutStatus,
  calculateProfitAndLoss,
  calculateStockAdjustment,
  calculateWorkOrderWaste,
} from './accounting';

describe('1. Weighted Average Cost (WAC) Tests - متوسط التكلفة المرجح', () => {
  it('1. Calculates WAC correctly when adding to existing inventory', () => {
    // 10 units at 50 EGP + 10 units at 70 EGP = 20 units at 60 EGP
    const wac = calculateWeightedAverageCost(10, 50, 10, 70);
    expect(wac).toBe(60);
  });

  it('2. Calculates WAC when initial stock is zero', () => {
    const wac = calculateWeightedAverageCost(0, 0, 5, 120);
    expect(wac).toBe(120);
  });

  it('3. Handles zero purchase quantity gracefully', () => {
    const wac = calculateWeightedAverageCost(15, 80, 0, 100);
    expect(wac).toBe(80);
  });

  it('4. Handles fractional weights and decimal prices accurately', () => {
    // 2.5 kg at 180 EGP + 5 kg at 210 EGP = (450 + 1050) / 7.5 = 200 EGP
    const wac = calculateWeightedAverageCost(2.5, 180, 5, 210);
    expect(wac).toBe(200);
  });
});

describe('2. Invoice Totals & VAT Tests - إجماليات الفاتورة والضريبة', () => {
  it('5. Computes basic invoice totals with discount and shipping', () => {
    const result = calculateInvoiceTotals(1000, 100, 50, false, 14);
    expect(result.subtotalAfterDiscount).toBe(900);
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(950);
  });

  it('6. Calculates 14% VAT only on discounted subtotal when enabled', () => {
    // Subtotal 1000, Discount 200 => 800. 14% of 800 = 112. Shipping 50 => Total 962.
    const result = calculateInvoiceTotals(1000, 200, 50, true, 14);
    expect(result.vatAmount).toBe(112);
    expect(result.totalAmount).toBe(962);
  });

  it('7. Deducts returned items amount from final total', () => {
    // Subtotal 500, no discount, no VAT, returns 150 => Total 350
    const result = calculateInvoiceTotals(500, 0, 0, false, 14, 150);
    expect(result.returnsTotal).toBe(150);
    expect(result.totalAmount).toBe(350);
  });

  it('8. Ensures discount does not exceed subtotal', () => {
    const result = calculateInvoiceTotals(300, 500, 0, false, 14);
    expect(result.discount).toBe(300);
    expect(result.subtotalAfterDiscount).toBe(0);
  });
});

describe('3. Invoice Status Tests - حالة الفاتورة', () => {
  it('9. Identifies unpaid invoice when 0 is paid', () => {
    expect(determineInvoiceStatus(1000, 0)).toBe('unpaid');
  });

  it('10. Identifies partially paid invoice when payment is less than total', () => {
    expect(determineInvoiceStatus(1000, 450)).toBe('partially_paid');
  });

  it('11. Identifies paid invoice when exact amount is received', () => {
    expect(determineInvoiceStatus(1000, 1000)).toBe('paid');
  });

  it('12. Identifies paid invoice when zero total is passed', () => {
    expect(determineInvoiceStatus(0, 0)).toBe('paid');
  });
});

describe('4. Customer Balance Tests - أرصدة العملاء (عليه / له)', () => {
  it('13. Correctly shows "عليه X" (مطلوب منه) when invoice remains unpaid', () => {
    const res = calculateCustomerBalance(1500, 500);
    expect(res.isDebtor).toBe(true);
    expect(res.isCreditor).toBe(false);
    expect(res.amount).toBe(1000);
    expect(res.statusText).toBe('عليه 1000');
  });

  it('14. Correctly shows "له X" (رصيد زيادة له عندنا) when customer overpays', () => {
    const res = calculateCustomerBalance(500, 700);
    expect(res.isDebtor).toBe(false);
    expect(res.isCreditor).toBe(true);
    expect(res.amount).toBe(200);
    expect(res.statusText).toBe('له 200');
  });

  it('15. Correctly accounts for customer returns reducing debt', () => {
    // Invoiced 1000, Paid 400, Returned 600 => Net due 400 - paid 400 = 0
    const res = calculateCustomerBalance(1000, 400, 600);
    expect(res.isSettled).toBe(true);
    expect(res.amount).toBe(0);
  });
});

describe('5. Supplier Balance Tests - أرصدة الموردين (له / عليه)', () => {
  it('16. Shows "له X" (مطلوب منك) when supplier invoices are unpaid', () => {
    const res = calculateSupplierBalance(3000, 1000);
    expect(res.isPayable).toBe(true);
    expect(res.amount).toBe(2000);
    expect(res.statusText).toBe('له 2000');
  });

  it('17. Shows "عليه X" (دفعت له زيادة) when we paid an advance exceeding invoices', () => {
    const res = calculateSupplierBalance(2000, 2500);
    expect(res.isAdvance).toBe(true);
    expect(res.amount).toBe(500);
    expect(res.statusText).toBe('عليه 500');
  });
});

describe('6. Net Salary & Payout Tests - الرواتب والأجور', () => {
  it('18. Calculates net salary with overtime, bonus, deductions, and loan repayment', () => {
    // Base 5000 + OT 500 + Bonus 300 - Ded 200 - Advance 600 = 5000
    const net = calculateNetSalary(5000, 500, 300, 200, 600);
    expect(net).toBe(5000);
  });

  it('19. Determines salary payout status when partially paid', () => {
    const status = determineSalaryPayoutStatus(5000, 3000);
    expect(status.status).toBe('partially_paid');
    expect(status.remaining).toBe(2000);
    expect(status.statusText).toContain('صُرف جزئياً');
  });

  it('20. Determines salary payout status when fully paid', () => {
    const status = determineSalaryPayoutStatus(5000, 5000);
    expect(status.status).toBe('paid');
    expect(status.remaining).toBe(0);
    expect(status.statusText).toBe('تم الصرف بالكامل');
  });
});

describe('7. Profit & Loss Tests - الأرباح والخسائر', () => {
  it('21. Computes gross and net profit accurately', () => {
    // Rev: 20000, COGS: 8000 => Gross 12000. Expenses 3000, Wages 4000 => Net 5000
    const pnl = calculateProfitAndLoss(20000, 8000, 3000, 4000);
    expect(pnl.grossProfit).toBe(12000);
    expect(pnl.grossMarginPercent).toBe(60);
    expect(pnl.netProfit).toBe(5000);
    expect(pnl.netMarginPercent).toBe(25);
    expect(pnl.isProfit).toBe(true);
  });

  it('22. Handles net loss scenario when overhead exceeds gross profit', () => {
    const pnl = calculateProfitAndLoss(10000, 6000, 3000, 2500);
    expect(pnl.grossProfit).toBe(4000);
    expect(pnl.netProfit).toBe(-1500);
    expect(pnl.isProfit).toBe(false);
  });
});

describe('8. Stock Adjustment & Scrap Tests - المخازن وهالك التشغيل', () => {
  it('23. Prevents negative stock when dispatching more than available', () => {
    const res = calculateStockAdjustment(5, 'out', 8);
    expect(res.error).toBeDefined();
    expect(res.newStock).toBe(5);
  });

  it('24. Calculates work order actual consumption and scrap cost', () => {
    // Pulled 10 kg, returned 2 kg => actual used 8 kg. Expected 6.5 kg => scrap 1.5 kg at 100 EGP = 150 EGP
    const waste = calculateWorkOrderWaste(10, 2, 6.5, 100);
    expect(waste.actualConsumedQty).toBe(8);
    expect(waste.wasteQty).toBe(1.5);
    expect(waste.wasteCost).toBe(150);
  });
});
