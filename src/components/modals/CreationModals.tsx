import React, { useState } from 'react';
import {
  UserProfile,
  RawMaterialItem,
  CustomerProfile,
  SupplierProfile,
  SupplierPurchaseInvoice,
  EmployeeProfile,
  EmployeeTier,
  EmployeePaymentType,
  SafeType,
  PaymentMethod,
} from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  X,
  PackagePlus,
  UserPlus,
  Truck,
  Users2,
  CheckCircle,
  Building,
  DollarSign,
  Printer,
  FileText,
  Receipt,
} from 'lucide-react';

// 1. RAW MATERIAL MODAL
export const NewMaterialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSuccess: () => void;
}> = ({ isOpen, onClose, profile, onSuccess }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('خيوط');
  const [unit, setUnit] = useState<any>('كيلو');
  const [initialStock, setInitialStock] = useState(10);
  const [costPerUnit, setCostPerUnit] = useState(180);
  const [minAlertThreshold, setMinAlertThreshold] = useState(5);
  const [supplierName, setSupplierName] = useState('مغزل المحلة');
  const [warehouseLocation, setWarehouseLocation] = useState('المخزن الرئيسي');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: RawMaterialItem = {
      id: 'mat_' + Date.now(),
      tenantId: profile.tenantId,
      materialName: name.trim(),
      category,
      unit,
      currentStock: Number(initialStock) || 0,
      costPerUnit: Number(costPerUnit) || 0,
      costPerGram: unit === 'كيلو' ? (Number(costPerUnit) || 0) / 1000 : Number(costPerUnit) || 0,
      supplierName: supplierName.trim() || 'مورد عام',
      warehouseLocation: warehouseLocation.trim() || 'المخزن الرئيسي',
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      minAlertThreshold: Number(minAlertThreshold) || 5,
      reorderLevel: Number(minAlertThreshold) || 5,
      isActive: true,
    };

    await tenantStorage.saveRawMaterial(item);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-300 dark:border-stone-700 w-full max-w-md space-y-3 text-right"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-amber-600" />
            <span>تعريف خامة جديدة في المخزن [زر خامة]</span>
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">اسم الخامة *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: خيط قطن مجدول 4 مم، خرز، عصا زان"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold mb-1">التصنيف</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
            >
              <option value="خيوط">خيوط</option>
              <option value="أخشاب وشاسيهات">أخشاب وشاسيهات</option>
              <option value="إكسسوارات ومعادن">إكسسوارات ومعادن</option>
              <option value="تغليف وأقمشة">تغليف وأقمشة</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">وحدة القياس</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
            >
              <option value="كيلو">كيلو (يحتسب الجرام آلياً)</option>
              <option value="جرام">جرام</option>
              <option value="متر">متر</option>
              <option value="قطعة">قطعة</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold mb-1">الرصيد المتاح حالياً</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={initialStock}
              onChange={(e) => setInitialStock(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">تكلفة الوحدة ({profile.currencySymbol}) *</label>
            <input
              type="number"
              min="0.1"
              step="0.5"
              required
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">
            حد الطلب الأدنى (مستوى الأمان للتنبيه التلقائي في الجرس) *
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={minAlertThreshold}
              onChange={(e) => setMinAlertThreshold(Number(e.target.value))}
              placeholder="5"
              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/50 dark:bg-amber-950/20 font-mono text-xs font-bold outline-none"
            />
            <span className="absolute left-3 top-2 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
              {unit}
            </span>
          </div>
          <span className="text-[10px] text-stone-500 dark:text-stone-400 block mt-0.5">
            * سيظهر إشعار فوري في الجرس عند وصول الرصيد إلى أو أقل من هذا الحد.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">اسم المورد</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500">
            إلغاء
          </button>
          <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer">
            حفظ الخامة في المخزن
          </button>
        </div>
      </form>
    </div>
  );
};

// 2. CLIENT PROFILE MODAL
export const NewClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSuccess: () => void;
}> = ({ isOpen, onClose, profile, onSuccess }) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('القاهرة');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const newClient: CustomerProfile = {
      id: 'cust_' + Date.now(),
      tenantId: profile.tenantId,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim() || '01000000000',
      city: city.trim(),
      totalPurchases: 0,
      outstandingBalance: 0,
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    await tenantStorage.saveCustomer(newClient);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-emerald-300 dark:border-stone-700 w-full max-w-md space-y-3 text-right"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>تسجيل عميل جديد بالدفتر [زر عميل]</span>
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">اسم العميل بالكامل *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الكريم أو اسم المعرض"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">رقم الهاتف *</label>
          <input
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01012345678"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs text-left"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">المدينة / المحافظة</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">ملاحظات العميل الخاصة</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: يفضل ألوان بيج وبوهيمي، طلبيات ديكور فنادق"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500">
            إلغاء
          </button>
          <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer">
            حفظ العميل
          </button>
        </div>
      </form>
    </div>
  );
};

