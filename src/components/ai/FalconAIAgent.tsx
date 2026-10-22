import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FalconMascotAvatar } from '../brand/BrandAssets';
import { UserProfile, CraftCategory, AIVisionAnalysis, ChatMessage } from '../../types';
import { tenantStorage } from '../../db/dexieDB';
import { getGenderArtistTitle } from '../../utils/macrameMath';
import { authedFetch } from '../../lib/apiClient';
import {
  Sparkles,
  Camera,
  Send,
  Upload,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  Grid,
  DollarSign,
  Clock,
  CheckCircle,
  Lightbulb,
  Cpu,
  ExternalLink,
} from 'lucide-react';

interface FalconAIAgentProps {
  profile: UserProfile;
  currentCategory: CraftCategory;
  onApplyCategoryFromAI: (category: CraftCategory) => void;
  onApplyEstimatedLaborWage: (wage: number, hours: number) => void;
  onTransferNotesToCalculator: (notes: string) => void;
}

/**
 * 5) خريطة الأخطاء بالعربية حسب رمز الحالة:
 * 401 (سجّل دخولك)، 429 (انتهى الحد اليومي)، 503 (خدمة الذكاء الاصطناعي غير مفعّلة حالياً)، 502 (تعذر التحليل، حاول مرة أخرى)
 */
function getArabicAiError(status: number, defaultMessage?: string): string {
  if (status === 401) {
    return 'سجّل دخولك الأول للوصول إلى استشارات وتحليلات صقر الشمساوية AI.';
  }
  if (status === 429) {
    return 'انتهى الحد اليومي (20 استشارة في اليوم) للمساعد الذكي. يتجدد رصيدك تلقائياً غداً.';
  }
  if (status === 503) {
    return 'خدمة الذكاء الاصطناعي غير مفعّلة حالياً على الخادم.';
  }
  if (status === 502) {
    return 'تعذر التحليل، حاول مرة أخرى.';
  }
  return defaultMessage || 'تعذر معالجة الطلب، حاول مرة أخرى.';
}

