import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';

// Import the auto-provisioned Firebase config
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId,
};

// Singleton App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth with Google Provider & Browser Local Persistence
export const auth = getAuth(app);

const ensureLocalPersistence = async (): Promise<void> => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn('browserLocalPersistence initialization notice:', err);
  }
};
ensureLocalPersistence();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore with offline persistence (persistentLocalCache) across multiple tabs
let dbInstance: Firestore;
try {
  // Use custom database ID if provisioned, else default
  const databaseId = (config as any).firestoreDatabaseId || '(default)';
  dbInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    databaseId === '(default)' ? undefined : databaseId
  );
} catch (e) {
  // Fallback to getFirestore if already initialized
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// Validate Firestore connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

/**
 * خريطة رسائل أخطاء المصادقة باللغة العربية البسيطة
 */
export function getArabicAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل بالفعل في المنصة، يرجى تسجيل الدخول مباشرة أو استعادة كلمة المرور.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة، تأكد من كتابته مثل (name@example.com).';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني، يرجى التسجيل أولاً.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور.';
    case 'auth/weak-password':
      return 'كلمة المرور قصيرة أو ضعيفة، يجب أن تحتوي على 6 أحرف أو أرقام على الأقل.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة الدخول بحساب Google قبل اكتمال العملية.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بخوادم السحابة، يرجى التحقق من اتصال الإنترنت.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً لتكرار المحاولة، يرجى الانتظار دقيقة والمحاولة مجدداً.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب، يرجى التواصل مع إدارة المنصة.';
    default:
      return error?.message || 'حدث خطأ أثناء المصادقة، يرجى المحاولة لاحقاً.';
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  ensureLocalPersistence,
};
export type { User };
