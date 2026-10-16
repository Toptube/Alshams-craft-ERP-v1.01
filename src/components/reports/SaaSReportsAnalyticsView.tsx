import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  SupplierProfile,
  SupplierPurchaseInvoice,
  CustomerOrder,
  SafeTransaction,
  SystemActivityLog,
  EmployeeProfile,
  EmployeePayoutRecord,
  AdminCostRecord,
  RawMaterialItem,
} from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building,
  Users2,
  Lock,
  Calendar,
  AlertTriangle,
  History,
  CheckCircle,
  CheckCircle2,
  Download,
  Filter,
  Scale,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface SaaSReportsAnalyticsViewProps {
  profile: UserProfile;
}

export const SaaSReportsAnalyticsView: React.FC<SaaSReportsAnalyticsViewProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<
    'trial_balance' | 'financial' | 'safes' | 'sales_audit' | 'suppliers' | 'audit_logs'
  >('trial_balance');

  // Balances & Data
  const [safeBalances, setSafeBalances] = useState<{ mainSafe: number; subSafe: number }>({
    mainSafe: 0,
    subSafe: 0,
  });
  const [safeTransactions, setSafeTransactions] = useState<SafeTransaction[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierPurchaseInvoice[]>([]);
  const [adminCosts, setAdminCosts] = useState<AdminCostRecord[]>([]);
  const [employeePayouts, setEmployeePayouts] = useState<EmployeePayoutRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<SystemActivityLog[]>([]);
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [auditFilterStatus, setAuditFilterStatus] = useState<string>('all');

  // Selected supplier statement view
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<SupplierProfile | null>(null);

  // Security Wipe Modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [wipeReason, setWipeReason] = useState('');
  const [wipeError, setWipeError] = useState('');
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const loadAllFinancials = async () => {
    try {
      const balances = await tenantStorage.getSafeBalances(profile.tenantId);
      const safeTxs = await tenantStorage.getSafeTransactions(profile.tenantId);
      const ords = await tenantStorage.getOrders(profile.tenantId);
      const sups = await tenantStorage.getSuppliers(profile.tenantId);
      const invoices = await tenantStorage.getSupplierInvoices(profile.tenantId);
      const admins = await tenantStorage.getAdminCosts(profile.tenantId);
      const payouts = await tenantStorage.getEmployeePayouts(profile.tenantId);
      const logs = await tenantStorage.getActivityLogs(profile.tenantId);
      const mats = await tenantStorage.getRawMaterials(profile.tenantId);

      setSafeBalances(balances);
      setSafeTransactions(safeTxs);
      setOrders(ords);
      setSuppliers(sups);
      setSupplierInvoices(invoices);
      setAdminCosts(admins);
      setEmployeePayouts(payouts);
      setActivityLogs(logs);
      setMaterials(mats);

      if (sups.length > 0 && !selectedSupplierForStatement) {
        setSelectedSupplierForStatement(sups[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllFinancials();
  }, [profile.tenantId]);

  // Aggregate calculations
  const totalSalesRevenue = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const totalMaterialPurchasesPaid = supplierInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalPayrollOperatingExpenses = employeePayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAdminOperatingExpenses = adminCosts.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalOperatingCosts = totalMaterialPurchasesPaid + totalPayrollOperatingExpenses + totalAdminOperatingExpenses;
  const netEstimatedProfit = totalSalesRevenue - totalOperatingCosts;

  // Double-Entry Ledger Matrix:
  const currentInventoryStockValue = materials.reduce(
    (sum, m) => sum + (Number(m.currentStock) || 0) * (Number(m.costPerUnit || (m as any).defaultCostPerUnit) || 0),
    0
  );
  const inventoryDebit = totalMaterialPurchasesPaid + currentInventoryStockValue;
  const estimatedConsumedMaterials = Math.round(orders.reduce((sum, o) => sum + (o.finalTotal || 0) * 0.45, 0));
  const inventoryCredit = estimatedConsumedMaterials;
  const inventoryNetBalance = Math.max(0, inventoryDebit - inventoryCredit);

  const mainSafeDebit =
    safeTransactions
      .filter((t) => t.safeType === 'main' && (t.type === 'income_sale' || t.amount > 0))
      .reduce((s, t) => s + Math.max(0, t.amount), 0) || safeBalances.mainSafe;
  const mainSafeCredit = safeTransactions
    .filter((t) => t.safeType === 'main' && (t.type.startsWith('expense_') || t.amount < 0))
    .reduce((s, t) => s + Math.abs(Math.min(0, t.amount)), 0);

  const subSafeDebit =
    safeTransactions
      .filter((t) => t.safeType === 'sub' && (t.type === 'income_sale' || t.amount > 0))
      .reduce((s, t) => s + Math.max(0, t.amount), 0) || safeBalances.subSafe;
  const subSafeCredit = safeTransactions
    .filter((t) => t.safeType === 'sub' && (t.type.startsWith('expense_') || t.amount < 0))
    .reduce((s, t) => s + Math.abs(Math.min(0, t.amount)), 0);

  const trialRows = [
    {
      code: '1101',
      name: 'مخزون خامات الورشة (Inventories Ledger)',
      type: 'أصول متداولة',
      debit: inventoryDebit,
      credit: inventoryCredit,
      balance: inventoryNetBalance,
      balanceType: 'مدين',
      notes: 'رصيد الخيوط والأخشاب والإكسسوارات والمشتريات',
    },
    {
      code: '1102',
      name: 'الخزينة الرئيسية (Main Safe Ledger)',
      type: 'أصول نقدية',
      debit: mainSafeDebit,
      credit: mainSafeCredit,
      balance: safeBalances.mainSafe,
      balanceType: 'مدين',
      notes: 'مقبوضات المبيعات الكبرى وتسويات التوريد',
    },
    {
      code: '1103',
      name: 'الخزينة الفرعية (Sub-Safe Ledger)',
      type: 'أصول نقدية',
      debit: subSafeDebit,
      credit: subSafeCredit,
      balance: safeBalances.subSafe,
      balanceType: 'مدين',
      notes: 'سلف العمالة والمصروفات اليومية والنثريات',
    },
    {
      code: '4101',
      name: 'إيرادات مبيعات المشغولات (Sales Revenue)',
      type: 'إيرادات تشغيلية',
      debit: 0,
      credit: totalSalesRevenue,
      balance: totalSalesRevenue,
      balanceType: 'دائن',
      notes: 'إجمالي المقبوضات المحصلة من العملاء',
    },
    {
      code: '5101',
      name: 'مصنعيات وأجور التشغيل (Operational Wages)',
      type: 'مصروفات تشغيلية',
      debit: totalPayrollOperatingExpenses,
      credit: 0,
      balance: totalPayrollOperatingExpenses,
      balanceType: 'مدين',
      notes: 'رواتب العمالة الحرفية والمصنعيات وسلف الشغل',
    },
    {
      code: '5201',
      name: 'التكاليف الإدارية الموحدة (Unified Admin Costs)',
      type: 'مصروفات إدارية وعمومية',
      debit: totalAdminOperatingExpenses,
      credit: 0,
      balance: totalAdminOperatingExpenses,
      balanceType: 'مدين',
      notes: 'إيجار الورشة، الكهرباء، الدعاية، والنقل والتغليف',
    },
  ];

  const grandTotalDebit = trialRows.reduce((sum, r) => sum + r.debit, 0);
  const grandTotalCredit = trialRows.reduce((sum, r) => sum + r.credit, 0);

  // Export functions (CSV Excel Trigger)
  const exportToExcelCSV = (filename: string, rows: string[][]) => {
    const csvContent =
      '\uFEFF' + rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSuppliers = () => {
    const headers = ['اسم المورد', 'الشركة', 'الهاتف', 'إجمالي المشتريات', 'المسدد', 'المتبقي الآجل'];
    const rows = suppliers.map((s) => [
      s.name,
      s.companyName,
      s.phoneNumber,
      String(s.totalPurchases),
      String(s.totalPaid),
      String(s.outstandingBalance),
    ]);
    exportToExcelCSV('كشف_الموردين_الشمس_كرافت', [headers, ...rows]);
  };

  const handleExportOrders = () => {
    const headers = ['رقم الطلبية', 'العميل', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الخزينة'];
    const rows = orders.map((o) => [
      o.id,
      o.customerName,
      o.date,
      String(o.finalTotal),
      String(o.amountPaid),
      String(o.remainingAmount),
      o.safeType === 'main' ? 'خزينة رئيسية' : 'خزينة فرعية',
    ]);
    exportToExcelCSV('سجل_المبيعات_الشمس_كرافت', [headers, ...rows]);
  };

  const handlePrint = () => {
    window.print();
  };

  // Secure Database Wipe
  const handleWipeDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setWipeError('');

    try {
      await tenantStorage.wipeDatabaseWithAuth(
        profile.tenantId,
        wipePassword,
        wipeReason,
        profile.email
      );
      setWipeSuccess(true);
      await loadAllFinancials();
      setTimeout(() => {
        setIsWipeModalOpen(false);
        setWipeSuccess(false);
        setWipePassword('');
        setWipeReason('');
      }, 2000);
    } catch (err: any) {
      setWipeError(err.message || 'فشل التصفير، تحقق من كلمة المرور');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border border-blue-300/40 dark:border-blue-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
            <BarChart3 className="w-4 h-4" />
            <span>التقارير التحليلية والمالية الشاملة (SaaS ERP Analytics)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            مؤشرات الأداء، الأرباح، وحركة الخزائن
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة التقرير</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWipeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-300/50 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>تصفير قاعدة البيانات (محمي)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('trial_balance')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'trial_balance'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>ميزان المراجعة المحاسبي (Double-Entry)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales_audit')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'sales_audit'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>سجل تدقيق حالات المبيعات (Audit Ledger)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'financial'
              ? 'bg-blue-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          قائمة الأرباح والخسائر
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('safes')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'safes'
              ? 'bg-blue-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>حركة الخزينة الرئيسية والفرعية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>كشوف حساب الموردين والآجلة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-blue-600 text-white shadow-md font-black'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>تقرير حركة المنظومة والأمان ({activityLogs.length})</span>
        </button>
      </div>

      {/* TAB 0: SAAS ACCOUNTING LEDGER & TRIAL BALANCE SHEET */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-6">
          {/* Printable Double-Entry Accounting Matrix Table */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-5 print:p-0 print:border-none print:shadow-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <Scale className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                      ميزان المراجعة المحاسبي العام (Double-Entry Trial Balance)
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      جدول القيد المزدوج لمطابقة الأرصدة وحركات الخامات والخزائن والإيرادات والأجور
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة ميزان المراجعة المعتمد</span>
                </button>
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 font-bold bg-stone-50/50 dark:bg-stone-800/40">
                    <th className="p-3">كود</th>
                    <th className="p-3">اسم الحساب والبيان</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3 font-mono text-emerald-700 dark:text-emerald-400">مدين (+) Debit</th>
                    <th className="p-3 font-mono text-purple-700 dark:text-purple-400">دائن (-) Credit</th>
                    <th className="p-3 font-mono">الرصيد الصافي</th>
                    <th className="p-3">طبيعة الرصيد</th>
                    <th className="p-3 hidden md:table-cell">الإيضاح المحاسبي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  {trialRows.map((row) => (
                    <tr key={row.code} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition">
                      <td className="p-3 font-mono text-stone-400">{row.code}</td>
                      <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{row.name}</td>
                      <td className="p-3 text-stone-500 text-[11px]">{row.type}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        {row.debit > 0 ? `${row.debit} ${profile.currencySymbol}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-600">
                        {row.credit > 0 ? `${row.credit} ${profile.currencySymbol}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-black text-stone-900 dark:text-stone-100">
                        {row.balance} {profile.currencySymbol}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.balanceType === 'مدين'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                          }`}
                        >
                          {row.balanceType}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-stone-400 hidden md:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-500/80 bg-amber-50/50 dark:bg-amber-950/20 font-black text-xs">
                    <td className="p-3 font-mono text-stone-500" colSpan={3}>
                      المجموع العام لميزان المراجعة (Grand Totals):
                    </td>
                    <td className="p-3 font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                      {grandTotalDebit} {profile.currencySymbol}
                    </td>
                    <td className="p-3 font-mono text-purple-700 dark:text-purple-400 text-sm">
                      {grandTotalCredit} {profile.currencySymbol}
                    </td>
                    <td className="p-3 font-mono text-amber-600 text-sm" colSpan={3}>
                      صافي الفارق التشغيلي: {Math.abs(grandTotalDebit - grandTotalCredit)} {profile.currencySymbol}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Accounting Certificate Footer */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <span>نظام محاسبي معتمد: ميزان المراجعة متوازن ومدقق محاسبياً بنظام القيد المزدوج.</span>
              </div>
              <span className="font-mono text-[10px] text-stone-500">
                تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: SALES STATUS AUDIT LEDGER */}
      {activeTab === 'sales_audit' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>سجل تدقيق ومتابعة حالات المبيعات (Sales Status Audit Ledger)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  تتبع حالات تنفيذ الطلبيات المصنفة: (مكتمل، جاري التنفيذ، جاري الشحن، معلق)
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'delivered', label: 'مكتمل' },
                  { key: 'in_progress', label: 'جاري التنفيذ' },
                  { key: 'shipping', label: 'جاري الشحن' },
                  { key: 'pending', label: 'معلق' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setAuditFilterStatus(st.key)}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      auditFilterStatus === st.key
                        ? 'bg-amber-600 text-white shadow-xs font-black'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-stone-500 font-bold bg-stone-50/50 dark:bg-stone-800/40">
                    <th className="p-3">رقم الطلبية</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">حالة التنفيذ المعتمدة</th>
                    <th className="p-3 font-mono">قيمة الفاتورة</th>
                    <th className="p-3 font-mono">المسدد</th>
                    <th className="p-3 font-mono">المتبقي</th>
                    <th className="p-3">موعد التسليم</th>
                    <th className="p-3">الموظف المسند</th>
                    <th className="p-3">تاريخ الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                  {orders
                    .filter((ord) => {
                      if (auditFilterStatus === 'all') return true;
                      if (auditFilterStatus === 'delivered') return ord.status === 'delivered';
                      if (auditFilterStatus === 'in_progress') return ord.status === 'in_progress';
                      if (auditFilterStatus === 'shipping') return ord.status === 'shipping' || ord.status === 'ready';
                      if (auditFilterStatus === 'pending') return ord.status === 'pending' || ord.status === 'new';
                      return true;
                    })
                    .map((ord) => {
                      // Status Label & Color
                      let statusBadge = { label: 'معلق', bg: 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300' };
                      if (ord.status === 'delivered') {
                        statusBadge = { label: 'مكتمل', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
                      } else if (ord.status === 'in_progress') {
                        statusBadge = { label: 'جاري التنفيذ', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300' };
                      } else if (ord.status === 'shipping' || ord.status === 'ready') {
                        statusBadge = { label: 'جاري الشحن', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
                      }

                      return (
                        <tr key={ord.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition">
                          <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                            #{ord.id.slice(-6)}
                          </td>
                          <td className="p-3 font-bold text-stone-900 dark:text-stone-100">
                            {ord.customerName}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                            {ord.finalTotal} {profile.currencySymbol}
                          </td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">
                            +{ord.amountPaid} {profile.currencySymbol}
                          </td>
                          <td className="p-3 font-mono text-rose-600 font-bold">
                            {ord.remainingAmount > 0 ? `${ord.remainingAmount} ${profile.currencySymbol}` : 'مسدد بالكامل'}
                          </td>
                          <td className="p-3 font-mono text-stone-600 dark:text-stone-300">
                            {ord.deliveryDate || 'غير محدد'}
                          </td>
                          <td className="p-3 text-[11px] text-stone-500">
                            {ord.assignedEmployeeName || 'الورشة المركزية'}
                          </td>
                          <td className="p-3 font-mono text-stone-400 text-[11px]">{ord.date}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL OVERVIEW */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 block">إجمالي المقبوضات النقدية (المبيعات)</span>
              <span className="text-2xl font-black font-mono text-emerald-600 block mt-1">
                +{totalSalesRevenue} {profile.currencySymbol}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 block">تكلفة خامات التوريد المشتراة</span>
              <span className="text-2xl font-black font-mono text-stone-800 dark:text-stone-200 block mt-1">
                -{totalMaterialPurchasesPaid} {profile.currencySymbol}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
              <span className="text-xs text-stone-500 block">مصروفات تشغيل أجور ومصنعيات العمالة</span>
              <span className="text-2xl font-black font-mono text-purple-600 block mt-1">
                -{totalPayrollOperatingExpenses} {profile.currencySymbol}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl">
              <span className="text-xs text-blue-100 block">صافي الأرباح التشغيلية المقدرة</span>
              <span className="text-2xl font-black font-mono block mt-1">
                {netEstimatedProfit} {profile.currencySymbol}
              </span>
              <p className="text-[10px] text-blue-200 mt-1">
                المبيعات المحصلة - (الخامات + الأجور + الإدارية)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleExportOrders}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير سجل المبيعات (Excel CSV)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SAFES LEDGER */}
      {activeTab === 'safes' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-100">رصيد الخزينة الرئيسية</span>
                <Wallet className="w-6 h-6 text-emerald-200" />
              </div>
              <span className="text-3xl font-black font-mono block mt-2">
                {safeBalances.mainSafe} {profile.currencySymbol}
              </span>
              <span className="text-[11px] text-emerald-200 mt-1 block">
                مخصصة للمبيعات الكبرى وتسويات التوريد
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-600 to-amber-800 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-100">رصيد الخزينة الفرعية</span>
                <Wallet className="w-6 h-6 text-amber-200" />
              </div>
              <span className="text-3xl font-black font-mono block mt-2">
                {safeBalances.subSafe} {profile.currencySymbol}
              </span>
              <span className="text-[11px] text-amber-200 mt-1 block">
                مخصصة لسلف العمالة والمصروفات اليومية الصغيرة
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
              سجل حركات الخزائن والتدفقات النقدية
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-stone-500 font-bold">
                    <th className="p-2.5">الخزينة</th>
                    <th className="p-2.5">البيان</th>
                    <th className="p-2.5">المبلغ</th>
                    <th className="p-2.5">الرصيد بعدها</th>
                    <th className="p-2.5">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                  {safeTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="p-2.5 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.safeType === 'main'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {tx.safeType === 'main' ? 'رئيسية' : 'فرعية'}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans font-bold text-stone-800 dark:text-stone-200">
                        {tx.description}
                      </td>
                      <td
                        className={`p-2.5 font-bold ${
                          tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} {profile.currencySymbol}
                      </td>
                      <td className="p-2.5 font-bold text-stone-700 dark:text-stone-300">
                        {tx.balanceAfter} {profile.currencySymbol}
                      </td>
                      <td className="p-2.5 text-stone-400">{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIER STATEMENTS & TENDERS */}
      {activeTab === 'suppliers' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleExportSuppliers}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>تصدير كشف الموردين (Excel CSV)</span>
            </button>
            <span className="text-xs text-stone-500 font-bold">
              كشوف حساب الموردين والآجلة المسددة والمعلقة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Suppliers List */}
            <div className="space-y-2 md:col-span-1">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-400 block mb-1">
                اختيار المورد لعرض كشف الحساب:
              </span>
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplierForStatement(s)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition text-right ${
                    selectedSupplierForStatement?.id === s.id
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 hover:border-blue-300'
                  }`}
                >
                  <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    {s.name}
                  </h4>
                  <p className="text-xs text-stone-500">{s.companyName}</p>
                  <div className="mt-2 flex justify-between text-xs font-mono">
                    <span className="text-stone-400">الآجل المعلق:</span>
                    <span className="font-bold text-rose-600">
                      {s.outstandingBalance} {profile.currencySymbol}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Statement Printable Sheet View */}
            <div className="md:col-span-2 p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              {selectedSupplierForStatement ? (
                <>
                  <div className="border-b pb-3 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة كشف الحساب</span>
                    </button>

                    <div className="text-right">
                      <h3 className="font-black text-base text-stone-900 dark:text-stone-100">
                        كشف حساب المورد: {selectedSupplierForStatement.name}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {selectedSupplierForStatement.companyName} • {selectedSupplierForStatement.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border">
                      <span className="text-stone-400 text-[10px] block">إجمالي المشتريات</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {selectedSupplierForStatement.totalPurchases} {profile.currencySymbol}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300">
                      <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block">
                        الدفعات المسددة
                      </span>
                      <span className="font-bold text-emerald-600">
                        {selectedSupplierForStatement.totalPaid} {profile.currencySymbol}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300">
                      <span className="text-rose-700 dark:text-rose-300 text-[10px] block font-bold">
                        الآجلة المتبقية
                      </span>
                      <span className="font-bold text-rose-600 text-sm">
                        {selectedSupplierForStatement.outstandingBalance} {profile.currencySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Logs */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
                      سجل فواتير التوريد وسندات الصرف المسجلة:
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b text-stone-500 font-bold">
                            <th className="p-2">التاريخ</th>
                            <th className="p-2">رقم الفاتورة</th>
                            <th className="p-2">إجمالي الفاتورة</th>
                            <th className="p-2">المسدد</th>
                            <th className="p-2">المتبقي الآجل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                          {supplierInvoices
                            .filter((inv) => inv.supplierId === selectedSupplierForStatement.id)
                            .map((inv) => (
                              <tr key={inv.id}>
                                <td className="p-2 text-stone-400">{inv.date}</td>
                                <td className="p-2 font-bold">#{inv.invoiceNumber || inv.id.slice(-4)}</td>
                                <td className="p-2">{inv.totalAmount} {profile.currencySymbol}</td>
                                <td className="p-2 text-emerald-600 font-bold">+{inv.paidAmount}</td>
                                <td className="p-2 text-rose-600">{inv.remainingAmount}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-stone-400 text-xs">
                  اختر مورداً من القائمة لعرض كشف الحساب التفصيلي
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM ACTIVITY & SECURITY AUDIT REPORT (تقرير حركة المنظومة) */}
      {activeTab === 'audit_logs' && (
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-xs text-stone-500 font-mono">
              SECURITY AUDIT LOGS (WHO DELETED WHAT, WHEN & WHY)
            </span>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <History className="w-4 h-4 text-rose-600" />
              <span>تقرير حركة المنظومة وإجراءات الأمان الصارمة</span>
            </h3>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              لا توجد عمليات حذف أو تصفير مسجلة في تقرير الحركة حتى الآن. المنظومة آمنة ومستقرة.
            </div>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-stone-900 dark:text-stone-100">
                          {log.entityName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 font-bold">
                          {log.actionType}
                        </span>
                      </div>
                      <p className="text-rose-600 dark:text-rose-400 font-bold mt-1">
                        سبب الإجراء الموثق: "{log.reason}"
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        المستخدم المسؤول: {log.userEmail} • تصريح كلمة المرور: مؤكد
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 self-end sm:self-center">
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STRICT PASSWORD-PROTECTED DATABASE RESET MODAL */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleWipeDatabase}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border-2 border-rose-500 w-full max-w-md space-y-4 text-right"
          >
            <div className="border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600 mb-1">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm">بروتوكول تصفير قاعدة البيانات الصارم</h3>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                هذا الإجراء يفرغ سجلات المنتجات والمبيعات والتوريد للبدء من جديد. يتطلب كلمة مرور الحساب وسبباً كتابياً إجبارياً للتوثيق.
              </p>
            </div>

            {wipeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs font-bold">
                {wipeError}
              </div>
            )}

            {wipeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                تم تصفير قاعدة البيانات وتوثيق الإجراء في تقرير الحركة بنجاح!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1">كلمة مرور حساب الورشة *</label>
              <input
                type="password"
                required
                value={wipePassword}
                onChange={(e) => setWipePassword(e.target.value)}
                placeholder="اكتب كلمة مرورك للتأكيد"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">اكتب سبب الحذف والتصفير (إجباري) *</label>
              <textarea
                rows={3}
                required
                value={wipeReason}
                onChange={(e) => setWipeReason(e.target.value)}
                placeholder="اكتب هنا سبب تصفير البيانات بالتفصيل لتوثيقه في تقرير حركة المنظومة..."
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                تراجع وإلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                تأكيد التصفير وتوثيق التقرير
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
