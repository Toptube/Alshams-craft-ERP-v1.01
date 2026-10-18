import React, { useState, useEffect } from 'react';
import {
  TreasuryItem,
  TreasuryTransaction,
  WorkshopProfile,
  TreasuryType,
} from '../../types';
import { firestoreService } from '../../db/firestoreService';
import {
  Wallet,
  ArrowRightLeft,
  Plus,
  ArrowDownRight,
  ArrowUpLeft,
  History,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building,
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  X,
} from 'lucide-react';

interface TreasuriesViewProps {
  workshop: WorkshopProfile;
  onOpenHelp: (sectionId: string) => void;
}

export const TreasuriesView: React.FC<TreasuriesViewProps> = ({
  workshop,
  onOpenHelp,
}) => {
  const [treasuries, setTreasuries] = useState<TreasuryItem[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromTreasuryId, setFromTreasuryId] = useState('');
  const [toTreasuryId, setToTreasuryId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Add Treasury Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTreasuryName, setNewTreasuryName] = useState('');
  const [newTreasuryType, setNewTreasuryType] = useState<TreasuryType>('cash');
  const [newTreasuryBalance, setNewTreasuryBalance] = useState('0');
  const [addLoading, setAddLoading] = useState(false);

  // Notice
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const trList = await firestoreService.getTreasuries(workshop.id);
      setTreasuries(trList);
      if (trList.length > 0 && !fromTreasuryId) {
        setFromTreasuryId(trList[0].id);
        setToTreasuryId(trList[1]?.id || trList[0].id);
      }
      const txList = await firestoreService.getTreasuryTransactions(
        workshop.id,
        selectedTreasuryId === 'all' ? undefined : selectedTreasuryId
      );
      setTransactions(txList);
    } catch (err: any) {
      console.error(err);
      setNotice({ text: err.message || 'فشل تحميل بيانات الخزن', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workshop.id, selectedTreasuryId]);

  const totalCashBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!amount || amount <= 0) {
      setNotice({ text: 'يرجى كتابة مبلغ تحويل صالح أكبر من الصفر', isError: true });
      return;
    }
    if (fromTreasuryId === toTreasuryId) {
      setNotice({ text: 'لا يمكن التحويل لنفس الخزنة، اختر خزينتين مختلفتين', isError: true });
      return;
    }

    setTransferLoading(true);
    try {
      await firestoreService.transferBetweenTreasuries(
        workshop.id,
        fromTreasuryId,
        toTreasuryId,
        amount,
        transferNotes.trim(),
        workshop.email
      );
      setNotice({ text: `تم تحويل ${amount} ${workshop.currencySymbol} بنجاح بين الخزينتين!` });
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferNotes('');
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل تنفيذ التحويل', isError: true });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCreateTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreasuryName.trim()) return;

    setAddLoading(true);
    try {
      const newTreasury: TreasuryItem = {
        id: 'tr_' + Math.random().toString(36).substring(2, 9),
        workshopId: workshop.id,
        name: newTreasuryName.trim(),
        type: newTreasuryType,
        balance: Number(newTreasuryBalance) || 0,
        isMain: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: workshop.email,
      };

      await firestoreService.saveTreasury(workshop.id, newTreasury);
      setIsAddModalOpen(false);
      setNewTreasuryName('');
      setNewTreasuryBalance('0');
      setNotice({ text: `تمت إضافة خزنة "${newTreasury.name}" بنجاح!` });
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل إنشاء الخزنة', isError: true });
    } finally {
      setAddLoading(false);
    }
  };

  const getTreasuryIcon = (type: TreasuryType) => {
    switch (type) {
      case 'cash':
        return Banknote;
      case 'instapay':
        return Smartphone;
      case 'wallet':
        return Smartphone;
      case 'bank':
        return Building;
      default:
        return Wallet;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300/40 dark:border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <Wallet className="w-4 h-4" />
            <span>دورة الفلوس وإدارة السيولة النقدية</span>
            <button
              type="button"
              onClick={() => onOpenHelp('treasury')}
              className="text-stone-400 hover:text-emerald-600 cursor-pointer"
              title="ما معنى هذا؟"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            الخزن والسيولة النقدية (Treasuries)
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            تتبع أرصدة الكاش والمحافظ وإنستاباي والتحويل الفوري بينها مع كارت حركة لحظي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>تحويل بين الخزن</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>إضافة خزنة</span>
          </button>
        </div>
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

      {/* Total Liquidity Highlight Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-emerald-100 block font-bold">
            إجمالي السيولة النقدية المتاحة بكافة الخزن:
          </span>
          <span className="text-3xl font-black font-mono tracking-tight mt-1 block">
            {totalCashBalance.toLocaleString()} {workshop.currencySymbol}
          </span>
        </div>
        <div className="text-xs text-emerald-100/90 bg-white/10 px-3.5 py-2 rounded-2xl border border-white/15 max-w-sm">
          * كافة إيرادات المبيعات وصرف الرواتب والمصروفات والتوريد تسجل بحركات دقيقة ومترابطة تمنع العجز.
        </div>
      </div>

      {/* Treasuries Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {treasuries.map((t) => {
          const IconComp = getTreasuryIcon(t.type);
          return (
            <div
              key={t.id}
              className={`p-4 rounded-3xl border transition relative overflow-hidden ${
                t.isMain
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <span>{t.name}</span>
                      {t.isMain && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-600 text-white">
                          رئيسية
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-stone-400 capitalize">
                      {t.type === 'cash' ? 'نقدية سائلة' : t.type === 'instapay' ? 'تحويل لحظي' : t.type === 'wallet' ? 'محفظة هاتف' : 'حساب بنكي'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-baseline justify-between">
                <span className="text-[11px] text-stone-500 font-bold">الرصيد الجاري:</span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {t.balance.toLocaleString()} {workshop.currencySymbol}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running Ledger Transactions Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
              كارت حركة الخزينة والرصيد الجاري (Treasury Ledger)
            </h3>
          </div>

          {/* Filter by Treasury */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-bold">تصفية بالخزنة:</span>
            <select
              value={selectedTreasuryId}
              onChange={(e) => setSelectedTreasuryId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
            >
              <option value="all">كافة الخزن (سجل مجمع)</option>
              {treasuries.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transactions List / Mobile Cards & Desktop Table */}
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">جاري تحميل حركات الخزن...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold">
            لا توجد أي حركات مالية مسجلة في هذه الخزنة حتى الآن.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-bold">
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">الخزنة</th>
                    <th className="py-2.5 px-3">نوع الحركة</th>
                    <th className="py-2.5 px-3">البيان والتفاصيل</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">الرصيد بعد الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium">
                  {transactions.map((tx) => {
                    const isPositive =
                      tx.type === 'deposit' ||
                      tx.type === 'transfer_in' ||
                      tx.type === 'invoice_payment';
                    return (
                      <tr key={tx.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                        <td className="py-3 px-3 font-mono text-[11px] text-stone-500">
                          {tx.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-stone-800 dark:text-stone-200">
                          {tx.treasuryName}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPositive
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {tx.type === 'deposit'
                              ? 'إيداع'
                              : tx.type === 'invoice_payment'
                              ? 'تحصيل فاتورة'
                              : tx.type === 'transfer_in'
                              ? 'تحويل وارد'
                              : tx.type === 'transfer_out'
                              ? 'تحويل صادر'
                              : tx.type === 'expense'
                              ? 'مصروف'
                              : tx.type === 'salary_payout'
                              ? 'صرف راتب'
                              : tx.type === 'supplier_payment'
                              ? 'سداد مورد'
                              : tx.type === 'advance_payout'
                              ? 'صرف سلفة'
                              : 'رد نقدية مرتجع'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-600 dark:text-stone-300">
                          {tx.notes}
                        </td>
                        <td
                          className={`py-3 px-3 font-black font-mono text-sm ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${tx.amount}` : `-${tx.amount}`}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-700 dark:text-stone-300">
                          {tx.balanceAfter} {workshop.currencySymbol}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-2.5">
              {transactions.map((tx) => {
                const isPositive =
                  tx.type === 'deposit' ||
                  tx.type === 'transfer_in' ||
                  tx.type === 'invoice_payment';
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-800 dark:text-stone-200">
                        {tx.treasuryName}
                      </span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? `+${tx.amount}` : `-${tx.amount}`} {workshop.currencySymbol}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                      {tx.notes}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-200/40 dark:border-stone-700/40 font-mono">
                      <span>{tx.date}</span>
                      <span>الرصيد بعد الحركة: {tx.balanceAfter}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleExecuteTransfer}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-emerald-300 dark:border-stone-700 w-full max-w-md space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <span>تحويل مالي بين الخزن</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  من خزنة (المرسلة) *
                </label>
                <select
                  value={fromTreasuryId}
                  onChange={(e) => setFromTreasuryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.balance} {workshop.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  إلى خزنة (المستلمة) *
                </label>
                <select
                  value={toTreasuryId}
                  onChange={(e) => setToTreasuryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  {treasuries.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.balance} {workshop.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                المبلغ المراد تحويله ({workshop.currencySymbol}) *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-sm font-mono font-bold text-center outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                ملاحظات أو سبب التحويل
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="مثال: تغذية الكاش من إنستاباي، سحب للمحفظة..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={transferLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {transferLoading ? 'جاري التحويل...' : 'تأكيد التحويل الآن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Treasury Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTreasury}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-emerald-300 dark:border-stone-700 w-full max-w-md space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>إضافة خزنة جديدة للورشة</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                اسم الخزنة *
              </label>
              <input
                type="text"
                required
                value={newTreasuryName}
                onChange={(e) => setNewTreasuryName(e.target.value)}
                placeholder="مثال: خزنة المعرض، بنك مصر، محفظة أورنج..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  نوع الخزنة
                </label>
                <select
                  value={newTreasuryType}
                  onChange={(e) => setNewTreasuryType(e.target.value as TreasuryType)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold"
                >
                  <option value="cash">كاش (نقدية سائلة)</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="wallet">محفظة إلكترونية</option>
                  <option value="bank">حساب بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الرصيد الافتتاحي
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newTreasuryBalance}
                  onChange={(e) => setNewTreasuryBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono font-bold text-center"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {addLoading ? 'جاري الإضافة...' : 'حفظ الخزنة'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
