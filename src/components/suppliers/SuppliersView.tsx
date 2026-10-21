import React, { useState, useEffect } from 'react';
import {
  SupplierRecord,
  SupplierInvoiceRecord,
  RawMaterialItem,
  TreasuryItem,
  WorkshopProfile,
  InvoicePaymentRecord,
} from '../../types';
import { firestoreService } from '../../db/firestoreService';
import {
  Truck,
  Plus,
  Search,
  CreditCard,
  History,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  Phone,
  Trash2,
  Boxes,
} from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';

interface SuppliersViewProps {
  workshop: WorkshopProfile;
  onOpenHelp: (sectionId: string) => void;
  onOpenDocumentPreview: (docType: 'statement', data: any) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  workshop,
  onOpenHelp,
  onOpenDocumentPreview,
}) => {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoiceRecord[]>([]);
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [treasuries, setTreasuries] = useState<TreasuryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierSpecialty, setNewSupplierSpecialty] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  // New Supplier Invoice Modal (Purchase Materials)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceShipping, setInvoiceShipping] = useState('0');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ materialId: string; materialName: string; quantity: number; unit: string; unitCost: number; totalCost: number }>
  >([]);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Supplier Payment Modal
  const [payingInvoice, setPayingInvoice] = useState<SupplierInvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTreasuryId, setPaymentTreasuryId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [supList, invList, matList, trList] = await Promise.all([
        firestoreService.getSuppliers(workshop.id),
        firestoreService.getSupplierInvoices(workshop.id),
        firestoreService.getRawMaterials(workshop.id),
        firestoreService.getTreasuries(workshop.id),
      ]);
      setSuppliers(supList);
      setInvoices(invList);
      setMaterials(matList);
      setTreasuries(trList);
      if (supList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supList[0].id);
      }
      if (trList.length > 0) {
        setPaymentTreasuryId(trList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setNotice({ text: err.message || 'فشل تحميل بيانات الموردين', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workshop.id]);

  const handleOpenPurchaseInvoice = () => {
    if (suppliers.length === 0) {
      setNotice({ text: 'يرجى تسجيل مورد أولاً لإصدار فاتورة شراء وتوريد', isError: true });
      return;
    }
    const defaultMat = materials[0];
    setPurchaseItems([
      {
        materialId: defaultMat?.id || '',
        materialName: defaultMat?.materialName || 'خامة خيط قطن',
        quantity: 5,
        unit: defaultMat?.unit || 'كيلو',
        unitCost: defaultMat?.costPerUnit || 180,
        totalCost: 5 * (defaultMat?.costPerUnit || 180),
      },
    ]);
    setInvoiceShipping('0');
    setInvoiceNotes('');
    setIsInvoiceModalOpen(true);
  };

  const handleAddPurchaseItem = () => {
    const defaultMat = materials[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        materialId: defaultMat?.id || '',
        materialName: defaultMat?.materialName || '',
        quantity: 1,
        unit: defaultMat?.unit || 'كيلو',
        unitCost: defaultMat?.costPerUnit || 100,
        totalCost: defaultMat?.costPerUnit || 100,
      },
    ]);
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...purchaseItems];
    const row = { ...updated[idx], [field]: val };
    if (field === 'materialId') {
      const match = materials.find((m) => m.id === val);
      if (match) {
        row.materialName = match.materialName;
        row.unit = match.unit;
        row.unitCost = match.costPerUnit;
        row.totalCost = Math.round(row.quantity * match.costPerUnit);
      }
    }
    if (field === 'quantity' || field === 'unitCost') {
      row.totalCost = Math.round((Number(row.quantity) || 0) * (Number(row.unitCost) || 0));
    }
    updated[idx] = row;
    setPurchaseItems(updated);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    setSavingSupplier(true);
    try {
      const sup: SupplierRecord = {
        id: 'sup_' + Date.now(),
        workshopId: workshop.id,
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        materialSpecialty: newSupplierSpecialty.trim() || 'خامات عامة',
        totalInvoiced: 0,
        totalPaid: 0,
        currentBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: workshop.email,
      };
      await firestoreService.saveSupplier(workshop.id, sup);
      setNotice({ text: `تم تسجيل المورد "${sup.name}" بنجاح!` });
      setIsSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل حفظ المورد', isError: true });
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSavePurchaseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) return;

    setSavingInvoice(true);
    try {
      const supplier = suppliers.find((s) => s.id === selectedSupplierId);
      if (!supplier) throw new Error('يرجى تحديد المورد');

      const invoiceNumber = await firestoreService.getNextSupplierInvoiceNumber(workshop.id);
      const subtotal = purchaseItems.reduce((sum, item) => sum + item.totalCost, 0);
      const shipping = Number(invoiceShipping) || 0;
      const totalAmount = subtotal + shipping;

      const invoiceRecord: SupplierInvoiceRecord = {
        id: 'sup_inv_' + Date.now(),
        workshopId: workshop.id,
        invoiceNumber,
        supplierId: supplier.id,
        supplierName: supplier.name || supplier.companyName || 'مورد خامات',
        items: purchaseItems.map((p, idx) => ({
          id: 'item_' + Date.now() + '_' + idx,
          materialId: p.materialId,
          materialName: p.materialName,
          quantity: p.quantity,
          unit: p.unit,
          unitCost: p.unitCost,
          totalCost: p.totalCost,
        })),
        subtotal,
        shipping,
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        status: 'unpaid',
        payments: [],
        notes: invoiceNotes.trim(),
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: workshop.email,
      };

      await firestoreService.saveSupplierInvoice(workshop.id, invoiceRecord, workshop.email);
      setNotice({
        text: `تم حفظ فاتورة شراء الخامات #${invoiceNumber} وتحديث أرصدة المخزن بمتوسط التكلفة المرجح (WAC)!`,
      });
      setIsInvoiceModalOpen(false);
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل حفظ فاتورة التوريد', isError: true });
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;

    setSavingPayment(true);
    try {
      const payment: InvoicePaymentRecord = {
        id: 'spay_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        amount,
        paymentMethod: 'cash',
        treasuryId: paymentTreasuryId,
        treasuryName: treasuries.find((t) => t.id === paymentTreasuryId)?.name || 'الخزنة',
        notes: paymentNotes.trim(),
        createdAt: Date.now(),
      };

      await firestoreService.recordSupplierPayment(
        workshop.id,
        payingInvoice.id,
        payment,
        workshop.email
      );
      setNotice({ text: `تم سداد ${amount} ${workshop.currencySymbol} للمورد وخصمها من الخزنة!` });
      setPayingInvoice(null);
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل سداد المورد', isError: true });
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border border-blue-300/40 dark:border-blue-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
            <Truck className="w-4 h-4" />
            <span>إدارة الموردين وشراء خامات الورشة</span>
            <button
              type="button"
              onClick={() => onOpenHelp('inventory')}
              className="text-stone-400 hover:text-blue-600 cursor-pointer"
              title="ما معنى هذا؟"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            الموردون وفواتير شراء الخامات
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            تسجيل توريد الخامات كأصول بالمخزن بمتوسط التكلفة المرجح (WAC) دون تسجيلها كمصروف خاطئ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPurchaseInvoice}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition"
          >
            <Boxes className="w-4 h-4" />
            <span>شراء وتوريد خامات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>إضافة مورد</span>
          </button>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notice.isError
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 text-blue-800'
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

      {/* Suppliers Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                  {s.name}
                </h3>
                <span className="text-[11px] text-stone-400">{s.materialSpecialty}</span>
              </div>
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <Truck className="w-4 h-4" />
              </span>
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-500 font-bold">رصيد المورد:</span>
              <span
                className={`font-mono font-black ${
                  (s.currentBalance || 0) > 0
                    ? 'text-rose-600'
                    : (s.currentBalance || 0) < 0
                    ? 'text-emerald-600'
                    : 'text-stone-400'
                }`}
              >
                {(s.currentBalance || 0) > 0
                  ? `له ${s.currentBalance} (مطلوب منك)`
                  : (s.currentBalance || 0) < 0
                  ? `عليه ${Math.abs(s.currentBalance || 0)} (دفعت له زيادة)`
                  : 'خالص (0)'}
              </span>
            </div>

            <div className="text-[10px] text-stone-400 font-mono flex items-center justify-between pt-1">
              <span>هاتف: {s.phone || 'غير مسجل'}</span>
              <span>إجمالي التوريد: {s.totalInvoiced} ج.م</span>
            </div>
          </div>
        ))}
      </div>

      {/* Invoices List */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              سجل فواتير توريد الخامات من الموردين
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-mono">{invoices.length} فواتير</span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold">
            لا توجد فواتير توريد خامات مسجلة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-bold">
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">المورد</th>
                  <th className="py-2.5 px-3">الخامات الموردة</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المتبقي (له)</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-stone-500">
                      {inv.date}
                    </td>
                    <td className="py-3 px-3 font-bold">{inv.supplierName}</td>
                    <td className="py-3 px-3 text-stone-600 dark:text-stone-300">
                      {inv.items?.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join('، ')}
                    </td>
                    <td className="py-3 px-3 font-mono font-black">
                      {inv.totalAmount} {workshop.currencySymbol}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-bold">
                      {inv.paidAmount} {workshop.currencySymbol}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-600 font-bold">
                      {inv.remainingAmount} {workshop.currencySymbol}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inv.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingInvoice(inv);
                            setPaymentAmount(String(inv.remainingAmount));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-200 transition cursor-pointer"
                        >
                          سداد للمورد
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSupplier}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-blue-300 dark:border-stone-700 w-full max-w-md space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>تسجيل مورد خامات جديد</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                اسم المورد أو التاجر *
              </label>
              <input
                type="text"
                required
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="مثال: الحاج فتحي غزل المحلة"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  رقم الهاتف / واتساب
                </label>
                <input
                  type="tel"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  نوع الخامات المتخصص بها
                </label>
                <input
                  type="text"
                  value={newSupplierSpecialty}
                  onChange={(e) => setNewSupplierSpecialty(e.target.value)}
                  placeholder="خيوط قطن، أخشاب، خرز..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingSupplier}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingSupplier ? 'جاري الحفظ...' : 'حفظ المورد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Purchase Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSavePurchaseInvoice}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-blue-300 dark:border-stone-700 w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>شراء وتوريد خامات للمخزن (أصول)</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                المورد *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.materialSpecialty})
                  </option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">الخامات المشتراة:</span>
                <button
                  type="button"
                  onClick={handleAddPurchaseItem}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة خامة</span>
                </button>
              </div>

              {purchaseItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 grid grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="col-span-5">
                    <select
                      value={item.materialId}
                      onChange={(e) => handleItemChange(idx, 'materialId', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materialName} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <NumberInput
                      min={0.1}
                      step={0.1}
                      required
                      value={item.quantity}
                      onChange={(val) => handleItemChange(idx, 'quantity', val)}
                      placeholder="الكمية"
                      className="w-full px-2 py-1.5 text-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-3">
                    <NumberInput
                      min={0.5}
                      step={0.5}
                      required
                      value={item.unitCost}
                      onChange={(val) => handleItemChange(idx, 'unitCost', val)}
                      placeholder="سعر الوحدة"
                      className="w-full px-2 py-1.5 text-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                      disabled={purchaseItems.length === 1}
                      className="p-1 text-rose-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingInvoice}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingInvoice ? 'جاري الحفظ...' : 'اعتماد التوريد وتحديث WAC'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Payment Modal */}
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
                <span>سداد دفعة للمورد: {payingInvoice.supplierName}</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                المبلغ المسدد للمورد ({workshop.currencySymbol}) *
              </label>
              <NumberInput
                min={1}
                required
                value={paymentAmount}
                onChange={(val) => setPaymentAmount(String(val))}
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm font-mono font-bold text-center outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                الخزنة المخصوم منها المبلغ *
              </label>
              <select
                value={paymentTreasuryId}
                onChange={(e) => setPaymentTreasuryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
              >
                {treasuries.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (رصيدها: {t.balance} ج.م)
                  </option>
                ))}
              </select>
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
                {savingPayment ? 'جاري السداد...' : 'تأكيد السداد والخصم'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
