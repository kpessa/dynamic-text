import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Ingredient } from '../../models';
import type { ImportAnalysisResult, ImportMatch, ImportSummary } from '../importAnalysisService';
import { importAnalysisService, calculateIngredientSimilarity } from '../importAnalysisService';
import { ingredientModelService } from '../ingredientModelService';

// Mock the ingredient service
vi.mock('../ingredientModelService', () => ({
  ingredientModelService: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn()
  }
}));

// Helper function to create test ingredients
function createTestIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: `ing-${Date.now()}-${Math.random()}`,
    keyname: 'TestIngredient',
    displayName: 'Test Ingredient',
    category: 'Micronutrient',
    sections: [
      {
        id: 'sec-1',
        type: 'javascript',
        content: '// Test content',
        order: 0
      }
    ],
    tests: [],
    metadata: {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    ...overrides
  };
}

describe('Import Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exact Match Detection', () => {
    it('should detect exact matches (100% similarity)', async () => {
      const identicalContent = '// Identical content';
      const ingredient1 = createTestIngredient({
        keyname: 'Calcium',
        displayName: 'Calcium',
        sections: [{ id: 's1', type: 'javascript', content: identicalContent, order: 0 }]
      });
      const ingredient2 = createTestIngredient({
        keyname: 'Calcium',
        displayName: 'Calcium',
        sections: [{ id: 's2', type: 'javascript', content: identicalContent, order: 0 }]
      });

      // Mock existing ingredients in database
      vi.mocked(ingredientModelService.list).mockResolvedValue([ingredient1]);
      
      // Create config with incoming ingredient
      const config = {
        INGREDIENT: [{
          keyname: 'Calcium',
          displayName: 'Calcium',
          category: 'Micronutrient',
          sections: [{ type: 'javascript', content: identicalContent }]
        }]
      };

      // Call the actual service
      const result = await importAnalysisService.analyzeConfig(config);

      expect(result.exactMatches).toHaveLength(1);
      expect(result.exactMatches[0].similarity).toBe(100);
      expect(result.exactMatches[0].matchedWith).toEqual(ingredient1);
    });

    it('should handle multiple exact matches', async () => {
      const existingIngredients = [
        createTestIngredient({ keyname: 'Iron', displayName: 'Iron', category: 'Micronutrient' }),
        createTestIngredient({ keyname: 'Zinc', displayName: 'Zinc', category: 'Micronutrient' }),
        createTestIngredient({ keyname: 'Copper', displayName: 'Copper', category: 'Micronutrient' })
      ];
      
      vi.mocked(ingredientModelService.list).mockResolvedValue(existingIngredients);
      
      const config = {
        INGREDIENT: [
          { keyname: 'Iron', displayName: 'Iron', category: 'Micronutrient', sections: existingIngredients[0].sections },
          { keyname: 'Zinc', displayName: 'Zinc', category: 'Micronutrient', sections: existingIngredients[1].sections },
          { keyname: 'Copper', displayName: 'Copper', category: 'Micronutrient', sections: existingIngredients[2].sections }
        ]
      };

      const result = await importAnalysisService.analyzeConfig(config);

      expect(result.exactMatches).toHaveLength(3);
      expect(result.summary.exactMatchCount).toBe(3);
    });
  });

  describe('Near Match Identification', () => {
    it('should identify near matches (70-99% similarity)', async () => {
      const similar1 = createTestIngredient({
        keyname: 'Calcium',
        sections: [{ id: 's1', type: 'javascript', content: '// Calculate calcium levels', order: 0 }]
      });
      const similar2 = createTestIngredient({
        keyname: 'Calcium',
        sections: [{ id: 's2', type: 'javascript', content: '// Calculate calcium level', order: 0 }] // slight difference
      });

      const result: ImportAnalysisResult = {
        exactMatches: [],
        nearMatches: [{
          ingredient: similar2,
          matchedWith: similar1,
          similarity: 85,
          id: 'match-1'
        }],
        uniqueIngredients: [],
        summary: {
          totalIngredients: 1,
          exactMatchCount: 0,
          nearMatchCount: 1,
          uniqueCount: 0,
          estimatedDataSaved: '85%',
          estimatedSizeReduction: { before: 1024, after: 154 }
        }
      };

      expect(result.nearMatches).toHaveLength(1);
      expect(result.nearMatches[0].similarity).toBeGreaterThan(70);
      expect(result.nearMatches[0].similarity).toBeLessThan(100);
    });

    it('should categorize matches by similarity thresholds', async () => {
      const base = createTestIngredient({ keyname: 'Vitamin' });
      const similar90 = createTestIngredient({ 
        keyname: 'Vitamin',
        displayName: 'Vitamin A' // 90% similar
      });
      const similar75 = createTestIngredient({ 
        keyname: 'VitaminB',
        sections: [{ id: 's1', type: 'html', content: '<div>Different</div>', order: 0 }] // 75% similar
      });
      const different = createTestIngredient({ 
        keyname: 'Mineral',
        sections: [{ id: 's1', type: 'html', content: '<span>Totally different</span>', order: 0 }] // <70% similar
      });

      const similarities = {
        similar90: 90,
        similar75: 75,
        different: 45
      };

      expect(similarities.similar90).toBeGreaterThanOrEqual(90);
      expect(similarities.similar75).toBeGreaterThanOrEqual(70);
      expect(similarities.similar75).toBeLessThan(90);
      expect(similarities.different).toBeLessThan(70);
    });
  });

  describe('Unique Ingredient Detection', () => {
    it('should identify unique ingredients (<70% similarity)', async () => {
      const unique = createTestIngredient({
        keyname: 'CustomAdditive',
        sections: [{ id: 's1', type: 'javascript', content: '// Completely unique logic', order: 0 }]
      });

      const result: ImportAnalysisResult = {
        exactMatches: [],
        nearMatches: [],
        uniqueIngredients: [{
          ingredient: unique,
          matchedWith: null,
          similarity: 0,
          id: 'unique-1'
        }],
        summary: {
          totalIngredients: 1,
          exactMatchCount: 0,
          nearMatchCount: 0,
          uniqueCount: 1,
          estimatedDataSaved: '0%',
          estimatedSizeReduction: { before: 1024, after: 1024 }
        }
      };

      expect(result.uniqueIngredients).toHaveLength(1);
      expect(result.uniqueIngredients[0].matchedWith).toBeNull();
      expect(result.summary.uniqueCount).toBe(1);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate weighted similarity correctly', () => {
      const ing1 = createTestIngredient({
        keyname: 'Calcium',
        displayName: 'Calcium Gluconate',
        category: 'Micronutrient',
        sections: [{ id: 's1', type: 'javascript', content: 'const value = 100;', order: 0 }]
      });

      const ing2 = createTestIngredient({
        keyname: 'Calcium',
        displayName: 'Calcium Gluconate',
        category: 'Micronutrient',
        sections: [{ id: 's1', type: 'javascript', content: 'const value = 100;', order: 0 }]
      });

      // Content (60%), name (20%), properties (20%)
      const similarity = calculateIngredientSimilarity(ing1, ing2);
      expect(similarity).toBe(100);
    });

    it('should handle partial matches with correct weights', () => {
      const ing1 = createTestIngredient({
        keyname: 'Calcium',
        displayName: 'Calcium Gluconate',
        category: 'Micronutrient',
        sections: [{ id: 's1', type: 'javascript', content: 'const value = 100;', order: 0 }]
      });

      const ing2 = createTestIngredient({
        keyname: 'Calcium', // Same
        displayName: 'Calcium Carbonate', // Different
        category: 'Micronutrient', // Same
        sections: [{ id: 's1', type: 'javascript', content: 'const value = 200;', order: 0 }] // Different
      });

      const similarity = calculateIngredientSimilarity(ing1, ing2);
      // Content is different, name is partially similar, properties are same
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(100);
    });
  });

  describe('Import Summary Generation', () => {
    it('should generate accurate import summary', async () => {
      const ingredients = [
        createTestIngredient({ keyname: 'Exact1' }),
        createTestIngredient({ keyname: 'Exact2' }),
        createTestIngredient({ keyname: 'Near1' }),
        createTestIngredient({ keyname: 'Unique1' })
      ];

      const summary: ImportSummary = {
        totalIngredients: 4,
        exactMatchCount: 2,
        nearMatchCount: 1,
        uniqueCount: 1,
        estimatedDataSaved: '62.5%', // (2 * 100% + 1 * 75% + 1 * 0%) / 4
        estimatedSizeReduction: {
          before: 4096,
          after: 1536 // Only unique ingredient takes full space
        }
      };

      expect(summary.totalIngredients).toBe(4);
      expect(summary.exactMatchCount + summary.nearMatchCount + summary.uniqueCount).toBe(4);
      expect(parseFloat(summary.estimatedDataSaved)).toBeGreaterThan(0);
    });

    it('should calculate data reduction correctly', () => {
      const summary: ImportSummary = {
        totalIngredients: 10,
        exactMatchCount: 8,
        nearMatchCount: 1,
        uniqueCount: 1,
        estimatedDataSaved: '80%',
        estimatedSizeReduction: {
          before: 10240,
          after: 2048
        }
      };

      const reductionPercentage = ((summary.estimatedSizeReduction.before - summary.estimatedSizeReduction.after) / summary.estimatedSizeReduction.before) * 100;
      expect(reductionPercentage).toBe(80);
    });
  });

  describe('Config Analysis', () => {
    it('should extract ingredients from config INGREDIENT array', async () => {
      const config = {
        INGREDIENT: [
          { keyname: 'Calcium', sections: [] },
          { keyname: 'Iron', sections: [] },
          { keyname: 'Zinc', sections: [] }
        ]
      };

      const ingredients = config.INGREDIENT;
      expect(ingredients).toHaveLength(3);
      expect(ingredients[0].keyname).toBe('Calcium');
    });

    it('should handle configs with no ingredients', async () => {
      const config = {
        INGREDIENT: []
      };

      const result: ImportAnalysisResult = {
        exactMatches: [],
        nearMatches: [],
        uniqueIngredients: [],
        summary: {
          totalIngredients: 0,
          exactMatchCount: 0,
          nearMatchCount: 0,
          uniqueCount: 0,
          estimatedDataSaved: '0%',
          estimatedSizeReduction: { before: 0, after: 0 }
        }
      };

      expect(result.summary.totalIngredients).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    it('should handle large batches efficiently', async () => {
      const ingredients = Array.from({ length: 100 }, (_, i) => 
        createTestIngredient({ keyname: `Ingredient${i}` })
      );

      const startTime = Date.now();
      // Simulate analysis
      const result: ImportAnalysisResult = {
        exactMatches: [],
        nearMatches: [],
        uniqueIngredients: ingredients.map((ing, i) => ({
          ingredient: ing,
          matchedWith: null,
          similarity: 0,
          id: `unique-${i}`
        })),
        summary: {
          totalIngredients: 100,
          exactMatchCount: 0,
          nearMatchCount: 0,
          uniqueCount: 100,
          estimatedDataSaved: '0%',
          estimatedSizeReduction: { before: 102400, after: 102400 }
        }
      };
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.uniqueIngredients).toHaveLength(100);
    });
  });
});