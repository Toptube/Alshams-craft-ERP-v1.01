import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  User,
  Truck,
  Package,
  FileText,
  Hammer,
  Users,
  Boxes,
  ArrowRight,
  Calculator,
  BookOpen,
  FolderArchive,
  Layers,
  Wallet,
  DollarSign,
  Users2,
  BarChart3,
  Sparkles,
  HelpCircle,
  Receipt,
  ShoppingCart,
  Compass,
  Tag,
  Coins,
  History,
  ShieldCheck,
} from 'lucide-react';
import {
  CustomerRecord,
  SupplierRecord,
  FinishedProductItem,
  SavedProductRecord,
  RawMaterialItem,
  InvoiceRecord,
  SupplierPurchaseInvoice,
  WorkOrderRecord,
  EmployeeProfile,
  TreasuryItem,
  AdminCostRecord,
} from '../../types';
import { GUIDE_SECTIONS, GLOSSARY } from '../../guide/guide';
import { playPageFlipSound } from '../../lib/sounds';

export interface GlobalSearchDataCache {
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  products: (FinishedProductItem | SavedProductRecord)[];
  materials: RawMaterialItem[];
  invoices: InvoiceRecord[];
  supplierInvoices?: SupplierPurchaseInvoice[];
  workOrders: WorkOrderRecord[];
  employees: EmployeeProfile[];
  treasuries?: TreasuryItem[];
  expenses?: AdminCostRecord[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cache: GlobalSearchDataCache;
  onSelectResult: (category: string, item: any, extra?: any) => void;
}

/**
 * 3) تطبيع النصوص العربية:
 * إزالة التشكيل تماماً، وتوحيد الألف (أ إ آ ٱ ← ا)، والتاء المربوطة (ة ← ه)، والياء/الألف المقصورة (ى ← ي)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // إزالة التشكيل (الفتحة، الضمة، الكسرة، السكون، الشدة، التنوين)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // إزالة التطويل / الكشيدة
    .replace(/\u0640/g, '')
    // توحيد الألف
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد التاء المربوطة
    .replace(/ة/g, 'ه')
    // توحيد الألف المقصورة والياء
    .replace(/ى/g, 'ي')
    // إزالة الفراغات الزائدة والتحويل لأحرف صغيرة
    .toLowerCase()
    .trim();
}

/**
 * خوارزمية حساب المسافة (Levenshtein Distance) لتحمل أخطاء الكتابة البسيطة
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // استبدال
          Math.min(
            matrix[i][j - 1] + 1, // إدراج
            matrix[i - 1][j] + 1 // حذف
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * فحص التطابق مع مراعاة التطبيع والبحث الجزئي وتحمل الأخطاء الإملائية
 */
function matchesFuzzy(targetText: string, queryText: string): boolean {
  if (!targetText || !queryText) return false;
  const normTarget = normalizeArabic(targetText);
  const normQuery = normalizeArabic(queryText);

  if (!normQuery) return false;

  // 1. تطابق كامل أو جزئي مباشر
  if (normTarget.includes(normQuery)) return true;

  // 2. فحص الكلمات المفتاحية
  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  const targetWords = normTarget.split(/[\s,._\-/]+/).filter(Boolean);

  return queryWords.every((qWord) => {
    // هل الكلمة مطابقة أو بادئة لأي كلمة في الهدف؟
    const hasPrefix = targetWords.some((tWord) => tWord.includes(qWord) || qWord.includes(tWord));
    if (hasPrefix) return true;

    // تحمل أخطاء الكتابة البسيطة للكلمات التي طولها 3 أحرف فأكثر
    if (qWord.length >= 3) {
      return targetWords.some((tWord) => {
        if (tWord.length >= 3) {
          const maxAllowed = qWord.length <= 4 ? 1 : 2;
          // فحص بداية الكلمة أو الكلمة كاملة
          const segment = tWord.slice(0, qWord.length);
          return levenshteinDistance(qWord, segment) <= maxAllowed;
        }
        return false;
      });
    }

    return false;
  });
}

// 1) قائمة الشاشات نفسها وأسماؤها وكلماتها المرادفة (مثل فاتورة، رواتب، جرد...)
const SYSTEM_SCREENS = [
  {
    id: 'home',
    name: 'الصفحة الرئيسية',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Compass,
    targetView: 'home',
    synonyms: ['الرئيسية', 'لوحة التحكم', 'البداية', 'الهوم', 'dashboard', 'home'],
    description: 'شبكة البطاقات الرئيسية والملخص السريع',
  },
  {
    id: 'calculator',
    name: 'حاسبة تكاليف المنتج',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Calculator,
    targetView: 'calculator',
    synonyms: ['حاسبة', 'تسعير', 'تكلفة', 'تكاليف', 'حساب', 'باترون', 'سعر', 'ربح', 'تسعير المنتجات', 'مكرمية', 'calculator', 'pricing'],
    description: 'تسعير الحِرف اليدوية، حساب الخامات والعمالة والربح المعزول',
  },
  {
    id: 'catalog',
    name: 'كتالوج الورشة',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: BookOpen,
    targetView: 'catalog',
    synonyms: ['كتالوج', 'معرض', 'منيو', 'قائمة المنتجات', 'اسعار الجملة', 'تصدير pdf', 'catalog'],
    description: 'جدول المنتجات، سعر الجملة والقطاعي وتصدير PDF بقالب مستقل',
  },
  {
    id: 'archive',
    name: 'أرشيف المنتجات',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: FolderArchive,
    targetView: 'archive',
    synonyms: ['أرشيف', 'ارشيف', 'المنتجات السابقة', 'بطاقات المنتجات', 'archive'],
    description: 'سجل المنتجات المسعرة وتعديل البطاقات ومشاركتها',
  },
  {
    id: 'materials',
    name: 'الخامات ووحدات القياس',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Layers,
    targetView: 'materials',
    synonyms: ['خامات', 'خام', 'خيوط', 'أخشاب', 'اخشاب', 'خرز', 'قماش', 'وحدات', 'جرام', 'شلة', 'materials'],
    description: 'إدارة خامات الورشة الأساسية والإضافية وأسعار الشراء',
  },
  {
    id: 'inventory',
    name: 'المخازن وكارت الصنف',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Boxes,
    targetModal: 'inventory',
    synonyms: ['مخزن', 'مخازن', 'كارت صنف', 'جرد', 'نواقص', 'رصيد مخزن', 'بضاعة', 'inventory', 'stock'],
    description: 'مخزن الخامات، مخزن المنتجات التامة، وجرد الورشة',
  },
  {
    id: 'sales',
    name: 'أوامر البيع والطلبات',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: ShoppingCart,
    targetView: 'sales',
    synonyms: ['بيع', 'مبيعات', 'طلبات', 'طلبيات', 'أمر بيع', 'امر بيع', 'اوردر', 'sales', 'orders'],
    description: 'تسجيل ومتابعة طلبات بيع العملاء وعروض الأسعار',
  },
  {
    id: 'invoices',
    name: 'فواتير المبيعات والعملاء',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: FileText,
    targetView: 'invoices',
    synonyms: ['فاتورة', 'فواتير', 'دفعات', 'مرتجعات', 'سند قبض', 'ضريبة', 'invoices'],
    description: 'إصدار فواتير البيع الرسمية والدفعات والمرتجعات',
  },
  {
    id: 'suppliers',
    name: 'الموردون وفواتير الخامات',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Truck,
    targetView: 'suppliers',
    synonyms: ['مورد', 'موردين', 'تجار', 'مشتريات', 'فواتير شراء', 'suppliers'],
    description: 'بيانات الموردين، فواتير شراء الخامات، وحساباتهم',
  },
  {
    id: 'treasuries',
    name: 'الخزن والسيولة النقدية',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Wallet,
    targetView: 'treasuries',
    synonyms: ['خزنة', 'خزن', 'كاش', 'سيولة', 'بنك', 'انستاباي', 'إنستاباي', 'فودافون كاش', 'محفظة', 'فلوس', 'treasury', 'cash'],
    description: 'أرصدة الخزن، التحويلات النقدية، وحركات الخزينة',
  },
  {
    id: 'expenses',
    name: 'المصروفات والتكاليف الإدارية',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: DollarSign,
    targetModal: 'expenses',
    synonyms: ['مصروف', 'مصروفات', 'مصاريف', 'إيجار', 'كهرباء', 'انتقالات', 'نثرية', 'تسويق', 'expenses'],
    description: 'تسجيل التكاليف الإدارية والشهرية للورشة',
  },
  {
    id: 'hr',
    name: 'الموارد البشرية والرواتب',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Users2,
    targetView: 'hr',
    synonyms: ['موظف', 'موظفين', 'رواتب', 'راتب', 'عمال', 'صناع', 'سلف', 'أجور', 'اجور', 'hr', 'payroll'],
    description: 'سجلات الصناع والمساعدين، كشوف الرواتب، والسلف',
  },
  {
    id: 'work_orders',
    name: 'أوامر التشغيل وتتبع الهالك',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Hammer,
    targetView: 'work_orders',
    synonyms: ['تشغيل', 'أمر تشغيل', 'امر تشغيل', 'إنتاج', 'انتاج', 'تصنيع', 'هالك', 'صناع', 'work orders', 'production'],
    description: 'صرف الخامات للإنتاج، تصنيع الطلبيات، وتتبع الهالك',
  },
  {
    id: 'reports',
    name: 'التقارير المالية وقفل الشهر',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: BarChart3,
    targetView: 'reports',
    synonyms: ['تقرير', 'تقارير', 'أرباح', 'خسائر', 'ميزانية', 'قفل شهر', 'أرصدة', 'reports'],
    description: 'قوائم الدخل، تقارير الأرباح والخسائر، وقفل الشهر المالي',
  },
  {
    id: 'ai_agent',
    name: 'صقر الشمساوية AI',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: Sparkles,
    targetView: 'ai_agent',
    synonyms: ['صقر', 'ذكاء اصطناعي', 'ذكاء', 'ai', 'مستشار', 'تحليل صور', 'دراسة سوق'],
    description: 'المستشار الفني الذكي، الرؤية البصرية، ودراسة السوق',
  },
  {
    id: 'guide',
    name: 'دليل الاستخدام والقاموس',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: HelpCircle,
    targetModal: 'guide',
    synonyms: ['دليل', 'شرح', 'مساعدة', 'قاموس', 'تعليمات', 'guide', 'help'],
    description: 'شرح منظومة الورشة خطوة بخطوة وقاموس المصطلحات المحاسبية',
  },
  {
    id: 'admin',
    name: 'لوحة تحكم الإدارة (الورش والمستخدمين)',
    categoryKey: 'screens',
    categoryName: 'الشاشات والأقسام',
    icon: ShieldCheck,
    targetView: 'admin',
    synonyms: ['ادارة', 'إدارة', 'مسؤول', 'ورش', 'تجميد', 'حذف ورشة', 'admin', 'dashboard'],
    description: 'إدارة كافة الورش المسجلة، تعديل البيانات، تجميد الحسابات، وحذف الورش',
  },
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  cache,
  onSelectResult,
}) => {
  // Input raw state
  const [inputValue, setInputValue] = useState('');
  // 4) Debounced query (250ms) للحفاظ على استهلاك الذاكرة
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset input when opened
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // In-memory Multi-Category Fuzzy Search
  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const results: Array<{
      categoryKey: string;
      categoryName: string;
      icon: any;
      id: string;
      title: string;
      subtitle: string;
      badge?: string;
      rawItem: any;
      extraAction?: any;
    }> = [];

    // 1. الشاشات نفسها وأسماؤها وكلماتها المرادفة
    SYSTEM_SCREENS.forEach((screen) => {
      const matchName = matchesFuzzy(screen.name, q);
      const matchSynonym = screen.synonyms.some((syn) => matchesFuzzy(syn, q));
      const matchDesc = matchesFuzzy(screen.description, q);

      if (matchName || matchSynonym || matchDesc) {
        results.push({
          categoryKey: 'screens',
          categoryName: 'الشاشات والأقسام',
          icon: screen.icon,
          id: screen.id,
          title: screen.name,
          subtitle: screen.description,
          badge: 'شاشة',
          rawItem: screen,
          extraAction: screen,
        });
      }
    });

    // 2. أقسام دليل الاستخدام والقاموس
    GUIDE_SECTIONS.forEach((sec) => {
      const matchTitle = matchesFuzzy(sec.title, q);
      const matchSummary = matchesFuzzy(sec.summary, q);
      const matchSteps = sec.steps.some((step) => matchesFuzzy(step.title, q) || matchesFuzzy(step.description, q));

      if (matchTitle || matchSummary || matchSteps) {
        results.push({
          categoryKey: 'guide',
          categoryName: 'دليل الورشة والقاموس',
          icon: HelpCircle,
          id: `guide_${sec.id}`,
          title: `دليل: ${sec.title}`,
          subtitle: sec.summary,
          badge: 'دليل الورشة',
          rawItem: sec,
          extraAction: { type: 'guide_section', sectionId: sec.id },
        });
      }
    });

    GLOSSARY.forEach((g, idx) => {
      const matchTerm = matchesFuzzy(g.term, q);
      const matchAcc = matchesFuzzy(g.accountingTerm, q);
      const matchMean = matchesFuzzy(g.meaning, q);

      if (matchTerm || matchAcc || matchMean) {
        results.push({
          categoryKey: 'guide',
          categoryName: 'دليل الورشة والقاموس',
          icon: HelpCircle,
          id: `glossary_${idx}`,
          title: `${g.term} (${g.accountingTerm})`,
          subtitle: g.meaning,
          badge: 'مصطلح',
          rawItem: g,
          extraAction: { type: 'guide_glossary', term: g.term },
        });
      }
    });

    // 3. المنتجات (الاسم والرقم المسلسل والكود والتصنيف)
    const productList = cache.products || [];
    productList.slice(0, 500).forEach((p: any) => {
      const pName = p.productName || '';
      const pCode = p.productCode || '';
      const pSerial = p.productSerialNumber ? `PRD-${String(p.productSerialNumber).padStart(4, '0')}` : '';
      const pSerialRaw = p.productSerialNumber ? String(p.productSerialNumber) : '';
      const pCat = p.category || p.productType || '';

      if (
        matchesFuzzy(pName, q) ||
        matchesFuzzy(pCode, q) ||
        matchesFuzzy(pSerial, q) ||
        matchesFuzzy(pSerialRaw, q) ||
        matchesFuzzy(pCat, q)
      ) {
        results.push({
          categoryKey: 'products',
          categoryName: 'المنتجات المسجلة',
          icon: Package,
          id: p.id,
          title: pName || 'منتج غير مسمى',
          subtitle: `الكود: ${pCode || pSerial || 'PRD'} • التصنيف: ${pCat || 'حرفي'} • التكلفة: ${p.costPrice || 0} ج.م`,
          badge: pCode || pSerial || 'منتج',
          rawItem: p,
        });
      }
    });

    // 4. الخامات (الاسم والتصنيف والمورد ووحدة القياس)
    const materialsList = cache.materials || [];
    materialsList.slice(0, 500).forEach((m) => {
      const mName = m.materialName || '';
      const mCat = m.category || '';
      const mUnit = m.unit || '';
      const mSupplier = m.supplierName || '';

      if (
        matchesFuzzy(mName, q) ||
        matchesFuzzy(mCat, q) ||
        matchesFuzzy(mSupplier, q) ||
        matchesFuzzy(mUnit, q)
      ) {
        results.push({
          categoryKey: 'materials',
          categoryName: 'الخامات والمخزون',
          icon: Boxes,
          id: m.id,
          title: mName,
          subtitle: `التصنيف: ${mCat || 'خامة'} • الرصيد: ${m.currentStock || 0} ${mUnit} • سعر الوحدة: ${m.costPerUnit || 0} ج.م`,
          badge: 'خامة',
          rawItem: m,
        });
      }
    });

    // 5. الموردين (الاسم والشركة والهاتف والتخصص)
    const suppliersList = cache.suppliers || [];
    suppliersList.slice(0, 500).forEach((s) => {
      const sName = s.name || (s as any).companyName || '';
      const sPhone = s.phone || (s as any).phoneNumber || '';
      const sSpecialty = (s as any).materialSpecialty || (s as any).specialty || '';

      if (matchesFuzzy(sName, q) || matchesFuzzy(sPhone, q) || matchesFuzzy(sSpecialty, q)) {
        results.push({
          categoryKey: 'suppliers',
          categoryName: 'الموردون',
          icon: Truck,
          id: s.id,
          title: sName || 'مورد',
          subtitle: `هاتف: ${sPhone || '—'} • تخصص: ${sSpecialty || 'خامات عامة'}`,
          badge: 'مورد',
          rawItem: s,
        });
      }
    });

    // 6. فواتير الشراء من الموردين
    const supplierInvoicesList = cache.supplierInvoices || [];
    supplierInvoicesList.slice(0, 500).forEach((sinv: any) => {
      const invNum = sinv.invoiceNumber || sinv.id || '';
      const suppName = sinv.supplierName || '';
      const notes = sinv.notes || '';

      if (matchesFuzzy(invNum, q) || matchesFuzzy(suppName, q) || matchesFuzzy(notes, q)) {
        results.push({
          categoryKey: 'supplierInvoices',
          categoryName: 'فواتير المشتريات',
          icon: Receipt,
          id: sinv.id,
          title: `فاتورة شراء #${invNum} - ${suppName}`,
          subtitle: `الإجمالي: ${sinv.totalAmount || sinv.finalTotal || 0} ج.م • المدفوع: ${sinv.paidAmount || 0} ج.م`,
          badge: invNum,
          rawItem: sinv,
        });
      }
    });

    // 7. العملاء (الاسم والهاتف والمدينة والرصيد)
    const customersList = cache.customers || [];
    customersList.slice(0, 500).forEach((c) => {
      const cName = c.name || (c as any).fullName || '';
      const cPhone = c.phone || (c as any).phoneNumber || '';
      const cCity = (c as any).city || '';

      if (matchesFuzzy(cName, q) || matchesFuzzy(cPhone, q) || matchesFuzzy(cCity, q)) {
        const bal = c.currentBalance ?? (c as any).outstandingBalance ?? 0;
        results.push({
          categoryKey: 'customers',
          categoryName: 'العملاء',
          icon: User,
          id: c.id,
          title: cName || 'عميل',
          subtitle: `هاتف: ${cPhone || '—'} • ${cCity ? `المدينة: ${cCity} • ` : ''}الرصيد: ${bal > 0 ? `عليه ${bal}` : bal < 0 ? `له ${Math.abs(bal)}` : 'خالص'}`,
          badge: 'عميل',
          rawItem: c,
        });
      }
    });

    // 8. فواتير البيع (الرقم واسم العميل والمنتج والهاتف)
    const invoicesList = cache.invoices || [];
    invoicesList.slice(0, 500).forEach((inv) => {
      const invNum = inv.invoiceNumber || '';
      const cName = inv.customerName || '';
      const cPhone = inv.customerPhone || '';
      const pName = (inv as any).productName || '';

      if (
        matchesFuzzy(invNum, q) ||
        matchesFuzzy(cName, q) ||
        matchesFuzzy(cPhone, q) ||
        matchesFuzzy(pName, q)
      ) {
        results.push({
          categoryKey: 'invoices',
          categoryName: 'فواتير المبيعات',
          icon: FileText,
          id: inv.id,
          title: `فاتورة بيع #${invNum} - ${cName}`,
          subtitle: `الإجمالي: ${inv.finalTotal || inv.totalAmount || 0} ج.م • الحالة: ${inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partially_paid' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}`,
          badge: invNum,
          rawItem: inv,
        });
      }
    });

    // 9. أوامر التشغيل (رقم الأمر واسم المنتج واسم الصانع)
    const workOrdersList = cache.workOrders || [];
    workOrdersList.slice(0, 500).forEach((wo) => {
      const woNum = wo.orderNumber || '';
      const pName = wo.productName || '';
      const artisan = (wo as any).assignedArtisanName || (wo as any).artisanName || '';

      if (matchesFuzzy(woNum, q) || matchesFuzzy(pName, q) || matchesFuzzy(artisan, q)) {
        results.push({
          categoryKey: 'workOrders',
          categoryName: 'أوامر التشغيل',
          icon: Hammer,
          id: wo.id,
          title: `أمر تشغيل #${woNum}: ${pName}`,
          subtitle: `الكمية: ${wo.targetQuantity || 1} • الصانع: ${artisan || 'قيد الإسناد'} • الحالة: ${wo.status === 'completed' ? 'مكتمل' : 'تحت التصنيع'}`,
          badge: woNum,
          rawItem: wo,
        });
      }
    });

    // 10. الموظفين والصناع
    const employeesList = cache.employees || [];
    employeesList.slice(0, 500).forEach((emp) => {
      const eName = emp.fullName || '';
      const ePhone = emp.phone || (emp as any).phoneNumber || '';
      const eRole = emp.role || (emp as any).specialty || '';

      if (matchesFuzzy(eName, q) || matchesFuzzy(ePhone, q) || matchesFuzzy(eRole, q)) {
        results.push({
          categoryKey: 'employees',
          categoryName: 'فريق العمل والصناع',
          icon: Users2,
          id: emp.id,
          title: eName || 'موظف',
          subtitle: `الدور: ${eRole || 'حرفي'} • هاتف: ${ePhone || '—'} • الراتب: ${emp.baseWage || 0} ج.م`,
          badge: 'صانع/موظف',
          rawItem: emp,
        });
      }
    });

    // 11. الخزن والسيولة النقدية
    const treasuriesList = cache.treasuries || [];
    treasuriesList.slice(0, 500).forEach((t) => {
      const tName = t.name || '';
      const tType = t.type || '';
      const tAccount = t.accountNumber || '';

      if (matchesFuzzy(tName, q) || matchesFuzzy(tType, q) || matchesFuzzy(tAccount, q)) {
        results.push({
          categoryKey: 'treasuries',
          categoryName: 'الخزن والسيولة',
          icon: Wallet,
          id: t.id,
          title: `خزنة: ${tName}`,
          subtitle: `النوع: ${tType} • الرصيد: ${t.balance || 0} ج.م • ${tAccount ? `الحساب: ${tAccount}` : ''}`,
          badge: 'خزنة',
          rawItem: t,
        });
      }
    });

    // 12. المصروفات والتكاليف الإدارية
    const expensesList = cache.expenses || [];
    expensesList.slice(0, 500).forEach((exp: any) => {
      const title = exp.title || exp.item || exp.costName || '';
      const category = exp.category || exp.costType || '';
      const notes = exp.notes || '';

      if (matchesFuzzy(title, q) || matchesFuzzy(category, q) || matchesFuzzy(notes, q)) {
        results.push({
          categoryKey: 'expenses',
          categoryName: 'المصروفات والتكاليف',
          icon: DollarSign,
          id: exp.id || Math.random().toString(),
          title: `مصروف: ${title}`,
          subtitle: `البند: ${category || 'إداري'} • القيمة: ${exp.amount || exp.costAmount || 0} ج.م`,
          badge: 'مصروف',
          rawItem: exp,
        });
      }
    });

    return results;
  }, [debouncedQuery, cache]);

  // 2) تجميع النتائج حسب النوع بأيقونة صغيرة
  const groupedResults = useMemo(() => {
    const groups: { [key: string]: { name: string; icon: any; items: typeof searchResults } } = {};

    searchResults.forEach((item) => {
      if (!groups[item.categoryKey]) {
        groups[item.categoryKey] = {
          name: item.categoryName,
          icon: item.icon,
          items: [],
        };
      }
      groups[item.categoryKey].items.push(item);
    });

    return groups;
  }, [searchResults]);

  const groupKeys = Object.keys(groupedResults);

  const handleSelect = (categoryKey: string, rawItem: any, extraAction?: any) => {
    playPageFlipSound();
    onSelectResult(categoryKey, rawItem, extraAction);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-20 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-amber-300/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-4 sm:p-6 text-right relative overflow-hidden flex flex-col max-h-[84vh]">
        {/* Search Header Input with 250ms debounce indicator */}
        <div className="relative flex items-center gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="ابحث بالاسم، الكود، رقم الفاتورة، الخامات، أوامر التشغيل، أو أسماء الشاشات (مثل: فاتورة، رواتب، جرد)..."
              className="w-full px-4 py-3 pr-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
            {isSearching && (
              <span className="absolute left-3 top-3 text-[10px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                جاري البحث...
              </span>
            )}
          </div>
        </div>

        {/* Grouped Results Container */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 mt-2 pr-1">
          {!inputValue.trim() ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-black text-stone-700 dark:text-stone-300">
                البحث الموحد الذكي في كافة أرجاء الورشة
              </p>
              <p className="text-[11px] text-stone-400 max-w-md mx-auto leading-relaxed">
                ابحث فورياً في المنتجات، الخامات، الموردين، العملاء، فواتير البيع والشراء، أوامر التشغيل، الخزن، المصروفات، أقسام الدليل، وأسماء الشاشات.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-10 text-center text-stone-400 space-y-2">
              <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                لم يتم العثور على أي نتائج مطابقة لكلمة البحث «{inputValue}».
              </p>
              <p className="text-[11px] text-stone-400">
                تأكد من كتابة الكلمة، أو جرّب البحث برقم الهاتف أو جزء من الاسم أو الكود.
              </p>
            </div>
          ) : (
            groupKeys.map((catKey) => {
              const group = groupedResults[catKey];
              const GroupIcon = group.icon;

              return (
                <div key={catKey} className="space-y-1.5">
                  {/* 2) ترويسة المجموعة بأيقونة صغيرة واسم وعدد النتائج */}
                  <div className="flex items-center justify-between px-2 py-1 bg-amber-500/10 dark:bg-amber-950/20 rounded-xl border border-amber-300/30 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-black">
                    <div className="flex items-center gap-1.5">
                      <GroupIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{group.name}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-stone-700">
                      {group.items.length}
                    </span>
                  </div>

                  {/* عناصر المجموعة */}
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={`${item.categoryKey}_${item.id}`}
                          onClick={() => handleSelect(item.categoryKey, item.rawItem, item.extraAction)}
                          className="p-2.5 sm:p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-800/80 transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium leading-tight">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 flex items-center gap-1 flex-shrink-0 group-hover:-translate-x-1 transition-transform">
                            <span>فتح</span>
                            <ArrowRight className="w-3 h-3 rotate-180" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info: 4) تأكيد البحث في الذاكرة لتوفير القراءات السحابية */}
        <div className="pt-2.5 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400 font-bold">
          <span>فهرس بحث في الذاكرة (حد 500 عنصر) مع تجاهل التشكيل وتأخير 250ms</span>
          <span>إجمالي النتائج: {searchResults.length}</span>
        </div>
      </div>
    </div>
  );
};
