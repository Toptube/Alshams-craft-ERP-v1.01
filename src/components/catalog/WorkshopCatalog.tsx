import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SavedProductRecord, UserProfile } from '../../types';
import {
  MAIN_SECTIONS,
  SUB_CRAFTS_REGISTRY,
  MainSectionDefinition,
  SubCraftDefinition,
} from '../../registry/craftsRegistry';
import { tenantStorage } from '../../db/dexieDB';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  Calculator,
  Layers,
  Boxes,
  Tag,
  DollarSign,
  CheckCircle,
  RefreshCw,
  FileText,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface WorkshopCatalogProps {
  profile: UserProfile;
  onSelectRecordToLoad: (record: SavedProductRecord) => void;
  onOpenWhatsAppShare: (record: SavedProductRecord) => void;
}

export const WorkshopCatalog: React.FC<WorkshopCatalogProps> = ({
  profile,
  onSelectRecordToLoad,
  onOpenWhatsAppShare,
}) => {
  // All loaded products stored in memory
  const [allProducts, setAllProducts] = useState<SavedProductRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string>('');

  // Search & Filter state (Executed completely in memory - no DB query per keystroke)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMainSection, setSelectedMainSection] = useState<string>('all');
  const [selectedCraft, setSelectedCraft] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'serial' | 'name' | 'retailPrice' | 'wholesalePrice' | 'costPrice'>('serial');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const tenantId = profile.tenantId || profile.workshopId || profile.id || '';
  const printTemplateRef = useRef<HTMLDivElement>(null);

  // Load all products ONCE from database
  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const items = await tenantStorage.getProducts(tenantId);
      setAllProducts(items);
    } catch (err) {
      console.error('Failed to load workshop products for catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, [tenantId]);

  // Crafts selected by the artisan
  const userCrafts = useMemo(() => {
    const craftIds = profile.selectedCrafts && profile.selectedCrafts.length > 0
      ? profile.selectedCrafts
      : ['macrame'];
    return SUB_CRAFTS_REGISTRY.filter((c) => craftIds.includes(c.id));
  }, [profile.selectedCrafts]);

  // Main sections available from selected crafts
  const availableSections = useMemo(() => {
    const secIds = new Set(userCrafts.map((c) => c.mainSectionId));
    return MAIN_SECTIONS.filter((s) => secIds.has(s.id));
  }, [userCrafts]);

  // Sub-crafts options for the dropdown, dynamically filtered by selectedMainSection
  const subCraftOptions = useMemo(() => {
    if (selectedMainSection === 'all') {
      return userCrafts;
    }
    return userCrafts.filter((c) => c.mainSectionId === selectedMainSection);
  }, [userCrafts, selectedMainSection]);

  // Reset craft filter if it doesn't belong to newly selected main section
  useEffect(() => {
    if (selectedCraft !== 'all') {
      const exists = subCraftOptions.some((c) => c.id === selectedCraft || c.nameAr === selectedCraft);
      if (!exists) {
        setSelectedCraft(!subCraftOptions.length ? 'all' : 'all');
      }
    }
  }, [selectedMainSection, subCraftOptions]);

  // Helper functions to get accurate numbers and labels across legacy and current records
  const getCostPrice = (p: SavedProductRecord): number => {
    if (typeof p.costPrice === 'number') return p.costPrice;
    if (p.output) {
      return Math.round(
        (p.output.totalDirectMaterialsCost || 0) +
        (p.output.laborWage || 0) +
        (p.output.packagingCost || 0) +
        (p.output.transitFees || 0) +
        (p.output.adminExpensesShare || 0)
      );
    }
    return 0;
  };

  const getRetailPrice = (p: SavedProductRecord): number => {
    if (typeof p.retailPrice === 'number') return p.retailPrice;
    return p.output?.finalSellingPrice || 0;
  };

  const getWholesalePrice = (p: SavedProductRecord): number => {
    if (typeof p.wholesalePrice === 'number') return p.wholesalePrice;
    const cost = getCostPrice(p);
    const retail = getRetailPrice(p);
    const discountPercent = profile.defaultWholesaleDiscountPercent ?? 25;
    const marginAmount = p.output?.insulatedProfitAmount || Math.max(0, retail - cost);
    const discount = Math.round(marginAmount * (discountPercent / 100));
    return Math.max(cost, retail - discount);
  };

  const getProductSerialDisplay = (p: SavedProductRecord, index: number): string => {
    if (p.productCode) return p.productCode;
    if (p.productSerialNumber) return `PRD-${String(p.productSerialNumber).padStart(4, '0')}`;
    return `PRD-${String(index + 1).padStart(4, '0')}`;
  };

  const getMainSectionDisplay = (p: SavedProductRecord): string => {
    if (p.mainSectionName) return p.mainSectionName;
    if (p.mainSectionId) {
      const sec = MAIN_SECTIONS.find((s) => s.id === p.mainSectionId);
      if (sec) return sec.nameAr;
    }
    return 'الحبال والنسيج';
  };

  const getCraftDisplay = (p: SavedProductRecord): string => {
    if (p.craftName) return p.craftName;
    if (p.craftId) {
      const c = SUB_CRAFTS_REGISTRY.find((sc) => sc.id === p.craftId);
      if (c) return c.nameAr;
    }
    return 'مكرمية';
  };

  // Purely in-memory search and filtering (zero DB calls per keystroke)
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // 1. Filter by Main Section
    if (selectedMainSection !== 'all') {
      result = result.filter((p) => {
        const secName = getMainSectionDisplay(p);
        return p.mainSectionId === selectedMainSection || secName === selectedMainSection;
      });
    }

    // 2. Filter by Sub Section / Craft
    if (selectedCraft !== 'all') {
      result = result.filter((p) => {
        const craftName = getCraftDisplay(p);
        return (
          p.craftId === selectedCraft ||
          craftName === selectedCraft ||
          p.category === selectedCraft ||
          p.productType === selectedCraft
        );
      });
    }

    // 3. Search by Name or Number (case-insensitive & trimmed)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p, idx) => {
        const nameMatch = p.productName?.toLowerCase().includes(q);
        const codeMatch = p.productCode?.toLowerCase().includes(q);
        const serialStr = p.productSerialNumber ? String(p.productSerialNumber) : '';
        const serialMatch = serialStr.includes(q);
        const displaySerial = getProductSerialDisplay(p, idx).toLowerCase();
        const displayMatch = displaySerial.includes(q);
        const categoryMatch = typeof p.category === 'string' && p.category.toLowerCase().includes(q);
        const typeMatch = p.productType?.toLowerCase().includes(q);
        return Boolean(nameMatch || codeMatch || serialMatch || displayMatch || categoryMatch || typeMatch);
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'serial') {
        const serialA = a.productSerialNumber || 0;
        const serialB = b.productSerialNumber || 0;
        comparison = serialA - serialB;
      } else if (sortBy === 'name') {
        comparison = (a.productName || '').localeCompare(b.productName || '', 'ar');
      } else if (sortBy === 'costPrice') {
        comparison = getCostPrice(a) - getCostPrice(b);
      } else if (sortBy === 'wholesalePrice') {
        comparison = getWholesalePrice(a) - getWholesalePrice(b);
      } else if (sortBy === 'retailPrice') {
        comparison = getRetailPrice(a) - getRetailPrice(b);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allProducts, selectedMainSection, selectedCraft, searchQuery, sortBy, sortOrder]);

  // Statistics calculation for the current filtered catalog
  const catalogStats = useMemo(() => {
    const totalCount = filteredProducts.length;
    const totalCost = filteredProducts.reduce((sum, p) => sum + getCostPrice(p), 0);
    const totalWholesale = filteredProducts.reduce((sum, p) => sum + getWholesalePrice(p), 0);
    const totalRetail = filteredProducts.reduce((sum, p) => sum + getRetailPrice(p), 0);

    return {
      totalCount,
      totalCost,
      totalWholesale,
      totalRetail,
      avgRetail: totalCount > 0 ? Math.round(totalRetail / totalCount) : 0,
    };
  }, [filteredProducts]);

  // PDF Export Function using dedicated independent template
  const handleExportPDF = async () => {
    if (!printTemplateRef.current || filteredProducts.length === 0) {
      setExportNotice('لا توجد منتجات معروضة للتصدير.');
      setTimeout(() => setExportNotice(''), 3000);
      return;
    }

    setIsExportingPdf(true);
    setExportNotice('جاري إنشاء قالب PDF المستقل بدقة عالية...');

    try {
      const templateEl = printTemplateRef.current;
      // Temporarily reveal template for capture offscreen
      templateEl.style.display = 'block';

      const canvas = await html2canvas(templateEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      templateEl.style.display = 'none';

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add remaining pages if content exceeds A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `كتالوج_ورشة_${profile.brandName || 'الشمس'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      setExportNotice('تم تصدير كتالوج الورشة بصيغة PDF بنجاح!');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setExportNotice('حدث خطأ أثناء تصدير ملف PDF: ' + (err.message || ''));
      setTimeout(() => setExportNotice(''), 4000);
    } finally {
      setIsExportingPdf(false);
      if (printTemplateRef.current) {
        printTemplateRef.current.style.display = 'none';
      }
    }
  };

  // Dedicated Print Function using clean iframe print-to-pdf
  const handlePrintTemplate = () => {
    if (!printTemplateRef.current || filteredProducts.length === 0) return;
    const content = printTemplateRef.current.innerHTML;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8">
            <title>كتالوج منتجات الورشة - ${profile.brandName}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; direction: rtl; padding: 15mm; color: #1c1917; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              th, td { border: 1px solid #d6d3d1; padding: 7px 10px; text-align: right; }
              th { background-color: #f5f5f4; font-weight: bold; }
              @media print {
                @page { size: A4 portrait; margin: 10mm; }
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <BookOpen className="w-4 h-4" />
            <span>الدليل التجاري والكتالوج الرسمي للورشة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            كتالوج منتجات الورشة
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            عرض جدولي متكامل للمنتجات مع التكلفة وأسعار البيع القطاعي والجملة، وإمكانية التصدير المباشر كملف PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh data button */}
          <button
            type="button"
            onClick={loadCatalogData}
            title="تحديث البيانات"
            className="p-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          {/* Quick Print Button */}
          <button
            type="button"
            onClick={handlePrintTemplate}
            disabled={filteredProducts.length === 0}
            className="px-3.5 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="طباعة مباشرة للكتالوج"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          {/* Export PDF Button - Main Requirement */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf || filteredProducts.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs shadow-md shadow-amber-600/20 active:scale-[0.98] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'جاري تجهيز PDF...' : 'تصدير PDF للقائمة'}</span>
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 2. Search & Filters Bar (Pure in-memory execution) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box: Name or Number */}
          <div className="lg:col-span-5 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم المنتج، رقم المنتج (PRD-0001)، أو نوع القطعة..."
              className="w-full px-3.5 py-2.5 pr-9 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold"
              >
                مسح
              </button>
            )}
          </div>

          {/* Filter 1: القسم الأساسي */}
          <div className="lg:col-span-3">
            <div className="relative">
              <select
                value={selectedMainSection}
                onChange={(e) => setSelectedMainSection(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
              >
                <option value="all">كافة الأقسام الأساسية (الكل)</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.nameAr}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Filter 2: القسم الفرعي / الحرفة */}
          <div className="lg:col-span-3">
            <div className="relative">
              <select
                value={selectedCraft}
                onChange={(e) => setSelectedCraft(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
              >
                <option value="all">كافة الحِرف الفرعية (الكل)</option>
                {subCraftOptions.map((craft) => (
                  <option key={craft.id} value={craft.id}>
                    {craft.nameAr}
                  </option>
                ))}
              </select>
              <Layers className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedMainSection('all');
                setSelectedCraft('all');
              }}
              title="إعادة ضبط الفلاتر"
              className="p-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1 text-xs font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="lg:hidden">إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* Catalog summary indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div className="flex items-center gap-2 text-stone-500">
            <span>النتائج المعروضة:</span>
            <span className="font-mono font-black text-amber-700 dark:text-amber-400">
              {filteredProducts.length}
            </span>
            <span>من إجمالي {allProducts.length} منتج مسجل بالورشة</span>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400">ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] font-bold text-stone-700 dark:text-stone-300 outline-none"
            >
              <option value="serial">رقم المنتج</option>
              <option value="name">اسم المنتج</option>
              <option value="retailPrice">سعر القطاعي</option>
              <option value="wholesalePrice">سعر الجملة</option>
              <option value="costPrice">التكلفة</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Catalog Content: Responsive Table on Desktop, Cards on Mobile */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600 mb-2" />
          <p className="text-xs font-bold text-stone-500">جاري تحميل سجلات منتجات الكتالوج...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-black text-stone-800 dark:text-stone-200">
            لم يتم العثور على منتجات مطابقة للبحث أو الفلتر
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            تأكد من كتابة الاسم أو الرقم بشكل صحيح، أو أضف منتجات جديدة من حاسبة الإنتاج لتظهر هنا فورياً!
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (md and up) */}
          <div className="hidden md:block rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 font-black">
                    <th className="py-3.5 px-4 text-center">رقم المنتج</th>
                    <th className="py-3.5 px-4">القسم الأساسي</th>
                    <th className="py-3.5 px-4">القسم الفرعي</th>
                    <th className="py-3.5 px-4">اسم المنتج</th>
                    <th className="py-3.5 px-4 text-center font-mono">التكلفة</th>
                    <th className="py-3.5 px-4 text-center font-mono text-emerald-700 dark:text-emerald-400">
                      سعر الجملة
                    </th>
                    <th className="py-3.5 px-4 text-center font-mono text-amber-700 dark:text-amber-400">
                      سعر القطاعي
                    </th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredProducts.map((p, idx) => {
                    const cost = getCostPrice(p);
                    const wholesale = getWholesalePrice(p);
                    const retail = getRetailPrice(p);
                    const serial = getProductSerialDisplay(p, idx);
                    const mainSec = getMainSectionDisplay(p);
                    const subCraft = getCraftDisplay(p);

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-amber-50/40 dark:hover:bg-stone-800/40 transition group"
                      >
                        {/* رقم المنتج */}
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[11px]">
                            {serial}
                          </span>
                        </td>

                        {/* القسم الأساسي */}
                        <td className="py-3 px-4 font-bold text-stone-700 dark:text-stone-300">
                          <span className="inline-flex items-center gap-1">
                            <Boxes className="w-3.5 h-3.5 text-stone-400" />
                            <span>{mainSec}</span>
                          </span>
                        </td>

                        {/* القسم الفرعي */}
                        <td className="py-3 px-4 font-bold text-stone-700 dark:text-stone-300">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 text-[11px]">
                            {subCraft}
                          </span>
                        </td>

                        {/* اسم المنتج */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {p.imageUrl && (
                              <img
                                src={p.imageUrl}
                                alt={p.productName}
                                className="w-8 h-8 rounded-lg object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0"
                              />
                            )}
                            <div>
                              <span className="font-extrabold text-stone-900 dark:text-stone-100 block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                {p.productName}
                              </span>
                              {p.productType && (
                                <span className="text-[10px] text-stone-400 font-medium">
                                  {p.productType}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* التكلفة */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-600 dark:text-stone-300">
                          {cost} {profile.currencySymbol}
                        </td>

                        {/* سعر الجملة */}
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {wholesale} {profile.currencySymbol}
                        </td>

                        {/* سعر القطاعي */}
                        <td className="py-3 px-4 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                          {retail} {profile.currencySymbol}
                        </td>

                        {/* إجراءات سريعة */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenWhatsAppShare(p)}
                              title="مشاركة عرض سعر واتساب"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectRecordToLoad(p)}
                              title="فتح في الحاسبة للتعديل"
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Footer Totals */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/70 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
              <div>
                <span>إجمالي الأصناف: </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                  {catalogStats.totalCount}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-stone-400 text-[11px]">مجموع التكاليف: </span>
                  <span className="font-mono">{catalogStats.totalCost} {profile.currencySymbol}</span>
                </div>
                <div>
                  <span className="text-emerald-600 text-[11px]">مجموع الجملة: </span>
                  <span className="font-mono text-emerald-600">{catalogStats.totalWholesale} {profile.currencySymbol}</span>
                </div>
                <div>
                  <span className="text-amber-600 text-[11px]">مجموع القطاعي: </span>
                  <span className="font-mono text-amber-600">{catalogStats.totalRetail} {profile.currencySymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (Transforms into cards on mobile - Requirement) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((p, idx) => {
              const cost = getCostPrice(p);
              const wholesale = getWholesalePrice(p);
              const retail = getRetailPrice(p);
              const serial = getProductSerialDisplay(p, idx);
              const mainSec = getMainSectionDisplay(p);
              const subCraft = getCraftDisplay(p);

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3"
                >
                  {/* Top Bar: Serial & Section Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 font-mono font-black text-xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                      {serial}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {mainSec}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                        {subCraft}
                      </span>
                    </div>
                  </div>

                  {/* Body: Image & Name */}
                  <div className="flex items-start gap-3 pt-1">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.productName}
                        className="w-14 h-14 rounded-2xl object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-black text-sm text-stone-900 dark:text-stone-100 leading-snug">
                        {p.productName}
                      </h4>
                      {p.productType && (
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          نوع المنتج: {p.productType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing 3-Box Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 text-center font-mono">
                    <div className="p-1">
                      <span className="text-[9px] text-stone-400 font-sans block mb-0.5">التكلفة</span>
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                        {cost} <span className="text-[9px]">{profile.currencySymbol}</span>
                      </span>
                    </div>
                    <div className="p-1 border-x border-stone-200/80 dark:border-stone-700">
                      <span className="text-[9px] text-emerald-600 font-sans block mb-0.5">الجملة</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {wholesale} <span className="text-[9px]">{profile.currencySymbol}</span>
                      </span>
                    </div>
                    <div className="p-1">
                      <span className="text-[9px] text-amber-600 font-sans block mb-0.5">القطاعي</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                        {retail} <span className="text-[9px]">{profile.currencySymbol}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectRecordToLoad(p)}
                      className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>تعديل في الحاسبة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppShare(p)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 border border-emerald-300/40"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 4. DEDICATED INDEPENDENT PRINT/PDF TEMPLATE (OFFSCREEN) */}
      <div style={{ display: 'none' }}>
        <div
          ref={printTemplateRef}
          style={{
            width: '800px',
            backgroundColor: '#ffffff',
            color: '#1c1917',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            direction: 'rtl',
            padding: '30px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #d97706',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 'bold', color: '#78350f' }}>
                كتالوج منتجات الورشة
              </h1>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#1c1917' }}>
                براند: {profile.brandName} | الفنان: {profile.artistName}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#78716c' }}>
                هاتف الورشة: {profile.phoneNumber} • {profile.country}
              </p>
            </div>
            <div style={{ textAlign: 'left', fontSize: '11px', color: '#78716c' }}>
              <p style={{ margin: '0' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
              <p style={{ margin: '4px 0 0 0' }}>عدد المنتجات: {filteredProducts.length}</p>
              <p style={{ margin: '4px 0 0 0', color: '#d97706', fontWeight: 'bold' }}>
                العملة: {profile.currencySymbol} ({profile.currency})
              </p>
            </div>
          </div>

          {/* Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'right',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#fef3c7', borderBottom: '2px solid #b45309' }}>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', width: '30px' }}>#</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', width: '75px' }}>رقم المنتج</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', width: '110px' }}>القسم الأساسي</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', width: '90px' }}>القسم الفرعي</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>اسم المنتج / الموديل</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', width: '75px' }}>التكلفة</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', width: '80px', color: '#047857' }}>سعر الجملة</th>
                <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', width: '80px', color: '#b45309' }}>سعر القطاعي</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => {
                const cost = getCostPrice(p);
                const wholesale = getWholesalePrice(p);
                const retail = getRetailPrice(p);
                const serial = getProductSerialDisplay(p, idx);
                const mainSec = getMainSectionDisplay(p);
                const subCraft = getCraftDisplay(p);
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={p.id}
                    style={{
                      backgroundColor: isEven ? '#ffffff' : '#fafaf9',
                      borderBottom: '1px solid #e7e5e4',
                    }}
                  >
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#78716c' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>
                      {serial}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb' }}>
                      {mainSec}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', color: '#78350f', fontWeight: 'bold' }}>
                      {subCraft}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                      {p.productName}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      {cost}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#047857' }}>
                      {wholesale}
                    </td>
                    <td style={{ padding: '7px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#b45309' }}>
                      {retail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold', borderTop: '2px solid #b45309' }}>
                <td colSpan={5} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>
                  الإجمالي العام ({filteredProducts.length} منتج)
                </td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {catalogStats.totalCost}
                </td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#047857' }}>
                  {catalogStats.totalWholesale}
                </td>
                <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#b45309' }}>
                  {catalogStats.totalRetail}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Notes */}
          <div
            style={{
              marginTop: '25px',
              paddingTop: '12px',
              borderTop: '1px solid #e7e5e4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10px',
              color: '#78716c',
            }}
          >
            <span>* الأسعار شاملة لكافة نسب الأمان وتكاليف الإنتاج المعتمدة بالورشة.</span>
            <span>صادر من نظام الشمس للبرمجيات الحرفية • AL-SHAMS CRAFT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
