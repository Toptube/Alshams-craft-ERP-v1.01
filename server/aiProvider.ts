import { GoogleGenAI } from '@google/genai';

export interface AIProviderOptions {
  apiKey?: string;
  model?: string;
}

export interface AIVisionPromptInput {
  imageBase64: string;
  mimeType: string;
  artistNotes?: string;
  activeCrafts?: string[];
}

export interface AIChatPromptInput {
  message: string;
  actionChip?: string | null;
  chatHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  currentContext: Record<string, any>;
}

export class GeminiAIProvider {
  private ai: GoogleGenAI | null = null;
  private defaultModel: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.defaultModel =
      process.env.GEMINI_MODEL && process.env.GEMINI_MODEL !== 'gemini-2.5-flash'
        ? process.env.GEMINI_MODEL
        : 'gemini-3.8-flash';

    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  isAvailable(): boolean {
    return Boolean(this.ai && process.env.GEMINI_API_KEY);
  }

  /**
   * استدعاء الرؤية الحاسوبية لتحليل صور الحِرف اليدوية واستخراج الباترون والتسعير
   */
  async analyzeCraftVision(input: AIVisionPromptInput): Promise<any> {
    if (!this.ai) {
      throw new Error('مفتاح GEMINI_API_KEY غير مضبوط على الخادم');
    }

       const { imageBase64, mimeType, artistNotes } = input;
    const activeCrafts = Array.isArray(input.activeCrafts) ? input.activeCrafts : [];

    // Normalize base64 string
    let cleanBase64 = imageBase64;
    let resolvedMimeType = mimeType || 'image/jpeg';
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      resolvedMimeType = dataUrlMatch[1].trim();
      cleanBase64 = dataUrlMatch[2].trim();
    } else {
      cleanBase64 = imageBase64.replace(/^data:[^,]+,/, '').trim();
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    const craftsContextText =
      activeCrafts.length > 0
        ? `الحِرف اليدوية المفعّلة في ورشة الحرفي حالياً: [${activeCrafts.join('، ')}].`
        : '';

    const promptText = `أنت "صقر الشمساوية AI" - الخبير الهندسي والحسابي الأول لتسعير وتصنيع المكرمية والمشغولات اليدوية بمنصة الشمس كرافت.
${craftsContextText}
قم بتحليل صورة قطعة المشغولات اليدوية هذه بدقة هندسية عالية جداً:
1. حدد التصنيف بدقة من هذه القائمة الحصرية فقط:
["رانر", "ستائر", "سجاد", "كوشن", "جدارية", "بوف", "كرسي", "أرجوحة", "نجف وإضاءة", "شنطة أو كلاتش"]
مثال: إذا كانت نجفة أو ثريا أو غطاء مصباح اختر "نجف وإضاءة". إذا كانت ستارة اختر "ستائر". إذا كانت كوشن اختر "كوشن". إذا كانت شنطة اختر "شنطة أو كلاتش". إذا كانت بوف اختر "بوف".

2. قدر عدد ساعات العمل اليدوي الصافي (estimatedHours) كرقم عشري مثلا 4.5 أو 7.0.
3. قدر الأبعاد المقترحة المناسبة (العرض بالسنتيمتر، الطول الكلي بالسنتيمتر، طول الشراشيب بالسنتيمتر، سمك الخيط بالملليمتر 3 أو 4 أو 5 مم). وإذا كان مجسماً مثل نجف أو بوف حدد إذا كان مستدير أو اسطواني.
4. قدر تسعير السوق للمنتج المشابه (أقل سعر في السوق بالعملة المحلية، السعر المتوسط، أعلى سعر في السوق).
5. اكتب دليل خطوات التنفيذ خطوة بخطوة باللغة العربية.
6. اذكر قائمة بأسماء العقد أو التقنيات المستخدمة بالتفصيل.
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
  "productionGuide": ["string", "string"],
  "stitchPatterns": ["string", "string"],
  "svgSchematic": "<svg ...</svg>",
  "notesForCalculator": "string"
}`;

    const parts = [
      {
        inlineData: {
          mimeType: resolvedMimeType,
          data: cleanBase64,
        },
      },
      { text: promptText + (artistNotes ? `\nملاحظات إضافية من الفنان: ${artistNotes}` : '') },
    ];

    let response;
    try {
      response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: { parts },
      });
    } catch (primaryError: any) {
      console.warn(
        `Primary model ${this.defaultModel} failed, retrying with gemini-3.8-flash:`,
        primaryError?.message
      );
      response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
      });
    }

    const responseText = response.text || '';
    const cleanJsonText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const jsonMatch = cleanJsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`تعذر استخراج بيانات JSON صالحة من النموذج: ${responseText.slice(0, 100)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const hours = Number(parsed.estimatedHours) || 5;
    parsed.estimatedLaborWage = Math.round(hours * 30);
    return parsed;
  }

  /**
   * استدعاء الدردشة مع مستشار صقر الشمساوية الذكي
   */
  async chatWithAgent(input: AIChatPromptInput): Promise<string> {
    if (!this.ai) {
      throw new Error('مفتاح GEMINI_API_KEY غير مضبوط على الخادم');
    }

    const { message, actionChip, chatHistory, currentContext } = input;

    const systemInstruction = `أنت "صقر الشمساوية AI" - المستشار الذكي والرفيق الفني لمنصة الشمس كرافت الحرفية (AlSHams Craft ERP).
