import React, { useState, useEffect, useMemo } from 'react';
import {
  RawMaterialItem,
  SupplierRecord,
  UnitRecord,
  WorkshopProfile,
} from '../../types';
import { firestoreService } from '../../db/firestoreService';
import { NumberInput } from '../ui/NumberInput';
import { ensureDefaultBasicYarns } from '../../services/materialCalculatorAdapter';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Building,
  Tag,
  ArrowRight,
  X,
  PackagePlus,
  Layers,
  Sparkles,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface MaterialsViewProps {
  workshop: WorkshopProfile;
  initialOpenAddModal?: boolean;
  onResetOpenAddModal?: () => void;
  onOpenHelp?: (sectionId: string) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  workshop,
  initialOpenAddModal = false,
  onResetOpenAddModal,
  onOpenHelp,
}) => {
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'basic' | 'extra'>('all');
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  // Material Modal (Add / Edit)
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(initialOpenAddModal);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterialItem | null>(null);
  const [materialName, setMaterialName] = useState('');
  const [materialCategory, setMaterialCategory] = useState<'خامة أساسية' | 'خامة إضافية'>('خامة أساسية');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [selectedUnitName, setSelectedUnitName] = useState('كيلو');
  const [marketName, setMarketName] = useState('');
  const [marketUnitRatio, setMarketUnitRatio] = useState<number>(1);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minAlertThreshold, setMinAlertThreshold] = useState<number>(5);
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Quick Add Supplier Inline Modal
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('');
  const [savingQuickSupplier, setSavingQuickSupplier] = useState(false);

  // Quick Add Unit Inline Modal
  const [isQuickUnitOpen, setIsQuickUnitOpen] = useState(false);
  const [quickUnitName, setQuickUnitName] = useState('');
  const [quickSubUnit, setQuickSubUnit] = useState('');
  const [quickConversionFactor, setQuickConversionFactor] = useState<number>(1);
  const [savingQuickUnit, setSavingQuickUnit] = useState(false);

  // Units Management Drawer/Modal
  const [isUnitsManagerOpen, setIsUnitsManagerOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);

  // Delete Confirm Modal
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mats, unts, sups] = await Promise.all([
        ensureDefaultBasicYarns(workshop.id),
        firestoreService.getUnits(workshop.id),
        firestoreService.getSuppliers(workshop.id),
      ]);
      setMaterials(mats);
      setUnits(unts);
      setSuppliers(sups);
      if (unts.length > 0 && !selectedUnitName) {
        setSelectedUnitName(unts[0].name);
      }
    } catch (err) {
      console.error('Failed to load materials data:', err);
      setNotice({ text: 'حدث خطأ أثناء تحميل بيانات الخامات.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workshop.id]);

  useEffect(() => {
    if (initialOpenAddModal) {
      handleOpenAddMaterial();
      if (onResetOpenAddModal) onResetOpenAddModal();
    }
  }, [initialOpenAddModal]);

  // Selected Unit Info
  const currentUnitRecord = useMemo(() => {
    return units.find((u) => u.name === selectedUnitName) || units[0] || null;
  }, [units, selectedUnitName]);

  const handleOpenAddMaterial = () => {
    setEditingMaterial(null);
    setMaterialName('');
    setMaterialCategory('خامة أساسية');
    setSelectedSupplierId('');
    setSelectedSupplierName('');
    setSupplierSearch('');
    setPurchasePrice(0);
    setSelectedUnitName(units[0]?.name || 'كيلو');
    setMarketName('');
    setMarketUnitRatio(1);
    setCurrentStock(0);
    setMinAlertThreshold(5);
    setIsMaterialModalOpen(true);
  };

  const handleOpenEditMaterial = (item: RawMaterialItem) => {
    setEditingMaterial(item);
    setMaterialName(item.materialName);
    setMaterialCategory(
      item.materialCategory === 'خامة إضافية' || item.materialCategory === 'extra'
        ? 'خامة إضافية'
        : 'خامة أساسية'
    );
    setSelectedSupplierId(item.supplierId || '');
    setSelectedSupplierName(item.supplierName || '');
    setSupplierSearch(item.supplierName || '');
    setPurchasePrice(item.costPerUnit || 0);
    setSelectedUnitName(item.unit || 'كيلو');
    setMarketName(item.marketName || '');
    setMarketUnitRatio(item.marketUnitRatio || 1);
    setCurrentStock(item.currentStock || 0);
    setMinAlertThreshold(item.minAlertThreshold || 5);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setNotice({ text: 'يرجى إدخال اسم الخامة.', isError: true });
      return;
    }

    setSavingMaterial(true);
    setNotice(null);

    try {
      const convFactor = currentUnitRecord?.conversionFactor || 1000;
      const subUnitName = currentUnitRecord?.subUnit || 'جرام';

      // Cost per subUnit (e.g., cost per gram)
      const costPerSubUnit =
        convFactor > 0 ? Math.round((purchasePrice / convFactor) * 10000) / 10000 : purchasePrice;

      const id = editingMaterial ? editingMaterial.id : 'mat_' + Math.random().toString(36).substring(2, 9);

      const record: RawMaterialItem = {
        id,
        workshopId: workshop.id,
        tenantId: workshop.id,
        materialName: materialName.trim(),
        category: materialCategory === 'خامة أساسية' ? 'خامات أساسية' : 'إضافية',
        materialCategory,
        unit: selectedUnitName,
        subUnit: subUnitName,
        conversionFactor: convFactor,
        marketName: marketName.trim() || undefined,
        marketUnitRatio: marketName.trim() ? (marketUnitRatio || 1) : undefined,
        currentStock: Number(currentStock) || 0,
        costPerUnit: Number(purchasePrice) || 0,
        costPerGram: costPerSubUnit,
        supplierId: selectedSupplierId || undefined,
        supplierName: selectedSupplierName.trim() || undefined,
        minAlertThreshold: Number(minAlertThreshold) || 5,
        isActive: true,
        createdAt: editingMaterial?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await firestoreService.saveRawMaterial(workshop.id, record);
      await loadData();

      setIsMaterialModalOpen(false);
      setNotice({
        text: editingMaterial ? 'تم تحديث بيانات الخامة بنجاح.' : 'تمت إضافة الخامة الجديدة بنجاح.',
        isError: false,
      });
    } catch (err: any) {
      console.error('Error saving material:', err);
      setNotice({ text: 'تعذر حفظ بيانات الخامة: ' + (err?.message || ''), isError: true });
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await firestoreService.deleteRawMaterial(workshop.id, materialId);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      setDeletingMaterialId(null);
      setNotice({ text: 'تم حذف الخامة بنجاح.', isError: false });
    } catch (err) {
      console.error('Failed to delete material:', err);
      setNotice({ text: 'حدث خطأ أثناء حذف الخامة.', isError: true });
    }
  };

  // Quick Supplier Creation
  const handleCreateQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;

    setSavingQuickSupplier(true);
    try {
      const supName = quickSupplierName.trim();
      const newSup: SupplierRecord = {
        id: 'sup_' + Math.random().toString(36).substring(2, 9),
        workshopId: workshop.id,
        name: supName,
        supplierName: supName,
        phoneNumber: quickSupplierPhone.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        currentBalance: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await firestoreService.saveSupplier(workshop.id, newSup);
      setSuppliers((prev) => [...prev, newSup]);
      setSelectedSupplierId(newSup.id);
      setSelectedSupplierName(supName);
      setSupplierSearch(supName);
      setIsQuickSupplierOpen(false);
      setQuickSupplierName('');
      setQuickSupplierPhone('');
      setNotice({ text: `تمت إضافة المورد "${supName}" واختياره بنجاح.`, isError: false });
    } catch (err) {
      console.error('Failed to add quick supplier:', err);
      setNotice({ text: 'تعذر إضافة المورد الجديد.', isError: true });
    } finally {
      setSavingQuickSupplier(false);
    }
  };

  // Quick Unit Creation
  const handleCreateQuickUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnitName.trim() || !quickSubUnit.trim()) return;

    setSavingQuickUnit(true);
    try {
      const newUnit: UnitRecord = {
        id: 'unit_' + Math.random().toString(36).substring(2, 9),
        workshopId: workshop.id,
        name: quickUnitName.trim(),
        subUnit: quickSubUnit.trim(),
        conversionFactor: Number(quickConversionFactor) || 1,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await firestoreService.saveUnit(workshop.id, newUnit);
      setUnits((prev) => [...prev, newUnit]);
      setSelectedUnitName(newUnit.name);
      setIsQuickUnitOpen(false);
      setQuickUnitName('');
      setQuickSubUnit('');
      setQuickConversionFactor(1);
      setNotice({ text: `تمت إضافة الوحدة "${newUnit.name}" بنجاح.`, isError: false });
    } catch (err) {
      console.error('Failed to add quick unit:', err);
      setNotice({ text: 'تعذر إضافة وحدة القياس.', isError: true });
    } finally {
      setSavingQuickUnit(false);
    }
  };

  // Unit Manager Save/Delete
  const handleSaveUnitManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnitName.trim() || !quickSubUnit.trim()) return;

    setSavingQuickUnit(true);
    try {
      const u: UnitRecord = {
        id: editingUnit ? editingUnit.id : 'unit_' + Math.random().toString(36).substring(2, 9),
        workshopId: workshop.id,
        name: quickUnitName.trim(),
        subUnit: quickSubUnit.trim(),
        conversionFactor: Number(quickConversionFactor) || 1,
        isDefault: editingUnit?.isDefault || false,
        createdAt: editingUnit?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await firestoreService.saveUnit(workshop.id, u);
      await loadData();
      setEditingUnit(null);
      setQuickUnitName('');
      setQuickSubUnit('');
      setQuickConversionFactor(1);
      setNotice({ text: 'تم حفظ وحدة القياس بنجاح.', isError: false });
    } catch (err) {
      console.error('Failed to save unit:', err);
      setNotice({ text: 'تعذر حفظ وحدة القياس.', isError: true });
    } finally {
      setSavingQuickUnit(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      await firestoreService.deleteUnit(workshop.id, unitId);
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
      setNotice({ text: 'تم حذف وحدة القياس.', isError: false });
    } catch (err) {
      console.error('Failed to delete unit:', err);
      setNotice({ text: 'تعذر حذف وحدة القياس.', isError: true });
    }
  };

  // Filtered Suppliers for inline search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        ((s.name || s.supplierName || '').toLowerCase().includes(q)) ||
        (s.phoneNumber && s.phoneNumber.includes(supplierSearch))
    );
  }, [suppliers, supplierSearch]);

  // Filtered Materials list
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        m.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.supplierName && m.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.unit && m.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.marketName && m.marketName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (categoryFilter === 'all') return true;
      const isExtra =
        m.materialCategory === 'خامة إضافية' ||
        m.materialCategory === 'extra' ||
        m.category === 'إضافية';

      if (categoryFilter === 'basic') return !isExtra;
      if (categoryFilter === 'extra') return isExtra;

      return true;
    });
  }, [materials, searchQuery, categoryFilter]);

  // Quick Stats
  const totalStockValue = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.currentStock || 0) * (m.costPerUnit || 0), 0);
  }, [materials]);

  const basicMaterialsCount = useMemo(() => {
    return materials.filter(
      (m) =>
        m.materialCategory === 'خامة أساسية' ||
        m.materialCategory === 'basic' ||
        m.category === 'خامات أساسية'
    ).length;
  }, [materials]);

  const extraMaterialsCount = useMemo(() => {
    return materials.filter(
      (m) =>
        m.materialCategory === 'خامة إضافية' ||
        m.materialCategory === 'extra' ||
        m.category === 'إضافية'
    ).length;
  }, [materials]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="max-w-2xl text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-200 text-xs font-bold mb-3 border border-white/20">
              <Boxes className="w-4 h-4" />
              <span>منظومة إدارة الخامات ووحدات القياس</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
              سجل الخامات والأسعار
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium">
              المرجع الشامل لخامات ورشتك (الأساسية والإضافية)، مع ضبط أسعار الشراء، ومستويات الأمان، ونظام التحويل التلقائي بين الوحدات الكبرى والصغرى.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsUnitsManagerOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>إدارة وحدات القياس</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddMaterial}
              className="px-5 py-2.5 rounded-2xl bg-white text-amber-900 hover:bg-amber-50 text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خامة جديدة</span>
            </button>
          </div>
        </div>

        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* Notice Alert */}
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
            notice.isError
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-right">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block mb-1">
            إجمالي الأصناف المسجلة
          </span>
          <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
            {materials.length}{' '}
            <span className="text-xs font-normal text-stone-400">صنف خامة</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-right">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
            الخامات الأساسية (خيوط...)
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-300">
            {basicMaterialsCount}{' '}
            <span className="text-xs font-normal text-stone-400">خامة</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-right">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
            الخامات الإضافية (إكسسوارات...)
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-300">
            {extraMaterialsCount}{' '}
            <span className="text-xs font-normal text-stone-400">خامة</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-right">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block mb-1">
            قيمة المخزون المقدرة
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-stone-900 dark:text-stone-100">
            {Math.round(totalStockValue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-stone-400">{workshop.currencySymbol}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar (Search & Filter) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، المورد، الوحدة، أو اسم السوق..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-500"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            الكل ({materials.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('basic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'basic'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            خامات أساسية ({basicMaterialsCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('extra')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              categoryFilter === 'extra'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            خامات إضافية ({extraMaterialsCount})
          </button>
        </div>
      </div>

      {/* Materials Table */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden text-right">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone-500">جاري تحميل سجل الخامات...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Boxes className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-stone-800 dark:text-stone-200 text-sm">
              لم يتم العثور على أي خامات
            </h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {searchQuery
                ? 'لا توجد خامات مطابقة لبحثك، جرب كتابة كلمة أخرى.'
                : 'ابدأ الآن بإضافة أول خامة لورشتك وربطها بالوحدة والمورد المناسب.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddMaterial}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خامة الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-100/70 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 font-bold border-b border-stone-200 dark:border-stone-800">
                  <th className="p-3.5">اسم الخامة</th>
                  <th className="p-3.5">التصنيف</th>
                  <th className="p-3.5">المورد</th>
                  <th className="p-3.5">سعر الشراء</th>
                  <th className="p-3.5">الرصيد المتاح</th>
                  <th className="p-3.5">الاسم بالسوق</th>
                  <th className="p-3.5">حد الطلب الأدنى</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                {filteredMaterials.map((m) => {
                  const isExtra =
                    m.materialCategory === 'خامة إضافية' ||
                    m.materialCategory === 'extra' ||
                    m.category === 'إضافية';
                  const isLowStock = (m.currentStock || 0) <= (m.minAlertThreshold || 0);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-amber-50/40 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-extrabold text-stone-900 dark:text-stone-100">
                          {m.materialName}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isExtra
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {isExtra ? 'خامة إضافية' : 'خامة أساسية'}
                        </span>
                      </td>

                      <td className="p-3.5 text-stone-600 dark:text-stone-400">
                        {m.supplierName || '—'}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-stone-900 dark:text-stone-100">
                        {m.costPerUnit || 0} {workshop.currencySymbol}{' '}
                        <span className="text-[10px] text-stone-400 font-normal">/ {m.unit}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                          <span>
                            {m.currentStock} {m.unit}
                          </span>
                          {isLowStock && (
                            <span
                              title="الرصيد أقل من حد الطلب الأدنى"
                              className="inline-flex items-center text-rose-500 bg-rose-50 dark:bg-rose-950/60 p-0.5 rounded-md"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-stone-600 dark:text-stone-400">
                        {m.marketName ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-stone-800 dark:text-stone-200">
                              {m.marketName}
                            </span>{' '}
                            <span className="text-stone-400 text-[10px]">
                              (= {m.marketUnitRatio || 1} {m.unit})
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-stone-500">
                        {m.minAlertThreshold} {m.unit}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMaterial(m)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                            title="تعديل الخامة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMaterialId(m.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                            title="حذف الخامة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. ADD / EDIT MATERIAL MODAL                             */}
      {/* ======================================================== */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-stone-200 dark:border-stone-800 shadow-2xl p-6 text-right space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                    {editingMaterial ? 'تعديل بيانات الخامة' : 'إضافة خامة جديدة'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    قم بإدخال بيانات الخامة والوحدة والتسعير
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              {/* Material Name & Category */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  اسم الخامة *
                </label>
                <input
                  type="text"
                  required
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="مثال: خيط قطن محلول 4 مم كرمة، حلقة حديد 20 سم..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              {/* Classification: Basic vs Extra */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  تصنيف نوع الخامة *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMaterialCategory('خامة أساسية')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
                      materialCategory === 'خامة أساسية'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 font-extrabold shadow-sm'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850 text-stone-600 dark:text-stone-400 font-medium'
                    }`}
                  >
                    <div className="text-xs font-extrabold">خامة أساسية</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                      مثل الخيوط، الحبال، النسيج
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMaterialCategory('خامة إضافية')}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer ${
                      materialCategory === 'خامة إضافية'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-extrabold shadow-sm'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-850 text-stone-600 dark:text-stone-400 font-medium'
                    }`}
                  >
                    <div className="text-xs font-extrabold">خامة إضافية</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                      مثل الإكسسوارات، الحديد، الخرز، التغليف
                    </div>
                  </button>
                </div>
              </div>

              {/* Supplier with search and + Add Supplier button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickSupplierOpen(true)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مورد جديد</span>
                  </button>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    المورد الرئيسي
                  </label>
                </div>

                <div className="relative">
                  <div
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {selectedSupplierName || 'اختر المورد أو ابحث باسمه...'}
                    </span>
                  </div>

                  {isSupplierDropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 p-2 space-y-1.5 animate-in fade-in">
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        placeholder="ابحث في الموردين المسجلين..."
                        className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs outline-none"
                        autoFocus
                      />

                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        <div
                          onClick={() => {
                            setSelectedSupplierId('');
                            setSelectedSupplierName('');
                            setIsSupplierDropdownOpen(false);
                          }}
                          className="p-2 rounded-xl text-xs hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer text-stone-500"
                        >
                          بدون مورد محدد (شراء عام)
                        </div>
                        {filteredSuppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSupplierId(s.id);
                              setSelectedSupplierName(s.name || s.supplierName || '');
                              setIsSupplierDropdownOpen(false);
                            }}
                            className={`p-2 rounded-xl text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer flex items-center justify-between ${
                              selectedSupplierId === s.id
                                ? 'bg-amber-100/60 dark:bg-amber-950/60 font-bold text-amber-900 dark:text-amber-200'
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            <span className="text-[10px] text-stone-400 font-mono">
                              {s.phoneNumber || ''}
                            </span>
                            <span>{s.name || s.supplierName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Units & Purchase Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Unit selector with + button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => setIsQuickUnitOpen(true)}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>وحدة جديدة</span>
                    </button>
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      وحدة القياس الكبرى *
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedUnitName}
                      onChange={(e) => setSelectedUnitName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none cursor-pointer"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    {/* SubUnit indicator (shows subUnit name only, as requested) */}
                    {currentUnitRecord && currentUnitRecord.subUnit && currentUnitRecord.subUnit !== currentUnitRecord.name && (
                      <div className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold whitespace-nowrap">
                        {currentUnitRecord.subUnit}
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Price (سعر الشراء) using NumberInput */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    سعر الشراء ({workshop.currencySymbol}) *
                  </label>
                  <div className="relative">
                    <NumberInput
                      required
                      value={purchasePrice}
                      onChange={setPurchasePrice}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none focus:border-amber-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-stone-400 font-mono">
                      لكل {selectedUnitName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Market Name (الاسم بالسوق) - Optional */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    الاسم بالسوق <span className="text-stone-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={marketName}
                    onChange={(e) => setMarketName(e.target.value)}
                    placeholder="مثال: شلة، بكرة، كرتونة، باكتة..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    الاسم الدارج الذي تشتري به القطعة من السوق.
                  </span>
                </div>

                {/* If marketName is entered, show conversion ratio */}
                {marketName.trim() && (
                  <div className="animate-in fade-in">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                      الواحدة منها تساوي كم من ({selectedUnitName})؟
                    </label>
                    <div className="relative">
                      <NumberInput
                        value={marketUnitRatio}
                        onChange={setMarketUnitRatio}
                        placeholder="0.5"
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-xs font-mono font-bold outline-none"
                      />
                      <span className="absolute left-3 top-2 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        {selectedUnitName}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">
                      مثال: الشلة الواحدة = 0.5 كيلو، تُستخدم تلقائياً في التحويل عند الشراء وتسهيل الحسابات.
                    </span>
                  </div>
                )}
              </div>

              {/* Current Stock & Min Threshold using NumberInput */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    الرصيد المتاح حالياً
                  </label>
                  <div className="relative">
                    <NumberInput
                      value={currentStock}
                      onChange={setCurrentStock}
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono text-xs font-bold outline-none text-center"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-stone-400">
                      {selectedUnitName}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    حد الطلب الأدنى للتنبيه *
                  </label>
                  <div className="relative">
                    <NumberInput
                      required
                      value={minAlertThreshold}
                      onChange={setMinAlertThreshold}
                      placeholder="5"
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/40 dark:bg-amber-950/20 font-mono text-xs font-bold outline-none text-center"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-amber-700 dark:text-amber-400">
                      {selectedUnitName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingMaterial}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {savingMaterial ? 'جاري الحفظ...' : editingMaterial ? 'تحديث الخامة' : 'حفظ الخامة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. QUICK ADD SUPPLIER INLINE MODAL                      */}
      {/* ======================================================== */}
      {isQuickSupplierOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateQuickSupplier}
            className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm border border-stone-200 dark:border-stone-800 shadow-2xl p-5 text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsQuickSupplierOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-600" />
                <span>إضافة مورد جديد سريعاً</span>
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اسم المورد / المحل *
              </label>
              <input
                type="text"
                required
                value={quickSupplierName}
                onChange={(e) => setQuickSupplierName(e.target.value)}
                placeholder="مثال: محل النور للخيوط، مصنع الأهرام..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                رقم الهاتف (اختياري)
              </label>
              <input
                type="tel"
                value={quickSupplierPhone}
                onChange={(e) => setQuickSupplierPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsQuickSupplierOpen(false)}
                className="px-3 py-1.5 text-xs text-stone-500 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingQuickSupplier}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingQuickSupplier ? 'جاري الإضافة...' : 'إضافة المورد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. QUICK ADD UNIT INLINE MODAL                          */}
      {/* ======================================================== */}
      {isQuickUnitOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateQuickUnit}
            className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm border border-stone-200 dark:border-stone-800 shadow-2xl p-5 text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsQuickUnitOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>إضافة وحدة قياس جديدة</span>
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اسم الوحدة الكبرى *
              </label>
              <input
                type="text"
                required
                value={quickUnitName}
                onChange={(e) => setQuickUnitName(e.target.value)}
                placeholder="مثال: ياردة، كرتونة، دستة، قيراط..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                اسم الوحدة الصغرى التابعة لها *
              </label>
              <input
                type="text"
                required
                value={quickSubUnit}
                onChange={(e) => setQuickSubUnit(e.target.value)}
                placeholder="مثال: بوصة، قطعة، سم..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                معامل التحويل (كم وحدة صغرى داخل الوحدة الكبرى؟) *
              </label>
              <NumberInput
                required
                value={quickConversionFactor}
                onChange={setQuickConversionFactor}
                placeholder="1"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono font-bold outline-none"
              />
              <span className="text-[10px] text-stone-400 block mt-0.5">
                مثلاً: الكيلو = 1000 جرام، الدستة = 12 قطعة، المتر = 100 سم.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsQuickUnitOpen(false)}
                className="px-3 py-1.5 text-xs text-stone-500 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingQuickUnit}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingQuickUnit ? 'جاري الإضافة...' : 'حفظ الوحدة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. UNITS MANAGER FULL MODAL                              */}
      {/* ======================================================== */}
      {isUnitsManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-stone-200 dark:border-stone-800 shadow-2xl p-6 text-right space-y-5">
            <div className="flex items-center justify-between border-b pb-4 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setIsUnitsManagerOpen(false);
                  setEditingUnit(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                    إدارة وحدات القياس
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    الوحدات الافتراضية للورشة ومعاملات التحويل بين الكبرى والصغرى
                  </p>
                </div>
              </div>
            </div>

            {/* Form for adding/editing in manager */}
            <form onSubmit={handleSaveUnitManager} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
                {editingUnit ? `تعديل وحدة: ${editingUnit.name}` : '+ إضافة وحدة قياس مخصصة'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    الوحدة الكبرى
                  </label>
                  <input
                    type="text"
                    required
                    value={quickUnitName}
                    onChange={(e) => setQuickUnitName(e.target.value)}
                    placeholder="مثال: ياردة"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    الوحدة الصغرى
                  </label>
                  <input
                    type="text"
                    required
                    value={quickSubUnit}
                    onChange={(e) => setQuickSubUnit(e.target.value)}
                    placeholder="مثال: سم"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    معامل التحويل
                  </label>
                  <NumberInput
                    required
                    value={quickConversionFactor}
                    onChange={setQuickConversionFactor}
                    placeholder="100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingUnit && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUnit(null);
                      setQuickUnitName('');
                      setQuickSubUnit('');
                      setQuickConversionFactor(1);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-stone-500 cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingQuickUnit}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {savingQuickUnit ? 'جاري الحفظ...' : editingUnit ? 'تحديث الوحدة' : 'حفظ الوحدة'}
                </button>
              </div>
            </form>

            {/* Units list */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
                الوحدات المسجلة حالياً ({units.length}):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnit(u);
                          setQuickUnitName(u.name);
                          setQuickSubUnit(u.subUnit);
                          setQuickConversionFactor(u.conversionFactor);
                        }}
                        className="p-1 text-stone-400 hover:text-amber-600 transition"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!u.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(u.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-xs text-stone-900 dark:text-stone-100 flex items-center justify-end gap-1.5">
                        <span>{u.name}</span>
                        {u.isDefault && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                            افتراضية
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        1 {u.name} = {u.conversionFactor} {u.subUnit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DELETE CONFIRM MODAL                                  */}
      {/* ======================================================== */}
      {deletingMaterialId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm border border-stone-200 dark:border-stone-800 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
              تأكيد حذف الخامة؟
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              هل أنت متأكد من حذف هذه الخامة نهائياً من سجل الخامات؟ لا يمكن التراجع عن هذه الخطوة.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMaterialId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMaterial(deletingMaterialId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
              >
                نعم، احذف الخامة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
