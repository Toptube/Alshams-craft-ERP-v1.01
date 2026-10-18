import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  WorkshopProfile,
  TreasuryItem,
  TreasuryTransaction,
  ExpenseItem,
  RevenueItem,
  CustomerRecord,
  InvoiceRecord,
  InvoicePaymentRecord,
  InvoiceReturnRecord,
  SupplierRecord,
  SupplierInvoiceRecord,
  RawMaterialItem,
  FinishedProductItem,
  StockMovementRecord,
  WorkOrderRecord,
  EmployeeProfile,
  EmployeeAdvanceRecord,
  PayrollRecord,
  AccountingPeriodRecord,
  ActivityLogItem,
  NotificationItem,
} from '../types';
import {
  calculateWeightedAverageCost,
  determineInvoiceStatus,
  calculateCustomerBalance,
  calculateSupplierBalance,
  determineSalaryPayoutStatus,
  calculateStockAdjustment,
} from '../lib/accounting';
import { tenantStorage as localDexieStorage } from './dexieDB';

/**
 * Multi-tenant Firestore Path Helper:
 * workshops/{workshopId}/{subcollection}/{docId}
 */
const getColRef = (workshopId: string, subcollection: string) => {
  return collection(db, 'workshops', workshopId, subcollection);
};

const getDocRef = (workshopId: string, subcollection: string, docId: string) => {
  return doc(db, 'workshops', workshopId, subcollection, docId);
};

