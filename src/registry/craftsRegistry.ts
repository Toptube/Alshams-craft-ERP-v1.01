import { CalculationInput, CalculationOutput } from '../types';
import { calculateMacrame } from '../utils/macrameMath';

export type MainSectionId = 'ropes_textiles' | 'beads_embroidery' | 'clays_composites' | 'woods';

export interface MainSectionDefinition {
  id: MainSectionId;
  nameAr: string;
  iconName: string;
  description: string;
}

export interface SubCraftDefinition {
  id: string;
  nameAr: string;
  mainSectionId: MainSectionId;
  calcEngine: 'macrame' | 'generic' | 'fusion';
  status: 'active' | 'coming_soon';
  badge?: string;
  description: string;
  sampleCategories: string[];
}

export const MAIN_SECTIONS: MainSectionDefinition[] = [
  {
    id: 'ropes_textiles',
    nameAr: 'الحبال والنسيج',
    iconName: 'Scroll',
    description: 'المكرمية، الكروشيه، التافتنج، الكليم، والعقادة',
  },
  {
    id: 'beads_embroidery',
    nameAr: 'الخرز والتطريز',
    iconName: 'Sparkles',
    description: 'أشغال الخرز الدقيقة، التطريز الفلاحي والمودرن',
  },
  {
    id: 'clays_composites',
    nameAr: 'تشكيل الخامات الطينية والمركبة',
    iconName: 'Boxes',
    description: 'الخزف، الصلصال الحراري، السيراميك، الكونكريت، والريزن',
  },
  {
    id: 'woods',
    nameAr: 'الأخشاب',
    iconName: 'Trees',
    description: 'البامبو، الخوص، الأركت، الأرابيسك، والنجارة الفنية',
  },
];

