import React, { useState } from 'react';
import { GUIDE_SECTIONS, GLOSSARY } from '../../guide/guide';
import { CHANGELOG_RELEASES } from '../../guide/changelog';
import {
  BookOpen,
  X,
  Search,
  Sparkles,
  HelpCircle,
  History,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialSectionId,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'guide' | 'glossary' | 'changelog'>('guide');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialSectionId || GUIDE_SECTIONS[0].id
  );
  const [glossarySearch, setGlossarySearch] = useState('');

  const currentSection =
    GUIDE_SECTIONS.find((s) => s.id === selectedSectionId) || GUIDE_SECTIONS[0];

  const filteredGlossary = GLOSSARY.filter(
    (item) =>
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.accountingTerm.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.meaning.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300">
              دليل الاستخدام وقاموس المصطلحات الحرفية
            </h2>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-5 pt-3 border-b border-stone-200 dark:border-stone-800 flex gap-2 text-xs font-bold bg-stone-50 dark:bg-stone-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            خطوات التشغيل (الدليل العملي)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('glossary')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'glossary'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <span>قاموس المصطلحات (ما معنى هذا؟)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'changelog'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل التحديثات وما الجديد</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'guide' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Sections Sidebar */}
              <div className="md:col-span-4 space-y-1.5 border-b md:border-b-0 md:border-l border-stone-200 dark:border-stone-800 pb-4 md:pb-0 md:pl-4">
                <span className="text-[11px] font-bold text-stone-400 block px-2 mb-2">
                  فهرس موضوعات الدليل:
                </span>
                {GUIDE_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`w-full p-2.5 rounded-2xl text-right text-xs transition cursor-pointer flex items-center justify-between ${
                      selectedSectionId === sec.id
                        ? 'bg-amber-600 text-white font-extrabold shadow-xs'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span>{sec.title}</span>
                  </button>
                ))}
              </div>

              {/* Section Details */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <h3 className="text-base font-black text-amber-900 dark:text-amber-300">
                    {currentSection.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {currentSection.summary}
                  </p>
                </div>

                <div className="space-y-3">
                  {currentSection.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 space-y-1.5"
                    >
                      <h4 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center text-[10px] font-mono font-bold">
                          {idx + 1}
                        </span>
                        <span>{step.title}</span>
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed pr-7">
                        {step.description}
                      </p>
                      {step.tip && (
                        <div className="mr-7 mt-2 p-2 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 text-[10.5px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>نصيحة: {step.tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'glossary' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder="ابحث في معاني الكلمات المحاسبية البسيطة..."
                  className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>

              {/* Glossary Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredGlossary.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-stone-700/60 pb-2">
                      <span className="font-black text-xs text-amber-900 dark:text-amber-300">
                        {item.term}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        ({item.accountingTerm})
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                      {item.meaning}
                    </p>
                    <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[10.5px] text-stone-500 dark:text-stone-400">
                      <strong>مثال عملي:</strong> {item.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="space-y-6">
              {CHANGELOG_RELEASES.map((rel, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl border border-amber-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b pb-3 border-stone-200/80 dark:border-stone-700/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-amber-600 text-white">
                        v{rel.version}
                      </span>
                      <h4 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                        {rel.title}
                      </h4>
                    </div>
                    <span className="text-xs text-stone-400 font-mono">{rel.date}</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-400 block">
                      المراحل المنفذة في هذا الإصدار:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rel.stagesImplemented.map((st, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40"
                        >
                          ✓ {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-stone-200/40 dark:border-stone-700/40 text-xs text-stone-600 dark:text-stone-300">
                    {rel.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 text-center bg-stone-50 dark:bg-stone-900 text-xs text-stone-400">
          منظومة الشمس كرافت الحرفية ERP • صُممت لتبسيط الحسابات للحرفيين
        </div>
      </div>
    </div>
  );
};
