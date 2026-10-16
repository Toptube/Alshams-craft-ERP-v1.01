import React from 'react';
import { AlShamsBrandLogo, ArtisanAvatar } from '../brand/BrandAssets';
import { UserProfile } from '../../types';
import { getGenderGreeting } from '../../utils/macrameMath';
import {
  X,
  UserCheck,
  Calculator,
  Sparkles,
  PlusCircle,
  FolderArchive,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  activeView: string;
  onSelectView: (view: any) => void;
  onOpenProfileSettings: () => void;
  onOpenInventory?: () => void;
  onOpenAdminCosts?: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  activeView,
  onSelectView,
  onOpenProfileSettings,
  onOpenInventory,
  onOpenAdminCosts,
  onToggleDarkMode,
  isDarkMode,
  onLogout,
}) => {
  if (!isOpen) return null;

  const greeting = getGenderGreeting(profile.gender, profile.artistName);

  // STRICT 6-ITEM LOGICAL ORDER
  const menuItems = [
    {
      id: 'profile',
      label: 'البيانات',
      sublabel: 'الملف الفني، اللوجو، ووسائل التواصل',
      icon: UserCheck,
      action: () => {
        onOpenProfileSettings();
        onClose();
      },
    },
    {
      id: 'calculator',
      label: 'حاسبة تكاليف المنتج',
      sublabel: 'تسعير القطع، أطوال القص، والربح المعزول',
      icon: Calculator,
      action: () => {
        onSelectView('calculator');
        onClose();
      },
    },
    {
      id: 'ai_agent',
      label: 'صقر الشمساوية AI',
      sublabel: 'الرؤية الذكية، الباترون، ودراسة السوق',
      icon: Sparkles,
      action: () => {
        onSelectView('ai_agent');
        onClose();
      },
    },
    {
      id: 'create_center',
      label: 'إنشاء جديد',
      sublabel: 'إضافة خامة، عميل، مورد، موظف، أو منتج',
      icon: PlusCircle,
      action: () => {
        onSelectView('create_center');
        onClose();
      },
    },
    {
      id: 'sales',
      label: 'المبيعات والطلبيات',
      sublabel: 'سجل أوامر الشغل، الدفعات، ومتابعة الشحن',
      icon: PlusCircle,
      action: () => {
        onSelectView('sales');
        onClose();
      },
    },
    {
      id: 'hr',
      label: 'فريق العمل والعمالة',
      sublabel: 'كادرات الحرفيين، ساعات العمل، ومصنعيات الشغل',
      icon: UserCheck,
      action: () => {
        onSelectView('hr');
        onClose();
      },
    },
    {
      id: 'archive',
      label: 'الأرشيف',
      sublabel: 'سجل المنتجات السابقة وتعديل البطاقات',
      icon: FolderArchive,
      action: () => {
        onSelectView('archive');
        onClose();
      },
    },
    {
      id: 'reports',
      label: 'التقارير وميزان المراجعة',
      sublabel: 'ميزان المراجعة، الأرباح، والخزائن',
      icon: BarChart3,
      action: () => {
        onSelectView('reports');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-xs sm:max-w-sm h-full shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col text-right animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <AlShamsBrandLogo size="sm" showSubtitle={false} />
        </div>

        {/* Artisan Card Header */}
        <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArtisanAvatar
              logoUrl={profile.logoUrl}
              artistName={profile.artistName}
              size="md"
            />
            <div className="text-right">
              <h4 className="font-black text-xs text-stone-900 dark:text-stone-100">
                {profile.artistName}
              </h4>
              <p className="text-[10px] text-stone-500 font-medium">
                براند: {profile.brandName}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 font-mono">
            {profile.currencySymbol}
          </span>
        </div>

        {/* STRICT 6-ITEM NAV LINKS */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-black'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{item.label}</span>
                      <span
                        className={`text-[9px] font-mono px-1 rounded ${
                          isActive ? 'bg-white/25 text-white' : 'text-stone-400'
                        }`}
                      >
                        0{index + 1}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] block leading-tight ${
                        isActive ? 'text-amber-100' : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                <ChevronLeft
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-white' : 'text-stone-400'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Footer with Mode toggle, Logout & Professional Copyright script */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 space-y-3 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex-1 py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>الوضع النهاري</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-600" />
                  <span>الوضع الليلي</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold flex items-center justify-center gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>

          {/* MANDATORY COPYRIGHT FOOTNOTE */}
          <div className="text-center pt-1 border-t border-stone-200/50 dark:border-stone-800/50">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold">
              جميع الحقوق محفوظة لشركة الشمس كرافت © 2026
            </p>
            <span className="text-[9px] text-stone-400/80 font-mono">
              AlShams Craft ERP Platform • All Rights Reserved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
