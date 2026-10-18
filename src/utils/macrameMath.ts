import {
  CalculationInput,
  CalculationOutput,
  CraftCategory,
  CountryConfig,
  Gender,
  CordTypeOption,
} from '../types';

export const CRAFT_CATEGORIES: CraftCategory[] = [
  'رانر',
  'ستائر',
  'سجاد',
  'كوشن',
  'جدارية',
  'بوف',
  'كرسي',
  'أرجوحة',
  'نجف وإضاءة',
  'شنطة أو كلاتش',
];

export const FOUNDATIONAL_UNITS: string[] = [
  'جرام',
  'كيلو',
  'متر',
  'سم',
  'قطعة',
  'لفة',
  'حبة',
  'سوستة',
];

export const CORD_TYPES: CordTypeOption[] = [
  {
    id: 'cord_cotton_twisted',
    name: 'خيط قطن محلول / مجدول (مكرمية تقليدي)',
    defaultPricePerKg: 180,
    densityFactor: 1.0,
    defaultThicknessMm: 4,
  },
  {
    id: 'cord_cotton_braided',
    name: 'خيط قطن مبروم / مضفور 3 فتلة',
    defaultPricePerKg: 200,
    densityFactor: 1.1,
    defaultThicknessMm: 4,
  },
  {
    id: 'cord_cotton_cordon',
    name: 'خيط قيطان قطن محشو فايبر',
    defaultPricePerKg: 190,
    densityFactor: 0.95,
    defaultThicknessMm: 3,
  },
  {
    id: 'cord_macrame_rope',
    name: 'حبل قطن سميك (للشاسيهات والمفروشات الكبيرة)',
    defaultPricePerKg: 175,
    densityFactor: 1.25,
    defaultThicknessMm: 5,
  },
  {
    id: 'cord_jute',
    name: 'خيط خيش طبيعي (Jute Rustic)',
    defaultPricePerKg: 140,
    densityFactor: 1.15,
    defaultThicknessMm: 4,
  },
  {
    id: 'cord_polyester',
    name: 'خيط كليم / بوليستر تركي',
    defaultPricePerKg: 130,
    densityFactor: 1.3,
    defaultThicknessMm: 5,
  },
  {
    id: 'cord_silk',
    name: 'خيط حرير وساتان ناعم (للكلاتش والشنط)',
    defaultPricePerKg: 260,
    densityFactor: 0.9,
    defaultThicknessMm: 3,
  },
];

export const COUNTRIES_CONFIG: CountryConfig[] = [
  {
    code: 'EG',
    name: 'جمهورية مصر العربية',
    flag: '🇪🇬',
    callingCode: '+20',
    currency: 'EGP',
    currencySymbol: 'ج.م',
    phoneLength: 11,
  },
  {
    code: 'SA',
    name: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    callingCode: '+966',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    phoneLength: 9,
  },
  {
    code: 'AE',
    name: 'الإمارات العربية المتحدة',
    flag: '🇦🇪',
    callingCode: '+971',
    currency: 'AED',
    currencySymbol: 'د.إ',
    phoneLength: 9,
  },
  {
    code: 'KW',
    name: 'دولة الكويت',
    flag: '🇰🇼',
    callingCode: '+965',
    currency: 'KWD',
    currencySymbol: 'د.ك',
    phoneLength: 8,
  },
  {
    code: 'QA',
    name: 'دولة قطر',
    flag: '🇶🇦',
    callingCode: '+974',
    currency: 'QAR',
    currencySymbol: 'ر.ق',
    phoneLength: 8,
  },
  {
    code: 'BH',
    name: 'مملكة البحرين',
    flag: '🇧🇭',
    callingCode: '+973',
    currency: 'BHD',
    currencySymbol: 'د.ب',
    phoneLength: 8,
  },
  {
    code: 'OM',
    name: 'سلطنة عمان',
    flag: '🇴🇲',
    callingCode: '+968',
    currency: 'OMR',
    currencySymbol: 'ر.ع',
    phoneLength: 8,
  },
  {
    code: 'JO',
    name: 'المملكة الأردنية الهاشمية',
    flag: '🇯🇴',
    callingCode: '+962',
    currency: 'JOD',
    currencySymbol: 'د.أ',
    phoneLength: 9,
  },
  {
    code: 'LB',
    name: 'الجمهورية اللبنانية',
    flag: '🇱🇧',
    callingCode: '+961',
    currency: 'LBP',
    currencySymbol: 'ل.ل',
    phoneLength: 8,
  },
  {
    code: 'IQ',
    name: 'جمهورية العراق',
    flag: '🇮🇶',
    callingCode: '+964',
    currency: 'IQD',
    currencySymbol: 'د.ع',
    phoneLength: 10,
  },
];

export function is3DCategory(cat: CraftCategory): boolean {
  return cat === 'بوف' || cat === 'كرسي' || cat === 'نجف وإضاءة' || cat === 'شنطة أو كلاتش';
}

export function isLargeItemCategory(cat: CraftCategory): boolean {
  return cat === 'ستائر' || cat === 'سجاد' || cat === 'بوف' || cat === 'كرسي' || cat === 'أرجوحة';
}

export function getGenderArtistTitle(gender?: Gender): string {
  return gender === 'female' ? 'فنانة' : 'فنان';
}

export function getGenderCreatorAdjective(gender?: Gender): string {
  return gender === 'female' ? 'مبدعة' : 'مبدع';
}