export const firestoreService = {
  // ==========================================
  // 1. WORKSHOP & ONBOARDING
  // ==========================================
  async getWorkshop(workshopId: string): Promise<WorkshopProfile | null> {
    const docRef = doc(db, 'workshops', workshopId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as WorkshopProfile;
  },

  async setWorkshop(profile: WorkshopProfile): Promise<void> {
    const docRef = doc(db, 'workshops', profile.id);
    await setDoc(
      docRef,
      {
        ...profile,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  async ensureDefaultTreasuries(workshopId: string, userEmail: string): Promise<void> {
    const colRef = getColRef(workshopId, 'treasuries');
    const snap = await getDocs(colRef);
    if (!snap.empty) return;

    const defaults: Array<Omit<TreasuryItem, 'id'>> = [
      {
        workshopId,
        name: 'الخزنة الرئيسية (كاش)',
        type: 'cash',
        balance: 0,
        isMain: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userEmail,
      },
      {
        workshopId,
        name: 'إنستاباي (InstaPay)',
        type: 'instapay',
        balance: 0,
        isMain: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userEmail,
      },
      {
        workshopId,
        name: 'محفظة إلكترونية (فودافون كاش)',
        type: 'wallet',
        balance: 0,
        isMain: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userEmail,
      },
    ];

    const batch = writeBatch(db);
    for (const t of defaults) {
      const id = 'tr_' + Math.random().toString(36).substring(2, 9);
      batch.set(getDocRef(workshopId, 'treasuries', id), { ...t, id });
    }
    await batch.commit();
  },

  async ensureDefaultWarehouses(workshopId: string): Promise<void> {
    const matRef = getDocRef(workshopId, 'warehouses', 'materials');
    const prodRef = getDocRef(workshopId, 'warehouses', 'products');

    const snap = await getDoc(matRef);
    if (!snap.exists()) {
      await setDoc(matRef, {
        id: 'materials',
        workshopId,
        name: 'مخزن الخامات',
        type: 'raw_materials',
        totalValue: 0,
        itemCount: 0,
      });
    }

    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) {
      await setDoc(prodRef, {
        id: 'products',
        workshopId,
        name: 'مخزن المنتجات',
        type: 'finished_products',
        totalValue: 0,
        itemCount: 0,
      });
    }
  },

  // ==========================================
  // 2. TREASURIES (الخزن)
  // ==========================================
  async getTreasuries(workshopId: string): Promise<TreasuryItem[]> {
    const colRef = getColRef(workshopId, 'treasuries');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as TreasuryItem);
  },

  async saveTreasury(workshopId: string, item: TreasuryItem): Promise<void> {
    const docRef = getDocRef(workshopId, 'treasuries', item.id);
    await setDoc(docRef, { ...item, updatedAt: Date.now() }, { merge: true });
  },

  async getTreasuryTransactions(
    workshopId: string,
    treasuryId?: string
  ): Promise<TreasuryTransaction[]> {
    const colRef = getColRef(workshopId, 'treasuryTransactions');
    const q = treasuryId
      ? query(colRef, where('treasuryId', '==', treasuryId))
      : colRef;
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TreasuryTransaction);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * تحويل فوري بين خزينتين داخل Transaction موحدة
   */
  async transferBetweenTreasuries(
    workshopId: string,
    fromTreasuryId: string,
    toTreasuryId: string,
    amount: number,
    notes: string,
    userEmail: string
  ): Promise<void> {
    if (fromTreasuryId === toTreasuryId) {
      throw new Error('لا يمكن التحويل لنفس الخزنة');
    }
    if (amount <= 0) {
      throw new Error('مبلغ التحويل يجب أن يكون أكبر من الصفر');
    }

    const fromRef = getDocRef(workshopId, 'treasuries', fromTreasuryId);
    const toRef = getDocRef(workshopId, 'treasuries', toTreasuryId);

    await runTransaction(db, async (t) => {
      const fromSnap = await t.get(fromRef);
      const toSnap = await t.get(toRef);

      if (!fromSnap.exists() || !toSnap.exists()) {
        throw new Error('إحدى الخزائن غير موجودة');
      }

      const fromData = fromSnap.data() as TreasuryItem;
      const toData = toSnap.data() as TreasuryItem;

      if (fromData.balance < amount) {
        throw new Error(
          `رصيد خزنة "${fromData.name}" الحالي (${fromData.balance}) غير كافٍ لتحويل مبلغ (${amount})`
        );
      }

      const newFromBal = Math.round((fromData.balance - amount) * 100) / 100;
      const newToBal = Math.round((toData.balance + amount) * 100) / 100;

      t.update(fromRef, { balance: newFromBal, updatedAt: Date.now() });
      t.update(toRef, { balance: newToBal, updatedAt: Date.now() });

      const txOutId = 'tx_' + Date.now() + '_out';
      const txInId = 'tx_' + Date.now() + '_in';
      const today = new Date().toISOString().split('T')[0];

      const txOut: TreasuryTransaction = {
        id: txOutId,
        workshopId,
        treasuryId: fromTreasuryId,
        treasuryName: fromData.name,
        type: 'transfer_out',
        amount,
        balanceAfter: newFromBal,
        relatedTreasuryId: toTreasuryId,
        relatedTreasuryName: toData.name,
        referenceType: 'transfer',
        notes: notes || `تحويل صادم إلى ${toData.name}`,
        date: today,
        createdAt: Date.now(),
        createdBy: userEmail,
      };

      const txIn: TreasuryTransaction = {
        id: txInId,
        workshopId,
        treasuryId: toTreasuryId,
        treasuryName: toData.name,
        type: 'transfer_in',
        amount,
        balanceAfter: newToBal,
        relatedTreasuryId: fromTreasuryId,
        relatedTreasuryName: fromData.name,
        referenceType: 'transfer',
        notes: notes || `تحويل وارد من ${fromData.name}`,
        date: today,
        createdAt: Date.now() + 1,
        createdBy: userEmail,
      };

      t.set(getDocRef(workshopId, 'treasuryTransactions', txOutId), txOut);
      t.set(getDocRef(workshopId, 'treasuryTransactions', txInId), txIn);
    });
  },

  // ==========================================
  // 3. EXPENSES & REVENUES
  // ==========================================
  async getExpenses(workshopId: string): Promise<ExpenseItem[]> {
    const colRef = getColRef(workshopId, 'expenses');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as ExpenseItem);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async recordExpense(workshopId: string, expense: ExpenseItem): Promise<void> {
    const treasuryRef = getDocRef(workshopId, 'treasuries', expense.treasuryId || 'main');
    const expenseRef = getDocRef(workshopId, 'expenses', expense.id);

    await runTransaction(db, async (t) => {
      const trSnap = await t.get(treasuryRef);
      if (!trSnap.exists()) {
        throw new Error('الخزنة المحددة غير موجودة');
      }
      const trData = trSnap.data() as TreasuryItem;

      if (trData.balance < expense.amount) {
        throw new Error(
          `رصيد خزنة "${trData.name}" الحالي (${trData.balance}) أقل من قيمة المصروف (${expense.amount}). يُمنع السحب بالسالب.`
        );
      }

      const newBal = Math.round((trData.balance - expense.amount) * 100) / 100;
      t.update(treasuryRef, { balance: newBal, updatedAt: Date.now() });
      t.set(expenseRef, expense);

      const txId = 'tx_exp_' + expense.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: expense.treasuryId,
        treasuryName: trData.name,
        type: 'expense',
        amount: expense.amount,
        balanceAfter: newBal,
        referenceType: 'expense',
        referenceId: expense.id,
        notes: `${expense.categoryNameAr}: ${expense.title}`,
        date: expense.date,
        createdAt: Date.now(),
        createdBy: expense.createdBy,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);
    });
  },

  async getRevenues(workshopId: string): Promise<RevenueItem[]> {
    const colRef = getColRef(workshopId, 'revenues');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as RevenueItem);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async recordRevenue(workshopId: string, revenue: RevenueItem): Promise<void> {
    const treasuryRef = getDocRef(workshopId, 'treasuries', revenue.treasuryId);
    const revRef = getDocRef(workshopId, 'revenues', revenue.id);

    await runTransaction(db, async (t) => {
      const trSnap = await t.get(treasuryRef);
      if (!trSnap.exists()) {
        throw new Error('الخزنة المحددة غير موجودة');
      }
      const trData = trSnap.data() as TreasuryItem;
      const newBal = Math.round((trData.balance + revenue.amount) * 100) / 100;

      t.update(treasuryRef, { balance: newBal, updatedAt: Date.now() });
      t.set(revRef, revenue);

      const txId = 'tx_rev_' + revenue.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: revenue.treasuryId,
        treasuryName: trData.name,
        type: 'deposit',
        amount: revenue.amount,
        balanceAfter: newBal,
        referenceId: revenue.id,
        notes: `إيراد: ${revenue.title}`,
        date: revenue.date,
        createdAt: Date.now(),
        createdBy: revenue.createdBy,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);
    });
  },

  // ==========================================
  // 4. CUSTOMERS & INVOICES
  // ==========================================
  async getCustomers(workshopId: string): Promise<CustomerRecord[]> {
    const colRef = getColRef(workshopId, 'customers');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as CustomerRecord);
  },

  async saveCustomer(workshopId: string, customer: CustomerRecord): Promise<void> {
    const docRef = getDocRef(workshopId, 'customers', customer.id);
    await setDoc(docRef, { ...customer, updatedAt: Date.now() }, { merge: true });
  },

  async getInvoices(workshopId: string): Promise<InvoiceRecord[]> {
    const colRef = getColRef(workshopId, 'invoices');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as InvoiceRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getNextInvoiceNumber(workshopId: string): Promise<string> {
    const counterRef = getDocRef(workshopId, 'counters', 'invoices');
    let nextNum = 1;
    await runTransaction(db, async (t) => {
      const snap = await t.get(counterRef);
      if (snap.exists()) {
        nextNum = (snap.data().current || 0) + 1;
        t.update(counterRef, { current: nextNum, updatedAt: Date.now() });
      } else {
        t.set(counterRef, { current: 1, updatedAt: Date.now() });
      }
    });
    return `INV-${String(nextNum).padStart(4, '0')}`;
  },

  async saveInvoice(workshopId: string, invoice: InvoiceRecord): Promise<void> {
    const invRef = getDocRef(workshopId, 'invoices', invoice.id);
    const custRef = getDocRef(workshopId, 'customers', invoice.customerId || 'default');

    await runTransaction(db, async (t) => {
      const invSnap = await t.get(invRef);
      if (invSnap.exists() && invSnap.data().isLocked) {
        throw new Error('لا يمكن تعديل هذه الفاتورة لأنها تابعة لفترة محاسبية مقفلة.');
      }

      t.set(invRef, { ...invoice, updatedAt: Date.now() }, { merge: true });

      // Recalculate customer balance
      const custSnap = await t.get(custRef);
      if (custSnap.exists()) {
        const custData = custSnap.data() as CustomerRecord;
        // Adjust customer invoiced totals
        const oldInvoiceTotal = invSnap.exists() ? (invSnap.data() as InvoiceRecord).totalAmount : 0;
        const diff = invoice.totalAmount - oldInvoiceTotal;
        const newTotalInvoiced = Math.max(0, custData.totalInvoiced + diff);
        const balRes = calculateCustomerBalance(
          newTotalInvoiced,
          custData.totalPaid,
          custData.totalReturned
        );

        t.update(custRef, {
          totalInvoiced: newTotalInvoiced,
          currentBalance: balRes.rawBalance,
          updatedAt: Date.now(),
        });
      }
    });
  },

  /**
   * تسجيل دفعة في فاتورة عميل مع ترحيلها للخزنة المحددة
   */
  async recordInvoicePayment(
    workshopId: string,
    invoiceId: string,
    payment: InvoicePaymentRecord,
    userEmail: string
  ): Promise<void> {
    const invRef = getDocRef(workshopId, 'invoices', invoiceId);
    const trRef = getDocRef(workshopId, 'treasuries', payment.treasuryId);

    await runTransaction(db, async (t) => {
      const invSnap = await t.get(invRef);
      const trSnap = await t.get(trRef);

      if (!invSnap.exists()) throw new Error('الفاتورة غير موجودة');
      if (!trSnap.exists()) throw new Error('الخزنة المحددة غير موجودة');

      const invData = invSnap.data() as InvoiceRecord;
      if (invData.isLocked) {
        throw new Error('الفاتورة تابعة لفترة مقفلة');
      }

      const trData = trSnap.data() as TreasuryItem;
      const updatedPayments = [...(invData.payments || []), payment];
      const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, Math.round((invData.totalAmount - newPaidAmount) * 100) / 100);
      const newStatus = determineInvoiceStatus(invData.totalAmount, newPaidAmount);

      // Update invoice
      t.update(invRef, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: Date.now(),
      });

      // Update Treasury
      const newTrBal = Math.round((trData.balance + payment.amount) * 100) / 100;
      t.update(trRef, { balance: newTrBal, updatedAt: Date.now() });

      // Record Treasury Transaction
      const txId = 'tx_pay_' + payment.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: payment.treasuryId,
        treasuryName: trData.name,
        type: 'invoice_payment',
        amount: payment.amount,
        balanceAfter: newTrBal,
        referenceType: 'invoice',
        referenceId: invData.invoiceNumber,
        notes: `دفعة فاتورة ${invData.invoiceNumber} - عميل: ${invData.customerName}`,
        date: payment.date,
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);

      // Update Customer total paid
      const custRef = getDocRef(workshopId, 'customers', invData.customerId || 'default');
      const custSnap = await t.get(custRef);
      if (custSnap.exists()) {
        const custData = custSnap.data() as CustomerRecord;
        const updatedTotalPaid = custData.totalPaid + payment.amount;
        const balRes = calculateCustomerBalance(
          custData.totalInvoiced,
          updatedTotalPaid,
          custData.totalReturned
        );
        t.update(custRef, {
          totalPaid: updatedTotalPaid,
          currentBalance: balRes.rawBalance,
          updatedAt: Date.now(),
        });
      }
    });
  },

  /**
   * تسجيل مرتجع من فاتورة عميل وإرجاع القطع لمخزن المنتجات
   */
  async recordInvoiceReturn(
    workshopId: string,
    invoiceId: string,
    returnRecord: InvoiceReturnRecord,
    userEmail: string
  ): Promise<void> {
    const invRef = getDocRef(workshopId, 'invoices', invoiceId);

    await runTransaction(db, async (t) => {
      const invSnap = await t.get(invRef);
      if (!invSnap.exists()) throw new Error('الفاتورة غير موجودة');
      const invData = invSnap.data() as InvoiceRecord;

      if (invData.isLocked) {
        throw new Error('الفاتورة تابعة لفترة مقفلة');
      }

      const updatedReturns = [...(invData.returns || []), returnRecord];
      const newReturnsTotal = updatedReturns.reduce((sum, r) => sum + r.totalAmount, 0);
      const newGross =
        invData.subtotal - invData.discount + invData.shipping + (invData.vatAmount || 0);
      const newTotalAmount = Math.max(0, Math.round((newGross - newReturnsTotal) * 100) / 100);
      const newRemaining = Math.max(0, Math.round((newTotalAmount - invData.paidAmount) * 100) / 100);
      const newStatus = determineInvoiceStatus(newTotalAmount, invData.paidAmount);

      t.update(invRef, {
        returns: updatedReturns,
        returnsTotal: newReturnsTotal,
        totalAmount: newTotalAmount,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: Date.now(),
      });

      // Return items to finished products warehouse
      for (const item of returnRecord.items) {
        const prodCol = getColRef(workshopId, 'products');
        const prodSnap = await getDocs(query(prodCol, where('productName', '==', item.productName)));
        if (!prodSnap.empty) {
          const pDoc = prodSnap.docs[0];
          const pData = pDoc.data() as FinishedProductItem;
          const newStock = pData.currentStock + item.quantity;
          t.update(pDoc.ref, { currentStock: newStock, updatedAt: Date.now() });

          const moveId = 'mov_' + Date.now() + Math.random().toString(36).substring(2, 5);
          const mov: StockMovementRecord = {
            id: moveId,
            workshopId,
            warehouseId: 'products',
            itemId: pDoc.id,
            itemName: pData.productName,
            type: 'customer_return',
            typeNameAr: 'مرتجع من عميل',
            quantity: item.quantity,
            direction: 'in',
            balanceAfter: newStock,
            unitCost: pData.costPerUnit,
            totalValuation: item.quantity * pData.costPerUnit,
            referenceType: 'invoice',
            referenceId: invData.invoiceNumber,
            notes: `مرتجع من فاتورة #${invData.invoiceNumber}`,
            date: returnRecord.date,
            createdAt: Date.now(),
            createdBy: userEmail,
          };
          t.set(getDocRef(workshopId, 'stockMovements', moveId), mov);
        }
      }

      // If refund from treasury selected
      if (returnRecord.refundMethod === 'treasury_refund' && returnRecord.treasuryId) {
        const trRef = getDocRef(workshopId, 'treasuries', returnRecord.treasuryId);
        const trSnap = await t.get(trRef);
        if (trSnap.exists()) {
          const trData = trSnap.data() as TreasuryItem;
          const newTrBal = Math.max(0, trData.balance - returnRecord.totalAmount);
          t.update(trRef, { balance: newTrBal, updatedAt: Date.now() });

          const txId = 'tx_ref_' + returnRecord.id;
          const tx: TreasuryTransaction = {
            id: txId,
            workshopId,
            treasuryId: returnRecord.treasuryId,
            treasuryName: trData.name,
            type: 'customer_refund',
            amount: returnRecord.totalAmount,
            balanceAfter: newTrBal,
            referenceType: 'invoice',
            referenceId: invData.invoiceNumber,
            notes: `رد نقدية مرتجع فاتورة #${invData.invoiceNumber}`,
            date: returnRecord.date,
            createdAt: Date.now(),
            createdBy: userEmail,
          };
          t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);
        }
      }

      // Update customer totalReturned
      const custRef = getDocRef(workshopId, 'customers', invData.customerId || 'default');
      const custSnap = await t.get(custRef);
      if (custSnap.exists()) {
        const custData = custSnap.data() as CustomerRecord;
        const newTotalReturned = custData.totalReturned + returnRecord.totalAmount;
        const balRes = calculateCustomerBalance(
          custData.totalInvoiced,
          custData.totalPaid,
          newTotalReturned
        );
        t.update(custRef, {
          totalReturned: newTotalReturned,
          currentBalance: balRes.rawBalance,
          updatedAt: Date.now(),
        });
      }
    });
  },

  // ==========================================
  // 5. SUPPLIERS & RAW MATERIALS PURCHASE (WAC)
  // ==========================================
  async getSuppliers(workshopId: string): Promise<SupplierRecord[]> {
    const colRef = getColRef(workshopId, 'suppliers');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as SupplierRecord);
  },

  async saveSupplier(workshopId: string, supplier: SupplierRecord): Promise<void> {
    const docRef = getDocRef(workshopId, 'suppliers', supplier.id);
    await setDoc(docRef, { ...supplier, updatedAt: Date.now() }, { merge: true });
  },

  async getSupplierInvoices(workshopId: string): Promise<SupplierInvoiceRecord[]> {
    const colRef = getColRef(workshopId, 'supplierInvoices');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as SupplierInvoiceRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getNextSupplierInvoiceNumber(workshopId: string): Promise<string> {
    const counterRef = getDocRef(workshopId, 'counters', 'supplierInvoices');
    let nextNum = 1;
    await runTransaction(db, async (t) => {
      const snap = await t.get(counterRef);
      if (snap.exists()) {
        nextNum = (snap.data().current || 0) + 1;
        t.update(counterRef, { current: nextNum, updatedAt: Date.now() });
      } else {
        t.set(counterRef, { current: 1, updatedAt: Date.now() });
      }
    });
    return `SUP-${String(nextNum).padStart(4, '0')}`;
  },

  /**
   * حفظ فاتورة مورد وإدخال الخامات للمخزن بمتوسط التكلفة المرجح (WAC)
   * شراء الخامات يسجل كأصل مخزني متداول وليس كمصروف!
   */
  async saveSupplierInvoice(
    workshopId: string,
    invoice: SupplierInvoiceRecord,
    userEmail: string
  ): Promise<void> {
    const invRef = getDocRef(workshopId, 'supplierInvoices', invoice.id);
    const suppRef = getDocRef(workshopId, 'suppliers', invoice.supplierId);

    await runTransaction(db, async (t) => {
      const invSnap = await t.get(invRef);
      if (invSnap.exists() && invSnap.data().isLocked) {
        throw new Error('فاتورة المورد تابعة لفترة مقفلة');
      }

      t.set(invRef, { ...invoice, updatedAt: Date.now() }, { merge: true });

      // Update Raw Materials with Weighted Average Cost (WAC)
      for (const item of invoice.items) {
        if (!item.materialId) continue;
        const matRef = getDocRef(workshopId, 'materials', item.materialId);
        const matSnap = await t.get(matRef);

        if (matSnap.exists()) {
          const matData = matSnap.data() as RawMaterialItem;
          const newWac = calculateWeightedAverageCost(
            matData.currentStock,
            matData.costPerUnit,
            item.quantity,
            item.unitCost
          );
          const newStock = Math.round((matData.currentStock + item.quantity) * 1000) / 1000;
          const costPerGram = matData.unit === 'كيلو' ? newWac / 1000 : newWac;

          t.update(matRef, {
            currentStock: newStock,
            costPerUnit: newWac,
            costPerGram,
            lastPurchaseDate: invoice.date,
            supplierName: invoice.supplierName,
            updatedAt: Date.now(),
          });

          // Stock movement
          const movId = 'mov_' + Date.now() + Math.random().toString(36).substring(2, 5);
          const mov: StockMovementRecord = {
            id: movId,
            workshopId,
            warehouseId: 'materials',
            itemId: item.materialId,
            itemName: item.materialName,
            type: 'purchase',
            typeNameAr: 'شراء وتوريد خامات',
            quantity: item.quantity,
            direction: 'in',
            balanceAfter: newStock,
            unitCost: item.unitCost,
            totalValuation: item.totalCost,
            referenceType: 'supplier_invoice',
            referenceId: invoice.invoiceNumber,
            notes: `شراء من المورد ${invoice.supplierName} بمتوسط تكلفة ${newWac}`,
            date: invoice.date,
            createdAt: Date.now(),
            createdBy: userEmail,
          };
          t.set(getDocRef(workshopId, 'stockMovements', movId), mov);
        }
      }

      // Update Supplier balance
      const suppSnap = await t.get(suppRef);
      if (suppSnap.exists()) {
        const suppData = suppSnap.data() as SupplierRecord;
        const oldTotal = invSnap.exists()
          ? (invSnap.data() as SupplierInvoiceRecord).totalAmount
          : 0;
        const newTotalInvoiced = suppData.totalInvoiced + (invoice.totalAmount - oldTotal);
        const balRes = calculateSupplierBalance(newTotalInvoiced, suppData.totalPaid);

        t.update(suppRef, {
          totalInvoiced: newTotalInvoiced,
          currentBalance: balRes.rawBalance,
          updatedAt: Date.now(),
        });
      }
    });
  },

  async recordSupplierPayment(
    workshopId: string,
    invoiceId: string,
    payment: InvoicePaymentRecord,
    userEmail: string
  ): Promise<void> {
    const invRef = getDocRef(workshopId, 'supplierInvoices', invoiceId);
    const trRef = getDocRef(workshopId, 'treasuries', payment.treasuryId);

    await runTransaction(db, async (t) => {
      const invSnap = await t.get(invRef);
      const trSnap = await t.get(trRef);

      if (!invSnap.exists()) throw new Error('فاتورة المورد غير موجودة');
      if (!trSnap.exists()) throw new Error('الخزنة المحددة غير موجودة');

      const invData = invSnap.data() as SupplierInvoiceRecord;
      const trData = trSnap.data() as TreasuryItem;

      if (trData.balance < payment.amount) {
        throw new Error(
          `رصيد خزنة "${trData.name}" الحالي (${trData.balance}) غير كافٍ لسداد دفعة المورد (${payment.amount})`
        );
      }

      const updatedPayments = [...(invData.payments || []), payment];
      const newPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, Math.round((invData.totalAmount - newPaid) * 100) / 100);
      const newStatus = determineInvoiceStatus(invData.totalAmount, newPaid);

      t.update(invRef, {
        payments: updatedPayments,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: Date.now(),
      });

      // Deduct from treasury
      const newTrBal = Math.round((trData.balance - payment.amount) * 100) / 100;
      t.update(trRef, { balance: newTrBal, updatedAt: Date.now() });

      // Transaction
      const txId = 'tx_spay_' + payment.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: payment.treasuryId,
        treasuryName: trData.name,
        type: 'supplier_payment',
        amount: payment.amount,
        balanceAfter: newTrBal,
        referenceType: 'supplier_invoice',
        referenceId: invData.invoiceNumber,
        notes: `سداد للمورد ${invData.supplierName} عن فاتورة #${invData.invoiceNumber}`,
        date: payment.date,
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);

      // Update Supplier
      const suppRef = getDocRef(workshopId, 'suppliers', invData.supplierId);
      const suppSnap = await t.get(suppRef);
      if (suppSnap.exists()) {
        const suppData = suppSnap.data() as SupplierRecord;
        const newTotalPaid = suppData.totalPaid + payment.amount;
        const balRes = calculateSupplierBalance(suppData.totalInvoiced, newTotalPaid);
        t.update(suppRef, {
          totalPaid: newTotalPaid,
          currentBalance: balRes.rawBalance,
          updatedAt: Date.now(),
        });
      }
    });
  },

  // ==========================================
  // 6. WAREHOUSES, MATERIALS & FINISHED PRODUCTS
  // ==========================================
  async getRawMaterials(workshopId: string): Promise<RawMaterialItem[]> {
    const colRef = getColRef(workshopId, 'materials');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as RawMaterialItem);
  },

  async saveRawMaterial(workshopId: string, material: RawMaterialItem): Promise<void> {
    const docRef = getDocRef(workshopId, 'materials', material.id);
    await setDoc(docRef, { ...material, updatedAt: Date.now() }, { merge: true });
  },

  async getFinishedProducts(workshopId: string): Promise<FinishedProductItem[]> {
    const colRef = getColRef(workshopId, 'products');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as FinishedProductItem);
  },

  async saveFinishedProduct(workshopId: string, product: FinishedProductItem): Promise<void> {
    const docRef = getDocRef(workshopId, 'products', product.id);
    await setDoc(docRef, { ...product, updatedAt: Date.now() }, { merge: true });
  },

  async getStockMovements(
    workshopId: string,
    warehouseId: 'materials' | 'products',
    itemId?: string
  ): Promise<StockMovementRecord[]> {
    const colRef = getColRef(workshopId, 'stockMovements');
    let q = query(colRef, where('warehouseId', '==', warehouseId));
    if (itemId) {
      q = query(colRef, where('warehouseId', '==', warehouseId), where('itemId', '==', itemId));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as StockMovementRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async recordStockAudit(
    workshopId: string,
    warehouseId: 'materials' | 'products',
    itemId: string,
    actualQty: number,
    reason: string,
    userEmail: string
  ): Promise<void> {
    const docRef = getDocRef(
      workshopId,
      warehouseId === 'materials' ? 'materials' : 'products',
      itemId
    );

    await runTransaction(db, async (t) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) throw new Error('الصنف غير موجود');
      const data = snap.data() as any;
      const currentStock = Number(data.currentStock) || 0;
      const diff = Math.round((actualQty - currentStock) * 1000) / 1000;

      t.update(docRef, { currentStock: actualQty, updatedAt: Date.now() });

      const movId = 'mov_audit_' + Date.now();
      const mov: StockMovementRecord = {
        id: movId,
        workshopId,
        warehouseId,
        itemId,
        itemName: data.materialName || data.productName,
        type: 'audit_adjustment',
        typeNameAr: 'تسوية جردية',
        quantity: Math.abs(diff),
        direction: diff >= 0 ? 'in' : 'out',
        balanceAfter: actualQty,
        unitCost: data.costPerUnit || 0,
        totalValuation: Math.abs(diff) * (data.costPerUnit || 0),
        referenceType: 'audit',
        notes: `${reason} (تعديل من ${currentStock} إلى ${actualQty})`,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'stockMovements', movId), mov);
    });
  },

  // ==========================================
  // 7. WORK ORDERS (أوامر التشغيل وتتبع الهالك)
  // ==========================================
  async getWorkOrders(workshopId: string): Promise<WorkOrderRecord[]> {
    const colRef = getColRef(workshopId, 'workOrders');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as WorkOrderRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getNextWorkOrderNumber(workshopId: string): Promise<string> {
    const counterRef = getDocRef(workshopId, 'counters', 'workOrders');
    let nextNum = 1;
    await runTransaction(db, async (t) => {
      const snap = await t.get(counterRef);
      if (snap.exists()) {
        nextNum = (snap.data().current || 0) + 1;
        t.update(counterRef, { current: nextNum, updatedAt: Date.now() });
      } else {
        t.set(counterRef, { current: 1, updatedAt: Date.now() });
      }
    });
    return `WO-${String(nextNum).padStart(4, '0')}`;
  },

  /**
   * فتح أمر تشغيل وصرف الخامات من المخزن (مع منع الرصيد السالب)
   * أمر التشغيل يبقى مفتوحاً للتعديل طوال فترة العمل
   */
  async createWorkOrder(
    workshopId: string,
    order: WorkOrderRecord,
    userEmail: string
  ): Promise<void> {
    const woRef = getDocRef(workshopId, 'workOrders', order.id);

    await runTransaction(db, async (t) => {
      // Check and deduct raw materials
      for (const mat of order.pulledMaterials) {
        const matRef = getDocRef(workshopId, 'materials', mat.materialId);
        const matSnap = await t.get(matRef);
        if (!matSnap.exists()) {
          throw new Error(`الخامة "${mat.materialName}" غير موجودة في المخزن`);
        }
        const matData = matSnap.data() as RawMaterialItem;
        const adj = calculateStockAdjustment(matData.currentStock, 'out', mat.quantity);
        if (adj.error) {
          throw new Error(
            `عجز مخزني في خامة "${mat.materialName}": ${adj.error}`
          );
        }

        t.update(matRef, { currentStock: adj.newStock, updatedAt: Date.now() });

        const movId = 'mov_wo_' + Date.now() + Math.random().toString(36).substring(2, 5);
        const mov: StockMovementRecord = {
          id: movId,
          workshopId,
          warehouseId: 'materials',
          itemId: mat.materialId,
          itemName: mat.materialName,
          type: 'work_order_pull',
          typeNameAr: 'صرف لأمر تشغيل',
          quantity: mat.quantity,
          direction: 'out',
          balanceAfter: adj.newStock,
          unitCost: mat.unitCost,
          totalValuation: mat.quantity * mat.unitCost,
          referenceType: 'work_order',
          referenceId: order.orderNumber,
          notes: `صرف خامات لأمر تشغيل #${order.orderNumber}`,
          date: order.startDate,
          createdAt: Date.now(),
          createdBy: userEmail,
        };
        t.set(getDocRef(workshopId, 'stockMovements', movId), mov);
      }

      t.set(woRef, { ...order, updatedAt: Date.now() });
    });
  },

  async updateWorkOrder(
    workshopId: string,
    orderId: string,
    updates: Partial<WorkOrderRecord>
  ): Promise<void> {
    const woRef = getDocRef(workshopId, 'workOrders', orderId);
    await updateDoc(woRef, { ...updates, updatedAt: Date.now() });
  },

  /**
   * معالج إغلاق أمر التشغيل:
   * (أ) إضافة المنتجات المصنعة لمخزن المنتجات بتكلفة الوحدة المحسوبة
   * (ب) استرجاع الخامات السليمة المتبقية لمخزن الخامات
   * (ج) تسجيل الفرق تلقائياً كهالك خامات
   */
  async closeWorkOrder(
    workshopId: string,
    orderId: string,
    closingData: {
      finishedProductsProduced: number;
      returnedMaterials: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        unitCost: number;
        unit: string;
      }>;
      scrapItems: Array<{
        materialId: string;
        materialName: string;
        wasteQty: number;
        wasteCost: number;
        unit: string;
      }>;
      laborCost: number;
      closingNotes?: string;
    },
    userEmail: string
  ): Promise<void> {
    const woRef = getDocRef(workshopId, 'workOrders', orderId);

    await runTransaction(db, async (t) => {
      const woSnap = await t.get(woRef);
      if (!woSnap.exists()) throw new Error('أمر التشغيل غير موجود');
      const woData = woSnap.data() as WorkOrderRecord;

      if (woData.status === 'completed') {
        throw new Error('أمر التشغيل مغلق بالفعل');
      }

      // 1. Return materials to raw materials warehouse
      for (const ret of closingData.returnedMaterials) {
        if (ret.quantity <= 0) continue;
        const matRef = getDocRef(workshopId, 'materials', ret.materialId);
        const matSnap = await t.get(matRef);
        if (matSnap.exists()) {
          const matData = matSnap.data() as RawMaterialItem;
          const newStock = Math.round((matData.currentStock + ret.quantity) * 1000) / 1000;
          t.update(matRef, { currentStock: newStock, updatedAt: Date.now() });

          const movId = 'mov_ret_' + Date.now() + Math.random().toString(36).substring(2, 5);
          const mov: StockMovementRecord = {
            id: movId,
            workshopId,
            warehouseId: 'materials',
            itemId: ret.materialId,
            itemName: ret.materialName,
            type: 'work_order_return',
            typeNameAr: 'مرتجع سليم من تشغيل',
            quantity: ret.quantity,
            direction: 'in',
            balanceAfter: newStock,
            unitCost: ret.unitCost,
            totalValuation: ret.quantity * ret.unitCost,
            referenceType: 'work_order',
            referenceId: woData.orderNumber,
            notes: `استرجاع خامات فائضة من أمر #${woData.orderNumber}`,
            date: new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
            createdBy: userEmail,
          };
          t.set(getDocRef(workshopId, 'stockMovements', movId), mov);
        }
      }

      // Calculate total actual consumed materials
      const pulledTotal = woData.pulledMaterials.reduce(
        (sum, m) => sum + m.quantity * m.unitCost,
        0
      );
      const returnedTotal = closingData.returnedMaterials.reduce(
        (sum, m) => sum + m.quantity * m.unitCost,
        0
      );
      const netMaterialsCost = Math.max(0, pulledTotal - returnedTotal);
      const totalProductionCost = netMaterialsCost + (closingData.laborCost || 0);
      const producedQty = Math.max(1, closingData.finishedProductsProduced);
      const calculatedUnitCost = Math.round((totalProductionCost / producedQty) * 100) / 100;

      // 2. Add finished products to finished products warehouse
      const prodCol = getColRef(workshopId, 'products');
      const prodSnap = await getDocs(
        query(prodCol, where('productName', '==', woData.productName))
      );

      let productId = 'prod_' + Date.now();
      let currentProdStock = 0;
      if (!prodSnap.empty) {
        const existingDoc = prodSnap.docs[0];
        productId = existingDoc.id;
        const pData = existingDoc.data() as FinishedProductItem;
        currentProdStock = pData.currentStock;
        const newStock = currentProdStock + closingData.finishedProductsProduced;
        t.update(existingDoc.ref, {
          currentStock: newStock,
          costPerUnit: calculatedUnitCost,
          updatedAt: Date.now(),
        });
      } else {
        const newProd: FinishedProductItem = {
          id: productId,
          workshopId,
          productName: woData.productName,
          craftId: woData.craftId,
          category: woData.category,
          currentStock: closingData.finishedProductsProduced,
          costPerUnit: calculatedUnitCost,
          sellingPrice: Math.round(calculatedUnitCost * 1.5),
          minAlertThreshold: 2,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userEmail,
        };
        t.set(getDocRef(workshopId, 'products', productId), newProd);
      }

      // Stock movement for finished production
      const prodMovId = 'mov_prod_' + Date.now();
      const prodMov: StockMovementRecord = {
        id: prodMovId,
        workshopId,
        warehouseId: 'products',
        itemId: productId,
        itemName: woData.productName,
        type: 'production',
        typeNameAr: 'إنتاج تام للورشة',
        quantity: closingData.finishedProductsProduced,
        direction: 'in',
        balanceAfter: currentProdStock + closingData.finishedProductsProduced,
        unitCost: calculatedUnitCost,
        totalValuation: totalProductionCost,
        referenceType: 'work_order',
        referenceId: woData.orderNumber,
        notes: `إنتاج من أمر تشغيل #${woData.orderNumber}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'stockMovements', prodMovId), prodMov);

      // 3. Update Work Order Document
      t.update(woRef, {
        status: 'completed',
        finishedProductsProduced: closingData.finishedProductsProduced,
        returnedMaterials: closingData.returnedMaterials,
        scrapItems: closingData.scrapItems,
        totalConsumedMaterialsCost: netMaterialsCost,
        totalLaborCost: closingData.laborCost,
        totalProductionCost,
        unitCostCalculated: calculatedUnitCost,
        closingNotes: closingData.closingNotes || '',
        completedDate: new Date().toISOString().split('T')[0],
        updatedAt: Date.now(),
      });
    });
  },

  // ==========================================
  // 8. HUMAN RESOURCES (HR & PAYROLL)
  // ==========================================
  async getEmployees(workshopId: string): Promise<EmployeeProfile[]> {
    const colRef = getColRef(workshopId, 'employees');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as EmployeeProfile);
  },

  async saveEmployee(workshopId: string, employee: EmployeeProfile): Promise<void> {
    const docRef = getDocRef(workshopId, 'employees', employee.id);
    await setDoc(docRef, { ...employee, updatedAt: Date.now() }, { merge: true });
  },

  async getEmployeeAdvances(
    workshopId: string,
    employeeId?: string
  ): Promise<EmployeeAdvanceRecord[]> {
    const colRef = getColRef(workshopId, 'advances');
    const q = employeeId
      ? query(colRef, where('employeeId', '==', employeeId))
      : colRef;
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as EmployeeAdvanceRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async recordEmployeeAdvance(
    workshopId: string,
    advance: EmployeeAdvanceRecord,
    userEmail: string
  ): Promise<void> {
    const trRef = getDocRef(workshopId, 'treasuries', advance.treasuryId);
    const empRef = getDocRef(workshopId, 'employees', advance.employeeId);
    const advRef = getDocRef(workshopId, 'advances', advance.id);

    await runTransaction(db, async (t) => {
      const trSnap = await t.get(trRef);
      const empSnap = await t.get(empRef);

      if (!trSnap.exists()) throw new Error('الخزنة المحددة غير موجودة');
      if (!empSnap.exists()) throw new Error('الموظف غير موجود');

      const trData = trSnap.data() as TreasuryItem;
      const empData = empSnap.data() as EmployeeProfile;

      if (trData.balance < advance.amount) {
        throw new Error(
          `رصيد خزنة "${trData.name}" الحالي (${trData.balance}) غير كافٍ لصرف السلفة (${advance.amount})`
        );
      }

      // Deduct from treasury
      const newTrBal = Math.round((trData.balance - advance.amount) * 100) / 100;
      t.update(trRef, { balance: newTrBal, updatedAt: Date.now() });

      // Increase employee advance balance
      const newAdvBal = empData.currentAdvanceBalance + advance.amount;
      t.update(empRef, { currentAdvanceBalance: newAdvBal, updatedAt: Date.now() });

      // Set advance
      t.set(advRef, advance);

      // Record treasury transaction
      const txId = 'tx_adv_' + advance.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: advance.treasuryId,
        treasuryName: trData.name,
        type: 'advance_payout',
        amount: advance.amount,
        balanceAfter: newTrBal,
        referenceType: 'advance',
        referenceId: advance.employeeName,
        notes: `صرف سلفة للموظف ${advance.employeeName}`,
        date: advance.date,
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);
    });
  },

  async getPayrolls(workshopId: string, monthYear?: string): Promise<PayrollRecord[]> {
    const colRef = getColRef(workshopId, 'payrolls');
    const q = monthYear
      ? query(colRef, where('monthYear', '==', monthYear))
      : colRef;
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as PayrollRecord);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },

  async savePayroll(workshopId: string, payroll: PayrollRecord): Promise<void> {
    const docRef = getDocRef(workshopId, 'payrolls', payroll.id);
    await setDoc(docRef, { ...payroll, updatedAt: Date.now() }, { merge: true });
  },

  async recordSalaryPayout(
    workshopId: string,
    payrollId: string,
    payout: {
      id: string;
      date: string;
      amount: number;
      method: any;
      treasuryId: string;
      notes?: string;
    },
    userEmail: string
  ): Promise<void> {
    const payRef = getDocRef(workshopId, 'payrolls', payrollId);
    const trRef = getDocRef(workshopId, 'treasuries', payout.treasuryId);

    await runTransaction(db, async (t) => {
      const paySnap = await t.get(payRef);
      const trSnap = await t.get(trRef);

      if (!paySnap.exists()) throw new Error('سجل الراتب غير موجود');
      if (!trSnap.exists()) throw new Error('الخزنة المحددة غير موجودة');

      const payData = paySnap.data() as PayrollRecord;
      const trData = trSnap.data() as TreasuryItem;

      if (trData.balance < payout.amount) {
        throw new Error(
          `رصيد خزنة "${trData.name}" الحالي (${trData.balance}) غير كافٍ لصرف الراتب (${payout.amount})`
        );
      }

      const updatedPayouts = [
        ...(payData.payouts || []),
        { ...payout, treasuryName: trData.name },
      ];
      const newPaid = updatedPayouts.reduce((sum, p) => sum + p.amount, 0);
      const statusRes = determineSalaryPayoutStatus(payData.netSalary, newPaid);

      t.update(payRef, {
        payouts: updatedPayouts,
        paidAmount: newPaid,
        remainingAmount: statusRes.remaining,
        status: statusRes.status,
        updatedAt: Date.now(),
      });

      // Deduct from treasury
      const newTrBal = Math.round((trData.balance - payout.amount) * 100) / 100;
      t.update(trRef, { balance: newTrBal, updatedAt: Date.now() });

      // Transaction
      const txId = 'tx_sal_' + payout.id;
      const tx: TreasuryTransaction = {
        id: txId,
        workshopId,
        treasuryId: payout.treasuryId,
        treasuryName: trData.name,
        type: 'salary_payout',
        amount: payout.amount,
        balanceAfter: newTrBal,
        referenceType: 'payroll',
        referenceId: payData.employeeName,
        notes: `صرف راتب شهر ${payData.monthYear} للموظف ${payData.employeeName}`,
        date: payout.date,
        createdAt: Date.now(),
        createdBy: userEmail,
      };
      t.set(getDocRef(workshopId, 'treasuryTransactions', txId), tx);
    });
  },

  // ==========================================
  // 9. PERIODS & MONTH CLOSING (قفل الشهر)
  // ==========================================
  async getPeriods(workshopId: string): Promise<AccountingPeriodRecord[]> {
    const colRef = getColRef(workshopId, 'periods');
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => d.data() as AccountingPeriodRecord);
    return list.sort((a, b) => b.id.localeCompare(a.id));
  },

  async closeMonthPeriod(
    workshopId: string,
    monthYear: string,
    userEmail: string
  ): Promise<AccountingPeriodRecord> {
    const periodRef = getDocRef(workshopId, 'periods', monthYear);

    // Compute month metrics
    const invoicesCol = getColRef(workshopId, 'invoices');
    const invSnap = await getDocs(invoicesCol);
    const monthInvoices = invSnap.docs
      .map((d) => d.data() as InvoiceRecord)
      .filter((i) => i.date?.startsWith(monthYear));

    const salesTotal = monthInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

    const expCol = getColRef(workshopId, 'expenses');
    const expSnap = await getDocs(expCol);
    const monthExpenses = expSnap.docs
      .map((d) => d.data() as ExpenseItem)
      .filter((e) => e.date?.startsWith(monthYear));
    const expensesTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const payCol = getColRef(workshopId, 'payrolls');
    const paySnap = await getDocs(query(payCol, where('monthYear', '==', monthYear)));
    const monthPayrolls = paySnap.docs.map((d) => d.data() as PayrollRecord);
    const wagesTotal = monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0);

    // COGS estimate: 45% of sales or from work orders
    const cogsTotal = Math.round(salesTotal * 0.42);
    const grossProfit = salesTotal - cogsTotal;
    const netProfit = grossProfit - expensesTotal - wagesTotal;

    const periodRecord: AccountingPeriodRecord = {
      id: monthYear,
      workshopId,
      periodName: `الفترة المالية لشهر ${monthYear}`,
      isClosed: true,
      closedAt: Date.now(),
      closedBy: userEmail,
      summary: {
        salesTotal,
        cogsTotal,
        grossProfit,
        expensesTotal,
        wagesTotal,
        netProfit,
        isProfit: netProfit >= 0,
        invoicesCount: monthInvoices.length,
        workOrdersCount: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userEmail,
    };

    const batch = writeBatch(db);
    batch.set(periodRef, periodRecord);

    // Lock invoices in that period
    for (const inv of monthInvoices) {
      batch.update(getDocRef(workshopId, 'invoices', inv.id), { isLocked: true });
    }

    await batch.commit();
    return periodRecord;
  },

  async reopenMonthPeriod(
    workshopId: string,
    monthYear: string,
    reason: string,
    userEmail: string
  ): Promise<void> {
    const periodRef = getDocRef(workshopId, 'periods', monthYear);
    await updateDoc(periodRef, {
      isClosed: false,
      reopenedAt: Date.now(),
      reopenedReason: reason,
      updatedAt: Date.now(),
    });

    // Unlock invoices
    const invoicesCol = getColRef(workshopId, 'invoices');
    const invSnap = await getDocs(invoicesCol);
    const batch = writeBatch(db);
    invSnap.docs
      .map((d) => d.data() as InvoiceRecord)
      .filter((i) => i.date?.startsWith(monthYear))
      .forEach((inv) => {
        batch.update(getDocRef(workshopId, 'invoices', inv.id), { isLocked: false });
      });
    await batch.commit();
  },

  // ==========================================
  // 10. MIGRATION FROM LOCAL DEXIE TO CLOUD
  // ==========================================
  async migrateFromDexie(
    workshopId: string,
    userEmail: string,
    onProgress?: (percent: number, stepName: string) => void
  ): Promise<{ migratedCount: number }> {
    let migratedCount = 0;
    if (onProgress) onProgress(10, 'استرجاع البيانات من التخزين المحلي...');

    const localMaterials = await localDexieStorage.getRawMaterials(workshopId);
    const localSuppliers = await localDexieStorage.getSuppliers(workshopId);
    const localCustomers = await localDexieStorage.getCustomers(workshopId);
    const localOrders = await localDexieStorage.getOrders(workshopId);
    const localEmployees = await localDexieStorage.getEmployees(workshopId);

    const totalItems =
      localMaterials.length +
      localSuppliers.length +
      localCustomers.length +
      localOrders.length +
      localEmployees.length;

    if (totalItems === 0) {
      if (onProgress) onProgress(100, 'لا توجد بيانات محلية سابقة للترحيل.');
      return { migratedCount: 0 };
    }

    // Batch upload in groups of 400
    let currentBatch = writeBatch(db);
    let countInBatch = 0;

    const commitIfFull = async () => {
      if (countInBatch >= 400) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        countInBatch = 0;
      }
    };

    if (onProgress) onProgress(30, 'ترحيل الخامات والمخزون إلى السحابة...');
    for (const m of localMaterials) {
      const docRef = getDocRef(workshopId, 'materials', m.id);
      currentBatch.set(docRef, { ...m, workshopId, createdBy: userEmail }, { merge: true });
      countInBatch++;
      migratedCount++;
      await commitIfFull();
    }

    if (onProgress) onProgress(50, 'ترحيل الموردين والعملاء...');
    for (const s of localSuppliers) {
      const docRef = getDocRef(workshopId, 'suppliers', s.id);
      currentBatch.set(
        docRef,
        {
          id: s.id,
          workshopId,
          name: s.name || (s as any).supplierName || 'مورد',
          phone: s.phone || (s as any).contactNumber || '',
          materialSpecialty: s.materialSpecialty || (s as any).materialType || 'خامات عامة',
          totalInvoiced: 0,
          totalPaid: 0,
          currentBalance: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userEmail,
        },
        { merge: true }
      );
      countInBatch++;
      migratedCount++;
      await commitIfFull();
    }

    for (const c of localCustomers) {
      const docRef = getDocRef(workshopId, 'customers', c.id);
      currentBatch.set(
        docRef,
        {
          id: c.id,
          workshopId,
          name: c.name || (c as any).fullName || 'عميل',
          phone: c.phone || (c as any).phoneNumber || '',
          city: c.city || 'القاهرة',
          totalInvoiced: 0,
          totalPaid: 0,
          totalReturned: 0,
          currentBalance: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userEmail,
        },
        { merge: true }
      );
      countInBatch++;
      migratedCount++;
      await commitIfFull();
    }

    if (onProgress) onProgress(75, 'ترحيل الموظفين وفريق العمل...');
    for (const e of localEmployees) {
      const docRef = getDocRef(workshopId, 'employees', e.id);
      currentBatch.set(
        docRef,
        {
          id: e.id,
          workshopId,
          fullName: e.fullName,
          phone: (e as any).phone || (e as any).phoneNumber || '',
          role: e.role,
          hireDate: e.hireDate,
          paymentType: (e.paymentType as any) === 'fixed_salary' || e.paymentType === 'monthly' ? 'monthly' : 'piece_rate',
          baseWage: e.baseWage,
          currentAdvanceBalance: 0,
          isActive: e.isActive !== false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userEmail,
        },
        { merge: true }
      );
      countInBatch++;
      migratedCount++;
      await commitIfFull();
    }

    if (countInBatch > 0) {
      await currentBatch.commit();
    }

    if (onProgress) onProgress(100, `تم ترحيل ${migratedCount} سجلاً بنجاح إلى السحابة!`);
    return { migratedCount };
  },
};
