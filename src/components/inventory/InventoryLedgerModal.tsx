import React, { useState, useEffect } from 'react';
import { InventoryStockItem, InventoryTransaction, UserProfile } from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  X,
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  History,
  Building,
  CheckCircle,
} from 'lucide-react';

interface InventoryLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const InventoryLedgerModal: React.FC<InventoryLedgerModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const [items, setItems] = useState<InventoryStockItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'stock' | 'purchase' | 'history'>('stock');

  // Purchase modal form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(5);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(180);
  const [supplierName, setSupplierName] = useState<string>('مغزل المحلة');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('توريد أصول خامات للمخزن');

  // New item modal form state
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<any>('خيوط');
  const [newItemUnit, setNewItemUnit] = useState<any>('كيلو');
  const [newItemInitialStock, setNewItemInitialStock] = useState(10);
  const [newItemCost, setNewItemCost] = useState(180);
  const [newItemSupplier, setNewItemSupplier] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('المخزن الرئيسي');

  const [actionNotice, setActionNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    try {
      const stock = await tenantStorage.getInventory(profile.tenantId);
      const txs = await tenantStorage.getInventoryTransactions(profile.tenantId);
      setItems(stock);
      setTransactions(txs);
      if (stock.length > 0 && !selectedItemId) {
        setSelectedItemId(stock[0].id);
      }
    } catch (err: any) {
      console.error('Error loading inventory:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.tenantId]);

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    try {
      await tenantStorage.recordMaterialPurchase(
        profile.tenantId,
        selectedItemId,
        purchaseQuantity,
        purchaseUnitCost,
        supplierName,
        purchaseNotes
      );
      setActionNotice({
        text: `تم تقييد شراء الخامات كأصل مخزني مالي بقيمة ${Math.round(purchaseQuantity * purchaseUnitCost)} ${profile.currencySymbol} وإضافتها للرصيد!`,
      });
      loadData();
      setActiveTab('stock');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل تسجيل الشراء', isError: true });
    }
  };

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const newItem: InventoryStockItem = {
        id: 'inv_' + Date.now(),
        tenantId: profile.tenantId,
        materialName: newItemName.trim(),
        category: newItemCategory,
        unit: newItemUnit,
        currentStock: newItemInitialStock,
        costPerUnit: newItemCost,
        costPerGram: newItemUnit === 'كيلو' ? newItemCost / 1000 : newItemCost,
        supplierName: newItemSupplier.trim() || 'مورد عام',
        warehouseLocation: newItemLocation.trim() || 'المخزن الرئيسي',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 5,
        isActive: true,
      };

      await tenantStorage.addInventoryItem(newItem);
      setIsAddingNewItem(false);
      setNewItemName('');
      loadData();
      setActionNotice({ text: `تم تعريف صنف الخامة "${newItem.materialName}" في أصول المخزن بنجاح!` });
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل إضافة الصنف', isError: true });
    }
  };

  // Calculate total inventory asset value
  const totalInventoryValue = items.reduce(
    (sum, i) => sum + (i.currentStock * i.costPerUnit),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-7 relative text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              <span>إدارة الموردين والمخازن وأصول الخامات (ORKANDA Warehouse Ledger)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              تسجيل الخامات كأصول مخزنية مالية مانعة للحركات السالبة مع مصفوفة التوريد
            </p>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              actionNotice.isError
                ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            {actionNotice.isError ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* Asset Value Highlight Bar */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="text-right">
            <span className="text-[11px] text-amber-100 block font-bold">
              إجمالي القيمة المالية لأصول الخامات بالمخزن:
            </span>
            <span className="text-2xl font-black font-mono">
              {Math.round(totalInventoryValue)} {profile.currencySymbol}
            </span>
          </div>
          <div className="text-[11px] text-amber-100/90 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
            * شراء الخامات يسجل أصولاً متداولة ولا يهلك كمصروف مباشر
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            الأرصدة الحالية بالمخزن ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'purchase'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل شراء خامات كأصل مالي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل حركات المخزن ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingNewItem(true)}
            className="mr-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 transition"
          >
            + تعريف صنف جديد
          </button>
        </div>

        {/* TAB 1: Stock list */}
        {activeTab === 'stock' && (
          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                لا توجد خامات مسجلة حالياً في المخزن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                      <th className="py-2.5 px-3">اسم الخامة</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3">الرصيد الفعلي</th>
                      <th className="py-2.5 px-3">تكلفة الوحدة</th>
                      <th className="py-2.5 px-3">قيمة الأصل المخزني</th>
                      <th className="py-2.5 px-3">المورد</th>
                      <th className="py-2.5 px-3">الموقع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {items.map((item) => {
                      const isLowStock = item.currentStock <= item.minAlertThreshold;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                        >
                          <td className="py-3 px-3 font-bold text-stone-900 dark:text-stone-100">
                            {item.materialName}
                            {isLowStock && (
                              <span className="mr-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                                رصيد حرج!
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-stone-500">{item.category}</td>
                          <td className="py-3 px-3 font-mono font-bold">
                            <span
                              className={
                                isLowStock
                                  ? 'text-rose-600 font-black'
                                  : 'text-stone-800 dark:text-stone-200'
                              }
                            >
                              {item.currentStock}
                            </span>{' '}
                            <span className="text-[10px] text-stone-500">{item.unit}</span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {item.costPerUnit} {profile.currencySymbol}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                            {Math.round(item.currentStock * item.costPerUnit)} {profile.currencySymbol}
                          </td>
                          <td className="py-3 px-3 text-stone-600 dark:text-stone-300">
                            {item.supplierName}
                          </td>
                          <td className="py-3 px-3 text-stone-400 text-[11px]">
                            {item.warehouseLocation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Record Purchase */}
        {activeTab === 'purchase' && (
          <form onSubmit={handleRecordPurchase} className="mt-4 space-y-4 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              💡 <strong>قاعدة الأصول المحاسبية الصارمة:</strong> تسجيل فاتورة المورد يضيف كميات
              الخامات فورياً إلى رصيد الورشة كأصول خامات، ولا يحتسب كمصروف هالك حتى يتم صرفه فعلياً في
              الإنتاج.
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اختيار الخامة المشتراة *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.materialName} (الرصيد الحالي: {i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  الكمية المشتراة *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-sm font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  سعر شراء الوحدة ({profile.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={purchaseUnitCost}
                  onChange={(e) => setPurchaseUnitCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اسم المورد / المحل *
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثال: مغزل المحلة، تاجر خان الخليلي"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                ملاحظات الفاتورة أو رقم إذن التوريد
              </label>
              <input
                type="text"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>إثبات شراء أصول الخامات وتحديث الرصيد المخزني</span>
            </button>
          </form>
        )}

        {/* TAB 3: History */}
        {activeTab === 'history' && (
          <div className="mt-4 space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                لا توجد حركات مخزن مسجلة بعد.
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          tx.type === 'purchase_in'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {tx.type === 'purchase_in' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 dark:text-stone-100">
                          {tx.materialName} ({tx.type === 'purchase_in' ? 'توريد شراء' : 'صرف تشغيل'})
                        </p>
                        <p className="text-[10px] text-stone-500">{tx.notes}</p>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="font-bold text-stone-800 dark:text-stone-200 block">
                        {tx.type === 'purchase_in' ? '+' : '-'}
                        {tx.quantity}
                      </span>
                      <span className="text-[10px] text-stone-400">{tx.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal to add brand-new stock item */}
        {isAddingNewItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form
              onSubmit={handleCreateNewItem}
              className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-300 dark:border-stone-700 w-full max-w-md space-y-3 text-right"
            >
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 pb-2 border-b">
                تعريف خامة جديدة في منظومة المخازن
              </h3>

              <div>
                <label className="block text-xs font-bold mb-1">اسم الخامة *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="مثال: خيط قطن هندي 5 مم"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">التصنيف</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
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
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <option value="كيلو">كيلو</option>
                    <option value="جرام">جرام</option>
                    <option value="متر">متر</option>
                    <option value="قطعة">قطعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    value={newItemInitialStock}
                    onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">تكلفة الوحدة</label>
                  <input
                    type="number"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNewItem(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white"
                >
                  إضافة الخامة
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