export function getGenderGreeting(gender?: Gender, name?: string): string {
  const title = gender === 'female' ? 'فنانتنا المبدعة' : 'فناننا المبدع';
  return name ? `أهلاً بك يا ${title} ${name}` : `أهلاً بك يا ${title}`;
}

export function calculateMacrame(input: CalculationInput): CalculationOutput {
  const thickness = Math.max(1, Number(input.cordThicknessMm) || 4);
  const isOverriddenStrands = Boolean(input.manualOverrideStrands && input.manualOverrideStrands > 0);
  const isOverriddenLength = Boolean(input.manualOverrideStrandLength && input.manualOverrideStrandLength > 0);
  const isOverriddenWeight = Boolean(input.manualOverrideTotalWeightKg && input.manualOverrideTotalWeightKg > 0);

  // 1. Calculate Base Strands & Working Cords (multiples of 4)
  let baseStrandsCount = 0;
  if (isOverriddenStrands) {
    baseStrandsCount = Number(input.manualOverrideStrands);
  } else {
    let effectiveWidthMm = 0;
    if (is3DCategory(input.category)) {
      if (input.shape3D === 'circle' || input.shape3D === 'cylinder') {
        const dia = input.diameterCm || input.baseDiameterCm || 30;
        effectiveWidthMm = Math.PI * dia * 10;
      } else {
        effectiveWidthMm = (input.widthCm || 40) * 10;
      }
    } else {
      effectiveWidthMm = (input.widthCm || 50) * 10;
    }

    // Number of working cords needed across width
    const calculatedWorking = Math.ceil(effectiveWidthMm / (thickness * 4)) * 4;
    const workingCords = Math.max(4, calculatedWorking);
    // Each strand folded in Lark's Head knot produces 2 working cords
    baseStrandsCount = Math.max(2, Math.ceil(workingCords / 2));
  }
  const workingCordsCount = baseStrandsCount * 2;

  // 2. Single Strand Cut Length (cm)
  let singleStrandLengthCm = 0;
  if (isOverriddenLength) {
    singleStrandLengthCm = Number(input.manualOverrideStrandLength);
  } else {
    const finishedLength = input.totalLengthCm || input.sideHeightCm || 60;
    const fringe = input.fringeLengthCm || 0;
    const knottingMultiplier = thickness >= 4 ? 4.8 : 4.2;
    singleStrandLengthCm = Math.round(finishedLength * knottingMultiplier + fringe * 2 + 20);
  }

  // 3. Total Length (meters) & Total Weight (Kg and Grams)
  const totalYarnLengthMeters = Math.max(1, Math.round((baseStrandsCount * singleStrandLengthCm) / 100));

  let totalWeightKg = 0;
  let totalWeightGrams = 0;
  if (isOverriddenWeight) {
    totalWeightKg = Number(input.manualOverrideTotalWeightKg);
    totalWeightGrams = Math.round(totalWeightKg * 1000);
  } else {
    // Grams per meter: thickness^2 * 0.38 for cotton cords
    const gramsPerMeter = Math.pow(thickness, 2) * 0.38;
    totalWeightGrams = Math.round(totalYarnLengthMeters * gramsPerMeter);
    totalWeightKg = Number((totalWeightGrams / 1000).toFixed(2));
  }

  // 4. Yarn Cost
  const pricePerKg = Number(input.pricePerKg) || 180;
  const yarnCost = Math.round(totalWeightKg * pricePerKg);

  // 5. Extra Materials & Accessories
  const dynamicExtraCost = (input.extraMaterials || []).reduce((sum, row) => {
    const cost = Number(row.totalCost) || (Number(row.quantity) * Number(row.unitPrice)) || 0;
    return sum + cost;
  }, 0);

  const extraMaterialsTotalCost = Math.round(
    (Number(input.curtainRodCost) || 0) +
    (Number(input.cushionCoverCost) || 0) +
    (Number(input.fiberCost) || 0) +
    (Number(input.bagAccessoriesCost) || 0) +
    dynamicExtraCost
  );

  const totalDirectMaterialsCost = yarnCost + extraMaterialsTotalCost;

  // 6. Insulated Profit Amount (Applied exclusively to materials to isolate profit from wage)
  const profitMarginPercent = Number(input.profitMarginPercent) || 0;
  const insulatedProfitAmount = Math.round(totalDirectMaterialsCost * (profitMarginPercent / 100));

  // 7. Labor, Packaging, Shipping & Overheads
  const laborWage = Math.round(Number(input.laborWage) || 0);
  const packagingCost = Math.round(Number(input.packagingCost) || 0);
  const transitFees = Math.round(Number(input.transitFees) || 0);
  const adminExpensesShare = Math.round(Number(input.adminExpensesShare) || 0);

  // 8. Final Selling Price
  const finalSellingPrice = Math.round(
    totalDirectMaterialsCost +
    insulatedProfitAmount +
    laborWage +
    packagingCost +
    transitFees +
    adminExpensesShare
  );

  return {
    baseStrandsCount,
    workingCordsCount,
    singleStrandLengthCm,
    totalYarnLengthMeters,
    totalWeightKg,
    totalWeightGrams,
    yarnCost,
    extraMaterialsTotalCost,
    totalDirectMaterialsCost,
    insulatedProfitAmount,
    laborWage,
    packagingCost,
    transitFees,
    adminExpensesShare,
    finalSellingPrice,
    isOverridden: {
      strands: isOverriddenStrands,
      strandLength: isOverriddenLength,
      weight: isOverriddenWeight,
    },
  };
}
