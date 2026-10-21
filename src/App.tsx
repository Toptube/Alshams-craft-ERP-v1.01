import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, SavedProductRecord, CraftCategory, NotificationItem } from './types';
import { AuthGateway } from './components/auth/AuthGateway';
import { Navbar } from './components/layout/Navbar';
import { SidebarDrawer } from './components/layout/SidebarDrawer';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { CreateCenterDashboard } from './components/createCenter/CreateCenterDashboard';
import { ProductionCalculator } from './components/calculator/ProductionCalculator';
import { SalesOrdersView } from './components/sales/SalesOrdersView';
import { HRWorkforceModule } from './components/hr/HRWorkforceModule';
import { FalconAIAgent } from './components/ai/FalconAIAgent';
import { ProductArchive } from './components/archive/ProductArchive';
import { SaaSReportsAnalyticsView } from './components/reports/SaaSReportsAnalyticsView';
import { TreasuriesView } from './components/treasuries/TreasuriesView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { MaterialsView } from './components/materials/MaterialsView';
import { WorkOrdersView } from './components/workOrders/WorkOrdersView';
import { CraftsSelectorModal } from './components/onboarding/CraftsSelectorModal';
import { GlobalSearchModal, GlobalSearchDataCache } from './components/search/GlobalSearchModal';
import { UserGuideModal } from './components/guide/UserGuideModal';
import { CloudMigrationModal } from './components/migration/CloudMigrationModal';
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
import { FamilyWelcomeModal } from './components/welcome/FamilyWelcomeModal';
import { InventoryLedgerModal } from './components/inventory/InventoryLedgerModal';
import { AdminExpensesModal } from './components/adminCosts/AdminExpensesModal';
import { WhatsAppQuoteDrawer } from './components/sharing/WhatsAppQuoteDrawer';
import {
  NewMaterialModal,
  NewClientModal,
  NewSupplierModal,
  NewEmployeeModal,
} from './components/modals/CreationModals';
import { tenantStorage } from './db/dexieDB';
import { firestoreService } from './db/firestoreService';
import { auth, onAuthStateChanged, signOut } from './lib/firebase';
import {
  PlusCircle,
  Calculator,
  ShoppingCart,
  Users2,
  Sparkles,
  FolderArchive,
  BarChart3,
  Boxes,
  Building,
  Wallet,
  Hammer,
  Truck,
  FileText,
} from 'lucide-react';

export type AppActiveView =
  | 'create_center'
  | 'calculator'
  | 'sales'
  | 'invoices'
  | 'work_orders'
  | 'suppliers'
  | 'materials'
  | 'treasuries'
  | 'hr'
  | 'ai_agent'
  | 'archive'
  | 'reports';

