import React from 'react';
import { UserProfile } from '../../types';
import { Menu, Search, Home } from 'lucide-react';

interface NavbarProps {
  profile: UserProfile;
  onToggleSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onGoHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onToggleSidebar,
  onOpenGlobalSearch,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-15 sm:h-16 flex items-center justify-between">
        {/* 1. زر القائمة الجانبية (ظاهر دائماً) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-2 border border-stone-200 dark:border-stone-700/80 shadow-xs active:scale-95"
            aria-label="القائمة الجانبية"
            title="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline text-xs font-black text-stone-800 dark:text-stone-200">
              القائمة
            </span>
          </button>
        </div>

        {/* 2. زر الرئيسية (ظاهر دائماً) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl hover:bg-amber-50/80 dark:hover:bg-stone-800/80 transition cursor-pointer border border-transparent hover:border-amber-200/80 dark:hover:border-stone-700 active:scale-95 group"
            title="الانتقال إلى الصفحة الرئيسية"
            aria-label="الصفحة الرئيسية"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Home className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 block leading-tight">
                الرئيسية
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-bold block leading-none">
                {profile.brandName || 'ورشة الفنون'}
              </span>
            </div>
          </button>
        </div>

        {/* 3. البحث الموحد (ظاهر دائماً) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="p-2 sm:px-3 sm:py-2 rounded-2xl text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-400 border border-stone-200 dark:border-stone-700/80 transition cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            title="البحث الموحد في كل سجلات الورشة"
            aria-label="البحث الموحد"
          >
            <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline text-xs font-black">
              بحث موحد
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
