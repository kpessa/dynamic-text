import { describe, it, expect, beforeEach } from 'vitest';
import { ingredientService, type Ingredient } from '../ingredientService';
import type { Section } from '$lib/types';

describe('IngredientService', () => {
  let mockIngredient: Ingredient;
  let mockIngredients: Ingredient[];

  beforeEach(() => {
    mockIngredient = {
      KEYNAME: 'TestIngredient',
      DISPLAY: 'Test Ingredient',
      MNEMONIC: 'test',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [{ TEXT: 'Test note' }],
      ALTUOM: [],
      REFERENCE_RANGE: [
        { THRESHOLD: 'Normal Low', VALUE: 10 },
        { THRESHOLD: 'Normal High', VALUE: 100 }
      ],
      LABS: [],
      CONCENTRATION: {
        STRENGTH: 1,
        STRENGTH_UOM: 'mg',
        VOLUME: 1,
        VOLUME_UOM: 'mL'
      },
      EXCLUDES: []
    };

    mockIngredients = [
      mockIngredient,
      {
        ...mockIngredient,
        KEYNAME: 'AnotherIngredient',
        DISPLAY: 'Another Ingredient',
        MNEMONIC: 'another'
      }
    ];
  });

  describe('exportIngredient', () => {
    it('should export a single ingredient as JSON', () => {
      const json = ingredientService.exportIngredient(mockIngredient);
      const parsed = JSON.parse(json);
      
      expect(parsed.KEYNAME).toBe('TestIngredient');
      expect(parsed.DISPLAY).toBe('Test Ingredient');
      expect(parsed.NOTE).toEqual([{ TEXT: 'Test note' }]);
    });

    it('should transform sections to NOTE array when provided', () => {
      const sections: Section[] = [
        {
          id: '1',
          name: 'Section 1',
          type: 'static',
          content: 'Static content',
          isExpanded: false
        },
        {
          id: '2',
          name: 'Section 2',
          type: 'dynamic',
          content: 'const x = 1;',
          isExpanded: false
        }
      ];

      const json = ingredientService.exportIngredient(mockIngredient, sections);
      const parsed = JSON.parse(json);
      
      expect(parsed.NOTE).toHaveLength(2);
      expect(parsed.NOTE[0].TEXT).toBe('Static content');
      expect(parsed.NOTE[1].TEXT).toBe('const x = 1;');
    });
  });

  describe('exportIngredients', () => {
    it('should export multiple ingredients as JSON array', () => {
      const json = ingredientService.exportIngredients(mockIngredients);
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].KEYNAME).toBe('TestIngredient');
      expect(parsed[1].KEYNAME).toBe('AnotherIngredient');
    });

    it('should transform sections for specific ingredients when map provided', () => {
      const sectionsMap = new Map<string, Section[]>();
      sectionsMap.set('TestIngredient', [
        {
          id: '1',
          name: 'Custom Section',
          type: 'static',
          content: 'Custom content',
          isExpanded: false
        }
      ]);

      const json = ingredientService.exportIngredients(mockIngredients, sectionsMap);
      const parsed = JSON.parse(json);
      
      expect(parsed[0].NOTE[0].TEXT).toBe('Custom content');
      expect(parsed[1].NOTE[0].TEXT).toBe('Test note'); // Unchanged
    });
  });

  describe('importIngredient', () => {
    it('should successfully import valid ingredient JSON', () => {
      const json = JSON.stringify(mockIngredient);
      const result = ingredientService.importIngredient(json);
      
      expect(result.success).toBe(true);
      expect(result.ingredient).toBeDefined();
      expect(result.ingredient?.KEYNAME).toBe('TestIngredient');
    });

    it('should handle missing NOTE array', () => {
      const ingredient = { ...mockIngredient };
      delete (ingredient as any).NOTE;
      const json = JSON.stringify(ingredient);
      
      const result = ingredientService.importIngredient(json);
      
      expect(result.success).toBe(true);
      expect(result.ingredient?.NOTE).toEqual([]);
    });

    it('should fail on invalid JSON', () => {
      const result = ingredientService.importIngredient('invalid json');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse JSON');
    });

    it('should fail on missing required fields', () => {
      const invalidIngredient = { KEYNAME: 'Test' };
      const json = JSON.stringify(invalidIngredient);
      
      const result = ingredientService.importIngredient(json);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required field missing');
    });
  });

  describe('importIngredients', () => {
    it('should import array of valid ingredients', () => {
      const json = JSON.stringify(mockIngredients);
      const result = ingredientService.importIngredients(json);
      
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.successful[0].KEYNAME).toBe('TestIngredient');
    });

    it('should handle mixed valid and invalid ingredients', () => {
      const mixed = [
        mockIngredient,
        { KEYNAME: 'Invalid' } // Missing required fields
      ];
      const json = JSON.stringify(mixed);
      
      const result = ingredientService.importIngredients(json);
      
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Required field missing');
    });

    it('should fail if not an array', () => {
      const json = JSON.stringify(mockIngredient);
      const result = ingredientService.importIngredients(json);
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Expected an array of ingredients');
    });
  });

  describe('validateIngredient', () => {
    it('should validate a correct ingredient', () => {
      const result = ingredientService.validateIngredient(mockIngredient);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalid = { KEYNAME: 'Test' };
      const result = ingredientService.validateIngredient(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DISPLAY'))).toBe(true);
      expect(result.errors.some(e => e.includes('MNEMONIC'))).toBe(true);
      expect(result.errors.some(e => e.includes('UOM_DISP'))).toBe(true);
      expect(result.errors.some(e => e.includes('TYPE'))).toBe(true);
    });

    it('should validate TYPE enum values', () => {
      const invalid = { ...mockIngredient, TYPE: 'InvalidType' as any };
      const result = ingredientService.validateIngredient(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid TYPE value'))).toBe(true);
    });

    it('should validate REFERENCE_RANGE thresholds', () => {
      const invalid = {
        ...mockIngredient,
        REFERENCE_RANGE: [
          { THRESHOLD: 'Invalid' as any, VALUE: 10 }
        ]
      };
      const result = ingredientService.validateIngredient(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid THRESHOLD'))).toBe(true);
    });

    it('should validate NOTE array structure', () => {
      const invalid = {
        ...mockIngredient,
        NOTE: [{ WRONG: 'property' }] as any
      };
      const result = ingredientService.validateIngredient(invalid);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('NOTE array must contain objects with TEXT property'))).toBe(true);
    });

    it('should add warnings for best practices', () => {
      const ingredient = { ...mockIngredient, NOTE: [], REFERENCE_RANGE: [] };
      const result = ingredientService.validateIngredient(ingredient);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('NOTE array is empty'))).toBe(true);
      expect(result.warnings.some(w => w.includes('No REFERENCE_RANGE defined'))).toBe(true);
    });
  });

  describe('checkDuplicateIngredient', () => {
    it('should detect duplicate KEYNAME', () => {
      const isDuplicate = ingredientService.checkDuplicateIngredient('TestIngredient', mockIngredients);
      expect(isDuplicate).toBe(true);
    });

    it('should return false for unique KEYNAME', () => {
      const isDuplicate = ingredientService.checkDuplicateIngredient('UniqueKey', mockIngredients);
      expect(isDuplicate).toBe(false);
    });
  });

  describe('mergeIngredient', () => {
    it('should add new ingredient when no duplicate', () => {
      const newIngredient = { ...mockIngredient, KEYNAME: 'NewIngredient' };
      const result = ingredientService.mergeIngredient(newIngredient, mockIngredients);
      
      expect(result.ingredients).toHaveLength(3);
      expect(result.result.success).toBe(true);
      expect(result.result.duplicateFound).toBeUndefined();
    });

    it('should skip duplicate with skip strategy', () => {
      const duplicate = { ...mockIngredient, DISPLAY: 'Modified' };
      const result = ingredientService.mergeIngredient(duplicate, mockIngredients, 'skip');
      
      expect(result.ingredients).toHaveLength(2);
      expect(result.result.success).toBe(false);
      expect(result.result.duplicateFound).toBe(true);
      expect(result.result.error).toContain('already exists');
    });

    it('should overwrite duplicate with overwrite strategy', () => {
      const duplicate = { ...mockIngredient, DISPLAY: 'Modified' };
      const result = ingredientService.mergeIngredient(duplicate, mockIngredients, 'overwrite');
      
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0].DISPLAY).toBe('Modified');
      expect(result.result.success).toBe(true);
      expect(result.result.duplicateFound).toBe(true);
    });

    it('should rename duplicate with rename strategy', () => {
      const duplicate = { ...mockIngredient };
      const result = ingredientService.mergeIngredient(duplicate, mockIngredients, 'rename');
      
      expect(result.ingredients).toHaveLength(3);
      expect(result.result.success).toBe(true);
      expect(result.result.duplicateFound).toBe(true);
      expect(result.result.newKeyname).toBe('TestIngredient_2');
      expect(result.result.originalKeyname).toBe('TestIngredient');
    });
  });

  describe('filterByType', () => {
    it('should filter ingredients by type', () => {
      const filtered = ingredientService.filterByType(mockIngredients, 'Micronutrient');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(i => i.TYPE === 'Micronutrient')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const filtered = ingredientService.filterByType(mockIngredients, 'Salt');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('searchIngredients', () => {
    it('should search by display name', () => {
      const results = ingredientService.searchIngredients(mockIngredients, 'Test');
      expect(results).toHaveLength(1);
      expect(results[0].KEYNAME).toBe('TestIngredient');
    });

    it('should search by mnemonic', () => {
      const results = ingredientService.searchIngredients(mockIngredients, 'another');
      expect(results).toHaveLength(1);
      expect(results[0].KEYNAME).toBe('AnotherIngredient');
    });

    it('should search by KEYNAME', () => {
      const results = ingredientService.searchIngredients(mockIngredients, 'AnotherIngredient');
      expect(results).toHaveLength(1);
      expect(results[0].KEYNAME).toBe('AnotherIngredient');
    });

    it('should be case insensitive', () => {
      const results = ingredientService.searchIngredients(mockIngredients, 'TEST');
      expect(results).toHaveLength(1);
      expect(results[0].KEYNAME).toBe('TestIngredient');
    });
  });

  describe('sortByDisplayName', () => {
    it('should sort ingredients alphabetically by display name', () => {
      const unsorted = [
        { ...mockIngredient, DISPLAY: 'Zinc' },
        { ...mockIngredient, DISPLAY: 'Calcium' },
        { ...mockIngredient, DISPLAY: 'Iron' }
      ];
      
      const sorted = ingredientService.sortByDisplayName(unsorted);
      
      expect(sorted[0].DISPLAY).toBe('Calcium');
      expect(sorted[1].DISPLAY).toBe('Iron');
      expect(sorted[2].DISPLAY).toBe('Zinc');
    });
  });
});