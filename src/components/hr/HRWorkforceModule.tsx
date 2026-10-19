import React, { useState, useEffect } from 'react';
import {
  EmployeeProfile,
  EmployeePayoutRecord,
  UserProfile,
  EmployeeTier,
  EmployeePaymentType,
  SafeType,
  PaymentMethod,
} from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import {
  Users2,
  UserPlus,
  DollarSign,
  Award,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle,
  AlertCircle,
  Wallet,
  TrendingDown,
  Building,
} from 'lucide-react';

interface HRWorkforceModuleProps {
  profile: UserProfile;
  onOpenNewEmployeeModal: () => void;
}

export const HRWorkforceModule: React.FC<HRWorkforceModuleProps> = ({
  profile,
  onOpenNewEmployeeModal,
}) => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [payouts, setPayouts] = useState<EmployeePayoutRecord[]>([]);

  // Payout / Advance settlement state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [payoutType, setPayoutType] = useState<'wage_payout' | 'advance' | 'bonus' | 'salary'>('wage_payout');
  const [payoutAmount, setPayoutAmount] = useState<number>(300);
  const [safeType, setSafeType] = useState<SafeType>('main');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [payoutNotes, setPayoutNotes] = useState<string>('تسوية مستحقات مصنعية القطع المشغولة');

  const [notice, setNotice] = useState<string>('');

  const tenantId = profile.tenantId || profile.workshopId || profile.id || '';

  const loadData = async () => {
    try {
      const emps = await tenantStorage.getEmployees(tenantId);
      const payRecs = await tenantStorage.getEmployeePayouts(tenantId);
      setEmployees(emps);
      setPayouts(payRecs);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  // Record payout or advance with automatic operating expense binding & safe deduction
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || payoutAmount <= 0) return;

    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;

    try {
      const payoutRecord: EmployeePayoutRecord = {
        id: 'pay_' + Date.now(),
        tenantId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        type: payoutType,
        amount: payoutAmount,
        safeType,
        paymentMethod,
        date: new Date().toISOString().split('T')[0],
        notes: payoutNotes,
        registeredAsOperatingExpense: true,
        createdAt: Date.now(),
      };

      await tenantStorage.recordEmployeePayout(payoutRecord);
      await loadData();
      setIsPayoutModalOpen(false);
      setPayoutNotes('');
      setNotice(`تم سداد ${payoutAmount} ${profile.currencySymbol} للموظف ${emp.fullName} وترحيلها كمصروفات تشغيلية وخصمها من الخزينة!`);
      setTimeout(() => setNotice(''), 3500);
    } catch (err: any) {
      setNotice(err.message || 'فشل تسجيل الصرف');
    }
  };

  const totalPersonnelWagesSettled = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getTierBadge = (tier: EmployeeTier) => {
    switch (tier) {
      case 'مدرب':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      case 'خبير':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'متوسط':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent border border-purple-300/40 dark:border-purple-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-400">
            <Users2 className="w-4 h-4" />
            <span>إدارة الموارد البشرية وكادرات الحرفيين (HR & Payroll Finance)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            منظومة كادرات العمالة ومصروفات التشغيل
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>صرف مصنعية / سلفة موظف</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewEmployeeModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ تعيين موظف / فنان</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">إجمالي كادر العمالة النشط</span>
            <span className="text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
              {employees.length} فنانين
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">إجمالي المصروفات التشغيلية للأجور المسددة</span>
            <span className="text-2xl font-black font-mono text-emerald-600">
              {totalPersonnelWagesSettled} {profile.currencySymbol}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">أرصدة مستحقات الحرفيين المعلقة</span>
            <span className="text-2xl font-black font-mono text-amber-600">
              {employees.reduce((s, e) => s + (e.currentBalance || 0), 0)} {profile.currencySymbol}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Employees Roster Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
          سجل الفنانين والموظفين وتصنيف الكادرات
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between gap-4 text-right"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getTierBadge(
                      emp.tier || ''
                    )}`}
                  >
                    كادر {emp.tier || 'عادي'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {emp.paymentType === 'piece_rate' ? 'مصنعية بالقطعة' : 'راتب شهري ثابت'}
                  </span>
                </div>

                <h4 className="text-base font-black text-stone-900 dark:text-stone-100">
                  {emp.fullName}
                </h4>
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mt-0.5">
                  التخصص: {emp.specialty || emp.role}
                </p>
                <p className="text-xs text-stone-500 font-mono mt-1" dir="ltr">
                  {emp.phoneNumber || emp.phone}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-stone-400 block">إجمالي المستحق:</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {emp.totalEarned || 0} {profile.currencySymbol}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block">الرصيد القائم للصرف:</span>
                  <span
                    className={`font-black ${
                      (emp.currentBalance || 0) > 0 ? 'text-amber-600' : 'text-stone-400'
                    }`}
                  >
                    {emp.currentBalance || 0} {profile.currencySymbol}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Modal with Operating Expense Binding */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleRecordPayout}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-purple-300 dark:border-stone-700 w-full max-w-lg space-y-4 text-right"
          >
            <div className="border-b pb-3">
              <h3 className="text-sm font-extrabold text-purple-900 dark:text-purple-300">
                تسوية أجر أو صرف سلفة للموظف (تسجيل مصروف تشغيلي)
              </h3>
              <p className="text-[11px] text-stone-500">
                يتم قيد المبلغ تلقائياً في قائمة الأرباح والخسائر كمصروف تشغيلي وخصمه من رصيد الخزينة المحددة
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">الموظف / الفنان *</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} (كادر {e.tier} — رصيده المستحق: {e.currentBalance} {profile.currencySymbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">نوع الحركة *</label>
                <select
                  value={payoutType}
                  onChange={(e) => setPayoutType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="wage_payout">صرف مصنعية إنتاج</option>
                  <option value="advance">سلفة موظف (تخصم لاحقاً)</option>
                  <option value="bonus">مكافأة تميز وإتقان</option>
                  <option value="salary">راتب شهري</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">المبلغ المنصرف ({profile.currencySymbol}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">الخزينة المسحوب منها *</label>
                <select
                  value={safeType}
                  onChange={(e) => setSafeType(e.target.value as SafeType)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="main">الخزينة الرئيسية</option>
                  <option value="sub">الخزينة الفرعية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">طريقة السداد *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="cash">نقدي (كاش في اليد)</option>
                  <option value="wallet">محفظة إلكترونية (إنستاباي / كاش)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">بيان الصرف والملاحظات</label>
              <input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="مثال: تسوية مصنعية جداريات فندق الغردقة"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                اعتماد الصرف وتخفيض الخزينة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