export const SUB_CRAFTS_REGISTRY: SubCraftDefinition[] = [
  // 1. الحبال والنسيج
  {
    id: 'macrame',
    nameAr: 'مكرمية',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'macrame',
    status: 'active',
    badge: 'المحرك المتخصص مفعّل',
    description: 'حساب هندسي دقيق للفتلات الأساسية ومضاعفات الـ 4 واستهلاك الخيوط',
    sampleCategories: ['رانر', 'ستائر', 'سجاد', 'كوشن', 'جدارية', 'بوف', 'كرسي', 'أرجوحة', 'نجف وإضاءة', 'شنطة أو كلاتش'],
  },
  {
    id: 'crochet',
    nameAr: 'كروشيه',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'أشغال السنارة، شيلان، مفارش، ودمى أميجورومي',
    sampleCategories: ['شال', 'مفرش', 'بطانية أطفال', 'شنطة كروشيه', 'أميجورومي'],
  },
  {
    id: 'zigzag',
    nameAr: 'زجزاج',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'حياكة حبال القطن بماكينات الزجزاج لصناعة السلات والشنط',
    sampleCategories: ['باسكت', 'صينية حبال', 'شنطة زجزاج', 'كوستر حبال'],
  },
  {
    id: 'punch_needle',
    nameAr: 'إبرة النقاش (بانش نيدل)',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تطريز بارز بحلقات الصوف والغرز المرتفعة على القماش',
    sampleCategories: ['تابلوه حائطي', 'كوشن بارز', 'كوستر صوف', 'مرآة مؤطرة'],
  },
  {
    id: 'tufting_gun',
    nameAr: 'مسدس التافت',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'صناعة السجاد الفني المعلق والأرضي بخيوط الأكريليك والصوف',
    sampleCategories: ['سجادة فنية أرضية', 'لوحة جدارية تافتنج', 'مخدة بارزة'],
  },
  {
    id: 'kelim',
    nameAr: 'كليم',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'نسيج يدوي على النول التقليدي بنقوش تراثية ومودرن',
    sampleCategories: ['كليم نول أرضي', 'رانر صوف', 'معلقة نسيج'],
  },
  {
    id: 'aqqada',
    nameAr: 'العقادة',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'عقد الحبال البحرية والزخرفية والشرابات ومكملات الستائر',
    sampleCategories: ['شرابة ستارة فاخرة', 'حزام حبال', 'عقدة بحرية زخرفية'],
  },
  {
    id: 'craft_fusion',
    nameAr: 'دمج المشغولات',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'fusion',
    status: 'active',
    badge: 'توليف حرفتين معاً',
    description: 'دمج تقنيتين يدويتين (مثل مكرمية مع خشب أو ريزن) في منتج واحد',
    sampleCategories: ['مكرمية مطعمة بالخشب', 'مرآة ريزن ومكرمية', 'صينية خوص وتطريز'],
  },
  {
    id: 'spinning',
    nameAr: 'الغزل اليدوي',
    mainSectionId: 'ropes_textiles',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تحضير وغزل الحبال الصوفية والقطنية والكتانية يدوياً',
    sampleCategories: ['شلة خيط يدوي', 'حبل مفتول طبيعي', 'خيط مصبوغ بالأعشاب'],
  },

  // 2. الخرز والتطريز
  {
    id: 'beadwork',
    nameAr: 'خرز',
    mainSectionId: 'beads_embroidery',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'شنط اللولي، الإكسسوارات، مجسمات الخرز المنسوجة',
    sampleCategories: ['شنطة لولي كريستال', 'إكسسوار مطرز', 'صينية خرز'],
  },
  {
    id: 'embroidery',
    nameAr: 'تطريز',
    mainSectionId: 'beads_embroidery',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تطريز يدوي على الطارات، مناديل كتب كتاب، وتطريز الملابس',
    sampleCategories: ['طارة تطريز زفاف', 'منديل كتب كتاب', 'شال مطرز'],
  },

  // 3. تشكيل الخامات الطينية والمركبة
  {
    id: 'pottery',
    nameAr: 'خزف وفخار',
    mainSectionId: 'clays_composites',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تشكيل الطين الأسواني، الحرق في الأفران، والجليز والتلوين',
    sampleCategories: ['فازة طين أسواني', 'مج قهوة خزف', 'طبق ديكور فخاري'],
  },
  {
    id: 'polymer_clay',
    nameAr: 'صلصال حراري',
    mainSectionId: 'clays_composites',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تشكيل المجات، الحلي، وإكسسوارات المكاتب بالصلصال الحراري',
    sampleCategories: ['مج مزخرف بالصلصال', 'حلق وإكسسوار يدوي', 'ميدالية تشكيل'],
  },
  {
    id: 'ceramics',
    nameAr: 'سيراميك',
    mainSectionId: 'clays_composites',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'صب وتشكيل وتلوين بلاطات السيراميك الفنية واللوحات',
    sampleCategories: ['لوحة بلاطات سيراميك', 'كوسترات سيراميك فني'],
  },
  {
    id: 'concrete',
    nameAr: 'كونكريت',
    mainSectionId: 'clays_composites',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'صب الخرسانة الديكورية وقوالب الشموع والصب الترازو',
    sampleCategories: ['وعاء شمع كونكريت', 'صينية ترازو', 'أصيص زرع مودرن'],
  },
  {
    id: 'resin',
    nameAr: 'ريزن',
    mainSectionId: 'clays_composites',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'سكب الإيبوكسي ريزن، صواني الضيافة، والشيالات الفاخرة',
    sampleCategories: ['صينية ضيافة ريزن', 'شيالة كحك ريزن', 'ساعة حائط جيود'],
  },

  // 4. الأخشاب
  {
    id: 'bamboo',
    nameAr: 'بامبو',
    mainSectionId: 'woods',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تشكيل عيدان الخيزران والبامبو الطبيعي في الأثاث والمرايا',
    sampleCategories: ['مرآة بامبو شمسية', 'أباجورة بامبو', 'ستاند نباتات'],
  },
  {
    id: 'wicker',
    nameAr: 'خوص',
    mainSectionId: 'woods',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'جدل سعف النخيل وأعواد الصفصاف في السلات والشنط التراثية',
    sampleCategories: ['سبت غسيل خوص', 'شنطة صيفية خوص', 'صينية عيش تراثية'],
  },
  {
    id: 'scroll_saw',
    nameAr: 'أركت',
    mainSectionId: 'woods',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'تفريغ خشب الأبلكاش والزان بمنشار الأركت اليدوي والكهربائي',
    sampleCategories: ['فانوس أركت مفرغ', 'لوحة آيات قرآنية خشب', 'صندوق مجوهرات'],
  },
  {
    id: 'arabesque',
    nameAr: 'أرابيسك وتصديف',
    mainSectionId: 'woods',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'خراطة الخشب الدقيق وتطعيم خشب الزان بالصدف الطبيعي',
    sampleCategories: ['صندوق مجوهرات صدف', 'طربيزة أرابيسك مطعمة', 'برواز صدف'],
  },
  {
    id: 'carpentry',
    nameAr: 'نجارة وخراطة',
    mainSectionId: 'woods',
    calcEngine: 'generic',
    status: 'coming_soon',
    badge: 'معادلات الحرفة المخصصة قريباً',
    description: 'خراطة شاسيهات الورشة، عصيان المكرمية، وألواح التقديم الصلبة',
    sampleCategories: ['بلانشة تقديم زان', 'عصا مكرمية مخروطة', 'شاسيه كرسي يدوي'],
  },
];

/**
 * محرك التكلفة العام لجميع الحِرف اليدوية (Generic Craft Cost Engine)
 * خامات إضافية ديناميكية + عدد ساعات × أجر الساعة + تغليف + نقل + تكاليف إدارية + هامش ربح مطبق على الخامات فقط
 */
