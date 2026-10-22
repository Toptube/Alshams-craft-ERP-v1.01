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
    const activeCrafts: string[] = Array.isArray(input.activeCrafts)
      ? input.activeCrafts.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : typeof input.activeCrafts === 'string'
      ? [(input.activeCrafts as string).trim()].filter(Boolean)
      : [];

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
    let usedSearch = false;
    try {
      // 6) تفعيل البحث الحقيقي في Gemini مع googleSearch داخل try/catch
      response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: { parts },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      usedSearch = true;
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

    // إذا لم يعمل البحث، نوضح أن الأسعار تقدير تقريبي وليست بحث سوق مؤكد
    if (!usedSearch) {
      parsed.notesForCalculator =
        (parsed.notesForCalculator ? parsed.notesForCalculator + '\n' : '') +
        '(ملاحظة: أسعار السوق تقدير تقريبي وليست بحث سوق مؤكد)';
    }

    // استخراج مصادر البحث إن وجدت
    const candidate = response?.candidates?.[0];
    const grounding = candidate?.groundingMetadata;
    const searchSources: Array<{ title: string; url: string }> = [];
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
    parsed.sources = searchSources;

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

    // 4) جودة الرد: صقر يرد على سؤال المستخدم الفعلي أولاً وبشكل مباشر ومنطقي
    const systemInstruction = `أنت "صقر الشمساوية AI" - المستشار الذكي والرفيق الفني لمنصة الشمس كرافت الحرفية (AlSHams Craft ERP).
أنت مستشار حرفي وهندسي خبير في الصناعات والمهارات والفنون اليدوية (المكرمية، الكروشيه، التطريز، الرزن، الخزف والصلصال، الأخشاب، إكسسوارات الهاند ميد).

التعليمات الصارمة لجودة الرد:
1. الإجابة عن سؤال المستخدم الفعلي أولاً وبشكل مباشر ومنطقي: ابدأ ردك مباشرة وبلا أي مقدمات إنشائية أو تكرار للسؤال، بتقديم الإجابة الدقيقة والمباشرة عن صلب ما سأل عنه الحرفي.
2. الاعتماد على سياق الورشة المرسل: اعتمد بالكامل على بيانات الورشة المرفقة أدناه (اسم الورشة، العملة [${currency}]، الحرفة، الخامات المسجلة وأسعارها) لربط إجابتك بالواقع العملي للورشة.
3. عدم اختراع أرقام أو معلومات:
   - لا تخترع أرقاماً أو أسعاراً غير مؤكدة من وحي الخيال مطلقاً.
   - إذا استعنت ببحث السوق المتاح واحتوى الرد على مصادر حقيقية، فاذكر الأسعار المرجعية الحقيقية بدقة.
   - إذا كان الرقم تقديراً بدون بحث سوق مؤكد، فاذكر صراحة وبوضوح: "هذا السعر هو تقدير تقريبي من صقر الشمساويه لمساعدتك في ايجاد السعر المناسب وليست بحث سوق مؤكد".
   - إن نقصت أي معلومة أساسية لإتمام الإجابة أو الحساب بدقة، أجب عما هو متاح واسأل سؤالاً توضيحياً واحداً محدداً ومباشراً في نهاية ردك.
4. عدم إرسال رد فارغ: إن لم تصل لمعلومة واضحة اعرض رسالة توضيحية محددة. تحدث دائماً باللغة العربية الراقية والودودة دون ذكر أي مصطلحات برمجية داخلية.

سياق ورشة الحرفي الحالي:
${JSON.stringify(currentContext, null, 2)}`;

    // 3) سجل المحادثة: حوّل رسائل الواجهة، سواء بصيغة {sender,text} أو {role,parts}، إلى صيغة النموذج {role:'user'|'model', parts:[{text}]}، واحذف الرسائل الفارغة، واحذف أي رسائل 'model' في البداية، وخذ آخر 12 رسالة فقط.
    const rawHistory = Array.isArray(chatHistory) ? chatHistory : [];
    const mappedHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const m of (rawHistory as any[])) {
      if (!m) continue;
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

      // حذف الرسائل الفارغة
      if (text) {
        mappedHistory.push({
          role,
          parts: [{ text }],
        });
      }
    }

    // حذف أي رسائل 'model' في البداية
    while (mappedHistory.length > 0 && mappedHistory[0].role === 'model') {
      mappedHistory.shift();
    }

    // خذ آخر 12 رسالة فقط
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

    // 6) تفعيل البحث الحقيقي في Gemini (tools: [{ googleSearch: {} }]) في الدردشة داخل try/catch
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

    // استخراج مصادر البحث إن وُجدت
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
      replyText = 'عذراً يا فنان، تعذر استخراج رد واضح على سؤالك حالياً، يرجى إعادة المحاولة أو توضيح السؤال.';
    }

    // إن لم يعمل البحث أعد الطلب بدونه واجعل الرد يكتب أن الأسعار "تقدير تقريبي وليست بحث سوق مؤكد". لا تعرض أرقام سوق كأنها حقيقية دون مصدر.
    if (!usedSearch || searchSources.length === 0) {
      const mentionsPrice =
        replyText.includes('سعر') ||
        replyText.includes('تكلفة') ||
        replyText.includes('مصنعية') ||
        replyText.includes(currency);

      if (mentionsPrice && !replyText.includes('تقدير تقريبي وليست بحث سوق مؤكد')) {
        replyText += '\n\n*(ملاحظة: الأسعار المذكورة أعلاه هي تقدير تقريبي وليست بحث سوق مؤكد)*';
      }
    }

    return {
      reply: replyText,
      sources: searchSources.slice(0, 5),
    };
  }
}

export const aiProvider = new GeminiAIProvider();
