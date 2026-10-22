import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, WorkshopProfile, isUserAdmin } from '../../types';
import { firestoreService } from '../../db/firestoreService';
import { tenantStorage } from '../../db/dexieDB';
import { COUNTRIES_CONFIG } from '../../utils/macrameMath';
import { playSuccessSound, playErrorSound, playPageFlipSound, playAlertSound } from '../../lib/sounds';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Trash2,
  Snowflake,
  Play,
  PlusCircle,
  X,
  Check,
  AlertTriangle,
  Lock,
  Globe,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface AdminDashboardProps {
  profile: UserProfile;
  onNavigateHome: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profile,
  onNavigateHome,
  onProfileUpdated,
}) => {
  const isAdmin = isUserAdmin(profile);

  // Workshops State
  const [workshops, setWorkshops] = useState<WorkshopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen'>('all');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('all');

  // Modals state
  const [editingWorkshop, setEditingWorkshop] = useState<WorkshopProfile | null>(null);
  const [freezingWorkshop, setFreezingWorkshop] = useState<WorkshopProfile | null>(null);
  const [freezeReason, setFreezeReason] = useState('مخالفة معايير الاستخدام أو طلب إيقاف مؤقت');
  const [deletingWorkshop, setDeletingWorkshop] = useState<WorkshopProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isNewWorkshopModalOpen, setIsNewWorkshopModalOpen] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // New Workshop Form State
  const [newBrandName, setNewBrandName] = useState('');
  const [newArtistName, setNewArtistName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCountry, setNewCountry] = useState('مصر');
  const [newRole, setNewRole] = useState<'artisan' | 'manager' | 'admin'>('artisan');

  // Load All Workshops from Firestore and Dexie
  const loadWorkshops = useCallback(async (isSilent = false) => {
    if (!isAdmin) return;
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg('');

    try {
      let remoteWorkshops: WorkshopProfile[] = [];
      let localProfiles: UserProfile[] = [];

      try {
        remoteWorkshops = await firestoreService.getAllWorkshops();
      } catch (err: any) {
        console.warn('Firestore getAllWorkshops warning (operating in local fallback):', err?.message);
      }

      try {
        localProfiles = await tenantStorage.getAllProfiles();
      } catch (err: any) {
        console.warn('Dexie getAllProfiles warning:', err?.message);
      }

      // Merge workshops by ID without duplication
      const map = new Map<string, WorkshopProfile>();

      // Ensure current profile is listed
      map.set(profile.id, profile);

      localProfiles.forEach((p) => {
        if (p.id) map.set(p.id, p);
      });

      remoteWorkshops.forEach((w) => {
        if (w.id) {
          const existing = map.get(w.id);
          map.set(w.id, { ...existing, ...w });
        }
      });

      const list = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setWorkshops(list);
    } catch (err: any) {
      setErrorMsg('تعذر تحميل قائمة الورش: ' + (err.message || 'خطأ في الاتصال'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, profile]);

  useEffect(() => {
    if (isAdmin) {
      loadWorkshops();
    }
  }, [isAdmin, loadWorkshops]);

  // Filtered Workshops
  const filteredWorkshops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workshops.filter((w) => {
      // Status filter
      if (statusFilter === 'active' && w.isFrozen) return false;
      if (statusFilter === 'frozen' && !w.isFrozen) return false;

      // Country filter
      if (selectedCountryFilter !== 'all' && w.country !== selectedCountryFilter) return false;

      // Search query
      if (!q) return true;
      const bName = (w.brandName || '').toLowerCase();
      const aName = (w.artistName || '').toLowerCase();
      const email = (w.email || '').toLowerCase();
      const phone = (w.phoneNumber || '').toLowerCase();
      const country = (w.country || '').toLowerCase();
      const crafts = (w.selectedCrafts || []).join(' ').toLowerCase();

      return (
        bName.includes(q) ||
        aName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        country.includes(q) ||
        crafts.includes(q)
      );
    });
  }, [workshops, searchQuery, statusFilter, selectedCountryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = workshops.length;
    const frozen = workshops.filter((w) => w.isFrozen).length;
    const active = total - frozen;
    const adminsCount = workshops.filter((w) => isUserAdmin(w)).length;
    return { total, active, frozen, adminsCount };
  }, [workshops]);

  // 1. Edit Workshop Handler
  const handleSaveEditedWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkshop) return;
    setSavingAction(true);
    try {
      const updated: WorkshopProfile = {
        ...editingWorkshop,
        updatedAt: Date.now(),
      };

      // Save to Firestore & local storage
      await firestoreService.setWorkshop(updated);
      await tenantStorage.saveProfile(updated);

      setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      if (updated.id === profile.id && onProfileUpdated) {
        onProfileUpdated(updated);
      }

      playSuccessSound();
      setSuccessNotice(`تم تحديث بيانات ورشة "${updated.brandName}" بنجاح.`);
      setTimeout(() => setSuccessNotice(''), 4000);
      setEditingWorkshop(null);
    } catch (err: any) {
      playErrorSound();
      alert('تعذر تحديث الورشة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSavingAction(false);
    }
  };

  // 2. Freeze / Unfreeze Workshop Handler
  const handleToggleFreezeWorkshop = async () => {
    if (!freezingWorkshop) return;
    setSavingAction(true);
    try {
      const newFrozenState = !freezingWorkshop.isFrozen;
      const updated: WorkshopProfile = {
        ...freezingWorkshop,
        isFrozen: newFrozenState,
        frozenReason: newFrozenState ? freezeReason.trim() || 'تجميد بواسطة الإدارة' : '',
        frozenAt: newFrozenState ? Date.now() : undefined,
        updatedAt: Date.now(),
      };

      await firestoreService.setWorkshopFrozenStatus(
        freezingWorkshop.id,
        newFrozenState,
        updated.frozenReason
      );
      await tenantStorage.saveProfile(updated);

      setWorkshops((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      if (updated.id === profile.id && onProfileUpdated) {
        onProfileUpdated(updated);
      }

      if (newFrozenState) {
        playAlertSound();
        setSuccessNotice(`تم تجميد حساب ورشة "${updated.brandName}" بنجاح.`);
      } else {
        playSuccessSound();
        setSuccessNotice(`تم إلغاء تجميد حساب ورشة "${updated.brandName}" وإعادة تفعيلها.`);
      }

      setTimeout(() => setSuccessNotice(''), 4000);
      setFreezingWorkshop(null);
    } catch (err: any) {
      playErrorSound();
      alert('تعذر تغيير حالة تجميد الحساب: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSavingAction(false);
    }
  };

  // 3. Delete Workshop Handler
  const handleDeleteWorkshop = async () => {
    if (!deletingWorkshop) return;
    if (deletingWorkshop.id === profile.id) {
      alert('لا يمكنك حذف ورشتك الحالية المسجل الدخول بها من لوحة التحكم!');
      return;
    }
    if (deleteConfirmText.trim() !== deletingWorkshop.brandName.trim()) {
      alert(`يرجى كتابة اسم الورشة بالكامل للتأكيد: "${deletingWorkshop.brandName}"`);
      return;
    }

    setSavingAction(true);
    try {
      await firestoreService.deleteWorkshop(deletingWorkshop.id);
      await tenantStorage.deleteProfile(deletingWorkshop.id);

      setWorkshops((prev) => prev.filter((w) => w.id !== deletingWorkshop.id));
      playAlertSound();
      setSuccessNotice(`تم حذف ورشة "${deletingWorkshop.brandName}" نهائياً من المنظومة.`);
      setTimeout(() => setSuccessNotice(''), 4000);
      setDeletingWorkshop(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      playErrorSound();
      alert('تعذر حذف الورشة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSavingAction(false);
    }
  };

  // 4. Create New Workshop Handler
  const handleCreateNewWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim() || !newArtistName.trim()) {
      alert('اسم البراند واسم الفنان مطلوبان');
      return;
    }

    setSavingAction(true);
    try {
      const generatedId = 'ws_' + Math.random().toString(36).substring(2, 10);
      const countryConfig =
        COUNTRIES_CONFIG.find((c) => c.name === newCountry) || COUNTRIES_CONFIG[0];

      const newWs: WorkshopProfile = {
        id: generatedId,
        ownerUid: generatedId,
        email: newEmail.trim() || `${generatedId}@alshams.craft`,
        brandName: newBrandName.trim(),
        artistName: newArtistName.trim(),
        gender: 'female',
        phoneNumber: newPhone.trim(),
        country: countryConfig.name,
        currency: countryConfig.currency,
        currencySymbol: countryConfig.currencySymbol,
        callingCode: countryConfig.callingCode,
        selectedCrafts: ['macrame'],
        defaultVatPercent: 14,
        showTaxInfoOnInvoice: false,
        role: newRole,
        isFrozen: false,
        welcomeShown: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: profile.email || 'admin',
      };

      await firestoreService.setWorkshop(newWs);
      await tenantStorage.saveProfile(newWs);

      setWorkshops((prev) => [newWs, ...prev]);
      playSuccessSound();
      setSuccessNotice(`تم تسجيل ورشة "${newWs.brandName}" بنجاح.`);
      setTimeout(() => setSuccessNotice(''), 4000);

      // Reset form
      setNewBrandName('');
      setNewArtistName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('artisan');
      setIsNewWorkshopModalOpen(false);
    } catch (err: any) {
      playErrorSound();
      alert('تعذر إنشاء الورشة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setSavingAction(false);
    }
  };

  // Access Denied Screen (إذا لم يكن المستخدم مسؤولاً)
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-stone-900 border border-rose-300 dark:border-rose-900/60 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
            منطقة المسؤولين فقط
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            عذراً، هذه الشاشة مخصصة لإدارة المنظومة والورش المسجلة. الحساب الحالي (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {profile.email || 'مستخدم غير محدد'}
            </span>
            ) لا يمتلك صلاحيات المسؤول.
          </p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20"
          >
            <ArrowRight size={16} />
            <span>العودة للصفحة الرئيسية</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-amber-300">
                لوحة تحكم الإدارة (Admin Dashboard)
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold font-mono">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              إدارة كافة الورش المسجلة، تعديل البيانات، تجميد الحسابات، وحذف الورش
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewWorkshopModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>تسجيل ورشة جديدة</span>
          </button>
          <button
            type="button"
            onClick={() => loadWorkshops(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition cursor-pointer disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice('')}
            className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500">إجمالي الورش</div>
            <div className="text-lg sm:text-xl font-black font-mono text-stone-900 dark:text-stone-100">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Check size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500">الورش النشطة</div>
            <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
            <Snowflake size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500">الحسابات المجمدة</div>
            <div className="text-lg sm:text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {stats.frozen}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500">المسؤولون</div>
            <div className="text-lg sm:text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {stats.adminsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الورشة، اسم الفنان، البريد، الهاتف، الدولة..."
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-right"
          />
          <Search size={16} className="absolute right-3.5 top-3 text-stone-400 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl w-full md:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            الكل ({workshops.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-stone-900 text-emerald-600 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            النشطة ({stats.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('frozen')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'frozen'
                ? 'bg-white dark:bg-stone-900 text-cyan-600 shadow-xs'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            المجمدة ({stats.frozen})
          </button>
        </div>

        {/* Country Filter */}
        <div className="w-full md:w-44">
          <select
            value={selectedCountryFilter}
            onChange={(e) => setSelectedCountryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold outline-none cursor-pointer text-stone-700 dark:text-stone-300"
          >
            <option value="all">كل الدول</option>
            {COUNTRIES_CONFIG.map((c) => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workshops List / Table */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-stone-500">جاري قراءة سجلات الورش المسجلة...</p>
        </div>
      ) : filteredWorkshops.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
          <Building2 size={40} className="mx-auto text-stone-300 dark:text-stone-700" />
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            لا توجد ورش مطابقة لمعايير البحث
          </h3>
          <p className="text-xs text-stone-500">
            جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر بالأعلى.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100/70 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">الورشة والبراند</th>
                  <th className="py-3.5 px-4">الفنان / المالك</th>
                  <th className="py-3.5 px-4">معلومات الاتصال</th>
                  <th className="py-3.5 px-4">الدولة والعملة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">الصلاحية</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات التفاعلية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                {filteredWorkshops.map((ws) => {
                  const isCurrent = ws.id === profile.id;
                  const isWsAdmin = isUserAdmin(ws);
                  return (
                    <tr
                      key={ws.id}
                      className={`hover:bg-amber-50/40 dark:hover:bg-stone-800/40 transition ${
                        ws.isFrozen ? 'bg-cyan-50/20 dark:bg-cyan-950/10' : ''
                      }`}
                    >
                      {/* Workshop Brand */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {ws.logoBase64 || ws.logoUrl ? (
                            <img
                              src={ws.logoBase64 || ws.logoUrl}
                              alt={ws.brandName}
                              className="w-9 h-9 rounded-xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black flex items-center justify-center flex-shrink-0">
                              {ws.brandName.charAt(0) || 'و'}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <span>{ws.brandName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                  ورشتك
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                              ID: {ws.id.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Artist Name */}
                      <td className="py-3.5 px-4 font-bold text-stone-800 dark:text-stone-200">
                        {ws.artistName || 'غير محدد'}
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-stone-700 dark:text-stone-300 flex items-center gap-1">
                            <Mail size={12} className="text-stone-400" />
                            <span className="font-mono">{ws.email || '—'}</span>
                          </div>
                          {ws.phoneNumber && (
                            <div className="text-stone-500 flex items-center gap-1 font-mono" dir="ltr">
                              <Phone size={12} className="text-stone-400" />
                              <span>{ws.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Country & Currency */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700 dark:text-stone-300">
                          <Globe size={13} className="text-amber-600" />
                          <span>{ws.country || 'مصر'}</span>
                          <span className="text-stone-400">({ws.currencySymbol || 'ج.م'})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {ws.isFrozen ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 text-[10px] font-extrabold border border-cyan-200 dark:border-cyan-800">
                            <Snowflake size={11} />
                            <span>مجمد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800">
                            <Check size={11} />
                            <span>نشطة</span>
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {isWsAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-[10px] font-extrabold border border-purple-200 dark:border-purple-800">
                            <ShieldCheck size={11} />
                            <span>مسؤول</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-500 font-bold">
                            حرفي ورشة
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => setEditingWorkshop(ws)}
                            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-600 dark:text-stone-300 hover:text-amber-700 transition cursor-pointer"
                            title="تعديل بيانات الورشة"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Freeze / Unfreeze */}
                          <button
                            type="button"
                            onClick={() => {
                              setFreezingWorkshop(ws);
                              setFreezeReason(ws.frozenReason || 'مخالفة معايير الاستخدام أو طلب إيقاف مؤقت');
                            }}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              ws.isFrozen
                                ? 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200'
                                : 'bg-stone-100 dark:bg-stone-800 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 text-stone-600 dark:text-stone-300 hover:text-cyan-600'
                            }`}
                            title={ws.isFrozen ? 'إلغاء التجميد' : 'تجميد الحساب'}
                          >
                            {ws.isFrozen ? <Play size={15} /> : <Snowflake size={15} />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => {
                              setDeletingWorkshop(ws);
                              setDeleteConfirmText('');
                            }}
                            className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-stone-600 dark:text-stone-300 hover:text-rose-600 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCurrent ? 'لا يمكن حذف ورشتك الحالية' : 'حذف الورشة نهائياً'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3.5">
            {filteredWorkshops.map((ws) => {
              const isCurrent = ws.id === profile.id;
              const isWsAdmin = isUserAdmin(ws);
              return (
                <div
                  key={ws.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3 ${
                    ws.isFrozen ? 'border-cyan-300 dark:border-cyan-800/60 bg-cyan-50/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {ws.logoBase64 || ws.logoUrl ? (
                        <img
                          src={ws.logoBase64 || ws.logoUrl}
                          alt={ws.brandName}
                          className="w-10 h-10 rounded-xl object-cover border border-stone-200 dark:border-stone-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black flex items-center justify-center">
                          {ws.brandName.charAt(0) || 'و'}
                        </div>
                      )}
                      <div>
                        <div className="font-black text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>{ws.brandName}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              ورشتك
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-stone-500">
                          {ws.artistName || 'غير محدد'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {ws.isFrozen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black">
                          <Snowflake size={10} />
                          <span>مجمد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          <Check size={10} />
                          <span>نشطة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div>
                      <span className="text-stone-400 block text-[10px]">الدولة:</span>
                      <span className="font-bold">{ws.country || 'مصر'} ({ws.currencySymbol || 'ج.م'})</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">البريد:</span>
                      <span className="font-mono truncate block">{ws.email || '—'}</span>
                    </div>
                  </div>

                  {ws.isFrozen && ws.frozenReason && (
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-800 dark:text-cyan-300 font-bold">
                      سبب التجميد: {ws.frozenReason}
                    </div>
                  )}

                  {/* Mobile Actions Button Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <button
                      type="button"
                      onClick={() => setEditingWorkshop(ws)}
                      className="flex-1 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-200 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Edit3 size={13} />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFreezingWorkshop(ws);
                        setFreezeReason(ws.frozenReason || 'مخالفة معايير الاستخدام أو طلب إيقاف مؤقت');
                      }}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        ws.isFrozen
                          ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                          : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300'
                      }`}
                    >
                      {ws.isFrozen ? <Play size={13} /> : <Snowflake size={13} />}
                      <span>{ws.isFrozen ? 'إلغاء التجميد' : 'تجميد'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        setDeletingWorkshop(ws);
                        setDeleteConfirmText('');
                      }}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 hover:bg-rose-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* 1. EDIT WORKSHOP MODAL */}
      {/* ============================================================ */}
      {editingWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setEditingWorkshop(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  تعديل بيانات ورشة: {editingWorkshop.brandName}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveEditedWorkshop} className="space-y-4 pt-4 text-xs font-bold">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1">
                  اسم البراند / الورشة
                </label>
                <input
                  type="text"
                  required
                  value={editingWorkshop.brandName}
                  onChange={(e) =>
                    setEditingWorkshop({ ...editingWorkshop, brandName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1">
                  اسم الفنان / الفنانة (صاحب الورشة)
                </label>
                <input
                  type="text"
                  required
                  value={editingWorkshop.artistName}
                  onChange={(e) =>
                    setEditingWorkshop({ ...editingWorkshop, artistName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    required
                    value={editingWorkshop.email}
                    onChange={(e) =>
                      setEditingWorkshop({ ...editingWorkshop, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-left outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    رقم الهاتف المعتمد
                  </label>
                  <input
                    type="tel"
                    value={editingWorkshop.phoneNumber || ''}
                    onChange={(e) =>
                      setEditingWorkshop({ ...editingWorkshop, phoneNumber: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-left outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    الدولة
                  </label>
                  <select
                    value={editingWorkshop.country}
                    onChange={(e) => {
                      const cfg = COUNTRIES_CONFIG.find((c) => c.name === e.target.value);
                      if (cfg) {
                        setEditingWorkshop({
                          ...editingWorkshop,
                          country: cfg.name,
                          currency: cfg.currency,
                          currencySymbol: cfg.currencySymbol,
                          callingCode: cfg.callingCode,
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {COUNTRIES_CONFIG.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    صلاحية الحساب في المنظومة
                  </label>
                  <select
                    value={editingWorkshop.role || 'artisan'}
                    onChange={(e) =>
                      setEditingWorkshop({
                        ...editingWorkshop,
                        role: e.target.value as any,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="artisan">حرفي ورشة (Artisan)</option>
                    <option value="manager">مدير ورشة (Workshop Manager)</option>
                    <option value="admin">مسؤول منصة (Platform Admin)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingWorkshop(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  {savingAction ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FREEZE / UNFREEZE WORKSHOP MODAL */}
      {/* ============================================================ */}
      {freezingWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  freezingWorkshop.isFrozen
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-cyan-100 text-cyan-600'
                }`}
              >
                {freezingWorkshop.isFrozen ? <Play size={24} /> : <Snowflake size={24} />}
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900 dark:text-stone-100">
                  {freezingWorkshop.isFrozen ? 'إلغاء تجميد الحساب' : 'تجميد حساب الورشة'}
                </h3>
                <p className="text-xs text-stone-500">{freezingWorkshop.brandName}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              {freezingWorkshop.isFrozen
                ? 'هل أنت متأكد من رغبتك في إلغاء التجميد وإعادة تمكين ورشة هذا الحرفي من تسجيل الدخول واستخدام النظام بكامل الصلاحيات؟'
                : 'عند تجميد الحساب، لن يتمكن صاحب الورشة من إجراء عمليات جديدة وسيتم إشعاره بمراجعة إدارة المنظومة.'}
            </p>

            {!freezingWorkshop.isFrozen && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  سبب التجميد (يظهر للحرفي عند الدخول):
                </label>
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="مثال: مراجعة الدورة المالية، عدم سداد الرسوم، أو انتهاك شروط الاستخدام"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setFreezingWorkshop(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={handleToggleFreezeWorkshop}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 ${
                  freezingWorkshop.isFrozen
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/30'
                }`}
              >
                {savingAction ? (
                  <span>جاري التنفيذ...</span>
                ) : freezingWorkshop.isFrozen ? (
                  <>
                    <Play size={15} />
                    <span>تأكيد إلغاء التجميد والتفعيل</span>
                  </>
                ) : (
                  <>
                    <Snowflake size={15} />
                    <span>تأكيد تجميد الحساب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DELETE WORKSHOP MODAL */}
      {/* ============================================================ */}
      {deletingWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl border border-rose-300 dark:border-rose-900/60 p-6 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-rose-600">حذف الورشة نهائياً</h3>
                <p className="text-xs text-stone-500">{deletingWorkshop.brandName}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>تحذير أمان صارم: هذا الإجراء لا يمكن الرجوع عنه!</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                سيتم مسح سجلات ورشة "{deletingWorkshop.brandName}" وملفها من قاعدة البيانات السحابية والمحلية نهائياً.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                لتأكيد الحذف، اكتب اسم الورشة تماماً: (
                <span className="text-rose-600 select-all font-black">{deletingWorkshop.brandName}</span>)
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="اكتب اسم الورشة هنا..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setDeletingWorkshop(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={
                  savingAction || deleteConfirmText.trim() !== deletingWorkshop.brandName.trim()
                }
                onClick={handleDeleteWorkshop}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingAction ? (
                  <span>جاري الحذف...</span>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. NEW WORKSHOP REGISTRATION MODAL */}
      {/* ============================================================ */}
      {isNewWorkshopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 sm:p-6 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsNewWorkshopModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  تسجيل ورشة حرفية جديدة
                </h3>
              </div>
            </div>

            <form onSubmit={handleCreateNewWorkshop} className="space-y-4 pt-4 text-xs font-bold">
              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1">
                  اسم البراند / الورشة *
                </label>
                <input
                  type="text"
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="مثال: ورشة شمس للمكرميات"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-stone-300 mb-1">
                  اسم الفنان / الفنانة *
                </label>
                <input
                  type="text"
                  required
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="مثال: مريم الألفي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-left outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-left outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    الدولة
                  </label>
                  <select
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {COUNTRIES_CONFIG.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 dark:text-stone-300 mb-1">
                    الدور الأولي
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="artisan">حرفي ورشة</option>
                    <option value="manager">مدير ورشة</option>
                    <option value="admin">مسؤول منصة</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewWorkshopModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
                >
                  {savingAction ? (
                    <span>جاري التسجيل...</span>
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      <span>إضافة الورشة فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
