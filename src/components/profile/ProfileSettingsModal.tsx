import React, { useState } from 'react';
import { UserProfile, Gender, getDefaultFamilyNickname } from '../../types';
import { COUNTRIES_CONFIG, getGenderArtistTitle } from '../../utils/macrameMath';
import { tenantStorage } from '../../db/dexieDB';
import { firestoreService } from '../../db/firestoreService';
import { NumberInput } from '../ui/NumberInput';
import {
  X,
  Building2,
  User,
  Upload,
  Globe,
  Share2,
  Check,
  AlertCircle,
  Facebook,
  Instagram,
  Youtube,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  KeyRound,
  Trash2,
  AlertTriangle,
  Download,
  Database,
  Heart,
  Sparkles,
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onFactoryResetDone?: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onFactoryResetDone,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'factory_reset'>('profile');

  // Profile fields
  const [brandName, setBrandName] = useState(profile.brandName || '');
  const [artistName, setArtistName] = useState(profile.artistName || '');
  const [familyNickname, setFamilyNickname] = useState(
    profile.familyNickname || getDefaultFamilyNickname(profile.artistName, profile.gender)
  );
  const [gender, setGender] = useState<Gender>(profile.gender || 'female');
  const [countryName, setCountryName] = useState(profile.country || 'جمهورية مصر العربية');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || '');
  const [defaultWholesaleDiscountPercent, setDefaultWholesaleDiscountPercent] = useState<number>(
    profile.defaultWholesaleDiscountPercent ?? 25
  );

  // Backup Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');

  // Socials
  const [activeSocials, setActiveSocials] = useState({
    facebook: Boolean(profile.socials?.facebook),
    instagram: Boolean(profile.socials?.instagram),
    tiktok: Boolean(profile.socials?.tiktok),
    youtube: Boolean(profile.socials?.youtube),
    store: Boolean(profile.socials?.store),
    website: Boolean(profile.socials?.website),
  });

  const [socialUrls, setSocialUrls] = useState({
    facebook: profile.socials?.facebook || '',
    instagram: profile.socials?.instagram || '',
    tiktok: profile.socials?.tiktok || '',
    youtube: profile.socials?.youtube || '',
    store: profile.socials?.store || '',
    website: profile.socials?.website || '',
  });

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  // Factory reset state
  const [resetPassword, setResetPassword] = useState('');
  const [resetReason, setResetReason] = useState('بدء دورة مالية جديدة وتصفير المخزون');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const currentCountryConfig =
    COUNTRIES_CONFIG.find((c) => c.name === countryName) || COUNTRIES_CONFIG[0];

  const handleCountryChange = (newCountryName: string) => {
    setCountryName(newCountryName);
    const cfg = COUNTRIES_CONFIG.find((c) => c.name === newCountryName);
    if (cfg && (!phoneNumber || phoneNumber.startsWith('+'))) {
      setPhoneNumber(cfg.callingCode);
    }
  };

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
          const compressedPng = canvas.toDataURL('image/png');
          setLogoUrl(compressedPng);
        } else {
          setLogoUrl(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setValidationError('');
    if (!brandName.trim()) {
      setValidationError('اسم البراند مطلوب');
      return;
    }
    if (!artistName.trim()) {
      setValidationError('اسم الفنان / الفنانة مطلوب');
      return;
    }

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < currentCountryConfig.phoneLength - 2) {
      setValidationError(
        `يرجى كتابة رقم هاتف صالح لدولة ${currentCountryConfig.name} (${currentCountryConfig.phoneLength} أرقام)`
      );
      return;
    }

    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        brandName: brandName.trim(),
        artistName: artistName.trim(),
        familyNickname:
          familyNickname.trim() || getDefaultFamilyNickname(artistName.trim(), gender),
        gender,
        country: currentCountryConfig.name,
        callingCode: currentCountryConfig.callingCode,
        currency: currentCountryConfig.currency,
        currencySymbol: currentCountryConfig.currencySymbol,
        phoneNumber: phoneNumber.trim(),
        logoUrl: logoUrl || undefined,
        defaultWholesaleDiscountPercent: Number(defaultWholesaleDiscountPercent) || 25,
        socials: {
          facebook: activeSocials.facebook ? socialUrls.facebook.trim() : undefined,
          instagram: activeSocials.instagram ? socialUrls.instagram.trim() : undefined,
          tiktok: activeSocials.tiktok ? socialUrls.tiktok.trim() : undefined,
          youtube: activeSocials.youtube ? socialUrls.youtube.trim() : undefined,
          store: activeSocials.store ? socialUrls.store.trim() : undefined,
          website: activeSocials.website ? socialUrls.website.trim() : undefined,
        },
        updatedAt: Date.now(),
      };

      await tenantStorage.saveProfile(updated);
      onProfileUpdated(updated);
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setValidationError(err.message || 'حدث خطأ أثناء حفظ الملف');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackupJson = async () => {
    setExportError('');
    setExporting(true);
    try {
      const tid = profile.tenantId || profile.workshopId || profile.id;
      const [
        treasuries,
        treasuryTransactions,
        customers,
        suppliers,
        supplierInvoices,
        materials,
        inventoryTransactions,
        invoices,
        workOrders,
        employees,
        payouts,
        products,
      ] = await Promise.all([
        firestoreService.getTreasuries(tid).catch(() => []),
        tenantStorage.getSafeTransactions(tid).catch(() => []),
        tenantStorage.getCustomers(tid).catch(() => []),
        tenantStorage.getSuppliers(tid).catch(() => []),
        firestoreService.getSupplierInvoices(tid).catch(() => []),
        tenantStorage.getRawMaterials(tid).catch(() => []),
        tenantStorage.getInventoryTransactions(tid).catch(() => []),
        tenantStorage.getOrders(tid).catch(() => []),
        firestoreService.getWorkOrders(tid).catch(() => []),
        tenantStorage.getEmployees(tid).catch(() => []),
        tenantStorage.getEmployeePayouts(tid).catch(() => []),
        firestoreService.getFinishedProducts(tid).catch(() => []),
      ]);

      const backupData = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        workshopId: tid,
        profile,
        treasuries,
        treasuryTransactions,
        customers,
        suppliers,
        supplierInvoices,
        rawMaterials: materials,
        inventoryTransactions,
        invoices,
        workOrders,
        employees,
        payouts,
        products,
      };

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `alshams_craft_backup_${(profile.brandName || 'workshop').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err: any) {
      console.error('Backup export failed:', err);
      setExportError(err.message || 'فشل تصدير النسخة الاحتياطية');
    } finally {
      setExporting(false);
    }
  };

  const handleExecuteFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      if (!resetPassword) {
        throw new Error('يرجى كتابة كلمة مرور حسابك النشط لتأكيد الهوية.');
      }
      if (!resetReason.trim() || resetReason.trim().length < 5) {
        throw new Error('يرجى كتابة سبب معتمد وموثق للتصفير.');
      }

      await tenantStorage.wipeDatabaseWithAuth(
        profile.tenantId || profile.workshopId || profile.id,
        resetPassword,
        resetReason,
        profile.email
      );

      setResetSuccess(true);
      setTimeout(() => {
        if (onFactoryResetDone) onFactoryResetDone();
        onClose();
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'فشلت عملية التصفير');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-7 relative text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
              إعدادات البراند وملف {getGenderArtistTitle(gender)}
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              تخصيص الهوية التجارية واللوجو الخاص، وإدارة أمان المنظومة
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            البيانات الأساسية للفنان
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>النسخ الاحتياطي (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('factory_reset')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'factory_reset'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>تصفير قاعدة البيانات (إعادة ضبط المصنع)</span>
          </button>
        </div>

        {/* Alerts */}
        {validationError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {successNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>تم حفظ التعديلات وتحديث هوية البراند بنجاح!</span>
          </div>
        )}

        {/* TAB 1: ARTISAN PROFILE */}
        {activeTab === 'profile' && (
          <div className="mt-4 space-y-5">
            {/* Logo Upload Section - STRICT SYSTEM ASSETS ISOLATION */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="لوجو البراند"
                    className="w-16 h-16 rounded-2xl object-contain bg-stone-100 dark:bg-stone-800 p-1 border-2 border-amber-500 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center border-2 border-dashed border-amber-400 text-amber-600 dark:text-amber-400 font-black text-xl">
                    {artistName.charAt(0) || 'ف'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    تحميل لوجو البراند الخاص بك
                  </p>
                  <p className="text-[11px] text-stone-500">
                    اختر صورة شعار متجرك الفردي ليظهر في عروض أسعار الواتساب والفواتير
                  </p>
                </div>
              </div>

              <label className="px-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-amber-500/50 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs hover:bg-amber-50 cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>تحميل لوجو البراند الخاص بك</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  اسم البراند / المشغل *
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="اسم البراند التجاري"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:placeholder-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  اسم الفنان / الفنانة *
                </label>
                <input
                  type="text"
                  required
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="الاسم الكريم"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:placeholder-transparent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>اسمك في العيلة (اختياري)</span>
                </label>
                <input
                  type="text"
                  value={familyNickname}
                  onChange={(e) => setFamilyNickname(e.target.value)}
                  placeholder={getDefaultFamilyNickname(artistName, gender)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  الاسم أو اللقب المحبب لك داخل عيلة الشمساوية (الافتراضي: {gender === 'female' ? 'الاسم الأول + الشمساوية' : 'الاسم الأول + الشمساوي'}).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الدولة والعملة المعتمدة
                </label>
                <select
                  value={countryName}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                >
                  {COUNTRIES_CONFIG.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name} ({c.currencySymbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  رقم الهاتف المعتمد
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="رقم الهاتف"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-left focus:placeholder-transparent"
                  dir="ltr"
                />
              </div>

              {/* Wholesale margin discount percent */}
              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60">
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  نسبة الخصم من هامش الربح لحساب سعر الجملة (%) (افتراضي 25%)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1.5">
                  <div className="w-full sm:w-36">
                    <NumberInput
                      value={defaultWholesaleDiscountPercent}
                      onChange={(v) => setDefaultWholesaleDiscountPercent(v)}
                      placeholder="25"
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    * تُخصم هذه النسبة من هامش الربح الصافي فقط عند حساب سعر الجملة مع حماية وضمان تغطية كافة تكاليف الخامات وأجور اليد العاملة.
                  </span>
                </div>
              </div>
            </div>

            {/* Social channels */}
            <div className="pt-2">
              <span className="block text-xs font-bold mb-2 text-stone-700 dark:text-stone-300">
                منصات التواصل والمتاجر (حدد ليظهر حقل الرابط)
              </span>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {[
                  { key: 'facebook', label: 'فيسبوك' },
                  { key: 'instagram', label: 'إنستجرام' },
                  { key: 'tiktok', label: 'تيك توك' },
                  { key: 'youtube', label: 'يوتيوب' },
                  { key: 'store', label: 'المتجر الإلكتروني' },
                  { key: 'website', label: 'الموقع الرسمي' },
                ].map((s) => (
                  <label
                    key={s.key}
                    className={`px-3 py-1.5 rounded-xl border cursor-pointer select-none transition ${
                      (activeSocials as any)[s.key]
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={(activeSocials as any)[s.key]}
                      onChange={(e) =>
                        setActiveSocials((prev) => ({ ...prev, [s.key]: e.target.checked }))
                      }
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>

              {/* Dynamic URL Inputs */}
              <div className="mt-3 space-y-2">
                {activeSocials.instagram && (
                  <input
                    type="url"
                    value={socialUrls.instagram}
                    onChange={(e) => setSocialUrls((p) => ({ ...p, instagram: e.target.value }))}
                    placeholder="https://instagram.com/your_macrame_art"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500 focus:placeholder-transparent"
                    dir="ltr"
                  />
                )}
                {activeSocials.facebook && (
                  <input
                    type="url"
                    value={socialUrls.facebook}
                    onChange={(e) => setSocialUrls((p) => ({ ...p, facebook: e.target.value }))}
                    placeholder="https://facebook.com/your_page"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500 focus:placeholder-transparent"
                    dir="ltr"
                  />
                )}
                {activeSocials.store && (
                  <input
                    type="url"
                    value={socialUrls.store}
                    onChange={(e) => setSocialUrls((p) => ({ ...p, store: e.target.value }))}
                    placeholder="https://salla.sa/your_brand أو متجر خاص"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500 focus:placeholder-transparent"
                    dir="ltr"
                  />
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>حفظ بيانات الفنان والبراند</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: BACKUP EXPORT (JSON) */}
        {activeTab === 'backup' && (
          <div className="mt-4 space-y-4">
            <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-stone-800 dark:text-stone-200 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <Database className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-black text-sm">
                  النسخ الاحتياطي اليدوي الشامل لبيانات الورشة (JSON)
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                يمكنك في أي وقت تنزيل نسخة احتياطية كاملة من بيانات ورشتك بصيغة JSON وحفظها على حاسوبك أو هاتفك.
                الملف يتضمن جميع سجلات ورشتك المتوافقة مع هيكلة بيانات Firebase Firestore: الملف التعريفي، الخزن، الحركات المالية، فواتير العملاء، الموردين، المخزون، أوامر التشغيل، وكشوف العمال والرواتب.
              </p>
            </div>

            {exportSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>تم تجهيز النسخة الاحتياطية وتنزيل الملف بنجاح على جهازك!</span>
              </div>
            )}

            {exportError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                محتويات حزمة النسخ الاحتياطي:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400 font-medium list-disc list-inside">
                <li>بيانات البراند وهوية المشغل واللقب العائلي</li>
                <li>سجلات الخزن النقدية وحركاتها المالية</li>
                <li>بيانات العملاء وأوامر البيع</li>
                <li>سجلات الموردين وفواتير الشراء</li>
                <li>أرصدة الخامات وتكاليف الـ WAC</li>
                <li>أوامر التشغيل وتتبع الهالك</li>
                <li>ملفات العمال والسلف وكشوف الرواتب</li>
                <li>أرشيف المنتجات الجاهزة والمحفوظة</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleExportBackupJson}
                disabled={exporting}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {exporting ? (
                  <span>جاري تجميع البيانات وتجهيز الملف...</span>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل وتصدير نسخة احتياطية كاملة (JSON)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FACTORY RESET (تصفير قاعدة البيانات المحمي بكلمة المرور) */}
        {activeTab === 'factory_reset' && (
          <form onSubmit={handleExecuteFactoryReset} className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>تنبيه أمني شديد الحساسية: تصفير قاعدة البيانات الشامل</span>
              </div>
              <p className="leading-relaxed">
                هذا الإجراء سيقوم بحذف كافة طلبيات المبيعات، أصول الخامات المخزنية، فواتير التوريد، كشوفات العملاء، مستحقات العمالة، وحركات الخزينة تماماً والعودة لنقطة الصفر المطلق. لا يمكن التراجع عن هذه العملية!
              </p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>تم تصفير كافة الجداول بنجاح والعودة لحالة المصنع النظيفة!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                سبب التصفير المعتمد *
              </label>
              <input
                type="text"
                required
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="مثال: بدء دورة مالية جديدة للعام أو جرد شامل"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                كلمة مرور حسابك النشط للتأكيد الأمني *
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور المسجلة بحسابك"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-stone-800 font-mono text-xs font-bold outline-none text-left"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                تطابق كلمة المرور شرط إلزامي لمنع التصفير العرضي أو غير المصرح به.
              </span>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {resetLoading ? (
                  <span>جاري التحقق والتصفير...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد تصفير البيانات والعودة للصفر</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
