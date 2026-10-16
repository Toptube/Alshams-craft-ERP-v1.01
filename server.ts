import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Increase payload limit for base64 craft images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize GoogleGenAI SDK safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Vision Analysis API - "صقر الشمساوية AI"
app.post('/api/analyze-vision', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', artistNotes = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.status(503).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `أنت "صقر الشمساوية AI" - الخبير الهندسي والحسابي الأول لتسعير وتصنيع المكرمية والمشغولات اليدوية بمنصة الشمس كرافت.
قم بتحليل صورة قطعة المكرمية أو العمل اليدوي هذه بدقة هندسية عالية جداً:
1. حدد التصنيف بدقة من هذه القائمة الحصرية فقط:
["رانر", "ستائر", "سجاد", "كوشن", "جدارية", "بوف", "كرسي", "أرجوحة", "نجف وإضاءة", "شنطة أو كلاتش"]
مثال: إذا كانت نجفة أو ثريا أو غطاء مصباح اختر "نجف وإضاءة". إذا كانت ستارة اختر "ستائر". إذا كانت كوشن اختر "كوشن". إذا كانت شنطة اختر "شنطة أو كلاتش". إذا كانت بوف اختر "بوف".

2. قدر عدد ساعات العمل اليدوي الصافي (estimatedHours) كرقم عشري مثلا 4.5 أو 7.0.
3. قدر الأبعاد المقترحة المناسبة (العرض بالسنتيمتر، الطول الكلي بالسنتيمتر، طول الشراشيب بالسنتيمتر، سمك الخيط بالملليمتر 3 أو 4 أو 5 مم). وإذا كان مجسماً مثل نجف أو بوف حدد إذا كان مستدير أو اسطواني.
4. قدر تسعير السوق للمنتج المشابه (أقل سعر في السوق بالجنيه المصري، السعر المتوسط، أعلى سعر في السوق).
5. اكتب دليل خطوات التنفيذ خطوة بخطوة باللغة العربية.
6. اذكر قائمة بأسماء العقد والغرز المستخدمة بالتفصيل.
7. قم بإنشاء كود رسم بياني تخطيطي لباترون الشغل بصيغة SVG نظيفة ومباشرة (<svg viewBox="0 0 300 200" ...>...).
8. لخص ملاحظات هندسية للحرفي ليتم نقلها لحاسبة الإنتاج.

أخرج الإجابة فقط بتنسيق JSON نظيف وبدون أي نصوص قبله أو بعده:
{
  "detectedCategory": "string",
  "estimatedHours": number,
  "suggestedDimensions": {
    "width": number,
    "totalLength": number,
    "fringeLength": number,
    "cordThickness": number,
    "shape": "flat" | "circle" | "cylinder" | "square"
  },
  "competitionPricing": {
    "minMarketPrice": number,
    "avgMarketPrice": number,
    "maxMarketPrice": number
  },
  "productionGuide": ["string", "string", ...],
  "stitchPatterns": ["string", "string", ...],
  "svgSchematic": "<svg ...</svg>",
  "notesForCalculator": "string"
}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText + (artistNotes ? `\nملاحظات إضافية من الفنان: ${artistNotes}` : '') },
        ],
      },
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Enforce labor wage calculation internally: estimatedHours * 30 EGP without exposing the raw multiplier 30
      const hours = Number(parsed.estimatedHours) || 5;
      parsed.estimatedLaborWage = Math.round(hours * 30);
      return res.json(parsed);
    }

    return res.status(500).json({ error: 'Failed to parse AI output', raw: responseText });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return res.status(502).json({
      error: 'فشل استدعاء نموذج الذكاء الاصطناعي',
      detail: error?.message || String(error),
    });
  }
});

// Chat Agent API - "صقر الشمساوية AI"
app.post('/api/chat-agent', async (req: Request, res: Response) => {
  try {
    const { message, chatHistory = [], actionChip = null, currentContext = {} } = req.body;

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.status(503).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
    }

    const systemInstruction = `أنت "صقر الشمساوية AI" - المستشار الذكي والرفيق الفني لمنصة الشمس كرافت الحرفية (AlSHams Craft ERP).
تحدث باللغة العربية بأسلوب راقٍ، مهني، دافئ، ومشجع للحرفيين وأصحاب البراندات الفنية.
احرص على الدقة الرياضية في حسابات خيوط المكرمية، استهلاك الجرامات، كلفة الوقت، وتفادي هدر الخامات.
احرص على ألا تذكر مطلقاً أي نماذج أو مصطلحات تقنية داخلية مثل "Gemini" أو أرقام إصدارات.
عندما يسألك المستخدم عن:
1. "التسعير العادل جملة وقطاعي": اشرح معادلة الشمس كرافت (عزل الربح على الخامات + أجر المصنعية + التكاليف الإدارية والتغليف)، وقدم اقتراح سعر الجملة (خصم 20-30% على هامش الربح فقط).
2. "مقارنة المنتج بالأسواق": وضح متوسطات السوق المصري والخليجي لنفس القطعة وحجم التنافسية وجودة التشطيب.
3. "توليد باترون مفصل وطريقة العمل": رتب خطوات العمل من عقدة التثبيت إلى الفنش والشراشيب مع توزيع العقد بدقة.
4. "توقع الأبعاد والتكلفة والمصنعية": احسب عدد الفتلات بدقة مضاعفات الـ 4، وأطوال القص، والوزن التقديري بالكيلو.

سياق الحرفي الحالي:
${JSON.stringify(currentContext, null, 2)}`;

    const formattedHistory = chatHistory.map((item: any) => ({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }],
    }));

    formattedHistory.push({
      role: 'user',
      parts: [
        {
          text: actionChip
            ? `[طلب تنفيذ مسار: ${actionChip}]\n${message || 'يرجى تقديم التوجيه والتحليل الفوري.'}`
            : message,
        },
      ],
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text || 'عذراً، تعذر توليد الرد حالياً.' });
  } catch (error: any) {
    console.error('Chat agent error:', error);
    return res.status(502).json({
      error: 'فشل استدعاء نموذج الذكاء الاصطناعي',
      detail: error?.message || String(error),
    });
  }
});

// Health check endpoint
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Start server with hybrid dist/vite SPA serving and allowedHosts: true
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
