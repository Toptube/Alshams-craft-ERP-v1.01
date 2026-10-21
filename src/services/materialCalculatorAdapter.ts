import { RawMaterialItem, CordTypeOption } from '../types';
import { firestoreService } from '../db/firestoreService';
import { tenantStorage as localDexieStorage } from '../db/dexieDB';
import { CORD_TYPES } from '../utils/macrameMath';

/**
 * الخيوط الثمانية الأساسية لورش المكرمية والأعمال اليدوية
 * بالأسعار الافتراضية المعتمدة
 */
export interface DefaultYarnSpec {
  name: string;
  defaultPricePerKg: number;
  densityFactor: number;
  defaultThicknessMm: number;
}

export const DEFAULT_BASIC_YARNS: DefaultYarnSpec[] = [
  {
    name: 'قطن مجدول',
    defaultPricePerKg: 180,
    densityFactor: 1.0,
    defaultThicknessMm: 4,
  },
  {
    name: 'قطن محلول',
    defaultPricePerKg: 160,
    densityFactor: 1.0,
    defaultThicknessMm: 4,
  },
  {
    name: 'مصري بوليستر',
    defaultPricePerKg: 140,
    densityFactor: 1.1,
    defaultThicknessMm: 4,
  },
  {
    name: 'خيش',
    defaultPricePerKg: 140,
    densityFactor: 1.15,
    defaultThicknessMm: 4,
  },
  {
    name: 'كردون فاضي',
    defaultPricePerKg: 175,
    densityFactor: 0.95,
    defaultThicknessMm: 4,
  },
  {
    name: 'كردون مبطن',
    defaultPricePerKg: 190,
    densityFactor: 1.0,
    defaultThicknessMm: 4,
  },
  {
    name: 'كردون أمريكي',
    defaultPricePerKg: 200,
    densityFactor: 1.1,
    defaultThicknessMm: 4,
  },
  {
    name: 'كليم',
    defaultPricePerKg: 130,
    densityFactor: 1.3,
    defaultThicknessMm: 5,
  },
];

/**
 * إزالة أي نصوص بين أقواس (عادية أو معقوفة أو مربعة) من أسماء الخيوط
 */
export function stripParentheses(name: string): string {
  if (!name) return '';
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*\{[^}]*\}/g, '')
    .replace(/\s*«[^»]*»/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * توحيد الاسم للمقارنة ومنع التكرار (إزالة المسافات الزائدة والهمزات)
 */
export function normalizeForComparison(str: string): string {
  if (!str) return '';
  return stripParentheses(str)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[َُِّْـ]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * هل الخامة مصنفة كخامة أساسية؟
 */
export function isBasicMaterial(m: RawMaterialItem): boolean {
  if (m.isActive === false) return false;
  if (m.materialCategory === 'خامة أساسية' || m.materialCategory === 'basic') return true;
  if (m.category === 'خامات أساسية' || m.category === 'خيوط') return true;
  // إذا لم تحدد الفئة صراحة وليست إضافية
  if (!m.materialCategory && m.category !== 'إضافية' && m.category !== 'خامات إضافية') {
    return true;
  }
  return false;
}

/**
 * هل الخامة مصنفة كخامة إضافية؟
 */
export function isExtraMaterial(m: RawMaterialItem): boolean {
  if (m.isActive === false) return false;
  if (m.materialCategory === 'خامة إضافية' || m.materialCategory === 'extra') return true;
  if (m.category === 'إضافية' || m.category === 'خامات إضافية') return true;
  if (
    m.category === 'أخشاب وشاسيهات' ||
    m.category === 'إكسسوارات ومعادن' ||
    m.category === 'تغليف وأقمشة'
  ) {
    return true;
  }
  return !isBasicMaterial(m);
}

/**
 * التحقق من وجود الخيوط الثمانية الأساسية وإنشاؤها في الورشة إن كانت غير موجودة
 * مع ضمان عدم التكرار إن كانت مسجلة مسبقاً
 */
export async function ensureDefaultBasicYarns(workshopId: string): Promise<RawMaterialItem[]> {
  if (!workshopId) return [];

  try {
    let existing: RawMaterialItem[] = [];
    try {
      existing = await firestoreService.getRawMaterials(workshopId);
    } catch {
      existing = await localDexieStorage.getRawMaterials(workshopId);
    }

    const existingNormalized = existing.map((e) => ({
      item: e,
      norm: normalizeForComparison(e.materialName),
    }));

    const missingYarns = DEFAULT_BASIC_YARNS.filter((spec) => {
      const specNorm = normalizeForComparison(spec.name);
      return !existingNormalized.some(
        (ex) => ex.norm.includes(specNorm) || specNorm.includes(ex.norm)
      );
    });

    if (missingYarns.length > 0) {
      const now = Date.now();
      for (let i = 0; i < missingYarns.length; i++) {
        const spec = missingYarns[i];
        const newMaterial: RawMaterialItem = {
          id: `mat_yarn_${workshopId}_${Date.now()}_${i}`,
          workshopId,
          tenantId: workshopId,
          materialName: spec.name,
          category: 'خامات أساسية',
          materialCategory: 'خامة أساسية',
          unit: 'كيلو',
          currentStock: 15.0,
          costPerUnit: spec.defaultPricePerKg,
          costPerGram: Number((spec.defaultPricePerKg / 1000).toFixed(4)),
          minAlertThreshold: 3,
          isActive: true,
          createdAt: now + i,
          updatedAt: now + i,
        };

        try {
          await firestoreService.saveRawMaterial(workshopId, newMaterial);
        } catch (e) {
          console.warn('Fallback to local Dexie for yarn save:', e);
          await localDexieStorage.saveRawMaterial(newMaterial);
        }
        existing.push(newMaterial);
      }
    }

    return existing;
  } catch (err) {
    console.error('Error ensuring default basic yarns:', err);
    return [];
  }
}

/**
 * مطابقة الخامة مع مواصفات الـ CordTypeOption لحاسبة التكاليف
 */
export function adaptMaterialToCordOption(
  material: RawMaterialItem,
  fallbackIndex: number = 0
): CordTypeOption {
  const cleanName = stripParentheses(material.materialName);
  const norm = normalizeForComparison(cleanName);

  // مطابقة مع مواصفات الكثافة والسمك الافتراضي
  const matchedSpec = DEFAULT_BASIC_YARNS.find((y) => {
    const yNorm = normalizeForComparison(y.name);
    return norm.includes(yNorm) || yNorm.includes(norm);
  });

  const matchedLegacy = CORD_TYPES.find((c) => {
    const cNorm = normalizeForComparison(c.name);
    return norm.includes(cNorm) || cNorm.includes(norm);
  });

  const densityFactor = matchedSpec?.densityFactor || matchedLegacy?.densityFactor || 1.0;
  const defaultThicknessMm =
    matchedSpec?.defaultThicknessMm || matchedLegacy?.defaultThicknessMm || 4;

  const price =
    material.unit === 'جرام'
      ? (material.costPerUnit || 0.18) * 1000
      : (material.costPerUnit || (material.costPerGram ? material.costPerGram * 1000 : 180));

  return {
    id: material.id,
    name: cleanName,
    defaultPricePerKg: Math.round(price) || 180,
    densityFactor,
    defaultThicknessMm,
  };
}
