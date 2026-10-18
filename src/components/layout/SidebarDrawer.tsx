import React from 'react';
import { AlShamsBrandLogo, ArtisanAvatar } from '../brand/BrandAssets';
import { UserProfile } from '../../types';
import { getGenderGreeting } from '../../utils/macrameMath';
import {
  X,
  UserCheck,
  Calculator,
  Sparkles,
  FolderArchive,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  Bell,
  Wallet,
  Boxes,
  Truck,
  Users,
  Hammer,
  FileText,
  DollarSign,
  BookOpen,
  CloudUpload,
  Layers,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  activeView: string;
  onSelectView: (view: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications: () => void;
  onOpenProfileSettings: () => void;
  onOpenCraftsSelector: () => void;
  onOpenUserGuide: (sectionId?: string) => void;
  onOpenCloudMigration: () => void;
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
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenProfileSettings,
  onOpenCraftsSelector,
  onOpenUserGuide,
  onOpenCloudMigration,
  onToggleDarkMode,
  isDarkMode,
  onLogout,
}) => {
  if (!isOpen) return null;

  const greeting = getGenderGreeting(profile.gender, profile.artistName);

  const mainModules = [
    {
      id: 'calculator',
      label: 'حاسبة تكاليف المنتج',
      sublabel: 'تسعير الحِرف، الباترون، والربح المعزول',
      icon: Calculator,
    },
    {
      id: 'invoices',
      label: 'فواتير المبيعات والعملاء',
      sublabel: 'فواتير البيع، الدفعات، المرتجعات، والضريبة',
      icon: FileText,
    },
    {
      id: 'work_orders',
      label: 'أوامر التشغيل وتتبع الهالك',
      sublabel: 'صرف الخامات، الإنتاج، واسترجاع المتبقي',
      icon: Hammer,
    },
    {
      id: 'suppliers',
      label: 'الموردون وفواتير الخامات',
      sublabel: 'شراء الخامات، الأصول، وحسابات الموردين',
      icon: Truck,
    },
    {
      id: 'treasuries',
      label: 'الخزن والسيولة النقدية',
      sublabel: 'الكاش، إنستاباي، المحافظ، والتحويلات',
      icon: Wallet,
    },
    {
      id: 'inventory',
      label: 'المخازن وكارت الصنف',
      sublabel: 'مخزن الخامات، مخزن المنتجات، والجرد',
      icon: Boxes,
    },
    {
      id: 'hr',
      label: 'الموارد البشرية والرواتب',
      sublabel: 'كشوف الرواتب، السلف، وحسابات الصناع',
      icon: Users,
    },
    {
      id: 'expenses',
      label: 'المصروفات والإيرادات',
      sublabel: 'التكاليف الإدارية، الانتقالات، والتسويق',
      icon: DollarSign,
    },
    {
      id: 'reports',
      label: 'التقارير المالية وقفل الشهر',
      sublabel: 'الأرباح والخسائر، أرصدة العملاء، والقفل',
      icon: BarChart3,
    },
    {
      id: 'archive',
      label: 'أرشيف المنتجات المسعرة',
      sublabel: 'سجل المنتجات السابقة وتعديل البطاقات',
      icon: FolderArchive,
    },
    {
      id: 'ai_agent',
      label: 'صقر الشمساوية AI',
      sublabel: 'الرؤية الذكية، دراسة السوق، والمستشار الفني',
      icon: Sparkles,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-xs sm:max-w-sm h-full shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col text-right animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <AlShamsBrandLogo size="sm" showSubtitle={false} />
        </div>

        {/* Artisan Profile Card */}
        <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArtisanAvatar
              logoUrl={profile.logoBase64}
              artistName={profile.artistName}
              size="md"
            />
            <div className="text-right">
              <h4 className="font-black text-xs text-stone-900 dark:text-stone-100">
                {profile.artistName}
              </h4>
              <p className="text-[10px] text-stone-500 font-medium">
                {profile.brandName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenProfileSettings();
              onClose();
            }}
            title="إعدادات الورشة والملف الشخصي"
            className="p-2 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Bar (الإشعارات، الدارك مود، حِرف الورشة) */}
        <div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/20 border-b border-amber-200/40 dark:border-amber-900/40 grid grid-cols-3 gap-1.5 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              onOpenNotifications();
              onClose();
            }}
            className="relative py-2 px-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 font-bold text-stone-800 dark:text-stone-200 hover:bg-amber-50 transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="text-[10px]">الإشعارات</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-mono font-black text-white animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenCraftsSelector();
              onClose();
            }}
            className="py-2 px-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 font-bold text-stone-800 dark:text-stone-200 hover:bg-amber-50 transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span className="text-[10px]">أقسام الورشة</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="py-2 px-1 rounded-xl bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 font-bold text-stone-800 dark:text-stone-200 hover:bg-amber-50 transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[10px]">نهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-stone-600" />
                <span className="text-[10px]">ليلي</span>
              </>
            )}
          </button>
        </div>

        {/* Modules Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {mainModules.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-black'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span
                      className={`text-[9.5px] block leading-tight ${
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

        {/* Utilities: Guide + Migration + Logout */}
        <div className="p-3 border-t border-stone-100 dark:border-stone-800 space-y-2 bg-stone-50 dark:bg-stone-900/60">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                onOpenUserGuide();
                onClose();
              }}
              className="py-2 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>دليل الاستخدام</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenCloudMigration();
                onClose();
              }}
              className="py-2 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
              <span>رفع للسحابة</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold flex items-center justify-center gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج الآمن</span>
          </button>

          <div className="text-center pt-1 border-t border-stone-200/50 dark:border-stone-800/50">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold">
              الشمس كرافت ERP • إصدار السحابة الحرفية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