export default function App() {
  // Authentication State
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // App Theme State (Dark / Light / System)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('alshams_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // Active View State:
  const [activeView, setActiveView] = useState<AppActiveView>('create_center');

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals for Crafts, Search, Guide, Cloud Migration
  const [isCraftsSelectorOpen, setIsCraftsSelectorOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [userGuideSection, setUserGuideSection] = useState<string | undefined>(undefined);
  const [isCloudMigrationOpen, setIsCloudMigrationOpen] = useState(false);

  const [searchCache, setSearchCache] = useState<GlobalSearchDataCache>({
    customers: [],
    suppliers: [],
    products: [],
    materials: [],
    invoices: [],
    workOrders: [],
    employees: [],
  });

  // Creation Modals States (from Create Center & shortcuts)
  const [isNewMaterialModalOpen, setIsNewMaterialModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);

  // Other Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isAdminCostsModalOpen, setIsAdminCostsModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [welcomeType, setWelcomeType] = useState<'first_time' | 'session_return'>('session_return');

  // WhatsApp Quote Drawer State
  const [quoteRecord, setQuoteRecord] = useState<SavedProductRecord | null>(null);
  const [isQuoteDrawerOpen, setIsQuoteDrawerOpen] = useState(false);

  // Notifications State & Interactive Drawer
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Reloaded Record from Archive into Calculator for Overwrite Mutation
  const [reloadedRecord, setReloadedRecord] = useState<SavedProductRecord | null>(null);

  // Notes transferred from AI to Calculator
  const [notesToTransfer, setNotesToTransfer] = useState<string | null>(null);

  // Open Add Material in MaterialsView
  const [openAddMaterialInView, setOpenAddMaterialInView] = useState(false);

  // Notification loader
  const loadNotifications = useCallback(async () => {
    if (!currentProfile) return;
    try {
      const tid = currentProfile.tenantId || currentProfile.workshopId || currentProfile.id || '';
      await tenantStorage.generateProactiveNotifications(tid);
      const notifs = await tenantStorage.getNotifications(tid);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentProfile]);

  const loadSearchCache = useCallback(async () => {
    if (!currentProfile) return;
    try {
      const tenantId = currentProfile.tenantId || currentProfile.workshopId || currentProfile.id || '';
      const [customers, suppliers, products, materials, invoices, workOrders, employees] = await Promise.all([
        tenantStorage.getCustomers(tenantId).catch(() => []),
        tenantStorage.getSuppliers(tenantId).catch(() => []),
        firestoreService.getFinishedProducts(tenantId).catch(() => []),
        tenantStorage.getRawMaterials(tenantId).catch(() => []),
        tenantStorage.getOrders(tenantId).catch(() => []),
        firestoreService.getWorkOrders(tenantId).catch(() => []),
        tenantStorage.getEmployees(tenantId).catch(() => []),
      ]);
      setSearchCache({
        customers,
        suppliers,
        products,
        materials,
        invoices: invoices as any,
        workOrders,
        employees,
      });
    } catch (err) {
      console.error('Error loading search cache:', err);
    }
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);

      const handleRealtimeNotif = () => {
        loadNotifications();
      };
      window.addEventListener('alshams_notifications_changed', handleRealtimeNotif);

      return () => {
        clearInterval(interval);
        window.removeEventListener('alshams_notifications_changed', handleRealtimeNotif);
      };
    }
  }, [currentProfile, loadNotifications]);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('alshams_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('alshams_theme', 'light');
    }
  }, [isDarkMode]);

  const triggerWelcomeFlow = useCallback((profile: UserProfile) => {
    if (profile.welcomeShown !== true) {
      setWelcomeType('first_time');
      setIsWelcomeModalOpen(true);
      try {
        sessionStorage.setItem('alshams_welcome_shown_session', 'true');
      } catch (e) {}
    } else {
      let sessionWelcomed = false;
      try {
        sessionWelcomed = sessionStorage.getItem('alshams_welcome_shown_session') === 'true';
      } catch (e) {}
      if (!sessionWelcomed) {
        setWelcomeType('session_return');
        setIsWelcomeModalOpen(true);
        try {
          sessionStorage.setItem('alshams_welcome_shown_session', 'true');
        } catch (e) {}
      }
    }
  }, []);

  const handleCloseWelcomeModal = async () => {
    setIsWelcomeModalOpen(false);
    if (welcomeType === 'first_time' && currentProfile && currentProfile.welcomeShown !== true) {
      const updated: UserProfile = { ...currentProfile, welcomeShown: true, updatedAt: Date.now() };
      setCurrentProfile(updated);
      try {
        await tenantStorage.saveProfile(updated);
        await firestoreService.setWorkshop(updated);
      } catch (err) {
        console.error('Failed to save welcomeShown flag:', err);
      }
    }
  };

  // Persistent Firebase Authentication State via onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile: UserProfile | null = await firestoreService.getWorkshop(firebaseUser.uid);
          if (!profile) {
            const local = await tenantStorage.getProfile(firebaseUser.uid);
            if (local) profile = local;
          }
          if (!profile) {
            const savedTenantId = localStorage.getItem('alshams_active_tenant_id');
            if (savedTenantId) {
              const local = await tenantStorage.getProfile(savedTenantId);
              if (local) profile = local;
            }
          }
          if (profile) {
            setCurrentProfile(profile);
            const tid = profile.tenantId || profile.workshopId || profile.id || firebaseUser.uid;
            localStorage.setItem('alshams_active_tenant_id', tid);
            triggerWelcomeFlow(profile);
            if (!localStorage.getItem('alshams_crafts_selected')) {
              setIsCraftsSelectorOpen(true);
            }
          }
        } catch (err) {
          console.error('Failed to restore workshop profile for user:', err);
        }
      } else {
        setCurrentProfile(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [triggerWelcomeFlow]);

  const handleAuthenticated = (profile: UserProfile) => {
    setCurrentProfile(profile);
    const tid = profile.tenantId || profile.workshopId || profile.id || '';
    localStorage.setItem('alshams_active_tenant_id', tid);
    triggerWelcomeFlow(profile);
    // Rule 5: بعد الدخول لأول مرة، يظهر مكوّن اختيار الأقسام CraftsSelectorModal مرة واحدة ثم يُحفظ الاختيار
    if (!localStorage.getItem('alshams_crafts_selected')) {
      setIsCraftsSelectorOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    }
    localStorage.removeItem('alshams_active_tenant_id');
    try {
      sessionStorage.removeItem('alshams_welcome_shown_session');
    } catch (e) {}
    setCurrentProfile(null);
    setIsMobileMenuOpen(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Archive reload handler - loads card into calculator to mutate / overwrite
  const handleSelectRecordFromArchive = (record: SavedProductRecord) => {
    setReloadedRecord(record);
    setActiveView('calculator');
  };

  // WhatsApp Quote trigger
  const handleOpenWhatsAppShare = (record: SavedProductRecord) => {
    setQuoteRecord(record);
    setIsQuoteDrawerOpen(true);
  };

  // Falcon AI integration handlers
  const handleApplyCategoryFromAI = (category: CraftCategory) => {
    if (reloadedRecord) {
      setReloadedRecord({
        ...reloadedRecord,
        category,
        input: { ...reloadedRecord.input, category },
      });
    }
  };

  const handleApplyEstimatedLaborWage = (wage: number, hours: number) => {
    if (reloadedRecord) {
      setReloadedRecord({
        ...reloadedRecord,
        input: { ...reloadedRecord.input, laborWage: wage },
      });
    }
  };

  const handleTransferNotesToCalculator = (notes: string) => {
    setNotesToTransfer(notes);
    setActiveView('calculator');
  };

  // If not authenticated, render strict security gateway
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentProfile) {
    return <AuthGateway onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        profile={currentProfile}
        onToggleSidebar={() => setIsMobileMenuOpen(true)}
        onOpenGlobalSearch={() => {
          loadSearchCache();
          setIsGlobalSearchOpen(true);
        }}
      />

      {/* Mobile Lateral Hamburger Drawer */}
      <SidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        profile={currentProfile}
        activeView={activeView}
        onSelectView={(v) => {
          if (v === 'inventory') {
            setIsInventoryModalOpen(true);
          } else if (v === 'expenses') {
            setIsAdminCostsModalOpen(true);
          } else {
            setActiveView(v as AppActiveView);
          }
        }}
        unreadNotificationsCount={notifications.filter((n) => !n.isRead).length}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onOpenCraftsSelector={() => setIsCraftsSelectorOpen(true)}
        onOpenUserGuide={(sectionId) => {
          setUserGuideSection(sectionId);
          setIsUserGuideOpen(true);
        }}
        onOpenCloudMigration={() => setIsCloudMigrationOpen(true)}
        onToggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Navigation Breadcrumb / Section Header for Quick Access */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold py-1">
            {/* 1. إنشاء جديد */}
            <button
              type="button"
              onClick={() => setActiveView('create_center')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'create_center'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إنشاء جديد</span>
            </button>

            {/* 2. حاسبة تكاليف المنتج */}
            <button
              type="button"
              onClick={() => setActiveView('calculator')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'calculator'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>حاسبة التكاليف</span>
            </button>

            {/* 3. فواتير المبيعات */}
            <button
              type="button"
              onClick={() => setActiveView('invoices')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'invoices'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>فواتير المبيعات</span>
            </button>

            {/* 4. طلبيات العملاء */}
            <button
              type="button"
              onClick={() => setActiveView('sales')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'sales'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>طلبيات العملاء</span>
            </button>

            {/* 5. أوامر التشغيل */}
            <button
              type="button"
              onClick={() => setActiveView('work_orders')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'work_orders'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>أوامر التشغيل</span>
            </button>

            {/* 6. الموردون */}
            <button
              type="button"
              onClick={() => setActiveView('suppliers')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'suppliers'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>الموردون</span>
            </button>

            {/* 7. الخامات والوحدات */}
            <button
              type="button"
              onClick={() => setActiveView('materials')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'materials'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>الخامات والوحدات</span>
            </button>

            {/* 7. الخزن والسيولة */}
            <button
              type="button"
              onClick={() => setActiveView('treasuries')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'treasuries'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>الخزن والسيولة</span>
            </button>

            {/* 8. كادر العمالة HR */}
            <button
              type="button"
              onClick={() => setActiveView('hr')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'hr'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              <span>كادر العمالة HR</span>
            </button>

            {/* 9. صقر الشمساوية AI */}
            <button
              type="button"
              onClick={() => setActiveView('ai_agent')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'ai_agent'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>صقر الشمساوية AI</span>
            </button>

            {/* 10. الأرشيف */}
            <button
              type="button"
              onClick={() => setActiveView('archive')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'archive'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>الأرشيف</span>
            </button>

            {/* 11. التقارير */}
            <button
              type="button"
              onClick={() => setActiveView('reports')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeView === 'reports'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>التقارير المالية</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInventoryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 border flex items-center gap-1.5 transition cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-600" />
              <span>المخازن وكارت الصنف</span>
            </button>
          </div>
        </div>

        {/* ACTIVE VIEW RENDERING */}
        {activeView === 'create_center' && (
          <CreateCenterDashboard
            profile={currentProfile}
            onOpenNewMaterialModal={() => {
              setOpenAddMaterialInView(true);
              setActiveView('materials');
            }}
            onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
            onOpenNewSupplierModal={() => setIsNewSupplierModalOpen(true)}
            onOpenNewEmployeeModal={() => setIsNewEmployeeModalOpen(true)}
            onNavigateToCalculator={() => setActiveView('calculator')}
          />
        )}

        {activeView === 'calculator' && (
          <ProductionCalculator
            profile={currentProfile}
            initialRecord={reloadedRecord}
            onOpenWhatsAppShare={handleOpenWhatsAppShare}
            onOpenNewMaterialModal={() => {
              setOpenAddMaterialInView(true);
              setActiveView('materials');
            }}
            onSavedSuccess={() => {
              // Successfully saved to archive
            }}
            externalNotesToTransfer={notesToTransfer}
            onNotesTransferredHandled={() => setNotesToTransfer(null)}
          />
        )}

        {activeView === 'invoices' && (
          <InvoicesView
            workshop={currentProfile}
            onOpenHelp={(sec) => {
              setUserGuideSection(sec);
              setIsUserGuideOpen(true);
            }}
            onOpenDocumentPreview={() => {}}
          />
        )}

        {activeView === 'work_orders' && (
          <WorkOrdersView
            workshop={currentProfile}
            onOpenHelp={(sec) => {
              setUserGuideSection(sec);
              setIsUserGuideOpen(true);
            }}
          />
        )}

        {activeView === 'suppliers' && (
          <SuppliersView
            workshop={currentProfile}
            onOpenHelp={(sec) => {
              setUserGuideSection(sec);
              setIsUserGuideOpen(true);
            }}
            onOpenDocumentPreview={() => {}}
          />
        )}

        {activeView === 'materials' && (
          <MaterialsView
            workshop={currentProfile}
            initialOpenAddModal={openAddMaterialInView}
            onResetOpenAddModal={() => setOpenAddMaterialInView(false)}
            onOpenHelp={(sec) => {
              setUserGuideSection(sec);
              setIsUserGuideOpen(true);
            }}
          />
        )}

        {activeView === 'treasuries' && (
          <TreasuriesView
            workshop={currentProfile}
            onOpenHelp={(sec) => {
              setUserGuideSection(sec);
              setIsUserGuideOpen(true);
            }}
          />
        )}

        {activeView === 'sales' && (
          <SalesOrdersView
            profile={currentProfile}
            onOpenWhatsAppQuote={handleOpenWhatsAppShare}
            onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
          />
        )}

        {activeView === 'hr' && (
          <HRWorkforceModule
            profile={currentProfile}
            onOpenNewEmployeeModal={() => setIsNewEmployeeModalOpen(true)}
          />
        )}

        {activeView === 'ai_agent' && (
          <FalconAIAgent
            profile={currentProfile}
            currentCategory={(reloadedRecord?.category as CraftCategory) || 'جدارية'}
            onApplyCategoryFromAI={handleApplyCategoryFromAI}
            onApplyEstimatedLaborWage={handleApplyEstimatedLaborWage}
            onTransferNotesToCalculator={handleTransferNotesToCalculator}
          />
        )}

        {activeView === 'archive' && (
          <ProductArchive
            profile={currentProfile}
            onSelectRecordToLoad={handleSelectRecordFromArchive}
            onOpenWhatsAppShare={handleOpenWhatsAppShare}
          />
        )}

        {activeView === 'reports' && (
          <SaaSReportsAnalyticsView profile={currentProfile} />
        )}
      </main>

      {/* CREATION MODALS (From "إنشاء جديد" & Shortcuts) */}
      <NewMaterialModal
        isOpen={isNewMaterialModalOpen}
        onClose={() => setIsNewMaterialModalOpen(false)}
        profile={currentProfile}
        onSuccess={() => {
          // Triggers reload if on relevant screen
        }}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        profile={currentProfile}
        onSuccess={() => {}}
      />

      <NewSupplierModal
        isOpen={isNewSupplierModalOpen}
        onClose={() => setIsNewSupplierModalOpen(false)}
        profile={currentProfile}
        onSuccess={() => {}}
      />

      <NewEmployeeModal
        isOpen={isNewEmployeeModalOpen}
        onClose={() => setIsNewEmployeeModalOpen(false)}
        profile={currentProfile}
        onSuccess={() => {}}
      />

      {/* OTHER MODALS */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={currentProfile}
        onProfileUpdated={(updated) => setCurrentProfile(updated)}
      />

      <InventoryLedgerModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        profile={currentProfile}
        onOpenMaterialsView={() => setActiveView('materials')}
      />

      <AdminExpensesModal
        isOpen={isAdminCostsModalOpen}
        onClose={() => setIsAdminCostsModalOpen(false)}
        profile={currentProfile}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        profile={currentProfile}
        onRefreshNotifications={loadNotifications}
        onNavigateToOrder={(orderId) => {
          setActiveView('sales');
          setIsNotificationDrawerOpen(false);
        }}
        onNavigateToInventory={() => {
          setIsInventoryModalOpen(true);
          setIsNotificationDrawerOpen(false);
        }}
      />

      <WhatsAppQuoteDrawer
        isOpen={isQuoteDrawerOpen}
        onClose={() => setIsQuoteDrawerOpen(false)}
        record={quoteRecord}
        profile={currentProfile}
      />

      {/* Crafts Selector Modal (اختيار أقسام الورشة) */}
      <CraftsSelectorModal
        isOpen={isCraftsSelectorOpen}
        onClose={() => setIsCraftsSelectorOpen(false)}
        workshop={currentProfile}
        onCraftsUpdated={(crafts) => {
          localStorage.setItem('alshams_crafts_selected', JSON.stringify(crafts));
          setCurrentProfile((prev) => (prev ? { ...prev, selectedCrafts: crafts } : prev));
          setIsCraftsSelectorOpen(false);
        }}
      />

      {/* Global Search Modal (البحث الموحد) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        cache={searchCache}
        onSelectResult={(cat) => {
          setIsGlobalSearchOpen(false);
          if (cat === 'customers' || cat === 'invoices') setActiveView('invoices');
          else if (cat === 'suppliers') setActiveView('suppliers');
          else if (cat === 'workOrders') setActiveView('work_orders');
          else if (cat === 'employees') setActiveView('hr');
          else if (cat === 'products') setActiveView('archive');
          else if (cat === 'materials') setIsInventoryModalOpen(true);
        }}
      />

      {/* User Guide Modal (دليل الاستخدام الشامل) */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        initialSectionId={userGuideSection}
      />

      {/* Cloud Migration Modal (الترحيل السحابي) */}
      <CloudMigrationModal
        isOpen={isCloudMigrationOpen}
        onClose={() => setIsCloudMigrationOpen(false)}
        workshopId={currentProfile.ownerUid || currentProfile.workshopId || currentProfile.id}
        userEmail={currentProfile.email}
        onMigrationComplete={() => {
          loadNotifications();
        }}
      />

      {/* Family Welcome Modal (رسالة الترحيب الدافئة بعيلة الشمساوية) */}
      <FamilyWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
        profile={currentProfile}
        type={welcomeType}
      />

      {/* Footer Attribution Watermark */}
      <footer className="mt-auto py-5 border-t border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1 font-medium">
            <span>منظومة الشمس كرافت الحرفية المتكاملة (SaaS Edition)</span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span>كافة الحقوق محفوظة لبراند {currentProfile.brandName}</span>
          </p>
          <p className="font-mono text-[11px] tracking-wider text-stone-400 dark:text-stone-500 lowercase">
            powered by AL-SHAMS CRAFT
          </p>
        </div>
      </footer>
    </div>
  );
}
