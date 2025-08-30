import { describe, it, expect, beforeEach } from 'vitest';
import { tpnConfigService } from '../tpnConfigService';
import type { TPNConfiguration, Ingredient, FlexConfig } from '../tpnConfigService';
import type { Section } from '$lib/types';

describe('TPNConfigService', () => {
  let service: typeof tpnConfigService;
  let validConfig: TPNConfiguration;
  let validIngredient: Ingredient;

  beforeEach(() => {
    service = tpnConfigService;
    
    validIngredient = {
      KEYNAME: 'TestIngredient',
      DISPLAY: 'Test Ingredient',
      MNEMONIC: 'TEST',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [
        { TEXT: 'This is a test note' },
        { TEXT: 'const value = me.getValue("test");' }
      ],
      ALTUOM: [],
      REFERENCE_RANGE: [
        { THRESHOLD: 'Normal Low', VALUE: 10 },
        { THRESHOLD: 'Normal High', VALUE: 100 }
      ],
      LABS: [
        { DISPLAY: 'Test Lab', EVENT_SET_NAME: 'Test Event', GRAPH: 1 }
      ],
      CONCENTRATION: {
        STRENGTH: 10,
        STRENGTH_UOM: 'mg',
        VOLUME: 1,
        VOLUME_UOM: 'mL'
      },
      EXCLUDES: []
    };

    validConfig = {
      INGREDIENT: [validIngredient],
      FLEX: [
        {
          NAME: 'TestFlex',
          VALUE: '100',
          CONFIG_COMMENT: 'Test flex config'
        }
      ]
    };
  });

  describe('validateTPNConfig', () => {
    it('should validate a correct TPN configuration', () => {
      const result = service.validateTPNConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object configurations', () => {
      const invalidConfigs = [null, undefined, 'string', 123, []];
      
      invalidConfigs.forEach(config => {
        const result = service.validateTPNConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should require INGREDIENT array', () => {
      const invalidConfig = { FLEX: [] };
      const result = service.validateTPNConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must have an INGREDIENT array');
    });

    it('should require FLEX array', () => {
      const invalidConfig = { INGREDIENT: [] };
      const result = service.validateTPNConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must have a FLEX array');
    });

    it('should validate ingredient required fields', () => {
      const invalidIngredient = {
        KEYNAME: 123, // Should be string
        DISPLAY: 'Test',
        MNEMONIC: 'TEST',
        UOM_DISP: 'mg',
        TYPE: 'InvalidType', // Invalid enum value
        OSMO_RATIO: '0', // Should be number
        EDITMODE: 'Invalid', // Invalid enum value
        PRECISION: '2', // Should be number
        SPECIAL: '',
        NOTE: [{ text: 'wrong key' }], // Invalid NOTE format
        ALTUOM: 'not array', // Should be array
        REFERENCE_RANGE: null,
        LABS: {},
        CONCENTRATION: [],
        EXCLUDES: ''
      };

      const config = {
        INGREDIENT: [invalidIngredient],
        FLEX: []
      };

      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });

    it('should validate TYPE enum values', () => {
      const ingredient = { ...validIngredient, TYPE: 'InvalidType' as any };
      const config = { INGREDIENT: [ingredient], FLEX: [] };
      
      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TYPE must be one of'))).toBe(true);
    });

    it('should validate EDITMODE enum values', () => {
      const ingredient = { ...validIngredient, EDITMODE: 'Invalid' as any };
      const config = { INGREDIENT: [ingredient], FLEX: [] };
      
      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('EDITMODE must be either'))).toBe(true);
    });

    it('should validate NOTE array format', () => {
      const ingredient = {
        ...validIngredient,
        NOTE: [
          { TEXT: 'Valid note' },
          { text: 'Invalid key' },
          { TEXT: 123 }, // Wrong type
          'string', // Not an object
        ] as any
      };
      const config = { INGREDIENT: [ingredient], FLEX: [] };
      
      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('NOTE must be an array'))).toBe(true);
    });

    it('should validate CONCENTRATION structure', () => {
      const ingredient = {
        ...validIngredient,
        CONCENTRATION: {
          STRENGTH: 'not a number',
          STRENGTH_UOM: 'mg',
          VOLUME: 'not a number',
          VOLUME_UOM: 'mL'
        } as any
      };
      const config = { INGREDIENT: [ingredient], FLEX: [] };
      
      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('CONCENTRATION.STRENGTH'))).toBe(true);
      expect(result.errors.some(e => e.includes('CONCENTRATION.VOLUME'))).toBe(true);
    });

    it('should validate FLEX config structure', () => {
      const invalidFlex = {
        NAME: 123, // Should be string
        VALUE: null, // Should be string
        ALT_VALUE: 'not array' // Should be array if present
      };
      const config = {
        INGREDIENT: [],
        FLEX: [invalidFlex as any]
      };
      
      const result = service.validateTPNConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('FLEX[0].NAME'))).toBe(true);
      expect(result.errors.some(e => e.includes('FLEX[0].VALUE'))).toBe(true);
      expect(result.errors.some(e => e.includes('FLEX[0].ALT_VALUE'))).toBe(true);
    });
  });

  describe('exportTPNConfig', () => {
    it('should export sections to TPN config format', () => {
      const sections: Section[] = [
        {
          id: 'section1',
          name: 'Section 1',
          type: 'static',
          content: 'Updated note content',
          isExpanded: false
        },
        {
          id: 'section2',
          name: 'Section 2',
          type: 'dynamic',
          content: 'return me.getValue("test") * 2;',
          isExpanded: false
        }
      ];

      const result = service.exportTPNConfig(sections, validConfig, 'TestIngredient');
      
      expect(result.INGREDIENT[0].NOTE).toEqual([
        { TEXT: 'Updated note content' },
        { TEXT: 'return me.getValue("test") * 2;' }
      ]);
    });

    it('should create new config if none provided', () => {
      const sections: Section[] = [];
      const result = service.exportTPNConfig(sections);
      
      expect(result).toEqual({
        INGREDIENT: [],
        FLEX: []
      });
    });

    it('should not modify config if ingredient not found', () => {
      const sections: Section[] = [
        {
          id: 'section1',
          name: 'Section 1',
          type: 'static',
          content: 'New content',
          isExpanded: false
        }
      ];

      const originalNotes = [...validConfig.INGREDIENT[0].NOTE];
      const result = service.exportTPNConfig(sections, validConfig, 'NonExistentIngredient');
      
      expect(result.INGREDIENT[0].NOTE).toEqual(originalNotes);
    });
  });

  describe('importTPNConfig', () => {
    it('should import config and extract sections for specific ingredient', () => {
      const sections = service.importTPNConfig(validConfig, 'TestIngredient');
      
      expect(sections).toHaveLength(2);
      expect(sections[0].content).toBe('This is a test note');
      expect(sections[0].type).toBe('static');
      expect(sections[1].content).toBe('const value = me.getValue("test");');
      expect(sections[1].type).toBe('dynamic');
    });

    it('should import all sections when no ingredient specified', () => {
      const multiIngredientConfig: TPNConfiguration = {
        INGREDIENT: [
          validIngredient,
          {
            ...validIngredient,
            KEYNAME: 'SecondIngredient',
            NOTE: [{ TEXT: 'Second ingredient note' }]
          }
        ],
        FLEX: []
      };

      const sections = service.importTPNConfig(multiIngredientConfig);
      
      expect(sections).toHaveLength(3); // 2 from first + 1 from second
      expect(sections.some(s => s.content === 'Second ingredient note')).toBe(true);
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig = { INGREDIENT: null } as any;
      
      expect(() => service.importTPNConfig(invalidConfig)).toThrow('Invalid TPN configuration');
    });

    it('should throw error if ingredient not found', () => {
      expect(() => service.importTPNConfig(validConfig, 'NonExistent')).toThrow(
        'Ingredient NonExistent not found in configuration'
      );
    });
  });

  describe('createCompleteConfig', () => {
    it('should create complete config from ingredient sections map', () => {
      const sectionsMap = new Map<string, Section[]>();
      sectionsMap.set('TestIngredient', [
        {
          id: 'new1',
          name: 'New Section',
          type: 'static',
          content: 'New content from map',
          isExpanded: false
        }
      ]);

      const result = service.createCompleteConfig(sectionsMap, validConfig);
      
      expect(result.INGREDIENT[0].NOTE).toEqual([
        { TEXT: 'New content from map' }
      ]);
    });

    it('should handle multiple ingredients', () => {
      const multiConfig: TPNConfiguration = {
        INGREDIENT: [
          validIngredient,
          { ...validIngredient, KEYNAME: 'Second' }
        ],
        FLEX: []
      };

      const sectionsMap = new Map<string, Section[]>();
      sectionsMap.set('TestIngredient', [
        { id: '1', name: 'S1', type: 'static', content: 'First update', isExpanded: false }
      ]);
      sectionsMap.set('Second', [
        { id: '2', name: 'S2', type: 'static', content: 'Second update', isExpanded: false }
      ]);

      const result = service.createCompleteConfig(sectionsMap, multiConfig);
      
      expect(result.INGREDIENT[0].NOTE[0].TEXT).toBe('First update');
      expect(result.INGREDIENT[1].NOTE[0].TEXT).toBe('Second update');
    });
  });

  describe('utility methods', () => {
    it('should get ingredient keys', () => {
      const keys = service.getIngredientKeys(validConfig);
      expect(keys).toEqual(['TestIngredient']);
    });

    it('should get specific ingredient', () => {
      const ingredient = service.getIngredient(validConfig, 'TestIngredient');
      expect(ingredient?.KEYNAME).toBe('TestIngredient');
    });

    it('should return undefined for non-existent ingredient', () => {
      const ingredient = service.getIngredient(validConfig, 'NonExistent');
      expect(ingredient).toBeUndefined();
    });

    it('should update ingredient', () => {
      const updated = service.updateIngredient(validConfig, 'TestIngredient', {
        DISPLAY: 'Updated Display Name',
        PRECISION: 4
      });
      
      expect(updated.INGREDIENT[0].DISPLAY).toBe('Updated Display Name');
      expect(updated.INGREDIENT[0].PRECISION).toBe(4);
      expect(updated.INGREDIENT[0].MNEMONIC).toBe('TEST'); // Unchanged
    });

    it('should apply precision correctly', () => {
      expect(service.applyPrecision(3.14159, 2)).toBe(3.14);
      expect(service.applyPrecision(10.9999, 3)).toBe(11);
      expect(service.applyPrecision(5.5, 0)).toBe(6);
    });

    it('should create empty config', () => {
      const empty = service.createEmptyConfig('neo');
      expect(empty).toEqual({
        INGREDIENT: [],
        FLEX: []
      });
    });

    it('should merge configurations', () => {
      const base: TPNConfiguration = {
        INGREDIENT: [
          { ...validIngredient, KEYNAME: 'Base1' },
          { ...validIngredient, KEYNAME: 'Base2' }
        ],
        FLEX: [
          { NAME: 'BaseFlex', VALUE: '100' }
        ]
      };

      const overlay: TPNConfiguration = {
        INGREDIENT: [
          { ...validIngredient, KEYNAME: 'Base1', DISPLAY: 'Updated Base1' },
          { ...validIngredient, KEYNAME: 'New1' }
        ],
        FLEX: [
          { NAME: 'BaseFlex', VALUE: '200' },
          { NAME: 'NewFlex', VALUE: '300' }
        ]
      };

      const merged = service.mergeConfigs(base, overlay);
      
      // Check ingredients
      expect(merged.INGREDIENT).toHaveLength(3);
      expect(merged.INGREDIENT.find(i => i.KEYNAME === 'Base1')?.DISPLAY).toBe('Updated Base1');
      expect(merged.INGREDIENT.find(i => i.KEYNAME === 'Base2')).toBeDefined();
      expect(merged.INGREDIENT.find(i => i.KEYNAME === 'New1')).toBeDefined();
      
      // Check FLEX
      expect(merged.FLEX).toHaveLength(2);
      expect(merged.FLEX.find(f => f.NAME === 'BaseFlex')?.VALUE).toBe('200');
      expect(merged.FLEX.find(f => f.NAME === 'NewFlex')?.VALUE).toBe('300');
    });
  });
});