import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../../types';
import { firestoreService } from '../../db/firestoreService';
import { tenantStorage } from '../../db/dexieDB';
import {
  Layers,
  ShoppingBag,
  Truck,
  Users,
  ShoppingCart,
  Boxes,
  Wallet,
  DollarSign,
  Users2,
  Hammer,
  BarChart3,
  PlusCircle,
  PackagePlus,
  UserPlus,
  Receipt,
  RotateCcw,
  Sparkles,
  FolderArchive,
  BookOpen,
  Calculator,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ClipboardCheck,
  ClipboardList,
  Edit3,
  Lock,
  ArrowLeftRight,
  History,
  Tag,
  Warehouse,
  CheckCircle,
  HelpCircle,
  Coins,
} from 'lucide-react';

export type HomeCardSection =
  | 'materials'
  | 'products'
  | 'suppliers'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'treasuries'
  | 'expenses'
  | 'employees'
  | 'work_orders'
  | 'reports';

export interface WorkshopHomeScreenProps {
  profile: UserProfile;
  // Navigation to full screens
  onNavigateToCalculator: () => void;
  onNavigateToArchive: () => void;
  onNavigateToCatalog: () => void;
  onNavigateToAIAgent: () => void;
  onNavigateToMaterials: (openAdd?: boolean) => void;
  onNavigateToSuppliers: () => void;
  onNavigateToSales: (mode?: string) => void;
  onNavigateToInvoices: (filter?: string) => void;
  onNavigateToWorkOrders: (mode?: string) => void;
  onNavigateToTreasuries: () => void;
  onNavigateToHR: () => void;
  onNavigateToReports: () => void;
  // Modals
  onOpenInventoryModal: (tab?: string) => void;
  onOpenAdminCostsModal: () => void;
  onOpenNewMaterialModal: () => void;
  onOpenNewClientModal: () => void;
  onOpenNewSupplierModal: () => void;
  onOpenCreateSupplier: () => void;
  onOpenSupplierInvoice: () => void;
  onOpenNewEmployeeModal: () => void;
}

