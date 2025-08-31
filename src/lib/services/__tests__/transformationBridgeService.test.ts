import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Ingredient, Section, TestCase, PopulationVariant } from '../../models';
import type { TPNAdvisorType, TPNAdvisorAlias } from '../../../types/tpn';
import { TransformationBridgeService } from '../transformationBridgeService';
import { noteTransformService } from '../noteTransformService';

// Mock noteTransformService
vi.mock('../noteTransformService', () => ({
  noteTransformService: {
    sectionsToNoteArray: vi.fn((sections) => 
      sections.map((s: any) => ({ TEXT: s.content }))
    ),
    noteArrayToSections: vi.fn((notes, key) => 
      notes.map((n: any, i: number) => ({
        id: i,
        type: 'dynamic',
        content: n.TEXT,
        testCases: []
      }))
    )
  }
}));

// Helper to create mock config
function mockConfig(overrides?: any) {
  return {
    KEYNAME: 'Calcium',
    DISPLAY: 'Calcium Gluconate',
    TYPE: 'Salt',
    UOM_DISP: 'mEq/kg/day',
    OSMO_RATIO: 2.0,
    PRECISION: 2,
    NOTE: [
      { TEXT: 'return me.getValue("calcium");' }
    ],
    REFERENCE_RANGE: [
      { THRESHOLD: 'Normal Low', VALUE: 1.0 },
      { THRESHOLD: 'Normal High', VALUE: 3.0 }
    ],
    ...overrides
  };
}

// Helper to create mock ingredient
function mockIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    id: 'calcium',
    keyname: 'Calcium',
    displayName: 'Calcium Gluconate',
    category: 'Salt',
    sections: [
      {
        id: 'sec-1',
        type: 'javascript',
        content: 'return me.getValue("calcium");',
        order: 0
      }
    ],
    tests: [
      {
        id: 'test-1',
        name: 'Normal Range',
        variables: { calcium: 2.5 }
      }
    ],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    ...overrides
  };
}

