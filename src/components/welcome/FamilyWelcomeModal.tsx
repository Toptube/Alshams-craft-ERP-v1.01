import React, { useEffect } from 'react';
import { UserProfile, getDefaultFamilyNickname } from '../../types';
import { Sparkles, Sun, Heart, ArrowLeft } from 'lucide-react';

interface FamilyWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  type: 'first_time' | 'session_return';
}

export const FamilyWelcomeModal: React.FC<FamilyWelcomeModalProps> = ({
  isOpen,
  onClose,
  profile,
  type,
}) => {
  if (!isOpen) return null;

  const isFemale = profile.gender === 'female';
  const familyName =
    profile.familyNickname || getDefaultFamilyNickname(profile.artistName, profile.gender);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-gradient-to-b from-amber-50 via-white to-amber-50/40 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 rounded-3xl shadow-2xl border-2 border-amber-300/80 dark:border-amber-600/40 p-6 sm:p-8 text-center relative overflow-hidden text-stone-900 dark:text-stone-100">
        {/* Decorative Top Sunburst Glow */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Badge */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white animate-bounce-subtle">
              <Sun className="w-9 h-9 sm:w-11 sm:h-11 text-amber-950 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-stone-900 p-1.5 rounded-2xl shadow-md border border-amber-200 dark:border-stone-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>

        {type === 'first_time' ? (
          /* First time workshop registration welcome */
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                عيلة الشمساوية ترحب بك 🤝
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-200 pt-2">
                {isFemale ? 'مرحباً بكِ يا فنانة' : 'مرحباً بك يا فنان'} — نورت عيلتك الجديدة 🌞✨
              </h2>
            </div>

            <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300 leading-relaxed px-2">
              ويشرفنا إنك تكون من النهاردة فرد وعضو فعّال في عيلة الشمساوية 🤝
            </p>

            <div className="p-4 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 shadow-inner">
              <span className="text-xs font-medium block text-amber-700 dark:text-amber-400 mb-0.5">
                لقبك المعتمد معنا في العيلة
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500 inline" />
                ومن النهاردة اسمك معانا <span className="underline decoration-wavy decoration-amber-400 px-1">{familyName}</span> 🧡
              </span>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              جاهزون لننطلق معك في كل تفصيلة من ورشتك، من الخيوط وحساب التكاليف وحتى تسليم آخر قطعة بأعلى ربح!
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>يلا بينا</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Subsequent session login welcome */
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                منور عيلتك من جديد 🌞
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-200 pt-2">
                {isFemale
                  ? `يا أهلاً وسهلاً بيكي يا ${familyName}!`
                  : `يا أهلاً وسهلاً بيك يا ${familyName}!`}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 shadow-sm text-stone-800 dark:text-stone-200 text-sm sm:text-base font-bold leading-relaxed space-y-2">
              <p>
                الدنيا نورت 🌞 {isFemale ? 'وحشتينا ووحشتنا' : 'وحشتنا ووحشنا'} إبداعاتك 🎨
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                يلا بينا ندخل على ورشتنا ونشوف إيه الجديد اللي هنعمله النهاردة 🚀💪🔥
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>يلا بينا</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
