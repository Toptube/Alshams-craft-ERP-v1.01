import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { aiProvider } from './server/aiProvider';

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Firebase Admin SDK for backend ID token authentication
if (getApps().length === 0) {
  try {
    initializeApp({
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
    console.error(`[AUTH 401] Missing or invalid Authorization header on ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'غير مصرح بالدخول (401)، يرجى تسجيل الدخول إلى ورشتك أولاً.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    console.error(`[AUTH 401] Empty Bearer token provided on ${req.method} ${req.path}`);
    return res.status(401).json({
      error: 'غير مصرح بالدخول (401)، رمز المصادقة فارغ.',
    });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    console.error(`[AUTH 401] Firebase ID token verification failed on ${req.method} ${req.path}:`, {
      code: err?.code,
      message: err?.message,
    });
    return res.status(401).json({
      error: 'انتهت صلاحية جلسة الدخول أو الرمز غير صالح، يرجى إعادة تسجيل الدخول.',
      detail: err?.message,
    });
  }
}

// 0. AI Usage Remaining Endpoint
app.get('/api/ai/usage', requireFirebaseAuth, (req: Request, res: Response) => {
  const uid = (req as any).user?.uid;
  const today = new Date().toISOString().split('T')[0];
  const record = userDailyAiUsage.get(uid);
  const used = (!record || record.date !== today) ? 0 : record.count;
  const remaining = Math.max(0, 20 - used);
  return res.json({ used, remaining, limit: 20 });
});

// 1. Vision Analysis API - "صقر الشمساوية AI"
const handleVisionAnalysis = async (req: Request, res: Response) => {
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
      return res.status(503).json({ error: 'خدمة الذكاء الاصطناعي غير مفعّلة حالياً أو مفتاح API غير متوفر على السيرفر' });
    }

    const parsedData = await aiProvider.analyzeCraftVision({
      imageBase64,
      mimeType,
      artistNotes,
      activeCrafts: Array.isArray(activeCrafts) ? activeCrafts : [],
    });

    return res.json({
      ...parsedData,
      dailyAiRemaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return res.status(502).json({
      error: 'تعذر التحليل، يرجى المحاولة مرة أخرى.',
      detail: error?.message || String(error),
    });
  }
};

app.post('/api/analyze-vision', requireFirebaseAuth, handleVisionAnalysis);
app.post('/api/ai/analyze-image', requireFirebaseAuth, handleVisionAnalysis);

// 2. Chat Agent API - "صقر الشمساوية AI"
const handleChatAgent = async (req: Request, res: Response) => {
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
      return res.status(503).json({ error: 'خدمة الذكاء الاصطناعي غير مفعّلة حالياً أو مفتاح API غير متوفر على السيرفر' });
    }

    const result = await aiProvider.chatWithAgent({
      message,
      actionChip,
      chatHistory,
      currentContext,
    });

    const reply = typeof result === 'string' ? result : result.reply;
    const sources = typeof result === 'object' && result.sources ? result.sources : [];

    return res.json({
      reply,
      sources,
      dailyAiRemaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Chat Agent error:', error);
    return res.status(502).json({
      error: 'تعذر الاتصال بمساعد الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.',
      detail: error?.message || String(error),
    });
  }
};

app.post('/api/chat-agent', requireFirebaseAuth, handleChatAgent);
app.post('/api/ai/chat', requireFirebaseAuth, handleChatAgent);

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