describe('TransformationBridgeService', () => {
  let service: TransformationBridgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TransformationBridgeService();
  });

  describe('Round-trip transformations', () => {
    it('should preserve all data in config→ingredient→config', () => {
      const original = mockConfig();
      const ingredient = service.configToIngredient(original);
      const result = service.ingredientToConfig(ingredient);
      
      expect(result.KEYNAME).toBe(original.KEYNAME);
      expect(result.DISPLAY).toBe(original.DISPLAY);
      expect(result.TYPE).toBe(original.TYPE);
      expect(result.NOTE).toEqual(original.NOTE);
    });

    it('should preserve all data in ingredient→config→ingredient', () => {
      const original = mockIngredient();
      const config = service.ingredientToConfig(original);
      const result = service.configToIngredient(config);
      
      expect(result.id).toBe(original.id);
      expect(result.keyname).toBe(original.keyname);
      expect(result.displayName).toBe(original.displayName);
      expect(result.category).toBe(original.category);
      expect(result.sections.length).toBe(original.sections.length);
      expect(result.tests).toEqual(original.tests);
    });

    it('should handle complex nested structures', () => {
      const complex = mockIngredient({
        variants: new Map([
          ['NEO', {
            populationType: 'neonatal',
            overrides: {
              displayName: 'Calcium (Neonatal)',
              sections: [
                {
                  id: 'neo-sec',
                  type: 'javascript',
                  content: 'return "neonatal";',
                  order: 0
                }
              ]
            }
          }]
        ])
      });

      const config = service.ingredientToConfig(complex);
      const result = service.configToIngredient(config);
      
      expect(result.keyname).toBe(complex.keyname);
      expect(result.sections.length).toBe(complex.sections.length);
    });
  });

  describe('Backward compatibility', () => {
    it('should preserve existing configToSections function', () => {
      const config = mockConfig();
      const sections = service.configToSections(config);
      
      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);
      expect(noteTransformService.noteArrayToSections).toHaveBeenCalled();
    });

    it('should preserve existing sectionsToConfig function', () => {
      const sections: Section[] = [
        {
          id: 'sec-1',
          type: 'javascript',
          content: 'return "test";',
          order: 0
        }
      ];
      
      const config = service.sectionsToConfig(sections, 'TestIngredient');
      
      expect(config).toBeDefined();
      expect(config.KEYNAME).toBe('TestIngredient');
      expect(noteTransformService.sectionsToNoteArray).toHaveBeenCalled();
    });

    it('should handle legacy population type names', () => {
      const config = mockConfig({ POPULATION: 'Neonatal' });
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient).toBeDefined();
      expect(ingredient.metadata).toBeDefined();
    });
  });

  describe('Config to Ingredient transformation', () => {
    it('should extract basic fields correctly', () => {
      const config = mockConfig();
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient.id).toBe('calcium');
      expect(ingredient.keyname).toBe('Calcium');
      expect(ingredient.displayName).toBe('Calcium Gluconate');
      expect(ingredient.category).toBe('Salt');
    });

    it('should convert NOTE array to sections', () => {
      const config = mockConfig({
        NOTE: [
          { TEXT: 'First section' },
          { TEXT: 'Second section' }
        ]
      });
      
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient.sections).toBeDefined();
      expect(ingredient.sections.length).toBeGreaterThan(0);
      expect(noteTransformService.noteArrayToSections).toHaveBeenCalled();
    });

    it('should handle missing NOTE array', () => {
      const config = mockConfig({ NOTE: undefined });
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient.sections).toEqual([]);
    });

    it('should extract metadata fields', () => {
      const config = mockConfig({
        UOM_DISP: 'mg/dL',
        OSMO_RATIO: 1.5,
        PRECISION: 3
      });
      
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient.metadata).toBeDefined();
      expect(ingredient.metadata?.uomDisplay).toBe('mg/dL');
      expect(ingredient.metadata?.osmoRatio).toBe(1.5);
      expect(ingredient.metadata?.precision).toBe(3);
    });

    it('should handle reference ranges', () => {
      const config = mockConfig();
      const ingredient = service.configToIngredient(config);
      
      expect(ingredient.metadata?.referenceRanges).toBeDefined();
      expect(ingredient.metadata?.referenceRanges).toHaveLength(2);
    });
  });

  describe('Ingredient to Config transformation', () => {
    it('should map basic fields correctly', () => {
      const ingredient = mockIngredient();
      const config = service.ingredientToConfig(ingredient);
      
      expect(config.KEYNAME).toBe('Calcium');
      expect(config.DISPLAY).toBe('Calcium Gluconate');
      expect(config.TYPE).toBe('Salt');
    });

    it('should convert sections to NOTE array', () => {
      const ingredient = mockIngredient({
        sections: [
          {
            id: 'sec-1',
            type: 'javascript',
            content: 'First content',
            order: 0
          },
          {
            id: 'sec-2',
            type: 'html',
            content: '<div>Second</div>',
            order: 1
          }
        ]
      });
      
      const config = service.ingredientToConfig(ingredient);
      
      expect(config.NOTE).toBeDefined();
      expect(Array.isArray(config.NOTE)).toBe(true);
      expect(noteTransformService.sectionsToNoteArray).toHaveBeenCalled();
    });

    it('should include metadata fields', () => {
      const ingredient = mockIngredient({
        metadata: {
          version: 1,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          uomDisplay: 'mg/dL',
          osmoRatio: 2.5,
          precision: 2,
          referenceRanges: [
            { THRESHOLD: 'Normal Low', VALUE: 1.0 }
          ]
        }
      });
      
      const config = service.ingredientToConfig(ingredient);
      
      expect(config.UOM_DISP).toBe('mg/dL');
      expect(config.OSMO_RATIO).toBe(2.5);
      expect(config.PRECISION).toBe(2);
      expect(config.REFERENCE_RANGE).toHaveLength(1);
    });

    it('should handle empty sections gracefully', () => {
      const ingredient = mockIngredient({ sections: [] });
      const config = service.ingredientToConfig(ingredient);
      
      expect(config.NOTE).toEqual([]);
    });
  });

  describe('Population variant handling', () => {
    it('should apply population-specific variant', () => {
      const ingredient = mockIngredient({
        variants: new Map([
          ['NEO', {
            populationType: 'neonatal',
            overrides: {
              displayName: 'Calcium (Neonatal)',
              sections: [
                {
                  id: 'neo-1',
                  type: 'javascript',
                  content: 'return "neonatal calcium";',
                  order: 0
                }
              ]
            }
          }]
        ])
      });
      
      const config = service.ingredientToConfigWithPopulation(ingredient, 'NEO');
      
      expect(config.DISPLAY).toBe('Calcium (Neonatal)');
      expect(config.NOTE).toBeDefined();
    });

    it('should handle alias resolution for infant→NEO', () => {
      const ingredient = mockIngredient({
        variants: new Map([
          ['NEO', {
            populationType: 'neonatal',
            overrides: {
              displayName: 'Infant Formula'
            }
          }]
        ])
      });
      
      const config = service.ingredientToConfigWithPopulation(ingredient, 'infant' as TPNAdvisorAlias);
      
      expect(config.DISPLAY).toBe('Infant Formula');
    });

    it('should handle pediatric alias mapping to multiple types', () => {
      const ingredient = mockIngredient({
        variants: new Map([
          ['CHILD', {
            populationType: 'child',
            overrides: { displayName: 'Child Formula' }
          }],
          ['ADOLESCENT', {
            populationType: 'adolescent',
            overrides: { displayName: 'Adolescent Formula' }
          }]
        ])
      });
      
      const configs = service.ingredientToConfigWithMultiplePopulations(
        ingredient, 
        ['CHILD', 'ADOLESCENT']
      );
      
      expect(configs).toHaveLength(2);
      expect(configs[0].DISPLAY).toBe('Child Formula');
      expect(configs[1].DISPLAY).toBe('Adolescent Formula');
    });

    it('should fallback to base when variant not found', () => {
      const ingredient = mockIngredient();
      const config = service.ingredientToConfigWithPopulation(ingredient, 'ADULT');
      
      expect(config.DISPLAY).toBe('Calcium Gluconate');
    });
  });

  describe('Batch operations', () => {
    it('should extract unique ingredients from multiple configs', () => {
      const configs = [
        mockConfig({ KEYNAME: 'Calcium' }),
        mockConfig({ KEYNAME: 'Phosphate', DISPLAY: 'Phosphate' }),
        mockConfig({ KEYNAME: 'Calcium' }) // Duplicate
      ];
      
      const ingredients = service.extractIngredientsFromConfigs(configs, true);
      
      expect(ingredients).toHaveLength(2);
      expect(ingredients.find(i => i.keyname === 'Calcium')).toBeDefined();
      expect(ingredients.find(i => i.keyname === 'Phosphate')).toBeDefined();
    });

    it('should preserve all configs when deduplication disabled', () => {
      const configs = [
        mockConfig({ KEYNAME: 'Calcium' }),
        mockConfig({ KEYNAME: 'Calcium' })
      ];
      
      const ingredients = service.extractIngredientsFromConfigs(configs, false);
      
      expect(ingredients).toHaveLength(2);
    });

    it('should handle empty config array', () => {
      const ingredients = service.extractIngredientsFromConfigs([]);
      
      expect(ingredients).toEqual([]);
    });
  });

  describe('Validation', () => {
    it('should validate round-trip transformation', () => {
      const original = mockConfig();
      const result = service.validateRoundTrip(original);
      
      expect(result.valid).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it('should detect data loss in transformation', () => {
      const original = mockConfig({
        CUSTOM_FIELD: 'This will be lost'
      });
      
      const result = service.validateRoundTrip(original);
      
      expect(result.valid).toBe(false);
      expect(result.differences).toContain('CUSTOM_FIELD');
    });

    it('should validate ingredient round-trip', () => {
      const original = mockIngredient();
      const result = service.validateIngredientRoundTrip(original);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle null config gracefully', () => {
      const ingredient = service.configToIngredient(null);
      
      expect(ingredient).toBeDefined();
      expect(ingredient.id).toBe('');
      expect(ingredient.sections).toEqual([]);
    });

    it('should handle malformed config', () => {
      const badConfig = { invalid: 'structure' };
      const ingredient = service.configToIngredient(badConfig);
      
      expect(ingredient).toBeDefined();
      expect(ingredient.keyname).toBe('');
    });

    it('should handle null ingredient gracefully', () => {
      const config = service.ingredientToConfig(null as any);
      
      expect(config).toBeDefined();
      expect(config.KEYNAME).toBe('');
      expect(config.NOTE).toEqual([]);
    });

    it('should log warnings for missing required fields', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      const incomplete = { DISPLAY: 'Only Display' };
      
      service.configToIngredient(incomplete);
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Performance optimization', () => {
    it('should cache frequently transformed items', () => {
      const config = mockConfig();
      
      // Transform same config multiple times
      const result1 = service.configToIngredient(config);
      const result2 = service.configToIngredient(config);
      
      // Should return same cached instance
      expect(result1).toBe(result2);
    });

    it('should invalidate cache on data change', () => {
      const config1 = mockConfig();
      const config2 = mockConfig({ DISPLAY: 'Changed' });
      
      const result1 = service.configToIngredient(config1);
      const result2 = service.configToIngredient(config2);
      
      expect(result1).not.toBe(result2);
      expect(result1.displayName).not.toBe(result2.displayName);
    });
  });
});