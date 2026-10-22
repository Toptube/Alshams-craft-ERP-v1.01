import { auth } from './firebase';

/**
 * دالة استدعاء مشتركة للمسارات الخلفية /api/*
 * تُضيف ترويسة Authorization: Bearer <ID_TOKEN> تلقائياً
 * عند الرد 401، تجدد الرمز فورياً بـ getIdToken(true) وتعيد المحاولة لمرة واحدة فقط
 * إذا لم يكن هناك مستخدم مسجل ترفض الطلب برسالة "سجّل دخولك الأول"
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('سجّل دخولك الأول');
  }

  let token = await currentUser.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // إذا كانت الاستجابة 401، نجدد الرمز ونجرب مرة واحدة إضافية
  if (response.status === 401) {
    try {
      token = await currentUser.getIdToken(true);
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${token}`);
      response = await fetch(input, {
        ...init,
        headers: retryHeaders,
      });
    } catch (refreshErr) {
      console.error('[authedFetch] Failed to force-refresh ID token on 401:', refreshErr);
    }
  }

  return response;
}
