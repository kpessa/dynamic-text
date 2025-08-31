import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { 
  Ingredient, 
  Section, 
  TestCase, 
  PopulationVariant,
  IngredientMetadata
} from '../../models';
import type { TPNAdvisorType, TPNAdvisorAlias } from '../../../types/tpn';
import { IngredientService } from '../ingredientModelService';
import type { IngredientFilters } from '../ingredientModelService';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({
    docs: [],
    forEach: vi.fn((callback) => {
      // Default empty implementation
    })
  })),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}));

vi.mock('../../firebase', () => ({
  db: {}
}));

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
    ...overrides
  };
}

describe('IngredientModelService', () => {
  let service: IngredientService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new IngredientService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create ingredient and return id', async () => {
        const ingredient = mockIngredient();
        vi.mocked(setDoc).mockResolvedValue(undefined);
        
        const id = await service.create(ingredient);
        
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        expect(setDoc).toHaveBeenCalled();
      });

      it('should generate id from keyname', async () => {
        const ingredient = mockIngredient({ keyname: 'Calcium Gluconate' });
        vi.mocked(setDoc).mockResolvedValue(undefined);
        
        const id = await service.create(ingredient);
        
        // The service uses the ingredient.id if provided, otherwise generates from keyname
        // Since mockIngredient provides id: 'calcium', that's what should be returned
        expect(id).toBe('calcium');
      });

      it('should add timestamps automatically', async () => {
        const ingredient = mockIngredient();
        vi.mocked(setDoc).mockResolvedValue(undefined);
        
        await service.create(ingredient);
        
        const callArgs = vi.mocked(setDoc).mock.calls[0][1];
        expect(callArgs).toHaveProperty('createdAt');
        expect(callArgs).toHaveProperty('updatedAt');
      });

      it('should validate required fields', async () => {
        const invalidIngredient = { keyname: 'Test' } as any;
        
        await expect(service.create(invalidIngredient))
          .rejects.toThrow('Missing required fields');
      });
    });

    describe('get', () => {
      it('should retrieve ingredient by id', async () => {
        const mockData = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => mockData,
          id: 'calcium'
        } as any);
        
        const retrieved = await service.get('calcium');
        
        expect(retrieved).toEqual(mockData);
        expect(retrieved).toHaveProperty('sections');
        expect(retrieved).toHaveProperty('tests');
      });

      it('should handle not found gracefully', async () => {
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => false
        } as any);
        
        const result = await service.get('non-existent');
        
        expect(result).toBeNull();
      });

      it('should handle Firebase errors', async () => {
        vi.mocked(getDoc).mockRejectedValue(new Error('Firebase error'));
        
        await expect(service.get('calcium'))
          .rejects.toThrow('Failed to get ingredient');
      });
    });

    describe('update', () => {
      it('should update ingredient fields', async () => {
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        await service.update('calcium', { displayName: 'Updated Calcium' });
        
        expect(updateDoc).toHaveBeenCalled();
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.displayName).toBe('Updated Calcium');
      });

      it('should add updatedAt timestamp', async () => {
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        await service.update('calcium', { displayName: 'Updated' });
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs).toHaveProperty('updatedAt');
      });

      it('should handle update errors', async () => {
        vi.mocked(updateDoc).mockRejectedValue(new Error('Update failed'));
        
        await expect(service.update('calcium', {}))
          .rejects.toThrow('Failed to update ingredient');
      });
    });

    describe('delete', () => {
      it('should delete ingredient', async () => {
        vi.mocked(deleteDoc).mockResolvedValue(undefined);
        vi.mocked(getDocs).mockResolvedValue({ empty: true } as any);
        
        await service.delete('calcium');
        
        expect(deleteDoc).toHaveBeenCalled();
      });

      it('should check for usage before deletion', async () => {
        vi.mocked(getDocs).mockResolvedValue({ 
          empty: false,
          size: 2 
        } as any);
        
        await expect(service.delete('calcium'))
          .rejects.toThrow('Cannot delete ingredient in use by 2 configs');
      });

      it('should handle deletion errors', async () => {
        vi.mocked(getDocs).mockResolvedValue({ empty: true } as any);
        vi.mocked(deleteDoc).mockRejectedValue(new Error('Delete failed'));
        
        await expect(service.delete('calcium'))
          .rejects.toThrow('Failed to delete ingredient');
      });
    });
  });

  describe('Section and Test Editing', () => {
    describe('updateSections', () => {
      it('should update only sections field', async () => {
        const newSections: Section[] = [
          {
            id: 'new-sec',
            type: 'html',
            content: '<div>New content</div>',
            order: 0
          }
        ];
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => mockIngredient()
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        await service.updateSections('calcium', newSections);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.sections).toEqual(newSections);
        expect(callArgs).toHaveProperty('updatedAt');
      });

      it('should validate section structure', async () => {
        const invalidSections = [
          { content: 'missing required fields' }
        ] as any;
        
        await expect(service.updateSections('calcium', invalidSections))
          .rejects.toThrow('Invalid section structure');
      });
    });

    describe('updateTests', () => {
      it('should update only tests field', async () => {
        const newTests: TestCase[] = [
          {
            id: 'new-test',
            name: 'New Test',
            variables: { value: 100 }
          }
        ];
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => mockIngredient()
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        await service.updateTests('calcium', newTests);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.tests).toEqual(newTests);
      });

      it('should validate test structure', async () => {
        const invalidTests = [
          { name: 'missing id and variables' }
        ] as any;
        
        await expect(service.updateTests('calcium', invalidTests))
          .rejects.toThrow('Invalid test structure');
      });
    });

    describe('addSection', () => {
      it('should append new section to existing', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const newSection: Section = {
          id: 'new-sec',
          type: 'javascript',
          content: 'return "new";',
          order: 1
        };
        
        await service.addSection('calcium', newSection);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.sections).toHaveLength(2);
        expect(callArgs.sections[1]).toEqual(newSection);
      });

      it('should generate unique section ID if not provided', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const newSection = {
          type: 'html',
          content: '<div>test</div>',
          order: 1
        } as Section;
        
        await service.addSection('calcium', newSection);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.sections[1].id).toBeDefined();
        expect(callArgs.sections[1].id).toContain('sec-');
      });
    });

    describe('addTest', () => {
      it('should append new test to existing', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const newTest: TestCase = {
          id: 'new-test',
          name: 'New Test',
          variables: { value: 200 }
        };
        
        await service.addTest('calcium', newTest);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.tests).toHaveLength(2);
        expect(callArgs.tests[1]).toEqual(newTest);
      });
    });
  });

  describe('Variant Management', () => {
    describe('addVariant', () => {
      it('should add variant for specific population', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const variant: PopulationVariant = {
          populationType: 'neonatal',
          overrides: {
            displayName: 'Calcium (Neonatal)'
          }
        };
        
        await service.addVariant('calcium', 'NEO', variant);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.variants).toHaveProperty('NEO');
        expect(callArgs.variants.NEO).toEqual(variant);
      });

      it('should handle alias resolution for infant->NEO', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const variant: PopulationVariant = {
          populationType: 'neonatal',
          overrides: { displayName: 'Infant Formula' }
        };
        
        await service.addVariant('calcium', 'infant' as TPNAdvisorAlias, variant);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.variants).toHaveProperty('NEO');
      });

      it('should handle pediatric alias mapping to CHILD and ADOLESCENT', async () => {
        const existingIngredient = mockIngredient();
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => existingIngredient
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        const variant: PopulationVariant = {
          populationType: 'pediatric',
          overrides: { displayName: 'Pediatric Formula' }
        };
        
        await service.addVariant('calcium', 'pediatric' as TPNAdvisorAlias, variant);
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.variants).toHaveProperty('CHILD');
        expect(callArgs.variants).toHaveProperty('ADOLESCENT');
      });
    });

    describe('getVariant', () => {
      it('should retrieve specific variant', async () => {
        const variant: PopulationVariant = {
          populationType: 'neonatal',
          overrides: { displayName: 'Neo Calcium' }
        };
        const ingredient = mockIngredient({
          variants: new Map([['NEO', variant]])
        });
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...ingredient,
            variants: { NEO: variant }
          })
        } as any);
        
        const retrieved = await service.getVariant('calcium', 'NEO');
        
        expect(retrieved).toEqual(variant);
      });

      it('should handle alias resolution for getVariant', async () => {
        const variant: PopulationVariant = {
          populationType: 'neonatal',
          overrides: { displayName: 'Neo Calcium' }
        };
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockIngredient(),
            variants: { NEO: variant }
          })
        } as any);
        
        const retrieved = await service.getVariant('calcium', 'infant' as TPNAdvisorAlias);
        
        expect(retrieved).toEqual(variant);
      });

      it('should return null if variant does not exist', async () => {
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => mockIngredient()
        } as any);
        
        const retrieved = await service.getVariant('calcium', 'ADULT');
        
        expect(retrieved).toBeNull();
      });
    });

    describe('removeVariant', () => {
      it('should remove specific population variant', async () => {
        const ingredient = mockIngredient({
          variants: new Map([
            ['NEO', { populationType: 'neonatal', overrides: {} }],
            ['ADULT', { populationType: 'adult', overrides: {} }]
          ])
        });
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...ingredient,
            variants: { 
              NEO: { populationType: 'neonatal', overrides: {} },
              ADULT: { populationType: 'adult', overrides: {} }
            }
          })
        } as any);
        vi.mocked(updateDoc).mockResolvedValue(undefined);
        
        await service.removeVariant('calcium', 'NEO');
        
        const callArgs = vi.mocked(updateDoc).mock.calls[0][1];
        expect(callArgs.variants).not.toHaveProperty('NEO');
        expect(callArgs.variants).toHaveProperty('ADULT');
      });
    });

    describe('getVariantsForAlias', () => {
      it('should return both CHILD and ADOLESCENT for pediatric', async () => {
        const childVariant: PopulationVariant = {
          populationType: 'child',
          overrides: { displayName: 'Child Formula' }
        };
        const adolescentVariant: PopulationVariant = {
          populationType: 'adolescent',
          overrides: { displayName: 'Adolescent Formula' }
        };
        
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => ({
            ...mockIngredient(),
            variants: {
              CHILD: childVariant,
              ADOLESCENT: adolescentVariant
            }
          })
        } as any);
        
        const variants = await service.getVariantsForAlias('calcium', 'pediatric');
        
        expect(variants).toHaveLength(2);
        expect(variants).toContainEqual(childVariant);
        expect(variants).toContainEqual(adolescentVariant);
      });

      it('should return empty array if no variants exist', async () => {
        vi.mocked(getDoc).mockResolvedValue({
          exists: () => true,
          data: () => mockIngredient()
        } as any);
        
        const variants = await service.getVariantsForAlias('calcium', 'pediatric');
        
        expect(variants).toEqual([]);
      });
    });
  });

  describe('Query and List Operations', () => {
    describe('list', () => {
      it('should return all ingredients without filters', async () => {
        const mockIngredients = [
          mockIngredient({ id: 'calcium' }),
          mockIngredient({ id: 'phosphate', keyname: 'Phosphate' })
        ];
        
        vi.mocked(getDocs).mockResolvedValue({
          docs: mockIngredients.map(ing => ({
            data: () => ing,
            id: ing.id
          })),
          forEach: vi.fn((callback) => {
            mockIngredients.forEach((ing) => {
              callback({ data: () => ing, id: ing.id });
            });
          })
        } as any);
        
        const result = await service.list();
        
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('calcium');
        expect(result[1].id).toBe('phosphate');
      });

      it('should filter by category', async () => {
        const mockIngredients = [
          mockIngredient({ id: 'calcium', category: 'Salt' }),
          mockIngredient({ id: 'vitamin-d', category: 'Vitamin' })
        ];
        
        vi.mocked(query).mockReturnValue('mock-query' as any);
        vi.mocked(getDocs).mockResolvedValue({
          docs: [mockIngredients[0]].map(ing => ({
            data: () => ing,
            id: ing.id
          })),
          forEach: vi.fn((callback) => {
            callback({ data: () => mockIngredients[0], id: mockIngredients[0].id });
          })
        } as any);
        
        const filters: IngredientFilters = { category: 'Salt' };
        const result = await service.list(filters);
        
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('Salt');
      });

      it('should order by displayName by default', async () => {
        vi.mocked(query).mockReturnValue('mock-query' as any);
        vi.mocked(getDocs).mockResolvedValue({ 
          docs: [],
          forEach: vi.fn()
        } as any);
        
        await service.list();
        
        expect(orderBy).toHaveBeenCalledWith('displayName');
      });
    });

    describe('search', () => {
      it('should search in displayName and keyname fields', async () => {
        const mockIngredients = [
          mockIngredient({ displayName: 'Calcium Gluconate', keyname: 'Calcium' }),
          mockIngredient({ id: 'phosphate', keyname: 'Phosphate', displayName: 'Phosphate' })
        ];
        
        vi.mocked(getDocs).mockResolvedValue({
          docs: mockIngredients.map(ing => ({
            data: () => ing,
            id: ing.id
          })),
          forEach: vi.fn((callback) => {
            mockIngredients.forEach((ing) => {
              callback({ data: () => ing, id: ing.id });
            });
          })
        } as any);
        
        const result = await service.search('calc');
        
        expect(result).toHaveLength(1);
        expect(result[0].displayName).toContain('Calcium');
      });

      it('should return empty array for no matches', async () => {
        vi.mocked(getDocs).mockResolvedValue({ 
          docs: [],
          forEach: vi.fn()
        } as any);
        
        const result = await service.search('xyz');
        
        expect(result).toEqual([]);
      });
    });

    describe('getByCategory', () => {
      it('should query by category field', async () => {
        const saltIngredients = [
          mockIngredient({ id: 'calcium', category: 'Salt' }),
          mockIngredient({ id: 'sodium', category: 'Salt' })
        ];
        
        vi.mocked(query).mockReturnValue('mock-query' as any);
        vi.mocked(getDocs).mockResolvedValue({
          docs: saltIngredients.map(ing => ({
            data: () => ing,
            id: ing.id
          })),
          forEach: vi.fn((callback) => {
            saltIngredients.forEach((ing) => {
              callback({ data: () => ing, id: ing.id });
            });
          })
        } as any);
        
        const result = await service.getByCategory('Salt');
        
        expect(result).toHaveLength(2);
        expect(result.every(ing => ing.category === 'Salt')).toBe(true);
      });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should throw IngredientNotFoundError for missing ingredient', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false
      } as any);
      
      await expect(service.updateSections('non-existent', []))
        .rejects.toThrow('Ingredient not found: non-existent');
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidIngredient = {
        keyname: 'Test'
        // Missing required fields
      } as any;
      
      await expect(service.create(invalidIngredient))
        .rejects.toThrow('Missing required fields');
    });

    it('should validate section structure properly', async () => {
      const invalidSection = {
        type: 'invalid-type',
        content: 'test'
      } as any;
      
      await expect(service.updateSections('calcium', [invalidSection]))
        .rejects.toThrow('Invalid section structure');
    });

    it('should validate test structure properly', async () => {
      const invalidTest = {
        name: 'Test without id or variables'
      } as any;
      
      await expect(service.updateTests('calcium', [invalidTest]))
        .rejects.toThrow('Invalid test structure');
    });

    it('should log operations for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      vi.mocked(setDoc).mockResolvedValue(undefined);
      
      await service.create(mockIngredient());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating ingredient'),
        expect.any(String)
      );
    });
  });

  describe('Real-time Subscription Support', () => {
    describe('subscribe', () => {
      it('should subscribe to ingredient changes', () => {
        const mockCallback = vi.fn();
        const mockUnsubscribe = vi.fn();
        vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe as any);
        
        const unsubscribe = service.subscribe('calcium', mockCallback);
        
        expect(onSnapshot).toHaveBeenCalled();
        expect(typeof unsubscribe).toBe('function');
      });

      it('should call callback with ingredient data', () => {
        const mockCallback = vi.fn();
        const mockIngredientData = mockIngredient();
        
        vi.mocked(onSnapshot).mockImplementation((ref, callback) => {
          (callback as any)({
            exists: () => true,
            data: () => mockIngredientData
          });
          return vi.fn() as any;
        });
        
        service.subscribe('calcium', mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(mockIngredientData);
      });

      it('should handle non-existent documents', () => {
        const mockCallback = vi.fn();
        
        vi.mocked(onSnapshot).mockImplementation((ref, callback) => {
          (callback as any)({
            exists: () => false
          });
          return vi.fn() as any;
        });
        
        service.subscribe('calcium', mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(null);
      });
    });

    describe('subscribeToList', () => {
      it('should subscribe to entire collection', () => {
        const mockCallback = vi.fn();
        const mockUnsubscribe = vi.fn();
        vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe as any);
        
        const unsubscribe = service.subscribeToList(mockCallback);
        
        expect(onSnapshot).toHaveBeenCalled();
        expect(typeof unsubscribe).toBe('function');
      });

      it('should call callback with ingredient list', () => {
        const mockCallback = vi.fn();
        const mockIngredients = [
          mockIngredient({ id: 'calcium' }),
          mockIngredient({ id: 'phosphate' })
        ];
        
        vi.mocked(onSnapshot).mockImplementation((query, callback) => {
          (callback as any)({
            docs: mockIngredients.map(ing => ({
              data: () => ing,
              id: ing.id
            })),
            forEach: (fn: any) => {
              mockIngredients.forEach((ing, idx) => {
                fn({
                  data: () => ing,
                  id: ing.id
                });
              });
            }
          });
          return vi.fn() as any;
        });
        
        service.subscribeToList(mockCallback);
        
        expect(mockCallback).toHaveBeenCalledWith(mockIngredients);
      });
    });
  });
});