// 3. SUPPLIER PROFILE & PURCHASE INVOICE MODAL
export const NewSupplierModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSuccess: () => void;
}> = ({ isOpen, onClose, profile, onSuccess }) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'create_supplier' | 'record_invoice' | 'statement'>('create_supplier');

  // Supplier profile fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Invoice fields
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [suppliersList, setSuppliersList] = useState<SupplierProfile[]>([]);
  const [invoicesList, setInvoicesList] = useState<SupplierPurchaseInvoice[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + Math.floor(1000 + Math.random() * 9000));
  const [rawMaterialsList, setRawMaterialsList] = useState<RawMaterialItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [unitCost, setUnitCost] = useState(180);
  const [paidAmount, setPaidAmount] = useState(1800);
  const [safeType, setSafeType] = useState<SafeType>('main');
  const tenantId = profile.tenantId || profile.workshopId || profile.id || '';

  React.useEffect(() => {
    tenantStorage.getSuppliers(tenantId).then((sups) => {
      setSuppliersList(sups);
      if (sups.length > 0) setSelectedSupplierId(sups[0].id);
    });
    tenantStorage.getRawMaterials(tenantId).then((mats) => {
      setRawMaterialsList(mats);
      if (mats.length > 0) setSelectedMaterialId(mats[0].id);
    });
    tenantStorage.getSupplierInvoices(tenantId).then(setInvoicesList);
  }, [tenantId]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSup: SupplierProfile = {
      id: 'sup_' + Date.now(),
      tenantId: profile.tenantId,
      name: name.trim(),
      companyName: companyName.trim() || 'مغزل / متجر خامات',
      phoneNumber: phone.trim() || '01000000000',
      address: address.trim(),
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdAt: Date.now(),
    };

    await tenantStorage.saveSupplier(newSup);
    onSuccess();
    onClose();
  };

  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedMaterialId) return;

    const sup = suppliersList.find((s) => s.id === selectedSupplierId);
    const mat = rawMaterialsList.find((m) => m.id === selectedMaterialId);
    if (!sup || !mat) return;

    const total = quantity * unitCost;
    const remaining = Math.max(0, total - paidAmount);

    const invoice: SupplierPurchaseInvoice = {
      id: 'sinv_' + Date.now(),
      tenantId: profile.tenantId || profile.workshopId || profile.id || '',
      supplierId: sup.id,
      supplierName: sup.name || sup.companyName || 'مورد خامات',
      invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      items: [
        {
          materialId: mat.id,
          materialName: mat.materialName,
          quantity,
          unit: mat.unit,
          unitCost,
          totalCost: total,
        },
      ],
      totalAmount: total,
      paidAmount,
      remainingAmount: remaining,
      safeType,
      paymentMethod: 'cash',
      createdAt: Date.now(),
    };

    await tenantStorage.recordSupplierPurchaseInvoice(invoice);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-blue-300 dark:border-stone-700 w-full max-w-lg space-y-4 text-right">
        <div className="flex items-center justify-between border-b pb-3">
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('create_supplier')}
              className={`px-3 py-1 rounded-lg transition ${
                mode === 'create_supplier' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500'
              }`}
            >
              تعريف مورد جديد
            </button>
            <button
              type="button"
              onClick={() => setMode('record_invoice')}
              className={`px-3 py-1 rounded-lg transition ${
                mode === 'record_invoice' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500'
              }`}
            >
              إثبات فاتورة مشتريات
            </button>
            <button
              type="button"
              onClick={() => setMode('statement')}
              className={`px-3 py-1 rounded-lg transition ${
                mode === 'statement' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500'
              }`}
            >
              كشف حساب مورد (طباعة)
            </button>
          </div>
        </div>

        {mode === 'create_supplier' ? (
          <form onSubmit={handleCreateSupplier} className="space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1">اسم المورد / التاجر *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المسؤول أو المورد"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">اسم الشركة / المغزل</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: مغزل المحلة الكبرى"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01000000000"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">العنوان / المحافظة</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500">
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer">
                حفظ المورد
              </button>
            </div>
          </form>
        ) : mode === 'record_invoice' ? (
          <form onSubmit={handleRecordInvoice} className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-900 dark:text-blue-200">
              💡 إثبات فاتورة المشتريات يحدث رصيد المخزن تلقائياً، ويعيد معايرة سعر تكلفة الجرام في حاسبة التكاليف.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">المورد *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.companyName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الخامة المشتراة *</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {rawMaterialsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialName} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">الكمية المشتراة *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">سعر شراء الوحدة الجديد ({profile.currencySymbol}) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold mb-1">المبلغ المسدد الآن</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">الخزينة المسحوب منها السداد</label>
                <select
                  value={safeType}
                  onChange={(e) => setSafeType(e.target.value as SafeType)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="main">الخزينة الرئيسية</option>
                  <option value="sub">الخزينة الفرعية</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs flex justify-between font-mono font-bold">
              <span>إجمالي الفاتورة: {quantity * unitCost} {profile.currencySymbol}</span>
              <span className="text-rose-600">الآجل المعلق: {Math.max(0, quantity * unitCost - paidAmount)} {profile.currencySymbol}</span>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500">
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer">
                اعتماد وتحديث المخزن والخزينة
              </button>
            </div>
          </form>
        ) : (
          /* SUPPLIER STATEMENT & PRINTABLE SHEET */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold mb-1">اختر المورد لعرض كشف الحساب والآجلة:</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب</span>
              </button>
            </div>

            {(() => {
              const currentSupplier = suppliersList.find((s) => s.id === selectedSupplierId);
              const relatedInvoices = invoicesList.filter((inv) => inv.supplierId === selectedSupplierId);

              if (!currentSupplier) {
                return <p className="text-xs text-stone-500 text-center py-4">يرجى اختيار مورد</p>;
              }

              return (
                <div className="space-y-3">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-bold">إجمالي المشتريات</span>
                      <span className="text-sm font-black font-mono text-blue-900 dark:text-blue-100">
                        {currentSupplier.totalPurchases} {profile.currencySymbol}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">الدفعات المسددة</span>
                      <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-100">
                        {currentSupplier.totalPaid} {profile.currencySymbol}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                      <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-bold">الآجلة المستحقة</span>
                      <span className="text-sm font-black font-mono text-rose-900 dark:text-rose-100">
                        {currentSupplier.outstandingBalance} {profile.currencySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Logs Table */}
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-bold">
                        <tr>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">رقم الفاتورة</th>
                          <th className="p-2">الخامات</th>
                          <th className="p-2">القيمة</th>
                          <th className="p-2">المسدد</th>
                          <th className="p-2">المتبقي الآجل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                        {relatedInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-stone-400 font-sans">
                              لا توجد فواتير توريد مسجلة لهذا المورد حتى الآن
                            </td>
                          </tr>
                        ) : (
                          relatedInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                              <td className="p-2 text-stone-500 font-sans">{inv.date}</td>
                              <td className="p-2 font-bold">{inv.invoiceNumber}</td>
                              <td className="p-2 font-sans">
                                {inv.items.map((it) => `${it.materialName} (${it.quantity} ${it.unit})`).join('، ')}
                              </td>
                              <td className="p-2 font-bold">{inv.totalAmount}</td>
                              <td className="p-2 text-emerald-600 font-bold">{inv.paidAmount}</td>
                              <td className="p-2 text-rose-600 font-bold">{inv.remainingAmount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-xl cursor-pointer">
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. EMPLOYEE / ARTISAN PROFILE MODAL
export const NewEmployeeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSuccess: () => void;
}> = ({ isOpen, onClose, profile, onSuccess }) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('حياكة مكرمية وجداريات');
  const [tier, setTier] = useState<EmployeeTier>('خبير');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentType, setPaymentType] = useState<EmployeePaymentType>('piece_rate');
  const [baseSalary, setBaseSalary] = useState(3000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const newEmp: EmployeeProfile = {
      id: 'emp_' + Date.now(),
      tenantId: profile.tenantId,
      fullName: fullName.trim(),
      specialty: specialty.trim(),
      tier,
      phoneNumber: phoneNumber.trim() || '01000000000',
      paymentType,
      pieceRatePercentage: 100,
      baseSalary: paymentType === 'fixed_salary' ? baseSalary : undefined,
      isActive: true,
      totalEarned: 0,
      totalPaid: 0,
      currentBalance: 0,
      createdAt: Date.now(),
    };

    await tenantStorage.saveEmployee(newEmp);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-purple-300 dark:border-stone-700 w-full max-w-md space-y-3 text-right"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-extrabold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
            <Users2 className="w-4 h-4 text-purple-600" />
            <span>تعيين فنان / موظف وتحديد الكادر [زر موظف]</span>
          </h3>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">اسم الفنان / الموظف *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="الاسم الكامل"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">التخصص الحرفي بالورشة</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="مثال: حياكة عقد مكرمية، قص وتجهيز، تغليف"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold mb-1">الكادر الفني والخبرة *</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as EmployeeTier)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
            >
              <option value="مبتدئ">مبتدئ</option>
              <option value="متوسط">متوسط</option>
              <option value="خبير">خبير</option>
              <option value="مدرب">مدرب ومشرف جودة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">نظام المحاسبة المالي *</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as EmployeePaymentType)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
            >
              <option value="piece_rate">مصنعية بالقطعة المشغولة</option>
              <option value="fixed_salary">راتب شهري ثابت</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">رقم الهاتف *</label>
          <input
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01000000000"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs text-left"
            dir="ltr"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-500">
            إلغاء
          </button>
          <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl cursor-pointer">
            اعتماد التعيين في الكادر
          </button>
        </div>
      </form>
    </div>
  );
};
