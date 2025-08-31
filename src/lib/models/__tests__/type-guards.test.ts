import { describe, it, expect } from 'vitest';
import type { 
  Ingredient, 
  ConfigManifest, 
  IngredientReference,
  PopulationVariant,
  IngredientMetadata,
  Section,
  TestCase,
  ConfigSource,
  ConfigSettings
} from '../index';
import { 
  isIngredient, 
  isConfigManifest, 
  isLegacyConfig,
  isIngredientReference,
  isPopulationVariant,
  isSection,
  isTestCase 
} from '../transformations';

describe('Type Guards', () => {
  describe('isIngredient type guard', () => {
    it('should return true for valid minimal ingredient', () => {
      const valid = { 
        id: 'calcium', 
        keyname: 'Calcium', 
        sections: [], 
        tests: [] 
      };
      expect(isIngredient(valid)).toBe(true);
    });

    it('should return true for complete ingredient with all properties', () => {
      const valid: Ingredient = {
        id: 'phosphate',
        keyname: 'Phosphate',
        displayName: 'Phosphate Additive',
        category: 'Salt',
        sections: [
          { 
            id: 'sec1',
            type: 'javascript',
            content: 'console.log("test");',
            order: 0
          }
        ],
        tests: [
          {
            id: 'test1',
            name: 'Test Case 1',
            variables: { test: 1 },
            expected: 'success'
          }
        ],
        variants: new Map([
          ['neonatal', { 
            populationType: 'neonatal',
            overrides: {
              displayName: 'Phosphate (Neonatal)',
              sections: []
            }
          }]
        ]),
        metadata: {
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'test-user'
        }
      };
      expect(isIngredient(valid)).toBe(true);
    });
    
    it('should return false for missing required id field', () => {
      const invalid = { 
        keyname: 'Calcium',
        sections: [],
        tests: []
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for missing required keyname field', () => {
      const invalid = { 
        id: 'calcium',
        sections: [],
        tests: []
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for missing required sections field', () => {
      const invalid = { 
        id: 'calcium',
        keyname: 'Calcium',
        tests: []
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for missing required tests field', () => {
      const invalid = { 
        id: 'calcium',
        keyname: 'Calcium',
        sections: []
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for invalid sections type', () => {
      const invalid = { 
        id: 'calcium',
        keyname: 'Calcium',
        sections: 'not-an-array',
        tests: []
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for invalid tests type', () => {
      const invalid = { 
        id: 'calcium',
        keyname: 'Calcium',
        sections: [],
        tests: 'not-an-array'
      };
      expect(isIngredient(invalid)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isIngredient(null)).toBe(false);
      expect(isIngredient(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isIngredient('string')).toBe(false);
      expect(isIngredient(123)).toBe(false);
      expect(isIngredient(true)).toBe(false);
      expect(isIngredient([])).toBe(false);
    });
  });

  describe('isConfigManifest type guard', () => {
    it('should return true for valid minimal config manifest', () => {
      const valid = {
        id: 'choc-pediatric-tpn',
        name: 'CHOC Pediatric TPN',
        ingredientRefs: []
      };
      expect(isConfigManifest(valid)).toBe(true);
    });

    it('should return true for complete config manifest', () => {
      const valid: ConfigManifest = {
        id: 'choc-adult-tpn',
        name: 'CHOC Adult TPN',
        source: {
          path: 'refs/adult-build-main-choc.json',
          importedAt: new Date().toISOString(),
          sha256: 'abc123def456'
        },
        ingredientRefs: [
          { ingredientId: 'calcium', overrides: null },
          { ingredientId: 'phosphate', overrides: { displayName: 'Custom Phosphate' } }
        ],
        settings: {
          flexEnabled: true,
          defaultPopulation: 'adult'
        }
      };
      expect(isConfigManifest(valid)).toBe(true);
    });

    it('should return false for missing required id field', () => {
      const invalid = {
        name: 'CHOC Pediatric TPN',
        ingredientRefs: []
      };
      expect(isConfigManifest(invalid)).toBe(false);
    });

    it('should return false for missing required name field', () => {
      const invalid = {
        id: 'choc-pediatric-tpn',
        ingredientRefs: []
      };
      expect(isConfigManifest(invalid)).toBe(false);
    });

    it('should return false for missing required ingredientRefs field', () => {
      const invalid = {
        id: 'choc-pediatric-tpn',
        name: 'CHOC Pediatric TPN'
      };
      expect(isConfigManifest(invalid)).toBe(false);
    });

    it('should return false for invalid ingredientRefs type', () => {
      const invalid = {
        id: 'choc-pediatric-tpn',
        name: 'CHOC Pediatric TPN',
        ingredientRefs: 'not-an-array'
      };
      expect(isConfigManifest(invalid)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isConfigManifest(null)).toBe(false);
      expect(isConfigManifest(undefined)).toBe(false);
    });
  });

  describe('isLegacyConfig type guard', () => {
    it('should return true for legacy config with KEYNAME', () => {
      const legacy = {
        KEYNAME: 'Calcium',
        DISPLAY: 'Calcium Gluconate',
        TYPE: 'Salt',
        sections: []
      };
      expect(isLegacyConfig(legacy)).toBe(true);
    });

    it('should return true for legacy config with minimal fields', () => {
      const legacy = {
        KEYNAME: 'Phosphate',
        sections: []
      };
      expect(isLegacyConfig(legacy)).toBe(true);
    });

    it('should return false for new ingredient format', () => {
      const newFormat = {
        id: 'calcium',
        keyname: 'Calcium',
        sections: [],
        tests: []
      };
      expect(isLegacyConfig(newFormat)).toBe(false);
    });

    it('should return false for missing KEYNAME', () => {
      const invalid = {
        DISPLAY: 'Calcium',
        sections: []
      };
      expect(isLegacyConfig(invalid)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isLegacyConfig(null)).toBe(false);
      expect(isLegacyConfig(undefined)).toBe(false);
    });
  });

  describe('isIngredientReference type guard', () => {
    it('should return true for valid ingredient reference', () => {
      const valid = {
        ingredientId: 'calcium',
        overrides: null
      };
      expect(isIngredientReference(valid)).toBe(true);
    });

    it('should return true for reference with overrides', () => {
      const valid = {
        ingredientId: 'phosphate',
        overrides: {
          displayName: 'Custom Phosphate',
          sections: []
        }
      };
      expect(isIngredientReference(valid)).toBe(true);
    });

    it('should return false for missing ingredientId', () => {
      const invalid = {
        overrides: null
      };
      expect(isIngredientReference(invalid)).toBe(false);
    });

    it('should return false for invalid ingredientId type', () => {
      const invalid = {
        ingredientId: 123,
        overrides: null
      };
      expect(isIngredientReference(invalid)).toBe(false);
    });
  });

  describe('isPopulationVariant type guard', () => {
    it('should return true for valid population variant', () => {
      const valid = {
        populationType: 'neonatal',
        overrides: {
          displayName: 'Calcium (Neonatal)',
          sections: []
        }
      };
      expect(isPopulationVariant(valid)).toBe(true);
    });

    it('should return false for missing populationType', () => {
      const invalid = {
        overrides: {}
      };
      expect(isPopulationVariant(invalid)).toBe(false);
    });

    it('should return false for invalid populationType', () => {
      const invalid = {
        populationType: 123,
        overrides: {}
      };
      expect(isPopulationVariant(invalid)).toBe(false);
    });
  });

  describe('isSection type guard', () => {
    it('should return true for valid section', () => {
      const valid = {
        id: 'section1',
        type: 'javascript',
        content: 'console.log("test");',
        order: 0
      };
      expect(isSection(valid)).toBe(true);
    });

    it('should return true for HTML section', () => {
      const valid = {
        id: 'section2',
        type: 'html',
        content: '<div>Test</div>',
        order: 1
      };
      expect(isSection(valid)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalid = {
        id: 'section1',
        content: 'test'
      };
      expect(isSection(invalid)).toBe(false);
    });

    it('should return false for invalid type value', () => {
      const invalid = {
        id: 'section1',
        type: 'invalid',
        content: 'test',
        order: 0
      };
      expect(isSection(invalid)).toBe(false);
    });
  });

  describe('isTestCase type guard', () => {
    it('should return true for valid test case', () => {
      const valid = {
        id: 'test1',
        name: 'Test Case 1',
        variables: { x: 1, y: 2 }
      };
      expect(isTestCase(valid)).toBe(true);
    });

    it('should return true for test with expected value', () => {
      const valid = {
        id: 'test2',
        name: 'Test Case 2',
        variables: { input: 'test' },
        expected: 'output'
      };
      expect(isTestCase(valid)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalid = {
        id: 'test1',
        variables: {}
      };
      expect(isTestCase(invalid)).toBe(false);
    });

    it('should return false for invalid variables type', () => {
      const invalid = {
        id: 'test1',
        name: 'Test',
        variables: 'not-an-object'
      };
      expect(isTestCase(invalid)).toBe(false);
    });
  });

  describe('Complex nested structure validation', () => {
    it('should validate complete ingredient with nested sections and tests', () => {
      const complex: Ingredient = {
        id: 'complex-ingredient',
        keyname: 'ComplexIngredient',
        displayName: 'Complex Ingredient Example',
        category: 'Advanced',
        sections: [
          {
            id: 'sec1',
            type: 'html',
            content: '<h1>Title</h1>',
            order: 0
          },
          {
            id: 'sec2',
            type: 'javascript',
            content: 'return me.getValue("test");',
            order: 1
          }
        ],
        tests: [
          {
            id: 'test1',
            name: 'Basic Test',
            variables: { test: 100 },
            expected: '100'
          },
          {
            id: 'test2',
            name: 'Advanced Test',
            variables: { test: 200, multiplier: 2 },
            expected: '400'
          }
        ],
        variants: new Map([
          ['neonatal', {
            populationType: 'neonatal',
            overrides: {
              displayName: 'Complex (Neo)',
              sections: [
                {
                  id: 'neo-sec',
                  type: 'javascript',
                  content: 'return "neonatal";',
                  order: 0
                }
              ]
            }
          }],
          ['adult', {
            populationType: 'adult',
            overrides: {
              displayName: 'Complex (Adult)',
              tests: [
                {
                  id: 'adult-test',
                  name: 'Adult Test',
                  variables: { adultValue: 500 }
                }
              ]
            }
          }]
        ]),
        metadata: {
          version: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          author: 'test-system',
          tags: ['complex', 'example']
        }
      };
      
      expect(isIngredient(complex)).toBe(true);
      
      // Validate nested sections
      complex.sections.forEach(section => {
        expect(isSection(section)).toBe(true);
      });
      
      // Validate nested tests
      complex.tests.forEach(test => {
        expect(isTestCase(test)).toBe(true);
      });
      
      // Validate population variants
      complex.variants.forEach(variant => {
        expect(isPopulationVariant(variant)).toBe(true);
      });
    });

    it('should validate complete config manifest with nested references', () => {
      const complex: ConfigManifest = {
        id: 'complex-manifest',
        name: 'Complex Config Manifest',
        source: {
          path: 'refs/complex.json',
          importedAt: '2024-01-01T00:00:00Z',
          sha256: 'abc123',
          originalFormat: 'legacy'
        },
        ingredientRefs: [
          {
            ingredientId: 'calcium',
            overrides: null
          },
          {
            ingredientId: 'phosphate',
            overrides: {
              displayName: 'Modified Phosphate',
              sections: [
                {
                  id: 'override-sec',
                  type: 'javascript',
                  content: 'return "overridden";',
                  order: 0
                }
              ],
              tests: [
                {
                  id: 'override-test',
                  name: 'Override Test',
                  variables: { value: 999 }
                }
              ]
            }
          }
        ],
        settings: {
          flexEnabled: true,
          defaultPopulation: 'pediatric',
          customSettings: {
            theme: 'dark',
            autoSave: true
          }
        }
      };
      
      expect(isConfigManifest(complex)).toBe(true);
      
      // Validate nested ingredient references
      complex.ingredientRefs.forEach(ref => {
        expect(isIngredientReference(ref)).toBe(true);
      });
    });
  });
});