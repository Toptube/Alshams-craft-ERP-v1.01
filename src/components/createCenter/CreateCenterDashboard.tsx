import React from 'react';
import { UserProfile } from '../../types';
import {
  PlusCircle,
  PackagePlus,
  UserPlus,
  Truck,
  Users2,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Receipt,
  ShoppingBag,
  Layers,
} from 'lucide-react';

export interface CreateCenterDashboardProps {
  profile: UserProfile;
  onOpenNewMaterialModal: () => void;
  onOpenNewClientModal: () => void;
  onOpenNewSupplierModal: () => void;
  onOpenNewEmployeeModal: () => void;
  onNavigateToCalculator: () => void;
  onOpenCreateSupplier?: () => void;
  onOpenSupplierInvoice?: () => void;
  onNavigateToSales?: () => void;
}

export const CreateCenterDashboard: React.FC<CreateCenterDashboardProps> = ({
  profile,
  onOpenNewMaterialModal,
  onOpenNewClientModal,
  onOpenNewSupplierModal,
  onOpenNewEmployeeModal,
  onNavigateToCalculator,
  onOpenCreateSupplier,
  onOpenSupplierInvoice,
  onNavigateToSales,
}) => {
  const handleCreateSupplier = onOpenCreateSupplier || onOpenNewSupplierModal;
  const handleSupplierInvoice = onOpenSupplierInvoice || onOpenNewSupplierModal;
  const handleSalesOrder = onNavigateToSales || (() => {});

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner - Compact for Mobile screens */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white p-4 sm:p-6 shadow-lg">
        <div className="relative z-10 max-w-2xl text-right">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-amber-200 text-[10px] sm:text-xs font-bold mb-2 border border-white/20">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>مركز العمليات الموحد (The Master Creation Hub)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black leading-tight tracking-tight">
            مركز «إنشاء جديد» وربط كروت الأصناف
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs text-amber-100/90 leading-relaxed font-medium">
            جميع نوافذ إنشاء الخامات، الموردين، العملاء، فواتير المشتريات، أوامر البيع، والعمالة في واجهة موحدة سريعة.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* Grid of 7 Creation Cards - 2 Columns on Mobile for full/quick view */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* 1. إضافة خامة */}
        <button
          type="button"
          onClick={onOpenNewMaterialModal}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-black flex items-center justify-center font-mono">
                1
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PackagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              إضافة خامة
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              تسجيل خيوط، أخشاب، وإكسسوارات وربط سعر الجرام والكيلو.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>فتح كارت الخامة</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 2. حاسبة التكاليف وإضافة المنتجات */}
        <button
          type="button"
          onClick={onNavigateToCalculator}
          className="group relative p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-black flex items-center justify-center font-mono">
                2
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white">
              حاسبة التكاليف وإضافة المنتجات
            </h3>
            <p className="text-[10px] sm:text-xs text-amber-100 mt-1 leading-snug line-clamp-2">
              تسعير الموديل، حساب أطوال القص، وزن الخيط، وهوامش الربح.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] sm:text-xs font-bold text-white">
            <span>حساب وتسعير الموديل</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 3. تسجيل مورد (زر مستقل يفتح نموذج تعريف مورد فقط) */}
        <button
          type="button"
          onClick={handleCreateSupplier}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-black flex items-center justify-center font-mono">
                3
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              تسجيل مورد
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              تعريف مورد خامات جديد، بيانات الاتصال، والعناوين.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-400">
            <span>فتح نموذج المورد فقط</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 4. إنشاء فاتورة (زر مستقل يفتح فاتورة مورد) */}
        <button
          type="button"
          onClick={handleSupplierInvoice}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center font-mono">
                4
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              إنشاء فاتورة
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              إثبات فاتورة مشتريات خامات من مورد وتحديث تكلفة المخزن.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-400">
            <span>فتح فاتورة مورد</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 5. تسجيل عميل */}
        <button
          type="button"
          onClick={onOpenNewClientModal}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center font-mono">
                5
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              تسجيل عميل
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              إضافة ملف العميل، الهاتف، ومتابعة المشتريات والأرصدة.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>فتح كارت العميل</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 6. إنشاء أمر بيع */}
        <button
          type="button"
          onClick={handleSalesOrder}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-rose-500 dark:hover:border-rose-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-black flex items-center justify-center font-mono">
                6
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              إنشاء أمر بيع
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              إصدار أمر بيع للأصناف وربط الدفعات وخصومات العملاء.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>شاشة أوامر البيع</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* 7. تعيين فنان/موظف */}
        <button
          type="button"
          onClick={onOpenNewEmployeeModal}
          className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200/90 dark:border-stone-800 hover:border-purple-500 dark:hover:border-purple-500 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-black flex items-center justify-center font-mono">
                7
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
              تعيين فنان/موظف
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug line-clamp-2">
              إدارة الكادرات (مبتدئ/خبير) وربط الأجور ونظام المحاسبة.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] sm:text-xs font-bold text-purple-700 dark:text-purple-400">
            <span>فتح ملف الموظف</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* زر احتياطي اختياري: تعريف مورد وفاتورة (النموذج القديم الشامل لم يُحذف حتى التأكد) */}
        <button
          type="button"
          onClick={onOpenNewSupplierModal}
          className="group relative p-3 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-850 border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 shadow-none hover:shadow-xs transition-all duration-200 flex flex-col justify-between text-right cursor-pointer"
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[9px] font-bold">
                النموذج المدمج القديم
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
              تعريف مورد وفاتورة (شامل)
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-400 mt-1 leading-snug line-clamp-2">
              النموذج الشامل السابق لتعريف المورد وفاتورة المشتريات معاً.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between text-[10px] sm:text-xs font-bold text-stone-500">
            <span>فتح النموذج المدمج</span>
            <ArrowRight className="w-3.5 h-3.5 transform rotate-180" />
          </div>
        </button>
      </div>

      {/* Integration Guide / System Architecture Info */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-100/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-center gap-3 text-xs text-stone-600 dark:text-stone-300">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span className="text-[11px] sm:text-xs leading-relaxed">
          <strong>ترابط آلي متكامل:</strong> كل خامة، عميل، أو فاتورة مورد تنعكس فورياً في كروت التكلفة والمخزن لضمان دقة الأرباح ومنع الحسابات القديمة.
        </span>
      </div>
    </div>
  );
};
