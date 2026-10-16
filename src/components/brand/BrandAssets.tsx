import React from 'react';
import falconAvatarImg from '../../assets/image_hmWr-I.png';

export { falconAvatarImg };

/**
 * Geometric Sun SVG Icon for AlShams Craft Platform
 * Central golden circle (#F5C542 to #D4A017) with 12 symmetrical harmonious rays
 */
export const AlShamsSunIcon: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="alshamsSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C542" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>

      {/* 12 Harmonious Geometric Rays */}
      <g fill="url(#alshamsSunGrad)">
        {rays.map((deg) => (
          <polygon
            key={deg}
            points="50,4 53.5,24 46.5,24"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}

        {/* Central Golden Circle */}
        <circle cx="50" cy="50" r="22" />
      </g>

      {/* Subtle Inner Concentric Glow */}
      <circle cx="50" cy="50" r="16" fill="#B4800C" fillOpacity="0.25" />
      <circle cx="50" cy="50" r="9" fill="#FFFFFF" fillOpacity="0.25" />
    </svg>
  );
};

/**
 * OFFICIAL SYSTEM PLATFORM LOGO BANNER (الشمس كرافت / AlShams Craft)
 * Pure inline SVG geometric sun icon + Cairo 800 typography.
 * Text automatically switches between light and dark: text-stone-900 / dark:text-amber-300
 * Strict separation: Never mixed with artisan's personal shop logo.
 */
export const AlShamsBrandLogo: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}> = ({ className = '', size = 'md', showSubtitle = true }) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', title: 'text-sm', sub: 'text-[8px]', gap: 'gap-2' },
    md: { icon: 'w-10 h-10', title: 'text-lg sm:text-xl', sub: 'text-[9px]', gap: 'gap-2.5' },
    lg: { icon: 'w-14 h-14', title: 'text-2xl', sub: 'text-[11px]', gap: 'gap-3' },
    xl: { icon: 'w-20 h-20', title: 'text-3xl sm:text-4xl', sub: 'text-[13px]', gap: 'gap-4' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center ${currentSize.gap} select-none ${className}`}>
      {/* Elegant Geometric Sun SVG Icon */}
      <div className={`relative ${currentSize.icon} flex-shrink-0 flex items-center justify-center drop-shadow-sm`}>
        <AlShamsSunIcon />
      </div>

      {/* Brand Name Calligraphy & Typography */}
      <div className="flex flex-col text-right">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-[800] ${currentSize.title} tracking-tight text-stone-900 dark:text-amber-300 font-sans`}>
            الشمس كرافت
          </span>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-mono">
            ERP
          </span>
        </div>
        {showSubtitle && (
          <span className={`${currentSize.sub} font-mono tracking-widest uppercase text-stone-500 dark:text-stone-400 mt-0.5`}>
            ALSHAMS CRAFT
          </span>
        )}
      </div>
    </div>
  );
};

// EXCLUSIVE FALCON MASCOT AVATAR FOR "صقر الشمساوية AI" [image_hmWr-I.png]
// STRICTLY RESTRICTED TO THE AI HELPER CONVERSATIONAL CHAT - NEVER PART OF ARTISAN PROFILE
export const FalconMascotAvatar: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  statusDot?: boolean;
}> = ({ className = '', size = 'md', statusDot = true }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`relative ${sizeMap[size]} flex-shrink-0 ${className}`}>
      <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-stone-900 via-amber-950 to-stone-900 p-0.5 shadow-md border border-amber-500/40 overflow-hidden flex items-center justify-center">
        <img
          src={falconAvatarImg}
          alt="صقر الشمساوية AI"
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>

      {statusDot && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-stone-900"></span>
        </span>
      )}
    </div>
  );
};

// DEDICATED ARTISAN PROFILE PICTURE COMPONENT
// STRICTLY SEPARATE FROM THE PLATFORM LOGO AND MASCOT
export const ArtisanAvatar: React.FC<{
  logoUrl?: string;
  artistName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ logoUrl, artistName, size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`لوجو ${artistName}`}
        className={`${sizeMap[size]} rounded-2xl object-contain bg-stone-100 dark:bg-stone-800 p-0.5 shadow-sm border border-stone-200 dark:border-stone-700 ${className}`}
      />
    );
  }

  // Fallback initial
  const initial = artistName ? artistName.trim().charAt(0) : 'ف';

  return (
    <div
      className={`${sizeMap[size]} rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center justify-center font-black ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
};
