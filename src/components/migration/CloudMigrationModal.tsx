import React, { useState } from 'react';
import { firestoreService } from '../../db/firestoreService';
import {
  CloudUpload,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface CloudMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshopId: string;
  userEmail: string;
  onMigrationComplete: () => void;
}

export const CloudMigrationModal: React.FC<CloudMigrationModalProps> = ({
  isOpen,
  onClose,
  workshopId,
  userEmail,
  onMigrationComplete,
}) => {
  if (!isOpen) return null;

  const [migrating, setMigrating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const startMigration = async () => {
    setErrorMsg('');
    setMigrating(true);
    setProgressPercent(10);
    setStatusMessage('بدء قراءة قواعد البيانات المحلية...');

    try {
      const res = await firestoreService.migrateFromDexie(
        workshopId,
        userEmail,
        (percent, stepName) => {
          setProgressPercent(percent);
          setStatusMessage(stepName);
        }
      );
      setDoneCount(res.migratedCount);
      onMigrationComplete();
    } catch (err: any) {
      console.error('Migration error:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء نقل البيانات');
    } finally {
      setMigrating(false);
    }
  };

  const handleClearLocal = async () => {
    setClearing(true);
    try {
      localStorage.removeItem('alshams_active_tenant_id');
      localStorage.removeItem('alshams_profile');
      sessionStorage.clear();
      setStatusMessage('تم مسح البيانات المحلية بنجاح، بياناتك الآن آمنة تماماً على السحابة.');
      setConfirmClearLocal(false);
    } catch (err: any) {
      setErrorMsg('تعذر مسح البيانات المحلية: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-blue-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-7 relative text-right space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 dark:text-stone-100">
              رفع بياناتي المحلية للسحابة (Cloud Migration)
            </h3>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <CloudUpload className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
          هذه الأداة تقوم بنقل كافة الأصناف والخامات والموردين والعملاء والطلبيات المسجلة سابقاً على هذا المتصفح إلى حساب ورشتك السحابي الآمن على Firebase في دفعات منظمة (400 سجل لكل دفعة) لضمان عدم فقدان أي بيانات سابقة.
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Progress Display */}
        {migrating && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
              <span>{statusMessage}</span>
              <span className="font-mono text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Done State */}
        {doneCount !== null && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs space-y-3 font-medium">
            <div className="flex items-center gap-2 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>اكتملت عملية المزامنة السحابية بنجاح!</span>
            </div>
            <p>
              تم نقل وتوثيق <strong>{doneCount} سجل</strong> في قاعدة بيانات ورشتك السحابية. يمكنك الآن الوصول إليها من أي جهاز آخر.
            </p>

            {/* Prompt before clearing local */}
            {!confirmClearLocal ? (
              <button
                type="button"
                onClick={() => setConfirmClearLocal(true)}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>هل تريد مسح النسخة المحلية المؤقتة لتوفير مساحة المتصفح؟</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-900/60 space-y-2">
                <span className="text-[11px] text-stone-700 dark:text-stone-300 font-bold block">
                  تأكيد: هل أنت متأكد من مسح البيانات المحلية بعد التأكد من وجودها على السحابة؟
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearLocal}
                    disabled={clearing}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    {clearing ? 'جاري المسح...' : 'نعم، امسح المحلي'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearLocal(false)}
                    className="px-3 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl"
          >
            إغلاق
          </button>
          {doneCount === null && (
            <button
              type="button"
              onClick={startMigration}
              disabled={migrating}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{migrating ? 'جاري الرفع...' : 'ابدأ رفع البيانات الآن'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
