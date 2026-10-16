import React, { useState, useEffect } from 'react';
import { SavedProductRecord, UserProfile, CraftCategory } from '../../types';
import { CRAFT_CATEGORIES, getGenderArtistTitle } from '../../utils/macrameMath';
import { tenantStorage } from '../../db/dexieDB';
import {
  FolderArchive,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Share2,
  Calendar,
  Layers,
  Scale,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ProductArchiveProps {
  profile: UserProfile;
  onSelectRecordToLoad: (record: SavedProductRecord) => void;
  onOpenWhatsAppShare: (record: SavedProductRecord) => void;
}

export const ProductArchive: React.FC<ProductArchiveProps> = ({
  profile,
  onSelectRecordToLoad,
  onOpenWhatsAppShare,
}) => {
  const [records, setRecords] = useState<SavedProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const items = await tenantStorage.getProducts(
        profile.tenantId,
        selectedCategoryFilter,
        searchQuery
      );
      setRecords(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [profile.tenantId, selectedCategoryFilter, searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف بطاقة التصميم هذه من الأرشيف؟')) {
      await tenantStorage.deleteProduct(profile.tenantId, id);
      loadRecords();
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Category Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        {/* Category Filter Dropdown - REQUIRED next to archive search bar */}
        <div className="w-full sm:w-64 flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none"
          >
            <option value="all">كافة التصنيفات (الكل)</option>
            {CRAFT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="w-full flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم الموديل أو القطعة في أرشيف الورشة..."
            className="w-full px-3.5 py-2 pr-9 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-stone-400 text-xs">
          جاري استرجاع بطاقات التصاميم المحفوظة...
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 space-y-3">
          <FolderArchive className="w-12 h-12 text-amber-500/40 mx-auto" />
          <h3 className="font-bold text-sm text-stone-700 dark:text-stone-300">
            لا توجد بطاقات إنتاج محفوظة في الأرشيف
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            احفظ تصميمك الأول من حاسبة الإنتاج وسيتم أرشفته هنا فورياً مع إمكانية تعديله
            وإعادة تسعيره في أي وقت!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => onSelectRecordToLoad(rec)}
              className="group cursor-pointer rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between text-right p-5 relative"
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300/40">
                    {rec.category}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {new Date(rec.updatedAt || rec.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-black text-base text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition mb-2">
                  {rec.productName}
                </h4>

                {/* Key Specs */}
                <div className="grid grid-cols-3 gap-1.5 py-2.5 border-y border-stone-100 dark:border-stone-800/80 text-center my-2 text-stone-600 dark:text-stone-300">
                  <div className="p-1 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-[9px] text-stone-400 block">الفتلات</span>
                    <span className="font-mono font-bold text-xs">
                      {rec.output.baseStrandsCount}
                    </span>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-[9px] text-stone-400 block">طول القص</span>
                    <span className="font-mono font-bold text-xs">
                      {rec.output.singleStrandLengthCm} سم
                    </span>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-[9px] text-stone-400 block">الوزن</span>
                    <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      {rec.output.totalWeightKg.toFixed(2)} كجم
                    </span>
                  </div>
                </div>

                {/* Selling Price */}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-stone-500 font-medium">سعر البيع النهائي:</span>
                  <div className="text-left font-mono">
                    <span className="text-xl font-black text-amber-700 dark:text-amber-400">
                      {rec.output.finalSellingPrice}
                    </span>
                    <span className="text-xs text-stone-500 mr-1">{profile.currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWhatsAppShare(rec);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50 text-xs font-bold flex items-center gap-1 transition"
                  title="مشاركة عرض السعر"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(rec.id, e)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition"
                    title="حذف من الأرشيف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <span>فتح وتعديل</span>
                    <ArrowRight className="w-3.5 h-3.5 transform rotate-180" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
