import React from 'react';
import { AlShamsBrandLogo, ArtisanAvatar } from '../brand/BrandAssets';
import { UserProfile } from '../../types';
import { getGenderGreeting } from '../../utils/macrameMath';
import { Menu, Sun, Moon, Bell, LogOut, User } from 'lucide-react';

interface NavbarProps {
  profile: UserProfile;
  activeView?: string;
  onSelectView?: (view: any) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfileSettings: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeView,
  onSelectView,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenProfileSettings,
  onToggleDarkMode,
  isDarkMode,
  onToggleSidebar,
  onToggleMobileMenu,
  onLogout,
}) => {
  const handleToggle = onToggleSidebar || onToggleMobileMenu || (() => {});
  const greeting = getGenderGreeting(profile.gender, profile.artistName);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Right: Hamburger button (ثلاث شرطات) for ALL screens + Greeting */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className="p-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-2 border border-stone-200 dark:border-stone-700/80"
            aria-label="القائمة الجانبية (ثلاث شرطات)"
            title="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline text-xs font-black text-stone-800 dark:text-stone-200">
              القائمة
            </span>
          </button>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-black text-stone-900 dark:text-stone-100">
              {greeting}
            </span>
            <span className="text-[10px] text-stone-500 font-medium">
              مشغل: {profile.brandName}
            </span>
          </div>
        </div>

        {/* Center: MANDATORY Official System Platform Logo Banner [image_29KltX.png] */}
        <div className="flex items-center justify-center">
          <AlShamsBrandLogo size="md" />
        </div>

        {/* Left: Interactive Notification Bell + Theme Switch + Profile Avatar + Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notification Bell with live count badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="جرس الإشعارات التفاعلي"
          >
            <Bell className="w-4 h-4 text-stone-700 dark:text-stone-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-mono font-black text-white ring-2 ring-white dark:ring-stone-900 animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Dark / Light Mode Switch */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-600" />
            )}
          </button>

          {/* Artisan Profile Avatar button */}
          <button
            type="button"
            onClick={onOpenProfileSettings}
            className="p-1 rounded-xl hover:ring-2 hover:ring-amber-500/50 transition cursor-pointer flex items-center gap-1.5 text-right"
            title="البيانات الأساسية للفنان"
          >
            <ArtisanAvatar
              logoUrl={profile.logoUrl}
              artistName={profile.artistName}
              size="sm"
            />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            title="تسجيل الخروج الآمن"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
