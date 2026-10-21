import React, { useState, useEffect } from 'react';
import {
  InvoiceRecord,
  CustomerRecord,
  FinishedProductItem,
  TreasuryItem,
  WorkshopProfile,
  InvoicePaymentRecord,
  InvoiceReturnRecord,
} from '../../types';
import { firestoreService } from '../../db/firestoreService';
import {
  calculateInvoiceTotals,
  determineInvoiceStatus,
  calculateCustomerBalance,
} from '../../lib/accounting';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CreditCard,
  RotateCcw,
  Printer,
  Share2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  X,
  User,
  Phone,
  Trash2,
  Calendar,
} from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';

interface InvoicesViewProps {
  workshop: WorkshopProfile;
  onOpenHelp: (sectionId: string) => void;
  onOpenDocumentPreview: (docType: 'invoice' | 'statement', data: any) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  workshop,
  onOpenHelp,
  onOpenDocumentPreview,
}) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [products, setProducts] = useState<FinishedProductItem[]>([]);
  const [treasuries, setTreasuries] = useState<TreasuryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');

  // Customer Statement Modal
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<CustomerRecord | null>(null);

  // New/Edit Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lineItems, setLineItems] = useState<
    Array<{ id: string; productId?: string; productName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }>
  >([
    { id: '1', productName: 'قطعة مشغولات يدوية', quantity: 1, unit: 'قطعة', unitPrice: 500, totalPrice: 500 },
  ]);
  const [discount, setDiscount] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Payment Modal
  const [payingInvoice, setPayingInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTreasuryId, setPaymentTreasuryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<any>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Return Modal
  const [returningInvoice, setReturningInvoice] = useState<InvoiceRecord | null>(null);
  const [returnItemName, setReturnItemName] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnUnitPrice, setReturnUnitPrice] = useState(0);
  const [refundMethod, setRefundMethod] = useState<'credit_balance' | 'treasury_refund'>('credit_balance');
  const [refundTreasuryId, setRefundTreasuryId] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [savingReturn, setSavingReturn] = useState(false);

  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [invList, custList, prodList, trList] = await Promise.all([
        firestoreService.getInvoices(workshop.id),
        firestoreService.getCustomers(workshop.id),
        firestoreService.getFinishedProducts(workshop.id),
        firestoreService.getTreasuries(workshop.id),
      ]);
      setInvoices(invList);
      setCustomers(custList);
      setProducts(prodList);
      setTreasuries(trList);
      if (trList.length > 0) {
        setPaymentTreasuryId(trList[0].id);
        setRefundTreasuryId(trList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setNotice({ text: err.message || 'فشل تحميل البيانات', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [workshop.id]);

  // Invoice calculations
  const subtotal = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const invoiceTotals = calculateInvoiceTotals(
    subtotal,
    Number(discount) || 0,
    Number(shipping) || 0,
    vatEnabled,
    workshop.defaultVatPercent || 14
  );

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: 'li_' + Date.now(),
        productName: '',
        quantity: 1,
        unit: 'قطعة',
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleLineItemChange = (idx: number, field: string, val: any) => {
    const updated = [...lineItems];
    const item = { ...updated[idx], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      item.totalPrice = Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
    }
    if (field === 'productId') {
      const match = products.find((p) => p.id === val);
      if (match) {
        item.productName = match.productName;
        item.unitPrice = match.sellingPrice;
        item.totalPrice = Math.round(item.quantity * match.sellingPrice);
      }
    }
    updated[idx] = item;
    setLineItems(updated);
  };

  const handleOpenCreateInvoice = () => {
    setEditingInvoiceId(null);
    setSelectedCustomerId(customers[0]?.id || '');
    setCustomerName(customers[0]?.name || '');
    setCustomerPhone(customers[0]?.phone || '');
    setLineItems([
      { id: '1', productName: 'قطعة مشغولات يدوية', quantity: 1, unit: 'قطعة', unitPrice: 500, totalPrice: 500 },
    ]);
    setDiscount('0');
    setShipping('0');
    setVatEnabled(false);
    setInvoiceNotes('');
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setNotice({ text: 'يرجى تحديد أو كتابة اسم العميل', isError: true });
      return;
    }
    if (lineItems.length === 0 || subtotal <= 0) {
      setNotice({ text: 'يجب إضافة بند واحد على الأقل بمبلغ صحيح', isError: true });
      return;
    }

    setSavingInvoice(true);
    try {
      let customerId = selectedCustomerId;
      if (!customerId) {
        // Auto-create customer
        customerId = 'cust_' + Date.now();
        const newCust: CustomerRecord = {
          id: customerId,
          workshopId: workshop.id,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          city: 'القاهرة',
          totalInvoiced: 0,
          totalPaid: 0,
          totalReturned: 0,
          currentBalance: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: workshop.email,
        };
        await firestoreService.saveCustomer(workshop.id, newCust);
      }

      const invoiceNumber = editingInvoiceId
        ? (invoices.find((i) => i.id === editingInvoiceId)?.invoiceNumber || 'INV-0001')
        : await firestoreService.getNextInvoiceNumber(workshop.id);

      const invoiceRecord: InvoiceRecord = {
        id: editingInvoiceId || 'inv_' + Date.now(),
        workshopId: workshop.id,
        invoiceNumber,
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: lineItems,
        subtotal: invoiceTotals.subtotal,
        discount: invoiceTotals.discount,
        shipping: invoiceTotals.shipping,
        vatEnabled,
        vatPercent: workshop.defaultVatPercent || 14,
        vatAmount: invoiceTotals.vatAmount,
        returnsTotal: 0,
        totalAmount: invoiceTotals.totalAmount,
        paidAmount: 0,
        remainingAmount: invoiceTotals.totalAmount,
        status: 'unpaid',
        payments: [],
        returns: [],
        notes: invoiceNotes.trim(),
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: workshop.email,
      };

      await firestoreService.saveInvoice(workshop.id, invoiceRecord);
      setNotice({ text: `تم حفظ الفاتورة #${invoiceNumber} بنجاح!` });
      setIsInvoiceModalOpen(false);
      await loadAllData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل حفظ الفاتورة', isError: true });
    } finally {
      setSavingInvoice(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setNotice({ text: 'يرجى إدخال مبلغ دفعة صحيح أكبر من الصفر', isError: true });
      return;
    }

    setSavingPayment(true);
    try {
      const payment: InvoicePaymentRecord = {
        id: 'pay_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        amount,
        paymentMethod,
        treasuryId: paymentTreasuryId,
        treasuryName: treasuries.find((t) => t.id === paymentTreasuryId)?.name || 'الخزنة',
        notes: paymentNotes.trim(),
        createdAt: Date.now(),
      };

      await firestoreService.recordInvoicePayment(
        workshop.id,
        payingInvoice.id,
        payment,
        workshop.email
      );
      setNotice({ text: `تم تسجيل سداد دفعة بقيمة ${amount} ${workshop.currencySymbol} وتغذية الخزنة!` });
      setPayingInvoice(null);
      setPaymentAmount('');
      setPaymentNotes('');
      await loadAllData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل تسجيل الدفعة', isError: true });
    } finally {
      setSavingPayment(false);
    }
  };

  // Record Return
  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningInvoice || !returnItemName) return;

    setSavingReturn(true);
    try {
      const totalAmount = returnQuantity * returnUnitPrice;
      const retRecord: InvoiceReturnRecord = {
        id: 'ret_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        items: [
          {
            lineItemId: 'item_' + Date.now(),
            productName: returnItemName,
            quantity: returnQuantity,
            unitPrice: returnUnitPrice,
            total: totalAmount,
          },
        ],
        totalAmount,
        refundMethod,
        treasuryId: refundMethod === 'treasury_refund' ? refundTreasuryId : undefined,
        notes: returnNotes.trim(),
        createdAt: Date.now(),
      };

      await firestoreService.recordInvoiceReturn(
        workshop.id,
        returningInvoice.id,
        retRecord,
        workshop.email
      );
      setNotice({ text: `تم تسجيل المرتجع بنجاح وإرجاع القطع لمخزن المنتجات!` });
      setReturningInvoice(null);
      await loadAllData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل تسجيل المرتجع', isError: true });
    } finally {
      setSavingReturn(false);
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q));

    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return Boolean(matchSearch && matchStatus);
  });

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <FileText className="w-4 h-4" />
            <span>فواتير المبيعات والعملاء</span>
            <button
              type="button"
              onClick={() => onOpenHelp('invoices')}
              className="text-stone-400 hover:text-amber-600 cursor-pointer"
              title="ما معنى هذا؟"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            فواتير المبيعات والدفعات والمرتجعات
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            إصدار فواتير بيع متعددة البنود، سداد دفعات مقسطة عبر الخزن، وتتبع حسابات العملاء "عليهم / لهم".
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateInvoice}
          className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إصدار فاتورة بيع جديدة</span>
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notice.isError
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800'
          }`}
        >
          {notice.isError ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم العميل أو الهاتف..."
            className="w-full px-3.5 py-2 pr-9 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <span className="text-stone-400 font-bold flex-shrink-0">الحالة:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            الكل ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              statusFilter === 'unpaid'
                ? 'bg-rose-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            غير مدفوعة
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('partially_paid')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              statusFilter === 'partially_paid'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            مدفوعة جزئياً
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            مدفوعة بالكامل
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">جاري استرجاع الفواتير...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold space-y-2">
            <FileText className="w-10 h-10 mx-auto text-amber-500/30" />
            <p>لا توجد فواتير مطابقة لخيارات التصفية الحالية.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-bold">
                    <th className="py-2.5 px-3">رقم الفاتورة</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">العميل</th>
                    <th className="py-2.5 px-3">الإجمالي الصافي</th>
                    <th className="py-2.5 px-3">المدفوع</th>
                    <th className="py-2.5 px-3">المتبقي (عليه)</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-500">
                        {inv.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-stone-900 dark:text-stone-100">
                        <div>{inv.customerName}</div>
                        {inv.customerPhone && (
                          <div className="text-[10px] text-stone-400 font-mono">
                            {inv.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        {inv.totalAmount} {workshop.currencySymbol}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                        {inv.paidAmount} {workshop.currencySymbol}
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-600 font-bold">
                        {inv.remainingAmount} {workshop.currencySymbol}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : inv.status === 'partially_paid'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {inv.status === 'paid'
                            ? 'مدفوعة بالكامل'
                            : inv.status === 'partially_paid'
                            ? 'مدفوعة جزئياً'
                            : 'غير مدفوعة'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPaymentAmount(String(inv.remainingAmount));
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-200 transition cursor-pointer"
                            >
                              تسجيل دفعة
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setReturningInvoice(inv);
                              if (inv.items && inv.items[0]) {
                                setReturnItemName(inv.items[0].productName);
                                setReturnUnitPrice(inv.items[0].unitPrice);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold hover:bg-stone-200 transition cursor-pointer"
                          >
                            مرتجع
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenDocumentPreview('invoice', inv)}
                            className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                            title="معاينة وطباعة الفاتورة A4 ومشاركة واتساب"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                      #{inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partially_paid'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partially_paid' ? 'جزئي' : 'غير مدفوعة'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">
                      {inv.customerName}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-mono">{inv.customerPhone}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-200/50 dark:border-stone-700/50">
                    <span className="text-stone-500">الإجمالي:</span>
                    <span className="font-black font-mono">
                      {inv.totalAmount} {workshop.currencySymbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">متبقي عليه:</span>
                    <span className="font-black font-mono text-rose-600">
                      {inv.remainingAmount} {workshop.currencySymbol}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDocumentPreview('invoice', inv)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>معاينة وطباعة</span>
                    </button>

                    {inv.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingInvoice(inv);
                          setPaymentAmount(String(inv.remainingAmount));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>سداد دفعة</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleSaveInvoice}
            className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-amber-300 dark:border-stone-700 w-full max-w-3xl max-h-[92vh] overflow-y-auto space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm sm:text-base text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>إصدار فاتورة بيع جديدة</span>
              </h3>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/80">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: مدام نورهان العسقلاني"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  رقم هاتف العميل (لإرسال الفاتورة بالواتساب)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none font-mono text-left"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-800 dark:text-stone-200">
                  بنود الفاتورة والمنتجات:
                </span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند / منتج</span>
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-5 sm:col-span-6">
                      <input
                        type="text"
                        required
                        value={item.productName}
                        onChange={(e) => handleLineItemChange(idx, 'productName', e.target.value)}
                        placeholder="اسم المنتج أو القطعة..."
                        className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <NumberInput
                        min={1}
                        required
                        value={item.quantity}
                        onChange={(val) => handleLineItemChange(idx, 'quantity', val)}
                        className="w-full px-2 py-1.5 text-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-3">
                      <div className="relative">
                        <NumberInput
                          min={0}
                          step={1}
                          required
                          value={item.unitPrice}
                          onChange={(val) => handleLineItemChange(idx, 'unitPrice', val)}
                          className="w-full px-2 py-1.5 text-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-xs"
                        />
                        <span className="absolute left-2 top-2 text-[10px] text-stone-400">ج.م</span>
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={lineItems.length === 1}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Options (Discount, Shipping, VAT) */}
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-stone-700 dark:text-stone-300">
                    الخصم الممنوح ({workshop.currencySymbol})
                  </label>
                  <NumberInput
                    min={0}
                    value={discount}
                    onChange={(val) => setDiscount(String(val))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-xs text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-stone-700 dark:text-stone-300">
                    مصاريف الشحن / التوصيل
                  </label>
                  <NumberInput
                    min={0}
                    value={shipping}
                    onChange={(val) => setShipping(String(val))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold text-xs text-center"
                  />
                </div>

                {/* VAT Toggle */}
                <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-stone-800 dark:text-stone-200">
                    <input
                      type="checkbox"
                      checked={vatEnabled}
                      onChange={(e) => setVatEnabled(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    <span>ضريبة القيمة المضافة ({workshop.defaultVatPercent || 14}%)</span>
                  </label>
                  <span className="text-[10px] text-stone-400 mt-0.5">
                    * مفتاح اختياري يُحسب فقط إن فُعّل للفاتورة
                  </span>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 flex items-baseline justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  إجمالي الفاتورة الصافي:
                </span>
                <span className="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
                  {invoiceTotals.totalAmount} {workshop.currencySymbol}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                ملاحظات الفاتورة أو شروط التسليم
              </label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="مثال: يرجى الحفاظ على القطعة من الرطوبة، الاستلام خلال 5 أيام..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingInvoice}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingInvoice ? 'جاري الحفظ...' : 'حفظ وإصدار الفاتورة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-emerald-300 dark:border-stone-700 w-full max-w-md space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>تسجيل دفعة سداد للفاتورة #{payingInvoice.invoiceNumber}</span>
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">العميل:</span>
                <span className="font-bold">{payingInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">المتبقي المطلوب:</span>
                <span className="font-mono font-bold text-rose-600">
                  {payingInvoice.remainingAmount} {workshop.currencySymbol}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                مبلغ الدفعة المسددة ({workshop.currencySymbol}) *
              </label>
              <NumberInput
                min={0.5}
                step={0.5}
                required
                value={paymentAmount}
                onChange={(val) => setPaymentAmount(String(val))}
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm font-mono font-bold text-center outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  طريقة السداد
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="cash">كاش نقدي</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="wallet">محفظة فودافون كاش</option>
                  <option value="bank">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الخزنة المستلمة *
                </label>
                <select
                  value={paymentTreasuryId}
                  onChange={(e) => setPaymentTreasuryId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                ملاحظات الدفعة
              </label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="عربون، دفعة تسليم، تحويل رقم المرجع..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingPayment}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingPayment ? 'جاري التسجيل...' : 'تأكيد السداد وتغذية الخزنة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return Modal */}
      {returningInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleRecordReturn}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-300 dark:border-stone-700 w-full max-w-md space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setReturningInvoice(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>إرجاع قطعة من فاتورة #{returningInvoice.invoiceNumber}</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                اختر البند المرتجع
              </label>
              <select
                value={returnItemName}
                onChange={(e) => {
                  setReturnItemName(e.target.value);
                  const found = (returningInvoice.items || []).find((i) => i.productName === e.target.value);
                  if (found) setReturnUnitPrice(found.unitPrice);
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
              >
                {(returningInvoice.items || []).map((i, idx) => (
                  <option key={idx} value={i.productName}>
                    {i.productName} (سعر القطعة: {i.unitPrice} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الكمية المرتجعة
                </label>
                <NumberInput
                  min={1}
                  required
                  value={returnQuantity}
                  onChange={setReturnQuantity}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono font-bold text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  إجمالي قيمة المرتجع
                </label>
                <div className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 font-mono font-black text-xs text-center text-rose-600">
                  {returnQuantity * returnUnitPrice} {workshop.currencySymbol}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                تسوية قيمة المرتجع للعميل
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
              >
                <option value="credit_balance">إضافة كرصيد للعميل "له" (يخصم من حسابه)</option>
                <option value="treasury_refund">رد نقدية فورية من الخزنة</option>
              </select>
            </div>

            {refundMethod === 'treasury_refund' && (
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الخزنة التي سيرد منها المبلغ
                </label>
                <select
                  value={refundTreasuryId}
                  onChange={(e) => setRefundTreasuryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (رصيدها: {t.balance} ج.م)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setReturningInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingReturn}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingReturn ? 'جاري التنفيذ...' : 'تأكيد إرجاع القطع للمخزن'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
