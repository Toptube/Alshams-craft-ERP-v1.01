/**
 * نظام الصوتيات الخفيفة لمنظومة الشمس كرافت ERP
 * مولد نغمات برمجي بالكامل باستخدام Web Audio API (بدون أي ملفات صوتية خارجية)
 * يدعم قيود المتصفحات لتشغيل الصوت فقط بعد أول تفاعل للمستخدم مع تحكم كامل بالصوت من الإعدادات.
 */

// Global AudioContext singleton
let audioCtx: AudioContext | null = null;
let hasUserInteracted = false;

// Audio Preference Key in localStorage
const SOUND_ENABLED_KEY = 'alshams_sound_enabled';

/**
 * فحص هل الصوت مفعل في إعدادات المستخدم
 */
export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_ENABLED_KEY);
    // المفتاح افتراضياً مفعل إذا لم يتم تعطيله صراحةً
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * تفعيل أو كتم الصوت وحفظ الاختيار في localStorage
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Could not save sound preference to localStorage:', err);
  }
}

/**
 * تبديل حالة الصوت بين التشغيل والكتم
 */
export function toggleSound(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    // تشغيل نغمة خفيفة لتأكيد التفعيل
    playSuccessSound();
  }
  return next;
}

/**
 * تسجيل أول تفاعل للمستخدم لفتح سياق الصوت (AudioContext) وفق سياسات الأمان بالمتصفحات
 */
function initUserInteractionListener() {
  if (typeof window === 'undefined') return;

  const handleFirstInteraction = () => {
    hasUserInteracted = true;
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // إزالة المستمعات بعد أول لمسة أو ضغطة
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };

  window.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
}

// تهيئة المستمع عند تحميل الملف في بيئة المتصفح
if (typeof window !== 'undefined') {
  initUserInteractionListener();
}

/**
 * الحصول على سياق الصوت وضمان استئنافه بأمان
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  // منع التشغيل الصوتي قبل أول تفاعل للمستخدم
  if (!hasUserInteracted) return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch (err) {
    console.warn('AudioContext not supported or blocked:', err);
    return null;
  }
}

/**
 * دالة مساعدة لتشغيل نغمة جيبية/مثلثية دافئة بمغلف صوتي هادئ
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number = 0.08,
  type: OscillatorType = 'sine'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // هجوم ناعم وتلاشي أسي طبيعي (Attack & Exponential Decay)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    // كتم الأخطاء لضمان عدم تعطل التطبيق
  }
}

/**
 * 1. صوت الترحيب (Welcome Sound):
 * نغمة تصاعدية ثلاثية دافئة ومبهجة (C5 - E5 - G5) ترافق رسالتي الترحيب بالورشة والعودة
 */
export function playWelcomeSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // النغمات المتصاعدة الثلاثية (523.25Hz -> 659.25Hz -> 783.99Hz)
  playTone(ctx, 523.25, now + 0.00, 0.28, 0.07, 'sine');
  playTone(ctx, 659.25, now + 0.12, 0.32, 0.08, 'sine');
  playTone(ctx, 783.99, now + 0.25, 0.45, 0.09, 'triangle');
}

/**
 * 2. صوت التنبيه (Alert / Notification Sound):
 * رنين مزدوج هادئ ورشيق لتنبيهات المخزن والإشعارات
 */
export function playAlertSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // نغمتين متتاليتين (880Hz -> 1046.5Hz) بنعومة
  playTone(ctx, 880, now + 0.00, 0.15, 0.06, 'sine');
  playTone(ctx, 1046.5, now + 0.09, 0.25, 0.08, 'sine');
}

/**
 * 3. صوت النجاح (Success Sound):
 * نغمة إيجابية واضحة ومريحة تُعزف عند إتمام حفظ المنتج أو الفاتورة أو الإعدادات
 */
export function playSuccessSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // وتر نجاح مكون من نغمتين هارمونيتين متتاليتين (587.33Hz [D5] ثم 880Hz [A5])
  playTone(ctx, 587.33, now + 0.00, 0.18, 0.07, 'triangle');
  playTone(ctx, 880.00, now + 0.10, 0.35, 0.09, 'sine');
}

/**
 * 4. صوت الخطأ (Error Sound):
 * نغمة مزدوجة منخفضة ولطيفة غير مزعجة عند فشل إدخال أو حقل إجباري
 */
export function playErrorSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 240, now + 0.00, 0.12, 0.08, 'sine');
  playTone(ctx, 190, now + 0.10, 0.20, 0.07, 'sine');
}

/**
 * 5. صوت تقليب الصفحة / التنقل (Page Flip / Navigation Sound):
 * صوت نقرة ورقية ناعمة وخفيفة جداً تُمثل تقليب الصفحة وترافق التنقل بين الأقسام والشاشات
 */
export function playPageFlipSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // انزلاق ترددي سريع يحاكي ملمس تقليب الورق
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch (err) {
    // كتم الأخطاء
  }
}
