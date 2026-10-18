import React, { useState, useEffect } from 'react';
import {
  CustomerProfile,
  CustomerOrder,
  OrderLineItem,
  SavedProductRecord,
  EmployeeProfile,
  UserProfile,
  SafeType,
  PaymentMethod,
} from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  ShoppingCart,
  Plus,
  Search,
  Share2,
  Save,
  CheckCircle2,
  Trash2,
  Package,
  Layers,
  DollarSign,
  User,
  Phone,
  Calendar,
  Lock,
  AlertTriangle,
  Receipt,
  Truck,
  Gift,
} from 'lucide-react';

interface SalesOrdersViewProps {
  profile: UserProfile;
  onOpenWhatsAppQuote: (record: SavedProductRecord) => void;
  onOpenNewClientModal: () => void;
}

export const SalesOrdersView: React.FC<SalesOrdersViewProps> = ({
  profile,
  onOpenWhatsAppQuote,
  onOpenNewClientModal,
}) => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [products, setProducts] = useState<SavedProductRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);

  // Search queries for dropdown matrices (عدسة البحث)
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Selected client & active line items for multi-item bundling
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderLineItems, setOrderLineItems] = useState<OrderLineItem[]>([]);

  // Current item builder form
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemCustomPrice, setItemCustomPrice] = useState<number>(0);

  // Financial details
  const [shippingCost, setShippingCost] = useState<number>(50);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [safeType, setSafeType] = useState<string>('main');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');

  // Delivery deadline & Tri-Phase installments
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [isSinglePayment, setIsSinglePayment] = useState<boolean>(true);

  // 3-Phase installments
  const [phase1Amount, setPhase1Amount] = useState<number>(0);
  const [phase1Date, setPhase1Date] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [phase1Paid, setPhase1Paid] = useState<boolean>(true);

  const [phase2Amount, setPhase2Amount] = useState<number>(0);
  const [phase2Date, setPhase2Date] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [phase2Paid, setPhase2Paid] = useState<boolean>(false);

  const [phase3Amount, setPhase3Amount] = useState<number>(0);
  const [phase3Date, setPhase3Date] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [phase3Paid, setPhase3Paid] = useState<boolean>(false);

  // UI state
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'new_sale' | 'all_orders'>('new_sale');

  // Load active data
  const loadData = async () => {
    try {
      const tId = profile.tenantId || profile.workshopId || profile.id;
      const ords = await tenantStorage.getOrders(tId);
      const custs = await tenantStorage.getCustomers(tId);
      const prods = await tenantStorage.getProducts(tId);
      const emps = await tenantStorage.getEmployees(tId);

      setOrders(ords);
      setCustomers(custs);
      setProducts(prods);
      setEmployees(emps);

      if (custs.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custs[0].id);
      }
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
        setItemCustomPrice(prods[0].output.finalSellingPrice);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.tenantId]);

  // Handle product selection in line item builder
  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemCustomPrice(prod.output.finalSellingPrice);
    }
  };

  // Add line item to bundle
  const handleAddLineItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    const name = prod ? prod.productName : 'منتج حرفي خاص';
    const category = prod ? prod.category : 'جدارية';
    const price = itemCustomPrice > 0 ? itemCustomPrice : (prod?.output.finalSellingPrice || 250);
    const qty = Math.max(1, itemQuantity);

    const newLine: OrderLineItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      productId: prod?.id,
      productName: name,
      category,
      unit: 'قطعة',
      quantity: qty,
      unitPrice: price,
      totalPrice: price * qty,
    };

    setOrderLineItems([...orderLineItems, newLine]);
    // Reset builder defaults
    setItemQuantity(1);
    setStatusNotice('تمت إضافة المنتج إلى سلة الطلبية الحالية!');
    setTimeout(() => setStatusNotice(''), 2000);
  };

  const handleRemoveLineItem = (index: number) => {
    setOrderLineItems(orderLineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const totalItemsPrice = orderLineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const finalTotal = Math.max(0, totalItemsPrice + Number(shippingCost || 0) - Number(discountAmount || 0));

  useEffect(() => {
    if (!isSinglePayment && finalTotal > 0) {
      const p1 = Math.round(finalTotal * 0.5);
      const p2 = Math.round(finalTotal * 0.3);
      const p3 = Math.max(0, finalTotal - p1 - p2);
      setPhase1Amount(p1);
      setPhase2Amount(p2);
      setPhase3Amount(p3);
    }
  }, [finalTotal, isSinglePayment]);

  const effectiveAmountPaid = isSinglePayment
    ? Number(amountPaid || 0)
    : (phase1Paid ? Number(phase1Amount || 0) : 0) +
      (phase2Paid ? Number(phase2Amount || 0) : 0) +
      (phase3Paid ? Number(phase3Amount || 0) : 0);
  const remaining = Math.max(0, finalTotal - effectiveAmountPaid);

  // Filtered dropdown matrices (عدسة البحث)
  const filteredCustomers = customers.filter(
    (c) =>
      (c.fullName || c.name || '').toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      (c.phoneNumber || c.phone || '').includes(clientSearchQuery)
  );

  const filteredProducts = products.filter((p) =>
    p.productName.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Save Order
  const handleSaveOrder = async (mode: 'save_only' | 'save_and_add' | 'save_and_share') => {
    if (!selectedCustomerId) {
      alert('يرجى اختيار العميل');
      return;
    }

    // If orderLineItems is empty, try to bundle the currently selected product
    let finalItems = [...orderLineItems];
    if (finalItems.length === 0 && selectedProductId) {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        finalItems.push({
          id: 'item_' + Date.now(),
          productId: prod.id,
          productName: prod.productName,
          category: prod.category,
          unit: 'قطعة',
          quantity: Math.max(1, itemQuantity),
          unitPrice: itemCustomPrice > 0 ? itemCustomPrice : prod.output.finalSellingPrice,
          totalPrice: (itemCustomPrice > 0 ? itemCustomPrice : prod.output.finalSellingPrice) * Math.max(1, itemQuantity),
        });
      }
    }

    if (finalItems.length === 0) {
      alert('يرجى إضافة منتج واحد على الأقل للطلبية');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);
    const targetTenantId = profile.tenantId || profile.workshopId || profile.id;

    const newOrder: CustomerOrder = {
      id: 'ord_' + Date.now(),
      workshopId: targetTenantId,
      tenantId: targetTenantId,
      customerId: selectedCustomerId,
      customerName: customer ? (customer.fullName || customer.name) : 'عميل عام',
      customerPhone: customer?.phoneNumber || customer?.phone || '',
      items: finalItems,
      subtotal: totalItemsPrice,
      shipping: Number(shippingCost) || 0,
      discount: Number(discountAmount) || 0,
      vatEnabled: false,
      vatPercent: 0,
      vatAmount: 0,
      returnsTotal: 0,
      totalAmount: finalTotal,
      finalTotal,
      paidAmount: effectiveAmountPaid,
      amountPaid: effectiveAmountPaid,
      remainingAmount: remaining,
      safeType,
      deliveryDate,
      depositPhases: isSinglePayment
        ? undefined
        : {
            phase1Amount,
            phase1Date,
            phase1Paid,
            phase2Amount,
            phase2Date,
            phase2Paid,
            phase3Amount,
            phase3Date,
            phase3Paid,
          },
      assignedEmployeeId: assignedEmp?.id,
      assignedEmployeeName: assignedEmp?.fullName,
      assignedEmployeeWage: assignedEmp ? 150 : undefined,
      payments: [],
      returns: [],
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: profile.email,
    };

    await tenantStorage.recordSalesOrder(newOrder);
    await tenantStorage.generateProactiveNotifications(targetTenantId);
    await loadData();

    if (mode === 'save_and_share') {
      // Create a dummy SavedProductRecord from the first product or bundle to trigger WhatsApp drawer
      const matchingProduct = products.find((p) => p.id === finalItems[0].productId);
      if (matchingProduct) {
        onOpenWhatsAppQuote(matchingProduct);
      } else {
        alert('تم حفظ الطلبية بنجاح! جاري تحويلك لعرض السعر.');
      }
    } else if (mode === 'save_and_add') {
      setOrderLineItems([]);
      setStatusNotice('تم حفظ الطلبية الأولى! جاهز لإدخال طلبية أو منتج جديد.');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    setOrderLineItems([]);
    setStatusNotice('تم تسجيل عملية البيع وترحيل المبالغ للخزينة وحساب العميل بنجاح!');
    setTimeout(() => setStatusNotice(''), 3000);
    setActiveTab('all_orders');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300/40 dark:border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <ShoppingCart className="w-4 h-4" />
            <span>منظومة المبيعات وتوريد المشغولات اليدوية (Sales & Logistics)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            تسجيل ومتابعة مبيعات الورشة
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('new_sale')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'new_sale'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
            }`}
          >
            + تسجيل بيع جديد
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all_orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'all_orders'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
            }`}
          >
            سجل المبيعات ({orders.length})
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {activeTab === 'new_sale' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Sale Form */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Client Search & Select Matrix */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <button
                  type="button"
                  onClick={onOpenNewClientModal}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ عميل جديد</span>
                </button>
                <h3 className="text-xs font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>تحديد العميل (قائمة مدمجة بعدسة بحث) *</span>
                </h3>
              </div>

              {/* Client Search bar with magnifying glass */}
              <div className="relative">
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full px-3.5 py-2 pr-9 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Searchable Client Dropdown Matrix */}
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              >
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — ({c.phoneNumber}) — رصيده الحالي: {c.outstandingBalance} {profile.currencySymbol}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Product Search & Dynamic Pieces Sold Alteration */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-[11px] text-stone-400 font-mono">
                  MULTIPLE PRODUCT BUNDLER
                </span>
                <h3 className="text-xs font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>اختيار الأصناف وتغيير إعداد القطع المباعة</span>
                </h3>
              </div>

              {/* Product Search bar with magnifying glass */}
              <div className="relative">
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="ابحث عن الموديل في كروت الأصناف المحسوبة..."
                  className="w-full px-3.5 py-2 pr-9 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Product Dropdown Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold mb-1">المنتج / الصنف *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productName} ({p.category}) — {p.output.finalSellingPrice} {profile.currencySymbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Option to dynamically alter quantity of pieces sold */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold mb-1">تغيير إعداد القطع المباعة *</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold text-center outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold mb-1">سعر بيع القطعة ({profile.currencySymbol})</label>
                  <input
                    type="number"
                    value={itemCustomPrice}
                    onChange={(e) => setItemCustomPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold text-center outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddLineItem}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>إضافة هذا الصنف إلى سلة الطلبية الحالية</span>
              </button>

              {/* Bundled Items List */}
              {orderLineItems.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    الأصناف المجمعة في هذه الفاتورة ({orderLineItems.length}):
                  </span>
                  {orderLineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.productName}
                        </span>
                        <span className="text-[10px] text-stone-500 mr-2">
                          ({item.quantity} قطع × {item.unitPrice} {profile.currencySymbol})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {item.totalPrice} {profile.currencySymbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Safes & Multi-Method Payment Routing */}
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 border-b pb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>طرق السداد والخزينة المستلمة (Multi-Method Safe Ledger)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Safe Selection */}
                <div>
                  <label className="block text-xs font-bold mb-1">الخزينة المودع بها الإيراد *</label>
                  <select
                    value={safeType}
                    onChange={(e) => setSafeType(e.target.value as SafeType)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    <option value="main">الخزينة الرئيسية (Main Safe Ledger)</option>
                    <option value="sub">الخزينة الفرعية (Sub-Safe Ledger)</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold mb-1">طريقة السداد *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    <option value="cash">نقدي (كاش في اليد)</option>
                    <option value="visa">فيزا / بطاقة دفع إلكتروني</option>
                    <option value="wallet">محفظة إلكترونية (فودافون كاش / إنستاباي)</option>
                    <option value="bank_transfer">تحويل بنكي مباشر</option>
                  </select>
                </div>

                {/* Delivery Date Calendar Deadline */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>موعد التسليم النهائي *</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      (تنبيه قبل يومين من الموعد)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Payment System Mode Toggle: Single Payment vs Tri-Phase */}
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-stone-100/70 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-900 dark:text-stone-100">
                      نظام سداد الفاتورة والدفعات
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setIsSinglePayment(true)}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                          isSinglePayment
                            ? 'bg-amber-600 text-white shadow-xs font-black'
                            : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                        }`}
                      >
                        تسليم ودفع دفعة واحدة
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSinglePayment(false)}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                          !isSinglePayment
                            ? 'bg-amber-600 text-white shadow-xs font-black'
                            : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                        }`}
                      >
                        جدولة الدفعات (3 دفعات)
                      </button>
                    </div>
                  </div>

                  {isSinglePayment ? (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                        المدفوع حالياً (العربون / السداد الكامل) *
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        placeholder="المبلغ المسدد"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ) : (
                    /* Tri-Phase Independent Payment Inputs */
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        ثلاث دفعات مجدولة مع إطلاق تنبيه تلقائي في جرس المنظومة قبل موعد كل استحقاق بيومين:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Phase 1 */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">
                              الدفعة الأولى (المقدم)
                            </span>
                            <label className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={phase1Paid}
                                onChange={(e) => setPhase1Paid(e.target.checked)}
                                className="accent-amber-600 rounded"
                              />
                              <span>تم الدفع</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            value={phase1Amount}
                            onChange={(e) => setPhase1Amount(Number(e.target.value))}
                            placeholder="مبلغ الدفعة"
                            className="w-full px-2 py-1.5 rounded-lg border text-xs font-bold font-mono outline-none"
                          />
                          <input
                            type="date"
                            value={phase1Date}
                            onChange={(e) => setPhase1Date(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border text-[10px] font-mono outline-none"
                          />
                        </div>

                        {/* Phase 2 */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-blue-700 dark:text-blue-400">
                              الدفعة الثانية (التصنيع)
                            </span>
                            <label className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={phase2Paid}
                                onChange={(e) => setPhase2Paid(e.target.checked)}
                                className="accent-amber-600 rounded"
                              />
                              <span>تم الدفع</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            value={phase2Amount}
                            onChange={(e) => setPhase2Amount(Number(e.target.value))}
                            placeholder="مبلغ الدفعة"
                            className="w-full px-2 py-1.5 rounded-lg border text-xs font-bold font-mono outline-none"
                          />
                          <input
                            type="date"
                            value={phase2Date}
                            onChange={(e) => setPhase2Date(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border text-[10px] font-mono outline-none"
                          />
                        </div>

                        {/* Phase 3 */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 space-y-1.5 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-purple-700 dark:text-purple-400">
                              الدفعة الثالثة (التسليم)
                            </span>
                            <label className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={phase3Paid}
                                onChange={(e) => setPhase3Paid(e.target.checked)}
                                className="accent-amber-600 rounded"
                              />
                              <span>تم الدفع</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            value={phase3Amount}
                            onChange={(e) => setPhase3Amount(Number(e.target.value))}
                            placeholder="مبلغ الدفعة"
                            className="w-full px-2 py-1.5 rounded-lg border text-xs font-bold font-mono outline-none"
                          />
                          <input
                            type="date"
                            value={phase3Date}
                            onChange={(e) => setPhase3Date(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border text-[10px] font-mono outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned Employee Artisan */}
                <div>
                  <label className="block text-xs font-bold mb-1">إسناد التصنيع لموظف / فنان</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={(e) => setAssignedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    <option value="">-- اختياري --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Invoice Summary & 3 Bottom Actions */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-[11px] font-mono text-emerald-600 font-bold">
                  INVOICE BALANCE
                </span>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>ملخص الحساب والفاتورة</span>
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-600 dark:text-stone-400">
                  <span>إجمالي الأصناف:</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                    {totalItemsPrice} {profile.currencySymbol}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-600 dark:text-stone-400">الشحن:</span>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-center font-mono rounded border text-xs font-bold"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-600 dark:text-stone-400">الخصم:</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-center font-mono rounded border text-xs font-bold"
                  />
                </div>

                <div className="pt-2 border-t flex justify-between items-center font-bold text-sm">
                  <span>الصافي المطلوب:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 text-base">
                    {finalTotal} {profile.currencySymbol}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-stone-500">
                  <span>المسدد للخزينة ({safeType === 'main' ? 'الرئيسية' : 'الفرعية'}):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +{effectiveAmountPaid} {profile.currencySymbol}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-rose-600">
                  <span>المتبقي الآجل بذمة العميل:</span>
                  <span className="font-mono">
                    {remaining} {profile.currencySymbol}
                  </span>
                </div>
              </div>

              {/* 3 MANDATORY BOTTOM ACTIONS */}
              <div className="space-y-2 pt-3 border-t">
                {/* 1. [زر حفظ] */}
                <button
                  type="button"
                  onClick={() => handleSaveOrder('save_only')}
                  className="w-full py-3 rounded-2xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>[زر حفظ] اعتماد وتخزين الفاتورة</span>
                </button>

                {/* 2. [زر حفظ وإضافة منتج] */}
                <button
                  type="button"
                  onClick={() => handleSaveOrder('save_and_add')}
                  className="w-full py-2.5 rounded-2xl font-bold text-xs text-stone-800 dark:text-stone-200 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>[زر حفظ وإضافة منتج] تجميع طلبية جديدة</span>
                </button>

                {/* 3. [زر حفظ ومشاركة] */}
                <button
                  type="button"
                  onClick={() => handleSaveOrder('save_and_share')}
                  className="w-full py-2.5 rounded-2xl font-bold text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>[زر حفظ ومشاركة] إرسال فاتورة واتساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ALL ORDERS TABLE */
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-xs text-stone-500">إجمالي الطلبيات المسجلة: {orders.length}</span>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              سجل مبيعات وعمليات الورشة
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b text-stone-500 font-bold">
                  <th className="p-3">رقم الطلبية</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الأصناف المجمعة</th>
                  <th className="p-3">الصافي</th>
                  <th className="p-3">المدفوع</th>
                  <th className="p-3">المتبقي</th>
                  <th className="p-3">الخزينة</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3 font-bold text-stone-400">#{ord.id.slice(-5)}</td>
                    <td className="p-3 font-sans font-bold text-stone-900 dark:text-stone-100">
                      {ord.customerName}
                    </td>
                    <td className="p-3 font-sans text-stone-600 dark:text-stone-300">
                      {ord.items && ord.items.length > 0
                        ? ord.items.map((i: any) => `${i.productName} (${i.quantity})`).join(', ')
                        : 'منتج حرفي'}
                    </td>
                    <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                      {ord.finalTotal} {profile.currencySymbol}
                    </td>
                    <td className="p-3 text-emerald-600">+{ord.amountPaid} {profile.currencySymbol}</td>
                    <td className="p-3 text-rose-600">
                      {ord.remainingAmount > 0 ? `${ord.remainingAmount} ${profile.currencySymbol}` : 'مسدد'}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px]">
                        {ord.safeType === 'main' ? 'خزينة رئيسية' : 'خزينة فرعية'}
                      </span>
                    </td>
                    <td className="p-3 text-stone-400">{ord.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
