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
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
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
} from 'lucide-react';

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
  // 'create_center' | 'calculator' | 'sales' | 'hr' | 'ai_agent' | 'archive' | 'reports'
  const [activeView, setActiveView] = useState<
    'create_center' | 'calculator' | 'sales' | 'hr' | 'ai_agent' | 'archive' | 'reports'
  >('create_center');

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Creation Modals States (from Create Center & shortcuts)
  const [isNewMaterialModalOpen, setIsNewMaterialModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);

  // Other Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isAdminCostsModalOpen, setIsAdminCostsModalOpen] = useState(false);

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

  // Notification loader
  const loadNotifications = useCallback(async () => {
    if (!currentProfile) return;
    try {
      await tenantStorage.generateProactiveNotifications(currentProfile.tenantId);
      const notifs = await tenantStorage.getNotifications(currentProfile.tenantId);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
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

  // Absolute Authentication Root: Default strictly to Login/Signup portal on startup
  useEffect(() => {
    const sessionActive = sessionStorage.getItem('alshams_session_verified');
    const savedTenantId = localStorage.getItem('alshams_active_tenant_id');

    if (sessionActive === 'true' && savedTenantId) {
      tenantStorage
        .getProfile(savedTenantId)
        .then((profile) => {
          if (profile) {
            setCurrentProfile(profile);
          }
        })
        .finally(() => {
          setAuthChecked(true);
        });
    } else {
      // First startup / unverified session lands directly on AuthGateway
      setAuthChecked(true);
    }
  }, []);

  const handleAuthenticated = (profile: UserProfile) => {
    setCurrentProfile(profile);
    localStorage.setItem('alshams_active_tenant_id', profile.tenantId);
    sessionStorage.setItem('alshams_session_verified', 'true');
  };

  const handleLogout = () => {
    localStorage.removeItem('alshams_active_tenant_id');
    sessionStorage.removeItem('alshams_session_verified');
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
        activeView={activeView}
        onSelectView={setActiveView}
        unreadNotificationsCount={notifications.filter((n) => !n.isRead).length}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onToggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
        onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mobile Lateral Hamburger Drawer */}
      <SidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        profile={currentProfile}
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
        onOpenInventory={() => setIsInventoryModalOpen(true)}
        onOpenAdminCosts={() => setIsAdminCostsModalOpen(true)}
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
              <span>حاسبة تكاليف المنتج</span>
            </button>

            {/* 3. المبيعات */}
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
              <span>المبيعات والطلبيات</span>
            </button>

            {/* 4. كادر العمالة HR */}
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

            {/* 5. صقر الشمساوية AI */}
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

            {/* 6. الأرشيف */}
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

            {/* 7. التقارير */}
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
              <span>المخازن والموردين</span>
            </button>
          </div>
        </div>

        {/* ACTIVE VIEW RENDERING */}
        {activeView === 'create_center' && (
          <CreateCenterDashboard
            profile={currentProfile}
            onOpenNewMaterialModal={() => setIsNewMaterialModalOpen(true)}
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
            onOpenNewMaterialModal={() => setIsNewMaterialModalOpen(true)}
            onSavedSuccess={() => {
              // Successfully saved to archive
            }}
            externalNotesToTransfer={notesToTransfer}
            onNotesTransferredHandled={() => setNotesToTransfer(null)}
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
            currentCategory={reloadedRecord?.category || 'جدارية'}
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
