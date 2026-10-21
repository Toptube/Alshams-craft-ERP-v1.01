import { auth } from './firebase';

/**
 * الحصول على رمز مصادقة المستخدم الحالي مع إمكانية التحديث الإجباري
 */
export async function getCurrentUserIdToken(forceRefresh = false): Promise<string | null> {
  let user = auth.currentUser;
  if (!user) {
    // انتظار قصير في حال لم تكتمل تهيئة onAuthStateChanged بعد
    await new Promise((resolve) => setTimeout(resolve, 400));
    user = auth.currentUser;
  }
  if (!user) return null;
  return await user.getIdToken(forceRefresh);
}

/**
 * دالة جلب موحدة ومحمية لجميع طلبات /api/*
 * تُرفق تلقائياً ترويسة Authorization: Bearer <رمز_المستخدم>
 * وعند استقبال 401 تجدد الرمز بـ getIdToken(true) وتعيد المحاولة مرة واحدة فقط
 */
export async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getCurrentUserIdToken(false);
  if (!token) {
    throw new Error('سجّل دخولك الأول للوصول إلى خدمات المساعد الذكي صقر الشمساوية.');
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(url, {
    ...init,
    headers,
  });

  // إذا كانت النتيجة 401، نحاول تجديد الرمز وإعادة المحاولة لمرة واحدة فقط
  if (res.status === 401 && auth.currentUser) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken(true);
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      res = await fetch(url, {
        ...init,
        headers,
      });
    } catch (refreshErr) {
      console.error('Failed to refresh Firebase ID token on 401 retry:', refreshErr);
    }
  }

  return res;
}
