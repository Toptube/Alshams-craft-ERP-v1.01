import React from 'react';
import { UserProfile } from '../../types';
import {
  PlusCircle,
  PackagePlus,
  UserPlus,
  Truck,
  Users2,
  Calculator,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Boxes,
} from 'lucide-react';

interface CreateCenterDashboardProps {
  profile: UserProfile;
  onOpenNewMaterialModal: () => void;
  onOpenNewClientModal: () => void;
  onOpenNewSupplierModal: () => void;
  onOpenNewEmployeeModal: () => void;
  onNavigateToCalculator: () => void;
}

export const CreateCenterDashboard: React.FC<CreateCenterDashboardProps> = ({
  profile,
  onOpenNewMaterialModal,
  onOpenNewClientModal,
  onOpenNewSupplierModal,
  onOpenNewEmployeeModal,
  onNavigateToCalculator,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-200 text-xs font-bold mb-3 border border-white/20">
            <PlusCircle className="w-4 h-4" />
            <span>مركز العمليات الموحد (The Master Creation Hub)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
            مركز «إنشاء جديد» وربط كروت الأصناف
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium">
            أنشئ خامات الورشة، سجل الموردين والعملاء، عرف كادرات العمالة والحرفيين، أو ابدأ تسعير وهندسة منتج مكرمية جديد بالربط الآلي مع المخزن.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* 5 Distinct Large Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. زر خامة (Raw Material) */}
        <button
          type="button"
          onClick={onOpenNewMaterialModal}
          className="group p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-right cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PackagePlus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
              [زر خامة]
            </span>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-1">
              إضافة خامة جديدة
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              تسجيل خيوط، أخشاب، إكسسوارات مع ربط سعر الجرام والكيلو بحاسبة التكاليف.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>فتح كارت الخامة</span>
            <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2. زر عميل (Client Profile) */}
        <button
          type="button"
          onClick={onOpenNewClientModal}
          className="group p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-right cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              [زر عميل]
            </span>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-1">
              تسجيل عميل جديد
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              إضافة ملف العميل ورقم الهاتف ومتابعة المشتريات والأرصدة المعلقة وكشوف الحساب.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>فتح كارت العميل</span>
            <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 3. زر مورد (Supplier Ledger) */}
        <button
          type="button"
          onClick={onOpenNewSupplierModal}
          className="group p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-right cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
              [زر مورد]
            </span>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-1">
              تعريف مورد وفاتورة
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              تسجيل مورد خامات، إثبات فواتير المشتريات، وتحديث أسعار التكلفة في المخزن فورياً.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
            <span>فتح دفتر المورد</span>
            <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 4. زر موظف (Employee/Artisan Profile) */}
        <button
          type="button"
          onClick={onOpenNewEmployeeModal}
          className="group p-5 rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-purple-500 dark:hover:border-purple-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-right cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono">
              [زر موظف]
            </span>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 mt-1">
              تعيين فنان / موظف
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              إدارة الكادرات (مبتدئ/متوسط/خبير/مدرب) وربط الأجور والمصنعية بأوامر الشغل والخزينة.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>فتح ملف الموظف</span>
            <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 5. زر منتج (Product Card -> Redirects directly to Calculator) */}
        <button
          type="button"
          onClick={onNavigateToCalculator}
          className="group p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between text-right cursor-pointer"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-amber-200 font-mono">
              [زر منتج]
            </span>
            <h3 className="text-base font-extrabold text-white mt-1">
              حاسبة تكاليف المنتج
            </h3>
            <p className="text-xs text-amber-100 mt-1.5 leading-relaxed font-medium">
              الانتقال المباشر لشاشة حساب التكاليف، أطوال القص، وزن الخيط، وهوامش الربح المعزولة.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-bold text-white">
            <span>بدء تسعير منتج جديد</span>
            <ArrowRight className="w-4 h-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Integration Guide / System Architecture Info */}
      <div className="p-5 rounded-3xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-stone-900 dark:text-stone-100 block">
              ترابط آلي متكامل بين كروت الصنف والمخازن والماليات (SaaS Cohesion)
            </span>
            <span>
              أي خامة تضاف أو يعدل سعرها عبر فواتير التوريد تنعكس لحظياً على كروت التكلفة لتأمين دقة الأرباح ومنع الحسابات القديمة.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