export function calculateGenericCraftCost(input: CalculationInput): CalculationOutput {
  // حساب إجمالي الخامات المباشرة
  const dynamicExtraCost = (input.extraMaterials || []).reduce((sum, row) => {
    const cost = Number(row.totalCost) || (Number(row.quantity) * Number(row.unitPrice)) || 0;
    return sum + cost;
  }, 0);

  const materialsCost = Math.round(
    (Number(input.curtainRodCost) || 0) +
    (Number(input.cushionCoverCost) || 0) +
    (Number(input.fiberCost) || 0) +
    (Number(input.bagAccessoriesCost) || 0) +
    dynamicExtraCost
  );

  // عزل هامش الربح وتطبيقه على الخامات فقط
  const profitMarginPercent = Number(input.profitMarginPercent) || 0;
  const insulatedProfitAmount = Math.round(materialsCost * (profitMarginPercent / 100));

  const laborWage = Math.round(Number(input.laborWage) || 0);
  const packagingCost = Math.round(Number(input.packagingCost) || 0);
  const transitFees = Math.round(Number(input.transitFees) || 0);
  const adminExpensesShare = Math.round(Number(input.adminExpensesShare) || 0);

  const finalSellingPrice = Math.round(
    materialsCost +
    insulatedProfitAmount +
    laborWage +
    packagingCost +
    transitFees +
    adminExpensesShare
  );

  return {
    baseStrandsCount: 0,
    workingCordsCount: 0,
    singleStrandLengthCm: 0,
    totalYarnLengthMeters: 0,
    totalWeightKg: 0,
    totalWeightGrams: 0,
    yarnCost: 0,
    extraMaterialsTotalCost: materialsCost,
    totalDirectMaterialsCost: materialsCost,
    insulatedProfitAmount,
    laborWage,
    packagingCost,
    transitFees,
    adminExpensesShare,
    finalSellingPrice,
    isOverridden: {
      strands: false,
      strandLength: false,
      weight: false,
    },
  };
}

/**
 * دمج المشغولات (Craft Fusion Engine)
 * يجمع تكلفة حرفتين معاً في منتج واحد مع تفصيل بنود كل منهما
 */
export function calculateFusionCraftCost(
  firstCalculation: CalculationOutput,
  secondCalculation: CalculationOutput,
  fusionOverhead: {
    packagingCost: number;
    transitFees: number;
    adminExpensesShare: number;
  }
): CalculationOutput {
  const totalDirectMaterialsCost =
    firstCalculation.totalDirectMaterialsCost + secondCalculation.totalDirectMaterialsCost;

  const insulatedProfitAmount =
    firstCalculation.insulatedProfitAmount + secondCalculation.insulatedProfitAmount;

  const laborWage = firstCalculation.laborWage + secondCalculation.laborWage;
  const packagingCost = Math.round(Number(fusionOverhead.packagingCost) || 0);
  const transitFees = Math.round(Number(fusionOverhead.transitFees) || 0);
  const adminExpensesShare = Math.round(Number(fusionOverhead.adminExpensesShare) || 0);

  const finalSellingPrice = Math.round(
    totalDirectMaterialsCost +
    insulatedProfitAmount +
    laborWage +
    packagingCost +
    transitFees +
    adminExpensesShare
  );

  return {
    baseStrandsCount: firstCalculation.baseStrandsCount || secondCalculation.baseStrandsCount || 0,
    workingCordsCount: firstCalculation.workingCordsCount || secondCalculation.workingCordsCount || 0,
    singleStrandLengthCm: firstCalculation.singleStrandLengthCm || secondCalculation.singleStrandLengthCm || 0,
    totalYarnLengthMeters: (firstCalculation.totalYarnLengthMeters || 0) + (secondCalculation.totalYarnLengthMeters || 0),
    totalWeightKg: Number(((firstCalculation.totalWeightKg || 0) + (secondCalculation.totalWeightKg || 0)).toFixed(2)),
    totalWeightGrams: (firstCalculation.totalWeightGrams || 0) + (secondCalculation.totalWeightGrams || 0),
    yarnCost: (firstCalculation.yarnCost || 0) + (secondCalculation.yarnCost || 0),
    extraMaterialsTotalCost: (firstCalculation.extraMaterialsTotalCost || 0) + (secondCalculation.extraMaterialsTotalCost || 0),
    totalDirectMaterialsCost,
    insulatedProfitAmount,
    laborWage,
    packagingCost,
    transitFees,
    adminExpensesShare,
    finalSellingPrice,
    isOverridden: {
      strands: false,
      strandLength: false,
      weight: false,
    },
  };
}

/**
 * Dispatcher: يشغل المحرك الحسابي المناسب بناءً على معرّف الحرفة
 */
export function executeCraftCalculation(craftId: string, input: CalculationInput): CalculationOutput {
  const craft = SUB_CRAFTS_REGISTRY.find((c) => c.id === craftId);
  if (craft && craft.calcEngine === 'macrame') {
    return calculateMacrame(input);
  }
  return calculateGenericCraftCost(input);
}
