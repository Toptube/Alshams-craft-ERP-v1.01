import React, { useState } from 'react';
import { SavedProductRecord, UserProfile } from '../../types';
import { getGenderArtistTitle } from '../../utils/macrameMath';
import { X, Copy, Check, Share2, Send, Sparkles, Truck, Gift, DollarSign } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';

interface WhatsAppQuoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: SavedProductRecord | null;
  profile: UserProfile;
}

export const WhatsAppQuoteDrawer: React.FC<WhatsAppQuoteDrawerProps> = ({
  isOpen,
  onClose,
  record,
  profile,
}) => {
  if (!isOpen || !record) return null;

  const [shippingCost, setShippingCost] = useState<number>(record.output.transitFees || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [clientPhone, setClientPhone] = useState<string>('');

  const artistTitle = getGenderArtistTitle(profile.gender);
  const baseProductPrice = record.output.finalSellingPrice;
  const shippingNum = Number(shippingCost) || 0;
  const discountNum = Number(discountAmount) || 0;
  const finalTotalWithShippingAndDiscount = Math.max(0, baseProductPrice + shippingNum - discountNum);

  // Formulate the exquisite WhatsApp Payload
  const generatePayloadText = () => {
    let payload = `🌹 يتشرف ${artistTitle} ${profile.artistName} من براند ${profile.brandName} بالتعامل معكم الدائم! ✨\n`;
    payload += `إليكم تفاصيل عرض السعر للمنتج المبتكر [${record.productName}] بعناية فائقة:\n\n`;
    payload += `📐 سعر المنتج: ${baseProductPrice} ${profile.currencySymbol}\n`;

    // Strictly hide lines if 0
    if (shippingNum > 0) {
      payload += `🚚 مصاريف الشحن: ${shippingNum} ${profile.currencySymbol}\n`;
    }

    if (discountNum > 0) {
      payload += `🎁 خصم خاص لعيونكم: ${discountNum} ${profile.currencySymbol}\n`;
    }

    payload += `💰 الإجمالي النهائي: ${finalTotalWithShippingAndDiscount} ${profile.currencySymbol}\n\n`;
    payload += `نشكركم على ثقتكم الغالية بنا ويسعدنا دائماً تزيين منازلكم بلمساتنا الفنية الحرفية! ❤️\n\n`;
    payload += `powered by AL-SHAMS CRAFT`;

    return payload;
  };

  const payloadText = generatePayloadText();

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectWhatsApp = () => {
    const encoded = encodeURIComponent(payloadText);
    const cleanPhone = clientPhone.replace(/\D/g, '');
    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (cleanPhone) {
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 p-5 sm:p-6 relative text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>مراجعة عرض السعر للعميل (WhatsApp Drawer)</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              صياغة أنيقة موثقة بشعار البراند ومحسوبة بالعملة الرسمية
            </p>
          </div>
        </div>

        {/* Inputs for Shipping & Discount */}
        <div className="mt-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-stone-500" />
                <span>تكلفة الشحن ({profile.currencySymbol})</span>
              </label>
              <NumberInput
                min={0}
                value={shippingCost}
                onChange={setShippingCost}
                placeholder="0 إذا لم يوجد شحن"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
              />
              <span className="text-[10px] text-stone-400">تختفي من الرسالة إذا كانت 0</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-stone-500" />
                <span>قيمة الخصم للعميل ({profile.currencySymbol})</span>
              </label>
              <NumberInput
                min={0}
                value={discountAmount}
                onChange={setDiscountAmount}
                placeholder="0 إذا لم يوجد خصم"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
              />
              <span className="text-[10px] text-stone-400">تختفي من الرسالة إذا كانت 0</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              رقم واتساب العميل (اختياري للفتح المباشر للمحادثة):
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="مثال: 201012345678 مع كود الدولة"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-xs outline-none text-left"
              dir="ltr"
            />
          </div>
        </div>

        {/* Formulated Message Preview Box */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-mono text-stone-400">
              PAYLOAD PREVIEW (النسخة النهائية للعميل)
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              معاينة نص الرسالة الحرفية
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap select-all">
            {payloadText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">تم النسخ بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ النص فقط</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDirectWhatsApp}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 transform rotate-180" />
            <span>إرسال عبر واتساب الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