export const FalconAIAgent: React.FC<FalconAIAgentProps> = ({
  profile,
  currentCategory,
  onApplyCategoryFromAI,
  onApplyEstimatedLaborWage,
  onTransferNotesToCalculator,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'falcon',
      text: `أهلاً وسهلاً بكِ في الجناح الذكي لمنظومة الشمس كرافت! 🦅✨
أنا "صقر الشمساوية AI" - مساعدكِ الحرفي والهندسي المتخصص في أصول حياكة المكرمية، تحليل كثافة الغرز بالرؤية الحاسوبية، وتدقيق الجدوى الاقتصادية للورش والبراندات اليدوية.

ارفعي صورة أي موديل أو اسأليني عن استراتيجيات التسعير ودراسة السوق!`,
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<AIVisionAnalysis | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [transferredNotice, setTransferredNotice] = useState(false);
  // 5) عرض عدد الاستشارات المتبقية اليوم
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, visionAnalysis, isSending, isAnalyzingImage]);

  // استعلام رصيد الاستشارات المتبقية اليوم عند الفتح
  const loadDailyUsage = useCallback(async () => {
    try {
      const res = await authedFetch('/api/ai/usage');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.remaining === 'number') {
          setDailyRemaining(data.remaining);
        }
      }
    } catch (err) {
      // مستخدم غير مسجل بعد أو غير متاح
    }
  }, []);

  useEffect(() => {
    loadDailyUsage();
  }, [loadDailyUsage]);

  // Action chips
  const actionChips = [
    'التسعير العادل جملة وقطاعي',
    'مقارنة المنتج بالأسواق',
    'توليد باترون مفصل وطريقة العمل',
    'توقع الأبعاد والتكلفة والمصنعية',
  ];

  // 5) ضغط الصورة في الواجهة قبل الإرسال (أقصى بُعد 1280px، JPEG جودة 0.8)
  const compressImageForAI = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawResult = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: rawResult, mimeType: 'image/jpeg' });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          // ضبط الجودة الصارم على 0.8 بصيغة JPEG
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve({ base64: compressed, mimeType: 'image/jpeg' });
        };
        img.onerror = () => {
          resolve({ base64: rawResult, mimeType: 'image/jpeg' });
        };
        img.src = rawResult;
      };
      reader.onerror = () => {
        resolve({ base64: '', mimeType: 'image/jpeg' });
      };
      reader.readAsDataURL(file);
    });
  };

  // 1) و 5) معالجة تحليل الصورة باستخدام authedFetch وعرض الأخطاء العربية
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzingImage(true);
      const { base64, mimeType } = await compressImageForAI(file);
      if (!base64) throw new Error('فشل قراءة ملف الصورة');

      setImagePreview(base64);

      // إضافة رسالة المستخدم
      setMessages((prev) => [
        ...prev,
        {
          id: 'user_img_' + Date.now(),
          sender: 'user',
          text: '📸 قمت برفع صورة قطعة مكرمية لتحليلها هندسياً واكتشاف التصنيف والباترون.',
          timestamp: Date.now(),
        },
      ]);

      const res = await authedFetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mimeType || 'image/jpeg',
          artistNotes: inputPrompt || '',
          activeCrafts: Array.isArray(profile.selectedCrafts) ? profile.selectedCrafts : [],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = getArabicAiError(res.status, errData.error || errData.detail);
        throw new Error(errMsg);
      }

      const data: AIVisionAnalysis = await res.json();
      setVisionAnalysis(data);

      if (typeof (data as any).dailyAiRemaining === 'number') {
        setDailyRemaining((data as any).dailyAiRemaining);
      }

      // 1. Shift category immediately
      if (data.detectedCategory) {
        onApplyCategoryFromAI(data.detectedCategory);
      }

      // 2. Autofill estimated hours * 30 internal wage
      if (data.estimatedLaborWage) {
        onApplyEstimatedLaborWage(data.estimatedLaborWage, data.estimatedHours);
      }

      // Add Falcon response message
      setMessages((prev) => [
        ...prev,
        {
          id: 'falcon_res_' + Date.now(),
          sender: 'falcon',
          text: `🎯 تم استيعاب الصورة وتحليلها هندسياً بنجاح عبر صقر الشمساوية AI!
- التصنيف المكتشف فورياً: **${data.detectedCategory}** (تم تحويل الحاسبة إليه تلقائياً).
- الساعات التقديرية للعمل اليدوي: **${data.estimatedHours} ساعة**.
- أجرة المصنعية المقترحة: **${data.estimatedLaborWage} ${profile.currencySymbol}**.
- شريحة تسعير السوق: من ${data.competitionPricing?.minMarketPrice || 0} إلى ${data.competitionPricing?.maxMarketPrice || 0} ${profile.currencySymbol}.

راجعي أدناه الباترون التخطيطي التفاعلي والمصفوفة التنافسية!`,
          timestamp: Date.now(),
          metadata: data,
          sources: (data as any).sources || [],
        },
      ]);
    } catch (err: any) {
      console.error('AI Vision error:', err);
      const isLoginErr = err?.message?.includes('سجّل دخولك');
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'falcon',
          text: `⚠️ ${isLoginErr ? 'سجّل دخولك الأول للوصول إلى تحليلات صقر الشمساوية AI.' : (err.message || 'تعذر التحليل، حاول مرة أخرى.')}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsAnalyzingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // 1) و 4) و 6) إرسال رسالة الشات مع authedFetch وتحديث الرصيد والمصادر
  const handleSendMessage = async (customText?: string, chip?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend && !chip) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: textToSend || (chip ? `استفسار حول: ${chip}` : ''),
      actionChip: chip,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsSending(true);

    try {
      // استخراج المعارف المحلية لتخصيص سياق الورشة
      const localOverrides = await tenantStorage.getArtisanOverrides(
        profile.tenantId || profile.workshopId || profile.id || ''
      );

      const res = await authedFetch('/api/chat-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          actionChip: chip || null,
          chatHistory: messages.slice(-12),
          currentContext: {
            artistName: profile.artistName,
            brandName: profile.brandName,
            gender: profile.gender,
            category: currentCategory,
            currency: profile.currencySymbol,
            artisanOverridesCount: localOverrides.length,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = getArabicAiError(res.status, errData.error || errData.detail);
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (typeof data.dailyAiRemaining === 'number') {
        setDailyRemaining(data.dailyAiRemaining);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'falcon_' + Date.now(),
          sender: 'falcon',
          text: data.reply || 'عذراً يا فنان، تعذر استخراج رد واضح على سؤالك حالياً، يرجى إعادة المحاولة.',
          timestamp: Date.now(),
          sources: data.sources || [],
        },
      ]);
    } catch (err: any) {
      const isLoginErr = err?.message?.includes('سجّل دخولك');
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'falcon',
          text: `⚠️ ${isLoginErr ? 'سجّل دخولك الأول للتواصل مع صقر الشمساوية AI.' : (err.message || 'تعذر معالجة الرد حالياً، حاول مرة أخرى.')}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Transfer notes to calculator
  const handleTransferToNotes = () => {
    if (!visionAnalysis) return;
    const minP = visionAnalysis.competitionPricing?.minMarketPrice || 0;
    const avgP = visionAnalysis.competitionPricing?.avgMarketPrice || visionAnalysis.competitionPricing?.recommendedFairPrice || 0;
    const maxP = visionAnalysis.competitionPricing?.maxMarketPrice || 0;
    const combinedNotes = `• التصنيف المعتمد: ${visionAnalysis.detectedCategory || ''}
• الساعات المقدرة: ${visionAnalysis.estimatedHours || 0} ساعة
• دراسة السوق: (أدنى: ${minP} | متوسط: ${avgP} | أعلى: ${maxP} ${profile.currencySymbol})
• التوجيه الهندسي: ${visionAnalysis.notesForCalculator || ''}
• خطوات التنفيذ المختارة:
${(visionAnalysis.productionGuide || []).join('\n')}`;

    onTransferNotesToCalculator(combinedNotes);
    setTransferredNotice(true);
    setTimeout(() => setTransferredNotice(false), 3000);
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col h-[750px] relative">
      {/* Header with Falcon Mascot Identity */}
      <div className="p-4 bg-gradient-to-r from-stone-950 via-amber-950 to-stone-900 text-white flex items-center justify-between border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <FalconMascotAvatar size="md" />
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-amber-300">
                صقر الشمساوية AI
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                خبير الرؤية الهندسية
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              تحليل بالرؤية الحاسوبية، تدقيق التسعير، وتدريب محلي من قرارات الورشة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dailyRemaining !== null && (
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>متبقي اليوم: {dailyRemaining} / 20</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">تحليل صورة موديل</span>
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-stone-50/50 dark:bg-stone-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse text-left' : 'text-right'
            }`}
          >
            {msg.sender === 'falcon' ? (
              <FalconMascotAvatar size="sm" statusDot={false} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                {profile.artistName?.charAt(0) || 'أ'}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-amber-600 text-white rounded-tl-none font-medium'
                  : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200/80 dark:border-stone-700 rounded-tr-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* مصادر بحث السوق إن وُجدت */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/80 dark:border-stone-700/80 text-right">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>المصادر المعتمدة لبحث السوق:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 border border-stone-200 dark:border-stone-700/80 transition flex items-center gap-1"
                      >
                        <span className="truncate max-w-[200px]">{s.title || s.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <span
                className={`block text-[9px] mt-1.5 font-mono ${
                  msg.sender === 'user' ? 'text-amber-100' : 'text-stone-400'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {/* 4) مؤشر "صقر بيكتب..." أثناء الانتظار */}
        {isSending && (
          <div className="flex items-start gap-3 text-right">
            <FalconMascotAvatar size="sm" statusDot={false} />
            <div className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 shadow-sm rounded-tr-none">
              <span className="font-bold">صقر بيكتب...</span>
              <span className="inline-flex gap-1 mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {isAnalyzingImage && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3 animate-pulse">
            <FalconMascotAvatar size="sm" />
            <div className="text-right">
              <p className="font-bold">صقر الشمساوية AI يحلل كثافة الغرز والأبعاد...</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">
                مطابقة التصنيف، استنتاج ساعات التصنيع، وتوليد الباترون التخطيطي
              </p>
            </div>
          </div>
        )}

        {/* Vision Analysis Interactive Cards (If an image was processed) */}
        {visionAnalysis && (
          <div className="space-y-4 my-2 p-4 rounded-3xl bg-amber-500/5 border-2 border-amber-500/30">
            {/* Header / Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span className="font-extrabold text-xs text-amber-900 dark:text-amber-200">
                  مخرجات التحليل الفني لقطعة ({visionAnalysis.detectedCategory})
                </span>
              </div>

              {/* Button: "الانتقال إلى حاسبة الإنتاج مع نقل الملاحظات" */}
              <button
                type="button"
                onClick={handleTransferToNotes}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الانتقال إلى حاسبة الإنتاج مع نقل الملاحظات</span>
              </button>
            </div>

            {transferredNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>تم نقل كافة ملاحظات الباترون ودراسة السوق لحاسبة الإنتاج بنجاح!</span>
              </div>
            )}

            {/* Competition Pricing Matrix */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>مصفوفة تسعير المنافسين في السوق اليدوي:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 block">أقل سعر في السوق</span>
                  <span className="font-mono font-bold text-sm text-stone-700 dark:text-stone-300">
                    {visionAnalysis.competitionPricing?.minMarketPrice || 0} {profile.currencySymbol}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/40">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold">
                    السعر المتوسط الشائع
                  </span>
                  <span className="font-mono font-black text-sm text-amber-800 dark:text-amber-200">
                    {visionAnalysis.competitionPricing?.avgMarketPrice || visionAnalysis.competitionPricing?.recommendedFairPrice || 0} {profile.currencySymbol}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-500 block">أعلى سعر قطاعي فاخر</span>
                  <span className="font-mono font-bold text-sm text-stone-700 dark:text-stone-300">
                    {visionAnalysis.competitionPricing?.maxMarketPrice || 0} {profile.currencySymbol}
                  </span>
                </div>
              </div>

              {/* مصادر أسعار السوق المرجعية من بحث الويب إن وُجدت */}
              {visionAnalysis.sources && visionAnalysis.sources.length > 0 && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-700/50 text-right">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                    المصادر المرجعية المستخرجة من بحث السوق:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {visionAnalysis.sources.map((src: any, idx: number) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 border border-stone-200 dark:border-stone-700/80 transition flex items-center gap-1"
                      >
                        <span className="truncate max-w-[200px]">{src.title || src.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stitch Pattern Catalog & Production Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pattern Catalog */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <Grid className="w-4 h-4 text-amber-600" />
                  <span>كتالوج العقد والغرز المستخدمة:</span>
                </div>
                <ul className="space-y-1 text-xs text-stone-600 dark:text-stone-300 list-disc list-inside">
                  {visionAnalysis.stitchPatterns.map((pat: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">
                      {pat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step by step guide */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>خطوات طريقة العمل المنظمة:</span>
                </div>
                <ol className="space-y-1 text-xs text-stone-600 dark:text-stone-300 list-decimal list-inside">
                  {visionAnalysis.productionGuide.map((step: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* SVG Visual Grid Schematic Workflow Graph */}
            {visionAnalysis.svgSchematic && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 shadow-sm space-y-2">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                  رسم بياني تخطيطي لباترون الشغل (SVG Canvas):
                </span>
                <div
                  className="w-full bg-stone-50 dark:bg-stone-900 rounded-xl p-3 border border-stone-200 dark:border-stone-800 flex items-center justify-center overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: visionAnalysis.svgSchematic }}
                />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4 Action Instruction Chips */}
      <div className="px-4 py-2 bg-stone-100/80 dark:bg-stone-950/70 border-t border-stone-200 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-[10px] font-bold text-stone-500 whitespace-nowrap ml-1">
          أوامر الصقر:
        </span>
        {actionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={isSending}
            onClick={() => handleSendMessage('', chip)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-stone-300/70 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Prompt Input Field */}
      <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="رفع صورة موديل لتحليلها"
          className="p-2.5 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`اسأل صقر الشمساوية AI عن أي استفسار أو اطلب تفاصيل التسعير...`}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          type="button"
          disabled={isSending || (!inputPrompt.trim() && !imagePreview)}
          onClick={() => handleSendMessage()}
          className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4 transform rotate-180" />
        </button>
      </div>
    </div>
  );
};
