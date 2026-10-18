import React, { useState } from 'react';
import { AlShamsBrandLogo } from '../brand/BrandAssets';
import { WorkshopProfile, Gender } from '../../types';
import { COUNTRIES_CONFIG } from '../../utils/macrameMath';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getArabicAuthErrorMessage,
} from '../../lib/firebase';
import { firestoreService } from '../../db/firestoreService';
import {
  Lock,
  Mail,
  User,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface AuthGatewayProps {
  onAuthenticated: (profile: WorkshopProfile) => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brandName, setBrandName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [countryCode, setCountryCode] = useState('EG');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [brandLogo, setBrandLogo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedCountry =
    COUNTRIES_CONFIG.find((c) => c.code === countryCode) || COUNTRIES_CONFIG[0];

  // Handle Artisan logo compression to <=256px and <=150KB PNG
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setBrandLogo(canvas.toDataURL('image/png', 0.8));
        } else {
          setBrandLogo(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /**
   * Helper to ensure workshop profile exists in Firestore and return it
   */
  const loadOrCreateWorkshop = async (
    uid: string,
    userEmail: string,
    initialData?: Partial<WorkshopProfile>
  ): Promise<WorkshopProfile> => {
    let workshop = await firestoreService.getWorkshop(uid);

    if (!workshop) {
      const newWorkshop: WorkshopProfile = {
        id: uid,
        ownerUid: uid,
        email: userEmail,
        brandName: initialData?.brandName || 'ورشة الإبداع الحرفي',
        artistName: initialData?.artistName || userEmail.split('@')[0],
        gender: initialData?.gender || 'female',
        phoneNumber: initialData?.phoneNumber || '',
        country: selectedCountry.name,
        currency: selectedCountry.currency,
        currencySymbol: selectedCountry.currencySymbol,
        selectedCrafts: initialData?.selectedCrafts || ['macrame'],
        defaultVatPercent: 14,
        showTaxInfoOnInvoice: false,
        logoBase64: initialData?.logoBase64 || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userEmail,
      };

      await firestoreService.setWorkshop(newWorkshop);
      workshop = newWorkshop;
    }

    // Ensure default treasuries (Cash, InstaPay, Wallet) and warehouses
    await firestoreService.ensureDefaultTreasuries(uid, userEmail);
    await firestoreService.ensureDefaultWarehouses(uid);

    return workshop;
  };

  // 1. Email/Password Authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى كتابة بريد إلكتروني صالح.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg(
          'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح، يرجى فحص صندوق الوارد أو الرسائل غير المرغوبة.'
        );
      } catch (err: any) {
        setErrorMsg(getArabicAuthErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!brandName.trim()) {
          throw new Error('يرجى كتابة اسم البراند أو المشغل الخاص بك.');
        }
        if (!artistName.trim()) {
          throw new Error('يرجى كتابة اسمك (الفنان أو الفنانة).');
        }

        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const workshop = await loadOrCreateWorkshop(cred.user.uid, cleanEmail, {
          brandName: brandName.trim(),
          artistName: artistName.trim(),
          gender,
          phoneNumber: phoneNumber.trim(),
          logoBase64: brandLogo,
          selectedCrafts: ['macrame'],
        });
        onAuthenticated(workshop);
      } else {
        // Login
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const workshop = await loadOrCreateWorkshop(cred.user.uid, cleanEmail);
        onAuthenticated(workshop);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(getArabicAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 2. Google Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const workshop = await loadOrCreateWorkshop(user.uid, user.email || 'artisan@craft.io', {
        artistName: user.displayName || 'فنان الشمس كرافت',
        brandName: user.displayName ? `براند ${user.displayName}` : 'ورشة الإبداع الفني',
      });
      onAuthenticated(workshop);
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setErrorMsg(getArabicAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-200/80 dark:border-stone-800 p-6 sm:p-8 space-y-5 text-right relative overflow-hidden">
        {/* Top Decorative Sun Beam */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Platform Identity */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <AlShamsBrandLogo size="lg" />
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium max-w-xs mt-1">
            المنظومة السحابية المتكاملة لورش الحِرف اليدوية (ERP + HR SaaS)
          </p>
        </div>

        {/* Tabs: Login / Signup / Reset */}
        <div className="flex items-center rounded-2xl bg-stone-100 dark:bg-stone-800 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            فتح ورشة جديدة
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              mode === 'reset'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            استعادة المرور
          </button>
        </div>

        {/* Google Authentication Button */}
        {mode !== 'reset' && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span>
              {googleLoading ? 'جاري التحقق...' : 'المتابعة والدخول بحساب Google'}
            </span>
          </button>
        )}

        {mode !== 'reset' && (
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-stone-200 dark:border-stone-800 w-full" />
            <span className="bg-white dark:bg-stone-900 px-3 text-[11px] text-stone-400 font-bold uppercase tracking-wider absolute">
              أو عبر البريد الإلكتروني
            </span>
          </div>
        )}

        {/* Notices */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
              البريد الإلكتروني <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 pr-9 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password (for login and signup) */}
          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  كلمة المرور <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-9 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Additional Signup Fields */}
          {mode === 'signup' && (
            <div className="space-y-3 pt-1 border-t border-stone-200 dark:border-stone-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    اسم البراند أو الورشة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="مثال: شمس مكرامي"
                      className="w-full px-3 py-2 pr-8 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Building2 className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    اسم الفنان أو الصانع <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="مثال: ياسمين أحمد"
                      className="w-full px-3 py-2 pr-8 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <User className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Gender & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    صفة المخاطبة
                  </label>
                  <div className="flex gap-2">
                    <label
                      className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl border cursor-pointer ${
                        gender === 'female'
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-300'
                          : 'border-stone-300 dark:border-stone-700 text-stone-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        className="hidden"
                        checked={gender === 'female'}
                        onChange={() => setGender('female')}
                      />
                      فنانة (مبدعة)
                    </label>
                    <label
                      className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl border cursor-pointer ${
                        gender === 'male'
                          ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-300'
                          : 'border-stone-300 dark:border-stone-700 text-stone-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        className="hidden"
                        checked={gender === 'male'}
                        onChange={() => setGender('male')}
                      />
                      فنان (مبدع)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    رقم الهاتف / واتساب
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full px-3 py-2 pr-8 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none font-mono text-left"
                    />
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>دخول الورشة السحابية</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>إنشاء ورشة سحابية جديدة</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>إرسال رابط الاستعادة</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Guarantee */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>عزل سحابي كامل ومزامنة آمنة بين أجهزتك بدون إنترنت</span>
        </div>
      </div>
    </div>
  );
};
