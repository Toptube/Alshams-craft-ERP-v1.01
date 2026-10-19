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
  Bell,
  Edit2,
  SlidersHorizontal,
  ShoppingCart,
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
  const [activeTab, setActiveTab] = useState<'stock' | 'purchase' | 'adjustment' | 'history'>('stock');

  // Purchase modal form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(5);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(180);
  const [supplierName, setSupplierName] = useState<string>('مغزل المحلة');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('توريد أصول خامات للمخزن');

  // Adjustment / Consumption form state
  const [adjustItemId, setAdjustItemId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'consume' | 'audit'>('consume');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(2);
  const [adjustNotes, setAdjustNotes] = useState<string>('صرف خامات لتنفيذ طلبية بالورشة');

  // Quick edit reorder threshold modal state
  const [editingThresholdItem, setEditingThresholdItem] = useState<InventoryStockItem | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(5);

  // New item modal form state
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<any>('خيوط');
  const [newItemUnit, setNewItemUnit] = useState<any>('كيلو');
  const [newItemInitialStock, setNewItemInitialStock] = useState(10);
  const [newItemCost, setNewItemCost] = useState(180);
  const [newItemMinThreshold, setNewItemMinThreshold] = useState(5);
  const [newItemSupplier, setNewItemSupplier] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('المخزن الرئيسي');

  const [actionNotice, setActionNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const tenantId = profile.tenantId || profile.workshopId || profile.id || '';

  const loadData = async () => {
    try {
      const stock = await tenantStorage.getInventory(tenantId);
      const txs = await tenantStorage.getInventoryTransactions(tenantId);
      setItems(stock);
      setTransactions(txs);
      if (stock.length > 0 && !selectedItemId) {
        setSelectedItemId(stock[0].id);
      }
      if (stock.length > 0 && !adjustItemId) {
        setAdjustItemId(stock[0].id);
      }
    } catch (err: any) {
      console.error('Error loading inventory:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Handle Recording New Purchase (Adds Stock)
  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;

    try {
      await tenantStorage.recordMaterialPurchase(
        tenantId,
        selectedItemId,
        purchaseQuantity,
        purchaseUnitCost,
        supplierName,
        purchaseNotes
      );
      setActionNotice({
        text: `تم تقييد شراء الخامات كأصل مخزني مالي بقيمة ${Math.round(purchaseQuantity * purchaseUnitCost)} ${profile.currencySymbol} وتحديث الرصيد فورياً!`,
      });
      await loadData();
      setActiveTab('stock');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل تسجيل الشراء', isError: true });
    }
  };

  // Handle Stock Consumption or Audit Adjustment
  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItemId) return;

    try {
      if (adjustType === 'consume') {
        await tenantStorage.recordMaterialConsumption(
          tenantId,
          adjustItemId,
          adjustQuantity,
          adjustNotes
        );
        setActionNotice({
          text: `تم صرف ${adjustQuantity} من الخامة وتحديث رصيد المخزن فورياً!`,
        });
      } else {
        await tenantStorage.adjustMaterialStock(
          tenantId,
          adjustItemId,
          adjustQuantity,
          adjustNotes || 'تسوية جردية فعلية'
        );
        setActionNotice({
          text: `تم ضبط الرصيد الفعلي للخامة إلى ${adjustQuantity} وتحديث سجلات الجرد والتنبيهات!`,
        });
      }

      await loadData();
      setActiveTab('stock');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل تسجيل الحركة', isError: true });
    }
  };

  // Handle Updating Reorder Alert Threshold
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThresholdItem) return;

    try {
      await tenantStorage.updateMaterialReorderThreshold(
        tenantId,
        editingThresholdItem.id,
        tempThresholdValue
      );
      setActionNotice({
        text: `تم تحديث حد الطلب الأدنى للخامة "${editingThresholdItem.materialName}" إلى ${tempThresholdValue} ${editingThresholdItem.unit} بنجاح!`,
      });
      setEditingThresholdItem(null);
      await loadData();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل تحديث حد الطلب', isError: true });
    }
  };

  // Quick Reorder Trigger from Table
  const handleQuickReorder = (item: InventoryStockItem) => {
    setSelectedItemId(item.id);
    setPurchaseUnitCost(item.costPerUnit);
    setSupplierName(item.supplierName || 'مورد عام');
    setPurchaseQuantity(Math.max(5, (item.minAlertThreshold || 5) * 2));
    setActiveTab('purchase');
  };

  // Quick Consume Trigger from Table
  const handleQuickConsume = (item: InventoryStockItem) => {
    setAdjustItemId(item.id);
    setAdjustType('consume');
    setAdjustQuantity(1);
    setActiveTab('adjustment');
  };

  // Handle Defining Brand-New Item
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
        currentStock: Number(newItemInitialStock) || 0,
        costPerUnit: Number(newItemCost) || 0,
        costPerGram: newItemUnit === 'كيلو' ? (Number(newItemCost) || 0) / 1000 : Number(newItemCost) || 0,
        supplierName: newItemSupplier.trim() || 'مورد عام',
        warehouseLocation: newItemLocation.trim() || 'المخزن الرئيسي',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: Number(newItemMinThreshold) || 5,
        reorderLevel: Number(newItemMinThreshold) || 5,
        isActive: true,
      };

      await tenantStorage.addInventoryItem(newItem);
      setIsAddingNewItem(false);
      setNewItemName('');
      await loadData();
      setActionNotice({ text: `تم تعريف صنف الخامة "${newItem.materialName}" في أصول المخزن بنجاح مع حد طلب أدنى (${newItem.minAlertThreshold} ${newItem.unit})!` });
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      setActionNotice({ text: err.message || 'فشل إضافة الصنف', isError: true });
    }
  };

  // Calculate total inventory asset value & low stock count
  const totalInventoryValue = items.reduce(
    (sum, i) => sum + (i.currentStock * i.costPerUnit),
    0
  );

  const lowStockItems = items.filter(
    (i) => i.currentStock <= (Number(i.minAlertThreshold ?? i.reorderLevel) || 5)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-7 relative text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              <span>إدارة الموردين والمخازن ونظام تنبيهات حد الطلب الأدنى</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              تسجيل أصول الخامات وتتبع مستويات الأمان مع نظام تنبيهات تلقائي في الجرس عند انخفاض الرصيد
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

        {/* Low Stock Auto Alert Banner */}
        {lowStockItems.length > 0 && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bell className="w-4 h-4" />
              </div>
              <div className="text-right">
                <span className="font-extrabold text-xs block">
                  تنبيه تلقائي: يوجد ({lowStockItems.length}) خامات وصلت لحد الطلب الأدنى أو أقل!
                </span>
                <span className="text-[11px] text-rose-700 dark:text-rose-300 block">
                  {lowStockItems.map((m) => `"${m.materialName}" (${m.currentStock} من ${m.minAlertThreshold} ${m.unit})`).join(' ، ')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex-shrink-0 cursor-pointer shadow-xs transition"
            >
              مراجعة وتوريد
            </button>
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
            * شراء الخامات يسجل كأصل متداول مانع للخسائر مع فحص دوري لمستويات إعادة الطلب
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <span>الأرصدة ومستويات الطلب ({items.length})</span>
            {lowStockItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'purchase'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل شراء وتوريد خامات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adjustment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'adjustment'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>صرف تشغيل / تسوية جردية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل حركات المخزن ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingNewItem(true)}
            className="mr-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 transition cursor-pointer"
          >
            + تعريف صنف جديد
          </button>
        </div>

        {/* TAB 1: Stock List with Reorder Points & Quick Actions */}
        {activeTab === 'stock' && (
          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                لا توجد خامات مسجلة حالياً في المخزن. انقر على "+ تعريف صنف جديد" للبدء.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 font-bold">
                    <tr className="border-b border-stone-200 dark:border-stone-800">
                      <th className="py-3 px-3">اسم الخامة</th>
                      <th className="py-3 px-3">التصنيف</th>
                      <th className="py-3 px-3">الرصيد الفعلي</th>
                      <th className="py-3 px-3">حد الطلب الأدنى</th>
                      <th className="py-3 px-3">الحالة والتنبيه</th>
                      <th className="py-3 px-3">تكلفة الوحدة</th>
                      <th className="py-3 px-3">قيمة الأصل</th>
                      <th className="py-3 px-3 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {items.map((item) => {
                      const threshold = Number(item.minAlertThreshold ?? item.reorderLevel) || 5;
                      const isLowStock = item.currentStock <= threshold;

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            isLowStock
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/40 dark:hover:bg-rose-950/40'
                              : 'hover:bg-stone-50 dark:hover:bg-stone-800/40'
                          }`}
                        >
                          <td className="py-3 px-3 font-bold text-stone-900 dark:text-stone-100">
                            {item.materialName}
                            <span className="text-[10px] text-stone-400 block font-normal">
                              {item.warehouseLocation || 'المخزن الرئيسي'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-stone-500">{item.category}</td>

                          {/* Current Stock */}
                          <td className="py-3 px-3 font-mono font-bold">
                            <span
                              className={`text-sm ${
                                isLowStock
                                  ? 'text-rose-600 font-black'
                                  : 'text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.currentStock}
                            </span>{' '}
                            <span className="text-[10px] text-stone-500">{item.unit}</span>
                          </td>

                          {/* Reorder Threshold with Quick Edit */}
                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-700 dark:text-amber-400">
                                {threshold}
                              </span>
                              <span className="text-[10px] text-stone-400">{item.unit}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingThresholdItem(item);
                                  setTempThresholdValue(threshold);
                                }}
                                title="تعديل حد الطلب الأدنى"
                                className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-amber-600 transition cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Alert Badge Status */}
                          <td className="py-3 px-3">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 font-extrabold text-[10px] ring-1 ring-rose-400/50">
                                <AlertTriangle className="w-3 h-3" />
                                <span>أقل من حد الطلب!</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold text-[10px]">
                                <CheckCircle className="w-3 h-3" />
                                <span>رصيد آمن</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono">
                            {item.costPerUnit} {profile.currencySymbol}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                            {Math.round(item.currentStock * item.costPerUnit)} {profile.currencySymbol}
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickReorder(item)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                title="إصدار أمر توريد / شراء خامات"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>شراء</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickConsume(item)}
                                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-[10px] cursor-pointer transition"
                                title="صرف تشغيل أو تسوية جردية"
                              >
                                صرف/تسوية
                              </button>
                            </div>
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

        {/* TAB 2: Record Purchase (Add Stock) */}
        {activeTab === 'purchase' && (
          <form onSubmit={handleRecordPurchase} className="mt-4 space-y-4 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              💡 <strong>تسجيل شراء خامات كأصل مالي:</strong> يضيف كميات الخامات فورياً لرصيد الورشة كأصول مخزنية مالية، ويرفع الرصيد فوق حد الطلب الأدنى مما يُغلق التنبيه تلقائياً.
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اختيار الخامة المشتراة *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none cursor-pointer"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.materialName} (الرصيد الحالي: {i.currentStock} {i.unit} - حد الطلب: {i.minAlertThreshold} {i.unit})
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

        {/* TAB 3: Stock Consumption & Audit Adjustment */}
        {activeTab === 'adjustment' && (
          <form onSubmit={handleRecordAdjustment} className="mt-4 space-y-4 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
              ⚙️ <strong>صرف تشغيل أو تسوية جردية:</strong> يمكنك هنا صرف خامات مستهلكة في الإنتاج، أو تعديل الرصيد الفعلي بعد الجرد. إذا انخفض الرصيد إلى ما دون حد الطلب الأدنى المحدد، سيصدر النظام فورياً إشعاراً في الجرس!
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                نوع العملية *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('consume')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    adjustType === 'consume'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  صرف خامات للتشغيل (خصم كمية)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('audit')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    adjustType === 'audit'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  تسوية جردية (تحديد الرصيد الفعلي)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اختيار الخامة *
              </label>
              <select
                value={adjustItemId}
                onChange={(e) => setAdjustItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none cursor-pointer"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.materialName} (الرصيد الحالي: {i.currentStock} {i.unit} - حد الأمان: {i.minAlertThreshold} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {adjustType === 'consume' ? 'الكمية المراد صرفها للإنتاج *' : 'الرصيد الفعلي الجديد بعد الجرد *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-sm font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                سبب الصرف أو التسوية الجردية
              </label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="مثال: تصنيع طلبية كوشن، مطابقة الجرد الدوري"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>تأكيد الحركة وتحديث الرصيد والتنبيهات التلقائية</span>
            </button>
          </form>
        )}

        {/* TAB 4: History */}
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
                          {tx.materialName} ({tx.type === 'purchase_in' ? 'توريد شراء' : tx.type === 'production_out' ? 'صرف تشغيل' : 'تسوية جردية'})
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

        {/* Quick Modal to Edit Reorder Level (حد الطلب الأدنى) */}
        {editingThresholdItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <form
              onSubmit={handleSaveThreshold}
              className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-300 dark:border-stone-700 w-full max-w-sm space-y-4 text-right shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <button
                  type="button"
                  onClick={() => setEditingThresholdItem(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>تعديل حد الطلب الأدنى</span>
                </h3>
              </div>

              <div>
                <p className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  الخامة: <span className="text-amber-700 dark:text-amber-400">{editingThresholdItem.materialName}</span>
                </p>
                <p className="text-[11px] text-stone-500 mb-3">
                  الرصيد الفعلي الحالي: {editingThresholdItem.currentStock} {editingThresholdItem.unit}
                </p>

                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  مستوى حد الطلب الأدنى الجديد ({editingThresholdItem.unit}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={tempThresholdValue}
                  onChange={(e) => setTempThresholdValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 font-mono text-sm font-bold outline-none"
                />
                <span className="text-[10px] text-stone-400 block mt-1">
                  * سيصدر إشعار فوري في الجرس بمجرد وصول رصيد الخامة إلى هذا الرقم أو أقل.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingThresholdItem(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer shadow-xs transition"
                >
                  حفظ وتطبيق التنبيه
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal to add brand-new stock item */}
        {isAddingNewItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <form
              onSubmit={handleCreateNewItem}
              className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-300 dark:border-stone-700 w-full max-w-md space-y-3 text-right shadow-2xl"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNewItem(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                  تعريف خامة جديدة في منظومة المخازن
                </h3>
              </div>

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
                    className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs cursor-pointer"
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
                    className="w-full px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs cursor-pointer"
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
                    min="0"
                    step="0.1"
                    value={newItemInitialStock}
                    onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">تكلفة الوحدة ({profile.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-amber-900 dark:text-amber-300">
                  حد الطلب الأدنى (مستوى الأمان للتنبيه التلقائي في الجرس) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={newItemMinThreshold}
                    onChange={(e) => setNewItemMinThreshold(Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-xs font-mono font-bold outline-none"
                  />
                  <span className="absolute left-3 top-2 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    {newItemUnit}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 block mt-0.5">
                  * سيظهر تنبيه فوري في جرس الإشعارات عند وصول كمية الخامة إلى هذا المستوى أو أقل.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">اسم المورد</label>
                <input
                  type="text"
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  placeholder="مورد عام"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddingNewItem(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs transition"
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
