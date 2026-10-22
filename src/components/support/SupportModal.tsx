import React, { useState } from 'react';
import { UserProfile } from '../../types';
import {
  HelpCircle,
  X,
  MessageCircle,
  Send,
  Phone,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Mail,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  if (!isOpen) return null;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'support' | 'complaint' | 'suggestion'>('support');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Simulate sending support request
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject('');
      setMessage('');
      onClose();
    }, 2500);
  };

  const handleWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `السلام عليكم، أنا الفنان ${profile.artistName} صاحب براند (${profile.brandName}). أحتاج لمساعدة ودعم في نظام الشمس كرافت ERP.`
    );
    window.open(`https://wa.me/201090000000?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 flex flex-col overflow-hidden text-right">
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
              الدعم الفني والشكاوى
            </h2>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-800 dark:text-stone-200">
                تم استلام رسالتك بنجاح!
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                فريق دعم الشمس كرافت سيقوم بالرد عليك ومتابعة طلبك يا فنان في أقرب وقت.
              </p>
            </div>
          ) : (
            <>
              {/* WhatsApp Fast Contact Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                    محادثة فورية عبر واتساب
                  </h4>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                    تواصل مباشر مع فريق الدعم الفني للورشة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWhatsAppSupport}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer flex-shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تواصل واتساب</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    نوع الرسالة
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('support')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        type === 'support'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      طلب مساعدة
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('complaint')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        type === 'complaint'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      تسجيل شكوى
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('suggestion')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                        type === 'suggestion'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      اقتراح وتطوير
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    موضوع الرسالة
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="مثال: مشكلة في حساب التكلفة أو استفسار عن ميزة..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    تفاصيل الشكوى أو المساعدة
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اشرح المشكلة بالتفصيل لنتمكن من مساعدتك بأسرع ما يمكن يا فنان..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال الرسالة</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
