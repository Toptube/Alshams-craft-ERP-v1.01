import React, { useState } from 'react';
import {
  MAIN_SECTIONS,
  SUB_CRAFTS_REGISTRY,
  MainSectionId,
} from '../../registry/craftsRegistry';
import { WorkshopProfile } from '../../types';
import { firestoreService } from '../../db/firestoreService';
import {
  Check,
  Sparkles,
  X,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface CraftsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshop: WorkshopProfile;
  onCraftsUpdated: (updatedCrafts: string[]) => void;
  isInitialOnboarding?: boolean;
}

export const CraftsSelectorModal: React.FC<CraftsSelectorModalProps> = ({
  isOpen,
  onClose,
  workshop,
  onCraftsUpdated,
  isInitialOnboarding = false,
}) => {
  if (!isOpen) return null;

  const [selectedIds, setSelectedIds] = useState<string[]>(
    workshop.selectedCrafts && workshop.selectedCrafts.length > 0
      ? workshop.selectedCrafts
      : ['macrame']
  );
  const [activeSection, setActiveSection] = useState<MainSectionId | 'all'>('all');
  const [saving, setSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  const toggleCraft = (id: string) => {
    setErrorNotice('');
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) {
        setErrorNotice('يجب الإبقاء على حرفة واحدة على الأقل مفعلة في ورشتك.');
        return;
      }
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllInSection = (secId: MainSectionId) => {
    const secCrafts = SUB_CRAFTS_REGISTRY.filter((c) => c.mainSectionId === secId).map((c) => c.id);
    const merged = Array.from(new Set([...selectedIds, ...secCrafts]));
    setSelectedIds(merged);
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      setErrorNotice('يرجى اختيار حرفة واحدة على الأقل لمتابعة تشغيل الورشة.');
      return;
    }

    setSaving(true);
    try {
      await firestoreService.setWorkshop({
        ...workshop,
        selectedCrafts: selectedIds,
        updatedAt: Date.now(),
      });
      onCraftsUpdated(selectedIds);
      onClose();
    } catch (err: any) {
      console.error('Failed to update crafts:', err);
      setErrorNotice(err?.message || 'فشل حفظ الحِرف المختارة');
    } finally {
      setSaving(false);
    }
  };

  const visibleCrafts =
    activeSection === 'all'
      ? SUB_CRAFTS_REGISTRY
      : SUB_CRAFTS_REGISTRY.filter((c) => c.mainSectionId === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-7 relative text-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          {!isInitialOnboarding && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>تخصيص سجل الورشة الحرفي</span>
            </div>
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100 mt-0.5">
              اختر أقسام وحِرف ورشتك اليدوية
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              ستعرض كافة شاشات الحاسبة والأرشيف والتقارير الحِرف التي تختارها هنا فقط لتسهيل عملك.
            </p>
          </div>
        </div>

        {/* Notices */}
        {errorNotice && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 pb-2 border-b border-stone-200 dark:border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              activeSection === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            كافة الأقسام ({SUB_CRAFTS_REGISTRY.length})
          </button>
          {MAIN_SECTIONS.map((sec) => (
            <button
              type="button"
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeSection === sec.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {sec.nameAr}
            </button>
          ))}
        </div>

        {/* Quick select buttons */}
        <div className="py-2.5 flex items-center justify-between text-xs text-stone-500">
          <span>
            الحِرف المختارة حالياً:{' '}
            <strong className="text-amber-700 dark:text-amber-400 font-mono text-sm">
              {selectedIds.length}
            </strong>{' '}
            حرفة
          </span>
          {activeSection !== 'all' && (
            <button
              type="button"
              onClick={() => handleSelectAllInSection(activeSection)}
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              تحديد كل حِرف هذا القسم
            </button>
          )}
        </div>

        {/* Crafts Grid */}
        <div className="flex-1 overflow-y-auto py-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh]">
          {visibleCrafts.map((craft) => {
            const isSelected = selectedIds.includes(craft.id);
            return (
              <div
                key={craft.id}
                onClick={() => toggleCraft(craft.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                <div
                  className={`w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                    isSelected
                      ? 'bg-amber-600 text-white'
                      : 'border-2 border-stone-300 dark:border-stone-600'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">
                      {craft.nameAr}
                    </span>
                    {craft.badge && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          craft.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {craft.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    {craft.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-auto border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-400 hidden sm:inline">
            * يمكنك إعادة تخصيص هذه الحِرف في أي وقت من زر الإعدادات
          </span>
          <div className="flex items-center gap-2 mr-auto">
            {!isInitialOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                إلغاء
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>تأكيد واعتماد الحِرف في ورشتي</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
