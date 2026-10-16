import React, { useState, useEffect } from 'react';
import { AlShamsBrandLogo } from '../brand/BrandAssets';
import { UserProfile, Gender } from '../../types';
import { COUNTRIES_CONFIG } from '../../utils/macrameMath';
import { tenantStorage } from '../../db/dexieDB';
import { Lock, Mail, User, ShieldCheck, Building2, Phone, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface AuthGatewayProps {
  onAuthenticated: (profile: UserProfile) => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brandName, setBrandName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [countryCode, setCountryCode] = useState('EG');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [brandLogo, setBrandLogo] = useState<string>(''); // Blank by default for artisan's personal shop image
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedCountry = COUNTRIES_CONFIG.find((c) => c.code === countryCode) || COUNTRIES_CONFIG[0];

  useEffect(() => {
    // Seed demo accounts so default authorized logins are ready
    tenantStorage.seedDemoAuthIfEmpty();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
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
          setBrandLogo(canvas.toDataURL('image/png'));
        } else {
          setBrandLogo(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!brandName.trim()) {
          throw new Error('يرجى كتابة اسم البراند الفني الخاص بك.');
        }
        if (!artistName.trim()) {
          throw new Error('يرجى كتابة اسم الفنان أو الفنانة.');
        }
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < selectedCountry.phoneLength - 2) {
          throw new Error(`رقم الهاتف غير مكتمل، يرجى كتابة رقم هاتف صحيح لدولة ${selectedCountry.name}.`);
        }

        // Genuine encrypted registration in Dexie / Auth schema
        const newProfile = await tenantStorage.registerAuthUser({
          email: cleanEmail,
          password,
          brandName: brandName.trim(),
          artistName: artistName.trim(),
          gender,
          country: selectedCountry.name,
          callingCode: selectedCountry.callingCode,
          currency: selectedCountry.currency,
          currencySymbol: selectedCountry.currencySymbol,
          phoneNumber: phoneNumber.trim(),
          logoUrl: brandLogo ? brandLogo : undefined,
        });

        setSuccessMsg('تم إنشاء الحساب وتشفير كلمة المرور بنجاح! جاري الدخول للورشة...');
        setTimeout(() => {
          onAuthenticated(newProfile);
        }, 800);
      } else {
        // Genuine authentication validation against database
        const profile = await tenantStorage.loginAuthUser(cleanEmail, password);
        setSuccessMsg(`أهلاً بك مجدداً يا ${profile.artistName}! جاري تحميل بيانات الورشة...`);
        setTimeout(() => {
          onAuthenticated(profile);
        }, 600);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'فشلت عملية المصادقة، يرجى التأكد من البيانات المدخلة.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, pass: string = '123456') => {
    setErrorMsg('');
    setSuccessMsg('');
    setEmail(demoEmail);
    setPassword(pass);
    setLoading(true);
    try {
      const profile = await tenantStorage.loginAuthUser(demoEmail, pass);
      setSuccessMsg(`تم التحقق من الحساب التجريبي المعتمد! جاري الدخول...`);
      setTimeout(() => onAuthenticated(profile), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول بالحساب التجريبي.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col justify-center items-center p-4 sm:p-6 text-stone-900 dark:text-stone-100 font-sans selection:bg-amber-500 selection:text-white">
      {/* Container */}
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-6">
        {/* Top Official Platform Header Banner */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 border-b border-stone-100 dark:border-stone-800 pb-5">
          <AlShamsBrandLogo size="lg" />
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium max-w-xs mt-1">
            بوابة الدخول المشفرة لمنظومة إدارة الورش الحرفية وحسابات المكرميات
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-sm font-black'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl transition cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-sm font-black'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            إنشاء حساب فنان جديد
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4 text-right">
          {mode === 'signup' && (
            <>
              {/* Brand Name */}
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  اسم البراند / المشغل الحرفي *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="مثال: شمس آرت للمكرمية اليدوية"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Brand Profile Image Component Fix: Active file picker explicitly labeled */}
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  تحميل لوجو البراند الخاص بك (اختياري)
                </label>
                <div className="p-3 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/40 transition">
                  {brandLogo ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={brandLogo}
                          alt="لوجو البراند المرفوع"
                          className="w-12 h-12 rounded-xl object-contain bg-stone-100 dark:bg-stone-800 p-0.5 border border-amber-500/40 shadow-xs"
                        />
                        <div className="text-right">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                            تم تحديد لوجو المشغل
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            جاهز للحفظ بالملف الشخصي
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBrandLogo('')}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        إزالة الشعار
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-xs text-stone-500 dark:text-stone-400 file:mr-0 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
                      />
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5 leading-normal">
                        مكون فارغ افتراضياً لقبول لوجو الورشة الشخصي للفنان. شعار المنظومة الرسمي يبقى ثابتاً في رأس الصفحة فقط.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Artist Name & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    اسم الفنان / الفنانة *
                  </label>
                  <input
                    type="text"
                    required
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="اسمك الكريم"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    الصيغة اللغوية
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    <option value="female">أنثى (فنانة / مبدعة)</option>
                    <option value="male">ذكر (فنان / مبدع)</option>
                  </select>
                </div>
              </div>

              {/* Country & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">الدولة والعملة *</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                  >
                    {COUNTRIES_CONFIG.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.currencySymbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">رقم الهاتف *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="01012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-left"
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
              البريد الإلكتروني المعتمد *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artisan@alshams.craft"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-left"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
              كلمة المرور المشفرة *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-left"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
            </div>
            {mode === 'login' && (
              <span className="text-[10px] text-stone-400 mt-1 block">
                ملاحظة: المنظومة تتحقق بدقة من التشفير وترفض الحسابات غير المسجلة.
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{mode === 'signup' ? 'تشفير واعتماد تسجيل حساب جديد' : 'التحقق وتسجيل الدخول الآمن'}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Logins for Instant Testing */}
        <div className="border-t border-stone-100 dark:border-stone-800 pt-4 space-y-2">
          <span className="text-[10px] font-bold text-stone-400 block text-center">
            أو الدخول السريع بحسابات ورشة تجريبية معتمدة:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('artisan@alshams.craft', '123456')}
              className="px-3 py-2 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer"
            >
              حساب فنانة معتمد (سارة)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('sara@alshams.craft', '123456')}
              className="px-3 py-2 rounded-xl text-[11px] font-bold bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer"
            >
              مشغل الشمساوية ERP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