export const WorkshopHomeScreen: React.FC<WorkshopHomeScreenProps> = ({
  profile,
  onNavigateToCalculator,
  onNavigateToArchive,
  onNavigateToCatalog,
  onNavigateToAIAgent,
  onNavigateToMaterials,
  onNavigateToSuppliers,
  onNavigateToSales,
  onNavigateToInvoices,
  onNavigateToWorkOrders,
  onNavigateToTreasuries,
  onNavigateToHR,
  onNavigateToReports,
  onOpenInventoryModal,
  onOpenAdminCostsModal,
  onOpenNewMaterialModal,
  onOpenNewClientModal,
  onOpenNewSupplierModal,
  onOpenCreateSupplier,
  onOpenSupplierInvoice,
  onOpenNewEmployeeModal,
}) => {
  // Active sub-screen state (null = main 11-card grid)
  const [activeSubSection, setActiveSubSection] = useState<HomeCardSection | null>(null);

  // Quick creation drawer / expansion state
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // Summary Metrics State (رصيد الخزن، مبيعات الشهر، تنبيهات المخزون)
  const [totalTreasuryBalance, setTotalTreasuryBalance] = useState<number>(0);
  const [monthSalesTotal, setMonthSalesTotal] = useState<number>(0);
  const [stockAlertCount, setStockAlertCount] = useState<number>(0);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const workshopId = profile.tenantId || profile.workshopId || profile.id || '';

  // Load summary metrics once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      try {
        setLoadingSummary(true);

        // 1. Treasuries Balance
        let treasuriesSum = 0;
        try {
          const treasuries = await firestoreService.getTreasuries(workshopId);
          if (treasuries && treasuries.length > 0) {
            treasuriesSum = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);
          } else {
            const safe = await tenantStorage.getSafeBalances(workshopId);
            treasuriesSum = (safe.mainSafe || 0) + (safe.subSafe || 0);
          }
        } catch {
          const safe = await tenantStorage.getSafeBalances(workshopId);
          treasuriesSum = (safe.mainSafe || 0) + (safe.subSafe || 0);
        }

        // 2. Current Month Sales
        let salesSum = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        try {
          const invoices = await firestoreService.getInvoices(workshopId);
          if (invoices && invoices.length > 0) {
            salesSum = invoices
              .filter((inv) => (inv.createdAt || 0) >= startOfMonth && inv.status !== 'cancelled')
              .reduce((sum, inv) => sum + (inv.finalTotal || inv.totalAmount || inv.subtotal || 0), 0);
          } else {
            const orders = await tenantStorage.getOrders(workshopId);
            salesSum = orders
              .filter((ord) => (ord.createdAt || 0) >= startOfMonth && ord.status !== 'cancelled')
              .reduce((sum, ord) => sum + (ord.finalTotal || ord.totalAmount || ord.subtotal || 0), 0);
          }
        } catch {
          const orders = await tenantStorage.getOrders(workshopId);
          salesSum = orders
            .filter((ord) => (ord.createdAt || 0) >= startOfMonth && ord.status !== 'cancelled')
            .reduce((sum, ord) => sum + (ord.finalTotal || ord.totalAmount || ord.subtotal || 0), 0);
        }

        // 3. Stock Alerts
        let alerts = 0;
        try {
          const materials = await firestoreService.getRawMaterials(workshopId);
          if (materials && materials.length > 0) {
            alerts = materials.filter(
              (m) => (m.currentStock || 0) <= (m.minAlertThreshold || 5) && m.isActive !== false
            ).length;
          } else {
            const raw = await tenantStorage.getRawMaterials(workshopId);
            alerts = raw.filter(
              (m) => (m.currentStock || 0) <= (m.minAlertThreshold || 5) && m.isActive !== false
            ).length;
          }
        } catch {
          const raw = await tenantStorage.getRawMaterials(workshopId);
          alerts = raw.filter(
            (m) => (m.currentStock || 0) <= (m.minAlertThreshold || 5) && m.isActive !== false
          ).length;
        }

        if (isMounted) {
          setTotalTreasuryBalance(Math.round(treasuriesSum));
          setMonthSalesTotal(Math.round(salesSum));
          setStockAlertCount(alerts);
        }
      } catch (err) {
        console.error('Failed to load workshop home metrics:', err);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    }

    if (workshopId) {
      loadMetrics();
    }
    return () => {
      isMounted = false;
    };
  }, [workshopId]);

  // The 11 Core Cards definition as per requirement 2
  const coreCards = [
    {
      id: 'materials' as HomeCardSection,
      label: 'الخامات',
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200/80 dark:border-amber-900/40',
    },
    {
      id: 'products' as HomeCardSection,
      label: 'المنتجات',
      icon: ShoppingBag,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200/80 dark:border-orange-900/40',
    },
    {
      id: 'suppliers' as HomeCardSection,
      label: 'الموردين',
      icon: Truck,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200/80 dark:border-blue-900/40',
    },
    {
      id: 'customers' as HomeCardSection,
      label: 'العملاء',
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200/80 dark:border-emerald-900/40',
    },
    {
      id: 'sales' as HomeCardSection,
      label: 'المبيعات',
      icon: ShoppingCart,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
      borderColor: 'border-teal-200/80 dark:border-teal-900/40',
    },
    {
      id: 'inventory' as HomeCardSection,
      label: 'المخازن',
      icon: Boxes,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200/80 dark:border-indigo-900/40',
    },
    {
      id: 'treasuries' as HomeCardSection,
      label: 'الخزن',
      icon: Wallet,
      color: 'text-lime-600 dark:text-lime-400',
      bgColor: 'bg-lime-50 dark:bg-lime-950/40',
      borderColor: 'border-lime-200/80 dark:border-lime-900/40',
    },
    {
      id: 'expenses' as HomeCardSection,
      label: 'المصروفات',
      icon: DollarSign,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200/80 dark:border-rose-900/40',
    },
    {
      id: 'employees' as HomeCardSection,
      label: 'الموظفين',
      icon: Users2,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/40',
      borderColor: 'border-violet-200/80 dark:border-violet-900/40',
    },
    {
      id: 'work_orders' as HomeCardSection,
      label: 'أوامر التشغيل',
      icon: Hammer,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
      borderColor: 'border-cyan-200/80 dark:border-cyan-900/40',
    },
    {
      id: 'reports' as HomeCardSection,
      label: 'التقارير',
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      borderColor: 'border-purple-200/80 dark:border-purple-900/40',
    },
  ];

  // Quick creation shortcuts for Requirement 4
  const quickCreateActions = [
    {
      label: 'إضافة خامة',
      icon: PackagePlus,
      color: 'text-amber-700 dark:text-amber-300',
      action: onOpenNewMaterialModal,
    },
    {
      label: 'حاسبة منتج',
      icon: Calculator,
      color: 'text-orange-700 dark:text-orange-300',
      action: onNavigateToCalculator,
    },
    {
      label: 'فاتورة مورد',
      icon: Receipt,
      color: 'text-blue-700 dark:text-blue-300',
      action: onOpenSupplierInvoice,
    },
    {
      label: 'أمر بيع',
      icon: ShoppingCart,
      color: 'text-emerald-700 dark:text-emerald-300',
      action: () => onNavigateToSales(),
    },
    {
      label: 'تسجيل عميل',
      icon: UserPlus,
      color: 'text-teal-700 dark:text-teal-300',
      action: onOpenNewClientModal,
    },
    {
      label: 'تعيين موظف',
      icon: Users2,
      color: 'text-violet-700 dark:text-violet-300',
      action: onOpenNewEmployeeModal,
    },
  ];

  // Sub-actions definition as per requirement 3
  const getSubActions = (section: HomeCardSection) => {
    switch (section) {
      case 'materials':
        return {
          title: 'الخامات',
          icon: Layers,
          items: [
            {
              label: 'إضافة خامة',
              icon: PlusCircle,
              onClick: onOpenNewMaterialModal,
            },
            {
              label: 'تعديل الخامات',
              icon: Edit3,
              onClick: () => onNavigateToMaterials(false),
            },
            {
              label: 'كارت الصنف',
              icon: FileSpreadsheet,
              onClick: () => onOpenInventoryModal('materials'),
            },
            {
              label: 'الجرد',
              icon: ClipboardCheck,
              onClick: () => onOpenInventoryModal('audit'),
            },
          ],
        };

      case 'products':
        return {
          title: 'المنتجات',
          icon: ShoppingBag,
          items: [
            {
              label: 'إضافة منتج',
              icon: Calculator,
              onClick: () => onNavigateToCalculator(),
            },
            {
              label: 'الأرشيف',
              icon: FolderArchive,
              onClick: () => onNavigateToArchive(),
            },
            {
              label: 'صقر AI',
              icon: Sparkles,
              onClick: () => onNavigateToAIAgent(),
            },
            {
              label: 'كتالوج الورشة',
              icon: BookOpen,
              onClick: () => onNavigateToCatalog(),
            },
          ],
        };

      case 'suppliers':
        return {
          title: 'الموردين',
          icon: Truck,
          items: [
            {
              label: 'تسجيل مورد',
              icon: UserPlus,
              onClick: () => onOpenCreateSupplier(),
            },
            {
              label: 'فاتورة مورد',
              icon: Receipt,
              onClick: () => onOpenSupplierInvoice(),
            },
            {
              label: 'كشف حساب',
              icon: FileSpreadsheet,
              onClick: () => onNavigateToSuppliers(),
            },
          ],
        };

      case 'customers':
        return {
          title: 'العملاء',
          icon: Users,
          items: [
            {
              label: 'تسجيل عميل',
              icon: UserPlus,
              onClick: onOpenNewClientModal,
            },
            {
              label: 'كشف حساب',
              icon: FileSpreadsheet,
              onClick: () => onNavigateToInvoices('customers'),
            },
          ],
        };

      case 'sales':
        return {
          title: 'المبيعات',
          icon: ShoppingCart,
          items: [
            {
              label: 'أمر بيع',
              icon: ShoppingCart,
              onClick: () => onNavigateToSales(),
            },
            {
              label: 'فاتورة بيع',
              icon: FileText,
              onClick: () => onNavigateToInvoices(),
            },
            {
              label: 'المرتجعات',
              icon: RotateCcw,
              onClick: () => onNavigateToInvoices('returns'),
            },
          ],
        };

      case 'inventory':
        return {
          title: 'المخازن',
          icon: Boxes,
          items: [
            {
              label: 'مخزن الخامات',
              icon: Layers,
              onClick: () => onOpenInventoryModal('materials'),
            },
            {
              label: 'مخزن المنتجات',
              icon: Boxes,
              onClick: () => onOpenInventoryModal('products'),
            },
            {
              label: 'الجرد',
              icon: ClipboardList,
              onClick: () => onOpenInventoryModal('audit'),
            },
          ],
        };

      case 'treasuries':
        return {
          title: 'الخزن',
          icon: Wallet,
          items: [
            {
              label: 'رصيد الخزن',
              icon: Wallet,
              onClick: () => onNavigateToTreasuries(),
            },
            {
              label: 'تحويل نقدية',
              icon: ArrowLeftRight,
              onClick: () => onNavigateToTreasuries(),
            },
            {
              label: 'حركة الخزينة',
              icon: History,
              onClick: () => onNavigateToTreasuries(),
            },
          ],
        };

      case 'expenses':
        return {
          title: 'المصروفات',
          icon: DollarSign,
          items: [
            {
              label: 'تسجيل مصروف',
              icon: PlusCircle,
              onClick: () => onOpenAdminCostsModal(),
            },
            {
              label: 'التكاليف الإدارية',
              icon: DollarSign,
              onClick: () => onOpenAdminCostsModal(),
            },
            {
              label: 'تقرير المصروفات',
              icon: BarChart3,
              onClick: () => onNavigateToReports(),
            },
          ],
        };

      case 'employees':
        return {
          title: 'الموظفين',
          icon: Users2,
          items: [
            {
              label: 'تعيين موظف',
              icon: UserPlus,
              onClick: () => onOpenNewEmployeeModal(),
            },
            {
              label: 'الرواتب',
              icon: Wallet,
              onClick: () => onNavigateToHR(),
            },
            {
              label: 'كشف حساب موظف',
              icon: FileText,
              onClick: () => onNavigateToHR(),
            },
          ],
        };

      case 'work_orders':
        return {
          title: 'أوامر التشغيل',
          icon: Hammer,
          items: [
            {
              label: 'أمر تشغيل',
              icon: PlusCircle,
              onClick: () => onNavigateToWorkOrders(),
            },
            {
              label: 'متابعة الإنتاج',
              icon: Hammer,
              onClick: () => onNavigateToWorkOrders(),
            },
            {
              label: 'تتبع الهالك',
              icon: AlertTriangle,
              onClick: () => onNavigateToWorkOrders(),
            },
          ],
        };

      case 'reports':
        return {
          title: 'التقارير',
          icon: BarChart3,
          items: [
            {
              label: 'الأرباح والخسائر',
              icon: BarChart3,
              onClick: () => onNavigateToReports(),
            },
            {
              label: 'المبيعات والعملاء',
              icon: TrendingUp,
              onClick: () => onNavigateToReports(),
            },
            {
              label: 'قفل الشهر',
              icon: Lock,
              onClick: () => onNavigateToReports(),
            },
          ],
        };

      default:
        return {
          title: '',
          icon: Layers,
          items: [],
        };
    }
  };

  const currentSubHub = activeSubSection ? getSubActions(activeSubSection) : null;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* 1. Quick Creation Hub Shortcut (Requirement 4) */}
      <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/40 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                مركز الإنشاء السريع
              </h3>
              <p className="text-[10px] text-stone-500 font-medium hidden sm:block">
                اختصارات سريعة لإضافة الخامات، المنتجات، الفواتير، والعملاء
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>{isQuickCreateOpen ? 'إغلاق الاختصارات' : 'إنشاء جديد'}</span>
            <ChevronLeft
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isQuickCreateOpen ? '-rotate-90' : ''
              }`}
            />
          </button>
        </div>

        {/* Collapsible / Quick Action Buttons */}
        {isQuickCreateOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-3 mt-3 border-t border-amber-200/40 dark:border-amber-900/40 animate-in slide-in-from-top-2 duration-200">
            {quickCreateActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    action.action();
                    setIsQuickCreateOpen(false);
                  }}
                  className="p-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-700/80 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95 group"
                >
                  <Icon className={`w-3.5 h-3.5 ${action.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-black">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Sub-Screen View (Requirement 3: Opens when a card is clicked) */}
      {activeSubSection && currentSubHub ? (
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border-2 border-amber-300/60 dark:border-amber-800/60 shadow-md space-y-4 animate-in slide-in-from-right-3 duration-200">
          {/* Sub-Hub Top Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <currentSubHub.icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">إدارة القسم</span>
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                  {currentSubHub.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubSection(null)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-600 dark:text-stone-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>رجوع للرئيسية</span>
            </button>
          </div>

          {/* Sub-Action Buttons Grid: Same style (Icon + Short Word) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
            {currentSubHub.items.map((sub, idx) => {
              const SubIcon = sub.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={sub.onClick}
                  className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-500/10 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95 group text-center min-h-[90px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                    <SubIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-stone-800 dark:text-stone-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                    {sub.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3. The 11 Core Cards Grid (Requirement 2: 3 in a row on mobile, Icon + One Word Only) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
          {coreCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveSubSection(card.id)}
                className="p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs active:scale-95 group min-h-[82px] sm:min-h-[100px]"
              >
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl ${card.bgColor} ${card.color} flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200 tracking-tight block leading-tight">
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Simplified Summary Widget (Requirement 2: رصيد الخزن، مبيعات الشهر، تنبيهات المخزون) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs sm:text-sm font-black text-stone-800 dark:text-stone-200">
              ملخص الورشة المالي والمخزني
            </h3>
          </div>
          <span className="text-[10px] text-stone-400 font-bold">
            محدث لحظياً
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Card 1: رصيد الخزن */}
          <div
            onClick={onNavigateToTreasuries}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-lime-50 to-emerald-50/40 dark:from-stone-800 dark:to-stone-800/80 border border-lime-200/80 dark:border-stone-700 flex items-center justify-between cursor-pointer hover:border-lime-500 transition group shadow-2xs"
          >
            <div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block mb-0.5">
                رصيد الخزن
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-lime-700 dark:text-lime-400">
                {loadingSummary ? '...' : totalTreasuryBalance.toLocaleString('ar-EG')}{' '}
                <span className="text-[10px] font-sans font-bold text-stone-600 dark:text-stone-300">
                  {profile.currencySymbol}
                </span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-lime-100 dark:bg-lime-950/60 text-lime-700 dark:text-lime-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: مبيعات الشهر */}
          <div
            onClick={() => onNavigateToInvoices()}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-stone-800 dark:to-stone-800/80 border border-amber-200/80 dark:border-stone-700 flex items-center justify-between cursor-pointer hover:border-amber-500 transition group shadow-2xs"
          >
            <div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block mb-0.5">
                مبيعات الشهر
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-amber-700 dark:text-amber-400">
                {loadingSummary ? '...' : monthSalesTotal.toLocaleString('ar-EG')}{' '}
                <span className="text-[10px] font-sans font-bold text-stone-600 dark:text-stone-300">
                  {profile.currencySymbol}
                </span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: تنبيهات المخزون */}
          <div
            onClick={() => onOpenInventoryModal('materials')}
            className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50/30 dark:from-stone-800 dark:to-stone-800/80 border border-rose-200/80 dark:border-stone-700 flex items-center justify-between cursor-pointer hover:border-rose-500 transition group shadow-2xs"
          >
            <div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold block mb-0.5">
                تنبيهات المخزون
              </span>
              <span
                className={`text-sm sm:text-base font-black ${
                  stockAlertCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                {loadingSummary
                  ? '...'
                  : stockAlertCount > 0
                  ? `${stockAlertCount} خامات أوشكت`
                  : 'المخزون آمن ومكتمل'}
              </span>
            </div>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                stockAlertCount > 0
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