تحدث باللغة العربية بأسلوب راقٍ، مهني، دافئ، ومشجع للحرفيين وأصحاب البراندات الفنية.
احرص على الدقة الرياضية في حسابات المشغولات، الخامات، كلفة الوقت، وتفادي هدر الخامات.
احرص على ألا تذكر مطلقاً أي نماذج أو مصطلحات تقنية داخلية مثل "Gemini" أو أرقام إصدارات.
عندما يسألك المستخدم عن:
1. "التسعير العادل جملة وقطاعي": اشرح معادلة الشمس كرافت (عزل الربح على الخامات + أجر المصنعية + التكاليف الإدارية والتغليف)، وقدم اقتراح سعر الجملة (خصم 20-30% على هامش الربح فقط).
2. "مقارنة المنتج بالأسواق": وضح متوسطات السوق المحلي والخليجي لنفس القطعة وحجم التنافسية وجودة التشطيب.
3. "توليد باترون مفصل وطريقة العمل": رتب خطوات العمل من عقدة البداية إلى الفنش والشراشيب بدقة.
4. "توقع الأبعاد والتكلفة والمصنعية": احسب عدد الفتلات بدقة مضاعفات الـ 4، وأطوال القص، والوزن التقديري.

سياق الورشة والحرفي الحالي:
${JSON.stringify(currentContext, null, 2)}`;

       const mappedHistory = (Array.isArray(chatHistory) ? chatHistory : [])
      .map((m: any) => ({
        role: m.role === 'model' || m.sender === 'falcon' ? 'model' : 'user',
        parts: m.parts ?? [{ text: String(m.text ?? '') }],
      }))
      .filter((m: any) => m.parts?.[0]?.text);
    while (mappedHistory.length && mappedHistory[0].role === 'model') mappedHistory.shift();
    const contents: any[] = [...mappedHistory];
    contents.push({
      role: 'user',
      parts: [
        {
          text: actionChip
            ? `الاستفسار السريع حول [${actionChip}]: ${message || 'يرجى تقديم التوجيه الفني المتخصص.'}`
            : message,
        },
      ],
    });

    let response;
    try {
      response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
      });
    } catch (primaryErr: any) {
      console.warn(`Primary model failed, retrying with gemini-3.8-flash:`, primaryErr?.message);
      response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
      });
    }

    return response.text || 'لم يتم استلام رد من المستشار الذكي.';
  }
}

export const aiProvider = new GeminiAIProvider();
