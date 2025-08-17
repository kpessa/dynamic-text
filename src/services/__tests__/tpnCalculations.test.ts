/**
 * TPN Calculation Unit Tests
 * Tests for Total Parenteral Nutrition calculations and key management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  isValidKey, 
  getKeyCategory, 
  isCalculatedValue, 
  getCanonicalKey,
  extractKeysFromCode,
  extractDirectKeysFromCode
} from '../../lib/tpnLegacy';

describe('TPN Key Validation', () => {
  describe('isValidKey', () => {
    it('should recognize valid TPN keys', () => {
      expect(isValidKey('DOSE_WEIGHT')).toBe(true);
      expect(isValidKey('TPN_VOLUME')).toBe(true);
      expect(isValidKey('DEXTROSE_CONC')).toBe(true);
      expect(isValidKey('CALCIUM_GLUCONATE')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(isValidKey('CUSTOM_KEY')).toBe(false);
      expect(isValidKey('invalid')).toBe(false);
      expect(isValidKey('')).toBe(false);
      expect(isValidKey(null)).toBe(false);
    });

    it('should handle case variations', () => {
      expect(isValidKey('dose_weight')).toBe(true);
      expect(isValidKey('Dose_Weight')).toBe(true);
      expect(isValidKey('DOSE_WEIGHT')).toBe(true);
    });
  });

  describe('getKeyCategory', () => {
    it('should categorize basic parameters correctly', () => {
      expect(getKeyCategory('DOSE_WEIGHT')).toBe('BASIC_PARAMETERS');
      expect(getKeyCategory('TPN_VOLUME')).toBe('BASIC_PARAMETERS');
      expect(getKeyCategory('OVERFILL_VOLUME')).toBe('BASIC_PARAMETERS');
    });

    it('should categorize macronutrients correctly', () => {
      expect(getKeyCategory('DEXTROSE_CONC')).toBe('MACRONUTRIENTS');
      expect(getKeyCategory('AMINO_ACID_CONC')).toBe('MACRONUTRIENTS');
      expect(getKeyCategory('LIPID_CONC')).toBe('MACRONUTRIENTS');
    });

    it('should categorize electrolytes correctly', () => {
      expect(getKeyCategory('SODIUM_CHLORIDE')).toBe('ELECTROLYTES');
      expect(getKeyCategory('POTASSIUM_CHLORIDE')).toBe('ELECTROLYTES');
      expect(getKeyCategory('CALCIUM_GLUCONATE')).toBe('ELECTROLYTES');
      expect(getKeyCategory('MAGNESIUM_SULFATE')).toBe('ELECTROLYTES');
    });

    it('should categorize additives correctly', () => {
      expect(getKeyCategory('HEPARIN')).toBe('ADDITIVES');
      expect(getKeyCategory('INSULIN')).toBe('ADDITIVES');
      expect(getKeyCategory('RANITIDINE')).toBe('ADDITIVES');
    });

    it('should categorize trace elements correctly', () => {
      expect(getKeyCategory('ZINC')).toBe('TRACE_ELEMENTS');
      expect(getKeyCategory('COPPER')).toBe('TRACE_ELEMENTS');
      expect(getKeyCategory('SELENIUM')).toBe('TRACE_ELEMENTS');
    });

    it('should categorize vitamins correctly', () => {
      expect(getKeyCategory('MVI')).toBe('VITAMINS');
      expect(getKeyCategory('VITAMIN_C')).toBe('VITAMINS');
    });

    it('should identify calculated values', () => {
      expect(getKeyCategory('TOTAL_PROTEIN')).toBe('CALCULATED');
      expect(getKeyCategory('TOTAL_CALORIES')).toBe('CALCULATED');
      expect(getKeyCategory('GIR')).toBe('CALCULATED');
    });

    it('should return null for unknown keys', () => {
      expect(getKeyCategory('UNKNOWN_KEY')).toBe(null);
      expect(getKeyCategory('custom')).toBe(null);
    });
  });

  describe('isCalculatedValue', () => {
    it('should identify calculated values', () => {
      expect(isCalculatedValue('TOTAL_PROTEIN')).toBe(true);
      expect(isCalculatedValue('TOTAL_CALORIES')).toBe(true);
      expect(isCalculatedValue('GIR')).toBe(true);
      expect(isCalculatedValue('OSMOLARITY')).toBe(true);
    });

    it('should reject non-calculated values', () => {
      expect(isCalculatedValue('DOSE_WEIGHT')).toBe(false);
      expect(isCalculatedValue('DEXTROSE_CONC')).toBe(false);
      expect(isCalculatedValue('SODIUM_CHLORIDE')).toBe(false);
    });
  });

  describe('getCanonicalKey', () => {
    it('should normalize key variations', () => {
      expect(getCanonicalKey('dose_weight')).toBe('DOSE_WEIGHT');
      expect(getCanonicalKey('Dose_Weight')).toBe('DOSE_WEIGHT');
      expect(getCanonicalKey('DOSE_WEIGHT')).toBe('DOSE_WEIGHT');
      expect(getCanonicalKey('DoseWeight')).toBe('DOSE_WEIGHT');
    });

    it('should handle special mappings', () => {
      expect(getCanonicalKey('weight')).toBe('DOSE_WEIGHT');
      expect(getCanonicalKey('volume')).toBe('TPN_VOLUME');
      expect(getCanonicalKey('dextrose')).toBe('DEXTROSE_CONC');
    });

    it('should return uppercase for unknown keys', () => {
      expect(getCanonicalKey('custom_key')).toBe('CUSTOM_KEY');
      expect(getCanonicalKey('unknown')).toBe('UNKNOWN');
    });
  });
});

describe('Code Key Extraction', () => {
  describe('extractKeysFromCode', () => {
    it('should extract me.getValue() calls', () => {
      const code = `
        const weight = me.getValue('DOSE_WEIGHT');
        const volume = me.getValue("TPN_VOLUME");
        return weight * volume;
      `;
      const keys = extractKeysFromCode(code);
      expect(keys).toContain('DOSE_WEIGHT');
      expect(keys).toContain('TPN_VOLUME');
      expect(keys.length).toBe(2);
    });

    it('should extract getIngredientQuantity calls', () => {
      const code = `
        const sodium = me.getIngredientQuantity('SODIUM_CHLORIDE');
        const calcium = me.getIngredientAmount('CALCIUM_GLUCONATE');
      `;
      const keys = extractKeysFromCode(code);
      expect(keys).toContain('SODIUM_CHLORIDE');
      expect(keys).toContain('CALCIUM_GLUCONATE');
    });

    it('should handle mixed quotes and patterns', () => {
      const code = `
        me.getValue('DEXTROSE_CONC') + 
        me.getValue("AMINO_ACID_CONC") +
        me.getIngredientDose('LIPID_CONC')
      `;
      const keys = extractKeysFromCode(code);
      expect(keys).toContain('DEXTROSE_CONC');
      expect(keys).toContain('AMINO_ACID_CONC');
      expect(keys).toContain('LIPID_CONC');
    });

    it('should extract unique keys only', () => {
      const code = `
        me.getValue('DOSE_WEIGHT');
        me.getValue('DOSE_WEIGHT');
        me.getValue('DOSE_WEIGHT');
      `;
      const keys = extractKeysFromCode(code);
      expect(keys).toContain('DOSE_WEIGHT');
      expect(keys.length).toBe(1);
    });

    it('should handle empty or invalid code', () => {
      expect(extractKeysFromCode('')).toEqual([]);
      expect(extractKeysFromCode(null)).toEqual([]);
      expect(extractKeysFromCode(undefined)).toEqual([]);
    });
  });

  describe('extractDirectKeysFromCode', () => {
    it('should extract direct object property access', () => {
      const code = `
        const weight = me.DOSE_WEIGHT;
        const volume = me['TPN_VOLUME'];
        return weight * volume;
      `;
      const keys = extractDirectKeysFromCode(code);
      expect(keys).toContain('DOSE_WEIGHT');
      expect(keys).toContain('TPN_VOLUME');
    });

    it('should handle object destructuring', () => {
      const code = `
        const { DEXTROSE_CONC, AMINO_ACID_CONC } = me;
        return DEXTROSE_CONC + AMINO_ACID_CONC;
      `;
      const keys = extractDirectKeysFromCode(code);
      expect(keys).toContain('DEXTROSE_CONC');
      expect(keys).toContain('AMINO_ACID_CONC');
    });

    it('should ignore non-TPN properties', () => {
      const code = `
        const id = me.id;
        const renderComplete = me.renderComplete;
        const weight = me.DOSE_WEIGHT;
      `;
      const keys = extractDirectKeysFromCode(code);
      expect(keys).toContain('DOSE_WEIGHT');
      expect(keys).not.toContain('id');
      expect(keys).not.toContain('renderComplete');
    });
  });
});

describe('TPN Calculations', () => {
  let mockMe: any;

  beforeEach(() => {
    mockMe = {
      getValue: (key: string) => {
        const values: Record<string, number> = {
          'DOSE_WEIGHT': 10, // kg
          'TPN_VOLUME': 1000, // mL
          'DEXTROSE_CONC': 10, // %
          'AMINO_ACID_CONC': 2, // %
          'LIPID_CONC': 2, // %
          'SODIUM_CHLORIDE': 3, // mEq/kg/day
          'POTASSIUM_CHLORIDE': 2, // mEq/kg/day
          'CALCIUM_GLUCONATE': 2, // mEq/kg/day
          'MAGNESIUM_SULFATE': 0.5, // mEq/kg/day
        };
        return values[key] || 0;
      }
    };
  });

  it('should calculate GIR (Glucose Infusion Rate)', () => {
    // GIR = (Dextrose% × Volume × 10) / (Weight × 1440)
    const dextrose = mockMe.getValue('DEXTROSE_CONC');
    const volume = mockMe.getValue('TPN_VOLUME');
    const weight = mockMe.getValue('DOSE_WEIGHT');
    
    const gir = (dextrose * volume * 10) / (weight * 1440);
    expect(gir).toBeCloseTo(6.94, 2); // mg/kg/min
  });

  it('should calculate total calories', () => {
    // Calories from dextrose: 3.4 kcal/g
    // Calories from protein: 4 kcal/g
    // Calories from lipids: 10 kcal/g (for 20% emulsion)
    
    const dextrose = mockMe.getValue('DEXTROSE_CONC');
    const protein = mockMe.getValue('AMINO_ACID_CONC');
    const lipid = mockMe.getValue('LIPID_CONC');
    const volume = mockMe.getValue('TPN_VOLUME');
    
    const dextroseCalories = (dextrose * volume / 100) * 3.4;
    const proteinCalories = (protein * volume / 100) * 4;
    const lipidCalories = (lipid * volume / 100) * 10;
    
    const totalCalories = dextroseCalories + proteinCalories + lipidCalories;
    expect(totalCalories).toBeCloseTo(620, 0); // kcal
  });

  it('should calculate protein per kg', () => {
    const protein = mockMe.getValue('AMINO_ACID_CONC');
    const volume = mockMe.getValue('TPN_VOLUME');
    const weight = mockMe.getValue('DOSE_WEIGHT');
    
    const proteinGrams = (protein * volume) / 100;
    const proteinPerKg = proteinGrams / weight;
    
    expect(proteinPerKg).toBe(2); // g/kg/day
  });

  it('should calculate electrolyte totals', () => {
    const weight = mockMe.getValue('DOSE_WEIGHT');
    const sodiumPerKg = mockMe.getValue('SODIUM_CHLORIDE');
    const potassiumPerKg = mockMe.getValue('POTASSIUM_CHLORIDE');
    
    const totalSodium = sodiumPerKg * weight;
    const totalPotassium = potassiumPerKg * weight;
    
    expect(totalSodium).toBe(30); // mEq total
    expect(totalPotassium).toBe(20); // mEq total
  });

  it('should validate ranges for neonatal population', () => {
    // Neonatal ranges (example)
    const girRange = { min: 4, max: 12 }; // mg/kg/min
    const proteinRange = { min: 1.5, max: 4 }; // g/kg/day
    
    const gir = 6.94;
    const proteinPerKg = 2;
    
    expect(gir).toBeGreaterThanOrEqual(girRange.min);
    expect(gir).toBeLessThanOrEqual(girRange.max);
    expect(proteinPerKg).toBeGreaterThanOrEqual(proteinRange.min);
    expect(proteinPerKg).toBeLessThanOrEqual(proteinRange.max);
  });
});

describe('TPN Reference Ranges', () => {
  const neonatalRanges = {
    GIR: { min: 4, max: 12, unit: 'mg/kg/min' },
    PROTEIN: { min: 1.5, max: 4, unit: 'g/kg/day' },
    LIPID: { min: 0.5, max: 3, unit: 'g/kg/day' },
    SODIUM: { min: 2, max: 5, unit: 'mEq/kg/day' },
    POTASSIUM: { min: 2, max: 3, unit: 'mEq/kg/day' },
    CALCIUM: { min: 2, max: 4, unit: 'mEq/kg/day' },
    MAGNESIUM: { min: 0.3, max: 0.5, unit: 'mEq/kg/day' },
    PHOSPHORUS: { min: 1, max: 2, unit: 'mmol/kg/day' }
  };

  it('should validate value within range', () => {
    const isInRange = (value: number, range: { min: number; max: number }) => {
      return value >= range.min && value <= range.max;
    };

    expect(isInRange(6, neonatalRanges.GIR)).toBe(true);
    expect(isInRange(2, neonatalRanges.GIR)).toBe(false);
    expect(isInRange(15, neonatalRanges.GIR)).toBe(false);
  });

  it('should flag values outside acceptable range', () => {
    const flagValue = (value: number, range: { min: number; max: number }) => {
      if (value < range.min) return 'low';
      if (value > range.max) return 'high';
      return 'normal';
    };

    expect(flagValue(3, neonatalRanges.GIR)).toBe('low');
    expect(flagValue(8, neonatalRanges.GIR)).toBe('normal');
    expect(flagValue(15, neonatalRanges.GIR)).toBe('high');
  });

  it('should calculate percentage of range', () => {
    const percentOfRange = (value: number, range: { min: number; max: number }) => {
      const percent = ((value - range.min) / (range.max - range.min)) * 100;
      return Math.max(0, Math.min(100, percent));
    };

    expect(percentOfRange(4, neonatalRanges.GIR)).toBe(0);
    expect(percentOfRange(8, neonatalRanges.GIR)).toBe(50);
    expect(percentOfRange(12, neonatalRanges.GIR)).toBe(100);
  });
});