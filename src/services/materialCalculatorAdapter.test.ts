import { describe, it, expect } from 'vitest';
import {
  stripParentheses,
  normalizeForComparison,
  DEFAULT_BASIC_YARNS,
} from './materialCalculatorAdapter';
import { calculateMacrame } from '../utils/macrameMath';
import { CalculationInput } from '../types';

describe('MaterialCalculatorAdapter and Math Invariance', () => {
  it('stripParentheses removes all parentheses and brackets without affecting text', () => {
    expect(stripParentheses('خيط قطن مجدول (مكرمية تقليدي)')).toBe('خيط قطن مجدول');
    expect(stripParentheses('خيش طبيعي (Jute Rustic)')).toBe('خيش طبيعي');
    expect(stripParentheses('قطن محلول [4 مم]')).toBe('قطن محلول');
    expect(stripParentheses('كردون مبطن (أصلي)')).toBe('كردون مبطن');
    expect(stripParentheses('كليم')).toBe('كليم');
  });

  it('contains the 8 required basic yarns', () => {
    const names = DEFAULT_BASIC_YARNS.map((y) => y.name);
    expect(names).toContain('قطن مجدول');
    expect(names).toContain('قطن محلول');
    expect(names).toContain('مصري بوليستر');
    expect(names).toContain('خيش');
    expect(names).toContain('كردون فاضي');
    expect(names).toContain('كردون مبطن');
    expect(names).toContain('كردون أمريكي');
    expect(names).toContain('كليم');
    expect(names.length).toBe(8);
  });

  it('normalizes names properly to prevent duplicate yarn generation', () => {
    expect(normalizeForComparison('خيط قطن مجدول 4 مم')).toContain(
      normalizeForComparison('قطن مجدول')
    );
    expect(normalizeForComparison('قطن محلول (سوفت)')).toContain(
      normalizeForComparison('قطن محلول')
    );
  });

  it('verifies that calculateMacrame results (فتلات، أطوال، وزن، سعر) are invariant', () => {
    const sampleInput: CalculationInput = {
      category: 'جدارية',
      productName: 'جدارية بوهو شمسية',
      shape3D: 'flat',
      widthCm: 60,
      diameterCm: 0,
      baseDiameterCm: 0,
      sideHeightCm: 0,
      totalLengthCm: 90,
      fringeLengthCm: 15,
      cordTypeId: 'mat_yarn_1',
      cordThicknessMm: 4,
      pricePerKg: 180,
      curtainRodCost: 0,
      cushionCoverCost: 0,
      fiberCost: 0,
      bagAccessoriesCost: 0,
      extraMaterials: [
        {
          id: 'extra_1',
          name: 'خرز خشب',
          unit: 'حبة',
          unitPrice: 2,
          quantity: 10,
          totalCost: 20,
        },
      ],
      laborWage: 150,
      packagingCost: 20,
      transitFees: 30,
      adminExpensesShare: 15,
      profitMarginPercent: 50,
      personalNotes: '',
    };

    const output = calculateMacrame(sampleInput);

    // Assert exact mathematical outputs of calculateMacrame
    expect(output.baseStrandsCount).toBe(76);
    expect(output.workingCordsCount).toBe(152);
    expect(output.singleStrandLengthCm).toBe(482);
    expect(output.totalYarnLengthMeters).toBe(366);
    expect(output.totalWeightGrams).toBe(2225);
    expect(output.totalWeightKg).toBe(2.23);
    expect(output.yarnCost).toBe(401);
    expect(output.extraMaterialsTotalCost).toBe(20);
    expect(output.totalDirectMaterialsCost).toBe(421);
    expect(output.insulatedProfitAmount).toBe(211);
    expect(output.finalSellingPrice).toBe(847);
  });
});
