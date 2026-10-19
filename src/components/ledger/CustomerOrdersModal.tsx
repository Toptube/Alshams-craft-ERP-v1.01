import React, { useState, useEffect } from 'react';
import { CustomerProfile, CustomerOrder, UserProfile } from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  X,
  Users,
  ShoppingCart,
  Plus,
  Phone,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'new_order'>('orders');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  // Selected customer statement modal view
  const [statementCustomer, setStatementCustomer] = useState<CustomerProfile | null>(null);

  // New order state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderProductName, setOrderProductName] = useState<string>('جدارية مكرمية خاصة');
  const [orderPrice, setOrderPrice] = useState<number>(650);
  const [orderShipping, setOrderShipping] = useState<number>(50);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [orderAmountPaid, setOrderAmountPaid] = useState<number>(300);
  const [orderStatus, setOrderStatus] = useState<any>('in_progress');

  // New customer quick-add
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCity, setNewCustCity] = useState('القاهرة');

  const tenantId = profile.tenantId || profile.workshopId || profile.id || '';

  const loadData = async () => {
    try {
      const custs = await tenantStorage.getCustomers(tenantId);
      const ords = await tenantStorage.getOrders(tenantId);
      setCustomers(custs);
      setOrders(ords);
      if (custs.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: CustomerProfile = {
      id: 'cust_' + Date.now(),
      tenantId,
      fullName: newCustName.trim(),
      phoneNumber: newCustPhone.trim() || '01000000000',
      city: newCustCity.trim(),
      totalPurchases: 0,
      outstandingBalance: 0,
      createdAt: Date.now(),
    };

    await tenantStorage.saveCustomer(newCust);
    setIsAddingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    loadData();
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    const finalTotal = Math.max(0, orderPrice + orderShipping - orderDiscount);
    const remaining = Math.max(0, finalTotal - orderAmountPaid);
    const paymentStatus =
      remaining === 0 ? 'paid' : orderAmountPaid > 0 ? 'deposit' : 'pending';

    const newOrder: CustomerOrder = {
      id: 'ord_' + Date.now(),
      tenantId,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phoneNumber,
      productName: orderProductName.trim(),
      price: orderPrice,
      items: [
        {
          productId: 'custom',
          productName: orderProductName.trim() || 'منتج هاند ميد',
          category: 'عام',
          quantity: 1,
          unitPrice: orderPrice,
          totalPrice: orderPrice,
        },
      ],
      totalItemsPrice: orderPrice,
      shippingCost: orderShipping,
      discount: orderDiscount,
      finalTotal,
      safeType: 'main',
      paymentMethod: 'cash',
      paymentStatus,
      amountPaid: orderAmountPaid,
      remainingAmount: remaining,
      date: new Date().toISOString().split('T')[0],
      status: orderStatus,
      createdAt: Date.now(),
    };

    await tenantStorage.saveOrder(newOrder);
    loadData();
    setActiveTab('orders');
  };

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
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <span>دفتر حسابات العملاء والمبيعات (Customers Ledger & Statements)</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              متابعة كشوف حساب العملاء، الدفعات، العربون، وتسليم الطلبيات
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="mt-4 flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders');
              setStatementCustomer(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'orders' && !statementCustomer
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            الطلبيات والمبيعات ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('customers');
              setStatementCustomer(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'customers' && !statementCustomer
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            سجل العملاء والأرصدة ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('new_order');
              setStatementCustomer(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'new_order'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تسجيل طلبية بيع جديدة</span>
          </button>
        </div>

        {/* VIEW: Customer Statement if selected */}
        {statementCustomer ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300">
              <button
                type="button"
                onClick={() => setStatementCustomer(null)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                ← العودة لسجل العملاء
              </button>
              <div className="text-right">
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  كشف حساب تفصيلي: {statementCustomer.fullName}
                </h3>
                <p className="text-xs text-stone-500 font-mono" dir="ltr">
                  {statementCustomer.phoneNumber} • {statementCustomer.city}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border">
                <span className="text-xs text-stone-500 block">إجمالي التعاملات</span>
                <span className="text-lg font-mono font-black text-stone-900 dark:text-stone-100">
                  {statementCustomer.totalPurchases} {profile.currencySymbol}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300">
                <span className="text-xs text-amber-700 dark:text-amber-300 block font-bold">
                  المتبقي بذمة العميل (الرصيد المعلق)
                </span>
                <span className="text-lg font-mono font-black text-rose-600">
                  {statementCustomer.outstandingBalance} {profile.currencySymbol}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-stone-500 font-bold">
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">المنتج</th>
                    <th className="p-2">الإجمالي</th>
                    <th className="p-2">المدفوع</th>
                    <th className="p-2">المتبقي</th>
                    <th className="p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                  {orders
                    .filter((o) => o.customerId === statementCustomer.id)
                    .map((o) => (
                      <tr key={o.id}>
                        <td className="p-2 text-stone-400">{o.date}</td>
                        <td className="p-2 font-sans font-bold">{o.productName}</td>
                        <td className="p-2">{o.finalTotal} {profile.currencySymbol}</td>
                        <td className="p-2 text-emerald-600">+{o.amountPaid} {profile.currencySymbol}</td>
                        <td className="p-2 text-rose-600">{o.remainingAmount} {profile.currencySymbol}</td>
                        <td className="p-2 font-sans">
                          <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px]">
                            {o.paymentStatus === 'paid' ? 'خالص' : 'عربون معلق'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="mt-4 space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-xs">
                    لا توجد طلبيات بيع مسجلة بعد.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b text-stone-500 font-bold">
                          <th className="p-2.5">العميل</th>
                          <th className="p-2.5">المنتج</th>
                          <th className="p-2.5">السعر</th>
                          <th className="p-2.5">الشحن</th>
                          <th className="p-2.5">الصافي</th>
                          <th className="p-2.5">المدفوع</th>
                          <th className="p-2.5">المتبقي</th>
                          <th className="p-2.5">حالة التنفيذ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {orders.map((o) => (
                          <tr key={o.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                            <td className="p-2.5 font-bold text-stone-900 dark:text-stone-100">
                              {o.customerName}
                            </td>
                            <td className="p-2.5 text-stone-600 dark:text-stone-300">
                              {o.productName}
                            </td>
                            <td className="p-2.5 font-mono">{o.price} {profile.currencySymbol}</td>
                            <td className="p-2.5 font-mono text-stone-400">
                              {o.shippingCost ? `+${o.shippingCost}` : '-'}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                              {o.finalTotal} {profile.currencySymbol}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-600 font-bold">
                              {o.amountPaid} {profile.currencySymbol}
                            </td>
                            <td className="p-2.5 font-mono text-rose-600 font-bold">
                              {(o.remainingAmount ?? 0) > 0 ? `${o.remainingAmount} ${profile.currencySymbol}` : 'خالص'}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.status === 'ready'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.status === 'delivered'
                                  ? 'تم التسليم'
                                  : o.status === 'ready'
                                  ? 'جاهز للتسليم'
                                  : 'قيد التنفيذ'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white"
                  >
                    + إضافة عميل جديد
                  </button>
                  <span className="text-xs text-stone-500">قائمة العملاء المعتمدين</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-stone-400">{c.city}</span>
                          <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                            {c.fullName}
                          </h4>
                        </div>
                        <p className="text-stone-500 font-mono mt-0.5 text-left" dir="ltr">
                          {c.phoneNumber}
                        </p>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setStatementCustomer(c)}
                          className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold text-[11px] hover:bg-amber-200 transition"
                        >
                          كشف الحساب التفصيلي
                        </button>
                        <div className="text-left font-mono">
                          <span className="text-[10px] text-stone-400 block">المتبقي:</span>
                          <span
                            className={
                              (c.outstandingBalance || 0) > 0
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-600'
                            }
                          >
                            {c.outstandingBalance || 0} {profile.currencySymbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NEW ORDER TAB */}
            {activeTab === 'new_order' && (
              <form onSubmit={handleCreateOrder} className="mt-4 space-y-4 max-w-xl mx-auto">
                <div>
                  <label className="block text-xs font-bold mb-1">العميل *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">اسم المنتج أو الطلبية *</label>
                  <input
                    type="text"
                    required
                    value={orderProductName}
                    onChange={(e) => setOrderProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">سعر المنتج</label>
                    <input
                      type="number"
                      required
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">الشحن</label>
                    <input
                      type="number"
                      value={orderShipping}
                      onChange={(e) => setOrderShipping(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">الخصم</label>
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={(e) => setOrderDiscount(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">المدفوع حالياً (العربون)</label>
                    <input
                      type="number"
                      value={orderAmountPaid}
                      onChange={(e) => setOrderAmountPaid(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">حالة الطلبية</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                    >
                      <option value="in_progress">قيد التنفيذ في الورشة</option>
                      <option value="ready">جاهز للشحن أو الاستلام</option>
                      <option value="delivered">تم التسليم</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs flex justify-between font-bold">
                  <span>الإجمالي الصافي:</span>
                  <span className="font-mono">
                    {Math.max(0, orderPrice + orderShipping - orderDiscount)} {profile.currencySymbol}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 transition"
                >
                  حفظ الطلبية وترحيلها لحساب العميل
                </button>
              </form>
            )}
          </>
        )}

        {/* Modal for adding customer */}
        {isAddingCustomer && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form
              onSubmit={handleCreateCustomer}
              className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-300 dark:border-stone-700 w-full max-w-sm space-y-3 text-right"
            >
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 pb-2 border-b">
                إضافة عميل جديد للدفتر
              </h3>
              <div>
                <label className="block text-xs font-bold mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">المدينة / الحي</label>
                <input
                  type="text"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-xl font-bold"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
