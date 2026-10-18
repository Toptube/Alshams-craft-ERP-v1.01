import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { aiProvider } from './server/aiProvider';
import firebaseConfig from './firebase-applet-config.json';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Firebase Admin SDK for backend ID token authentication
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

// In-memory daily rate limit tracker: 20 requests per UID per calendar day
interface UserRateLimitRecord {
  date: string;
  count: number;
}
const userDailyAiUsage = new Map<string, UserRateLimitRecord>();

function checkAndIncrementAiRateLimit(uid: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0];
  const record = userDailyAiUsage.get(uid);

  if (!record || record.date !== today) {
    userDailyAiUsage.set(uid, { date: today, count: 1 });
    return { allowed: true, remaining: 19 };
  }

  if (record.count >= 20) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: 20 - record.count };
}

// Request size limits for craft image payloads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check Endpoint (Required by AI Studio runtime)
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Authenticate /api/* requests with Firebase ID Token
async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'غير مصرح بالدخول (401)، يرجى تسجيل الدخول إلى ورشتك أولاً.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    console.error('Firebase ID token verification failed:', err?.message || err);
    return res.status(401).json({
      error: 'انتهت صلاحية جلسة الدخول أو الرمز غير صالح، يرجى إعادة تسجيل الدخول.',
      detail: err?.message,
    });
  }
}

// 1. Vision Analysis API - "صقر الشمساوية AI"
app.post('/api/analyze-vision', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    const rateCheck = checkAndIncrementAiRateLimit(uid);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'تجاوزت الحد اليومي الأقصى (20 استشارة في اليوم) للمساعد الذكي. يتجدد رصيدك تلقائياً غداً.',
      });
    }

    const { imageBase64, mimeType = 'image/jpeg', artistNotes = '', activeCrafts = [] } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    if (!aiProvider.isAvailable()) {
      return res.status(503).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
    }

    const parsedData = await aiProvider.analyzeCraftVision({
      imageBase64,
      mimeType,
      artistNotes,
      activeCrafts,
    });

    return res.json({
      ...parsedData,
      dailyAiRemaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return res.status(502).json({
      error: 'فشل استدعاء نموذج الذكاء الاصطناعي',
      detail: error?.message || String(error),
    });
  }
});

// 2. Chat Agent API - "صقر الشمساوية AI"
app.post('/api/chat-agent', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    const rateCheck = checkAndIncrementAiRateLimit(uid);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'تجاوزت الحد اليومي الأقصى (20 استشارة في اليوم) للمساعد الذكي. يتجدد رصيدك تلقائياً غداً.',
      });
    }

    const { message, chatHistory = [], actionChip = null, currentContext = {} } = req.body;

    if (!aiProvider.isAvailable()) {
      return res.status(503).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
    }

    const reply = await aiProvider.chatWithAgent({
      message,
      actionChip,
      chatHistory,
      currentContext,
    });

    return res.json({
      reply,
      dailyAiRemaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Chat Agent error:', error);
    return res.status(502).json({
      error: 'فشل استدعاء مساعد الذكاء الاصطناعي',
      detail: error?.message || String(error),
    });
  }
});

// Start Server Engine
async function startServer() {
  const distIndex = path.join(process.cwd(), 'dist', 'index.html');
  const useBuilt = process.env.NODE_ENV === 'production' || fs.existsSync(distIndex);

  if (useBuilt && fs.existsSync(distIndex)) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(distIndex));
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlSHams Craft ERP running on port ${PORT}`);
  });
}

startServer();
