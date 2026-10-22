import React, { useState, useEffect } from 'react';
import { NotificationItem, UserProfile } from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import { playAlertSound } from '../../lib/sounds';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Trophy,
  Package,
  Truck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  profile: UserProfile;
  onRefreshNotifications: () => void;
  onNavigateToOrder?: (orderId: string) => void;
  onNavigateToInventory?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  profile,
  onRefreshNotifications,
  onNavigateToOrder,
  onNavigateToInventory,
}) => {
  useEffect(() => {
    if (isOpen) {
      playAlertSound();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const [selectedOrderIdForStatus, setSelectedOrderIdForStatus] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    await tenantStorage.markNotificationAsRead(id);
    onRefreshNotifications();
  };

  const handleMarkAllRead = async () => {
    const targetTenantId = profile.tenantId || profile.workshopId || profile.id;
    await tenantStorage.markAllNotificationsAsRead(targetTenantId);
    onRefreshNotifications();
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const targetTenantId = profile.tenantId || profile.workshopId || profile.id;
      await tenantStorage.updateOrderStatus(targetTenantId, orderId, newStatus);
      setSelectedOrderIdForStatus(null);
      onRefreshNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'stock_depletion':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'upcoming_delivery':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'upcoming_deposit':
      case 'overdue_deposit':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'milestone_sales':
      case 'milestone_usage':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md h-full shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col text-right animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                مركز التنبيهات التفاعلي
              </h3>
              <span className="text-[10px] text-stone-400 block font-mono">
                {unreadCount} تنبيهات غير مقروءة
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-40 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>تحديد الكل كمقروء</span>
          </button>
          <span className="text-[11px] text-stone-500">
            تنبيهات فورية للمخزون ومواعيد التسليم والدفعات
          </span>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-stone-600 dark:text-stone-300">
                لا توجد تنبيهات جديدة في الوقت الحالي
              </p>
              <span className="text-[11px] text-stone-400">
                كافة طلبيات المشغل والمخزون في حالة ممتازة ومستقرة
              </span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all text-right ${
                  item.isRead
                    ? 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-sm text-stone-900 dark:text-stone-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      title={item.isRead ? 'مقروء' : 'تحديد كمقروء'}
                      className={`w-2 h-2 rounded-full ${
                        item.isRead ? 'bg-stone-300 dark:bg-stone-600' : 'bg-amber-500 ring-2 ring-amber-400/40'
                      }`}
                    />
                    <span className="font-extrabold text-xs">{item.title}</span>
                  </div>
                  <div className="p-1 rounded-lg bg-white dark:bg-stone-800 shadow-xs flex-shrink-0">
                    {getNotificationIcon(item.type)}
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1.5 leading-relaxed font-medium">
                  {item.message}
                </p>

                {/* Operational Execution Tracker Dropdown: (تحت التصنيع، جاري الشحن، تم الشحن، تم التسليم) */}
                {item.relatedOrderId && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>متابعة حالة التنفيذ التشغيلي:</span>
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        disabled={updatingOrderId === item.relatedOrderId}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleStatusChange(item.relatedOrderId!, e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
                      >
                        <option value="" disabled>اختر حالة التنفيذ للطلبية...</option>
                        <option value="in_progress">تحت التصنيع</option>
                        <option value="shipping">جاري الشحن</option>
                        <option value="ready">تم الشحن</option>
                        <option value="delivered">تم التسليم</option>
                      </select>
                      {updatingOrderId === item.relatedOrderId && (
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )}

                {/* If notification is related to low inventory */}
                {item.type === 'stock_depletion' && onNavigateToInventory && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToInventory();
                        onClose();
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Package className="w-3 h-3" />
                      <span>فتح كارت الخامة لإصدار أمر توريد</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 text-center bg-stone-50 dark:bg-stone-900">
          <span className="text-[10px] text-stone-400 font-mono">
            نظام الإشعارات الذكي والمستمر لورشة الشمس كرافت © 2026
          </span>
        </div>
      </div>
    </div>
  );
};
