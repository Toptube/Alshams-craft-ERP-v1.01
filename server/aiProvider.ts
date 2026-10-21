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

export interface AIChatResult {
  reply: string;
  sources?: Array<{ title: string; url: string }>;
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
   * استدعاء الرؤية الحاسوبية لتحليل صور الحِرف اليدوية واستخراج الباترون والتسعير مع بحث السوق
   */
  async analyzeCraftVision(input: AIVisionPromptInput): Promise<any> {
    if (!this.ai) {
      throw new Error('مفتاح GEMINI_API_KEY غير مضبوط على الخادم');
    }

    const { imageBase64, mimeType, artistNotes } = input;
    const activeCrafts = Array.isArray(input.activeCrafts)
      ? input.activeCrafts
      : [input.activeCrafts].filter(Boolean);

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
4. ابحث في أسعار السوق الواقعية لمنتجات هاند ميد مشابهة في المتاجر المحلية، وحدد (أقل سعر، السعر المتوسط، أعلى سعر بالعملة المحلية).
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
      // First attempt with Google Search grounding
      response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: { parts },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchError: any) {
      console.warn('Vision analysis with googleSearch failed, retrying without search tools:', searchError?.message);
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
   * استدعاء الدردشة التفاعلية مع مستشار صقر الشمساوية الذكي
   */
  async chatWithAgent(input: AIChatPromptInput): Promise<AIChatResult> {
    if (!this.ai) {
      throw new Error('مفتاح GEMINI_API_KEY غير مضبوط على الخادم');
    }

    const { message, actionChip, chatHistory, currentContext } = input;
    const currency = currentContext?.currency || 'جنيه';

    const systemInstruction = `أنت "صقر الشمساوية AI" - المستشار الذكي والرفيق الفني لمنصة الشمس كرافت الحرفية (AlSHams Craft ERP).
أنت مستشار حرفي وهندسي خبير في الصناعات والمهارات والفنون اليدوية (المكرمية، الكروشيه، التطريز، الرزن، الخزف والصلصال، الأخشاب، إكسسوارات الهاند ميد).

القواعد المهنية الصارمة:
1. الإجابة المباشرة أولاً: ابدأ ردك مباشرة وبشكل منطقي ومحدد بالإجابة عن سؤال المستخدم الفعلي، بلا مقدمات إنشائية مكررة أو إعادة صياغة للسؤال.
2. التفاعل الموضوعي الحرفي: تفاعل مع الحرفي كخبير أمين، وناقشه بموضوعية وبحث متقن مبني على أصول الصنعة ودراسة السوق الحقيقية.
3. الاعتماد على سياق الورشة: اعتمد على بيانات الورشة المرفقة (اسم الورشة، العملة [${currency}]، الحرفة، الخامات المسجلة وأسعارها، ومصنعية اليد).
4. الأمانة والشفافية وعدم اختراع الأرقام:
   - لا تخترع أسعاراً أو أرقاماً غير مؤكدة من وحي الخيال.
   - إذا استعنت ببحث السوق فاذكر الأسعار المرجعية الحقيقية.
   - إذا كان الرقم تقديراً بدون مصدر محدد، اذكر صراحة: "هذا السعر هو تقدير تقريبي من صقر الشمساويه لمساعدتك في ايجاد السعر المناسب".
   - إذا نقصت معلومة أساسية لإكمال الإجابة بدقة، أجب عن المتاح واسأل سؤالاً توضيحياً واحداً محدداً ومباشراً في نهاية الرد.
5. البساطة والاختصار مع الدقة: قدم نتائج واضحة، مبسطة، ومختصرة بخطوات عملية يسهل على الحرفي تطبيقها فوراً في ورشته.
6. اللغة والخصوصية: تحدث باللغة العربية الراقية والودودة دون ذكر أي مصطلحات برمجية أو تقنية داخلية مثل "Gemini" أو أسماء نماذج أو أكواد.

سياق ورشة الحرفي الحالي:
${JSON.stringify(currentContext, null, 2)}`;

    // تحويل سجل المحادثة واستخراج النصوص الصالحة
    const rawHistory = Array.isArray(chatHistory) ? chatHistory : [];
    const mappedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const m of (rawHistory as any[])) {
      const role: 'user' | 'model' =
        m.role === 'model' || m.sender === 'falcon' || m.sender === 'model' || m.sender === 'assistant'
          ? 'model'
          : 'user';

      let text = '';
      if (Array.isArray(m.parts) && m.parts.length > 0) {
        text = m.parts.map((p: any) => p?.text || '').join('\n').trim();
      } else if (typeof m.text === 'string') {
        text = m.text.trim();
      } else if (typeof m.message === 'string') {
        text = m.message.trim();
      }

      if (text) {
        mappedHistory.push({
          role,
          parts: [{ text }],
        });
      }
    }

    // حذف أي رسائل model في البداية لضمان بدء المحادثة بـ user
    while (mappedHistory.length > 0 && mappedHistory[0].role === 'model') {
      mappedHistory.shift();
    }

    // أخذ آخر 12 رسالة فقط كما هو مطلوب
    const recentHistory = mappedHistory.slice(-12);

    const contents: any[] = [...recentHistory];
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

    let response: any;
    let usedSearch = false;
    const searchSources: Array<{ title: string; url: string }> = [];

    // محاولة الاستدعاء مع أدوات بحث جوجل أولاً
    try {
      response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [{ googleSearch: {} }],
        },
      });
      usedSearch = true;
    } catch (searchErr: any) {
      console.warn('Chat with googleSearch failed, falling back to standard generation:', searchErr?.message);
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
    }

    // استخراج مصادر البحث إن وجدت
    const candidate = response?.candidates?.[0];
    const grounding = candidate?.groundingMetadata;
    if (grounding?.groundingChunks) {
      for (const chunk of grounding.groundingChunks) {
        if (chunk.web?.uri) {
          searchSources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    let replyText = response?.text?.trim() || '';
    if (!replyText) {
      replyText = 'عذراً يا فنان، لم أتمكن من صياغة إجابة واضحة لهذه النقطة. يرجى توضيح استفسارك أو إعادة طرح السؤال.';
    }

    // إذا لم تتوفر مصادر بحث وورد ذكر أسعار، أضف التنبيه التوضيحي الصريح
    if (!usedSearch || searchSources.length === 0) {
      const mentionsPrice =
        replyText.includes('سعر') ||
        replyText.includes('تكلفة') ||
        replyText.includes('مصنعية') ||
        replyText.includes(currency);

      if (mentionsPrice && !replyText.includes('تقدير تقريبي من صقر الشمساويه')) {
        replyText += '\n\n*(ملاحظة: الأسعار المذكورة أعلاه هي تقدير تقريبي من صقر الشمساويه لمساعدتك في ايجاد السعر المناسب)*';
      }
    }

    return {
      reply: replyText,
      sources: searchSources.slice(0, 5),
    };
  }
}

export const aiProvider = new GeminiAIProvider();
