import React from 'react';
import { AlShamsBrandLogo } from '../brand/BrandAssets';
import { UserProfile } from '../../types';
import { Menu, Search } from 'lucide-react';

interface NavbarProps {
  profile: UserProfile;
  onToggleSidebar: () => void;
  onOpenGlobalSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onToggleSidebar,
  onOpenGlobalSearch,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Right: Hamburger button (زر القائمة) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2.5 rounded-2xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-2 border border-stone-200 dark:border-stone-700/80 shadow-xs"
            aria-label="القائمة الجانبية (ثلاث شرطات)"
            title="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline text-xs font-black text-stone-800 dark:text-stone-200">
              القائمة
            </span>
          </button>
        </div>

        {/* Center: Platform Brand Logo strictly in the center */}
        <div className="flex items-center justify-center">
          <AlShamsBrandLogo size="md" />
        </div>

        {/* Left: Global Search button (زر البحث الموحد) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="p-2.5 rounded-2xl text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-400 border border-stone-200 dark:border-stone-700/80 transition cursor-pointer flex items-center gap-2 shadow-xs"
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
