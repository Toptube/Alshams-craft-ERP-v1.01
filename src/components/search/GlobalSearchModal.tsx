import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  User,
  Truck,
  Package,
  FileText,
  Hammer,
  Users,
  Boxes,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  CustomerRecord,
  SupplierRecord,
  FinishedProductItem,
  RawMaterialItem,
  InvoiceRecord,
  WorkOrderRecord,
  EmployeeProfile,
} from '../../types';

export interface GlobalSearchDataCache {
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  products: FinishedProductItem[];
  materials: RawMaterialItem[];
  invoices: InvoiceRecord[];
  workOrders: WorkOrderRecord[];
  employees: EmployeeProfile[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cache: GlobalSearchDataCache;
  onSelectResult: (category: string, item: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  cache,
  onSelectResult,
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{
      categoryKey: string;
      categoryName: string;
      icon: any;
      id: string;
      title: string;
      subtitle: string;
      badge?: string;
      rawItem: any;
    }> = [];

    // 1. Customers
    cache.customers.forEach((c) => {
      const cName = c.name || c.fullName || '';
      const cPhone = c.phone || c.phoneNumber || '';
      const cCity = c.city || '';
      const balance = c.currentBalance ?? c.outstandingBalance ?? 0;
      if (cName.toLowerCase().includes(q) || cPhone.includes(q) || cCity.toLowerCase().includes(q)) {
        results.push({
          categoryKey: 'customers',
          categoryName: 'العملاء',
          icon: User,
          id: c.id,
          title: cName || 'عميل',
          subtitle: `هاتف: ${cPhone} • الرصيد: ${balance > 0 ? `عليه ${balance}` : balance < 0 ? `له ${Math.abs(balance)}` : 'خالص'}`,
          badge: 'عميل',
          rawItem: c,
        });
      }
    });

    // 2. Suppliers
    cache.suppliers.forEach((s) => {
      const sName = s.name || s.companyName || '';
      const sPhone = s.phone || s.phoneNumber || '';
      const match =
        (sName && sName.toLowerCase().includes(q)) ||
        (sPhone && sPhone.includes(q)) ||
        (s.materialSpecialty && s.materialSpecialty.toLowerCase().includes(q));
      if (match) {
        results.push({
          categoryKey: 'suppliers',
          categoryName: 'الموردون',
          icon: Truck,
          id: s.id,
          title: sName || 'مورد',
          subtitle: `تخصص: ${s.materialSpecialty || 'عام'} • هاتف: ${sPhone}`,
          badge: 'مورد',
          rawItem: s,
        });
      }
    });

    // 3. Invoices
    cache.invoices.forEach((inv) => {
      const match =
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q));
      if (match) {
        results.push({
          categoryKey: 'invoices',
          categoryName: 'فواتير المبيعات',
          icon: FileText,
          id: inv.id,
          title: `فاتورة #${inv.invoiceNumber} - ${inv.customerName}`,
          subtitle: `الإجمالي: ${inv.totalAmount} ج.م • الحالة: ${inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partially_paid' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}`,
          badge: inv.invoiceNumber,
          rawItem: inv,
        });
      }
    });

    // 4. Products & Materials
    cache.products.forEach((p) => {
      if (p.productName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
        results.push({
          categoryKey: 'products',
          categoryName: 'المنتجات التامة',
          icon: Package,
          id: p.id,
          title: p.productName,
          subtitle: `التصنيف: ${p.category} • الرصيد بالمخزن: ${p.currentStock} قطعة`,
          badge: 'منتج تام',
          rawItem: p,
        });
      }
    });

    cache.materials.forEach((m) => {
      if (m.materialName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
        results.push({
          categoryKey: 'materials',
          categoryName: 'مخزن الخامات',
          icon: Boxes,
          id: m.id,
          title: m.materialName,
          subtitle: `الرصيد: ${m.currentStock} ${m.unit} • متوسط التكلفة: ${m.costPerUnit} ج.م`,
          badge: 'خامة',
          rawItem: m,
        });
      }
    });

    // 5. Work Orders
    cache.workOrders.forEach((wo) => {
      if (wo.orderNumber.toLowerCase().includes(q) || wo.productName.toLowerCase().includes(q)) {
        results.push({
          categoryKey: 'workOrders',
          categoryName: 'أوامر التشغيل',
          icon: Hammer,
          id: wo.id,
          title: `أمر #${wo.orderNumber}: ${wo.productName}`,
          subtitle: `الكمية: ${wo.targetQuantity} • الحالة: ${wo.status === 'completed' ? 'مكتمل' : 'تحت التشغيل'}`,
          badge: wo.orderNumber,
          rawItem: wo,
        });
      }
    });

    // 6. Employees
    cache.employees.forEach((emp) => {
      const eName = emp.fullName || '';
      const ePhone = emp.phone || emp.phoneNumber || '';
      const eRole = emp.role || emp.specialty || '';
      if (eName.toLowerCase().includes(q) || ePhone.includes(q) || eRole.toLowerCase().includes(q)) {
        results.push({
          categoryKey: 'employees',
          categoryName: 'فريق العمل',
          icon: Users,
          id: emp.id,
          title: eName || 'موظف',
          subtitle: `الدور: ${eRole || 'حرفي'} • الراتب الأساسي: ${emp.baseWage || 0} ج.م`,
          badge: 'موظف',
          rawItem: emp,
        });
      }
    });

    return results;
  }, [searchQuery, cache]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-amber-300/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-4 sm:p-6 text-right relative overflow-hidden flex flex-col max-h-[82vh]">
        {/* Search Header Input */}
        <div className="relative flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو رقم الفاتورة أو كود الطلبية..."
              className="w-full px-4 py-3 pr-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 mt-2">
          {!searchQuery.trim() ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30 text-amber-600" />
              <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                ابحث فورياً في كافة أرجاء الورشة
              </p>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                اكتب أي حرف للبحث التلقائي في العملاء والموردين والفواتير والمخزن والموظفين وأوامر التشغيل.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-xs font-bold">
              لا توجد أي نتائج مطابقة لكلمة البحث "{searchQuery}".
            </div>
          ) : (
            filteredResults.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={`${item.categoryKey}_${item.id}`}
                  onClick={() => {
                    onSelectResult(item.categoryKey, item.rawItem);
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-800/80 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 flex-shrink-0">
                    <span>فتح</span>
                    <ArrowRight className="w-3 h-3 rotate-180" />
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400">
          <span>بحث محلي فوري وآمن من الذاكرة دون استهلاك قراءات سحابية إضافية</span>
          <span>{filteredResults.length} نتيجة</span>
        </div>
      </div>
    </div>
  );
};
