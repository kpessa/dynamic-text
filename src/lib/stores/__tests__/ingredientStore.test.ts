import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ingredientStore } from '../ingredientStore.svelte';
import { ingredientModelService } from '../../services/ingredientModelService';
import type { Ingredient } from '../../models';

// Mock the service
vi.mock('../../services/ingredientModelService', () => ({
  ingredientModelService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    subscribe: vi.fn(),
    subscribeToList: vi.fn()
  }
}));

// Mock ingredient data
const mockIngredients: Ingredient[] = [
  {
    id: 'calcium',
    keyname: 'Calcium',
    displayName: 'Calcium Gluconate',
    category: 'Micronutrient',
    sections: [],
    tests: [],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  },
  {
    id: 'phosphate',
    keyname: 'Phosphate',
    displayName: 'Sodium Phosphate',
    category: 'Micronutrient',
    sections: [],
    tests: [],
    metadata: {
      version: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  }
];

describe('IngredientStore', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    // Reset store state
    ingredientStore.reset();
  });

  afterEach(() => {
    // Clean up subscriptions
    ingredientStore.dispose();
  });

  describe('Loading Ingredients', () => {
    it('should load ingredients from service', async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);

      await ingredientStore.loadIngredients();

      expect(ingredientModelService.list).toHaveBeenCalled();
      expect(ingredientStore.ingredients).toEqual(mockIngredients);
      expect(ingredientStore.loading).toBe(false);
      expect(ingredientStore.error).toBeNull();
    });

    it('should set loading state while fetching', async () => {
      vi.mocked(ingredientModelService.list).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockIngredients), 100))
      );

      const loadPromise = ingredientStore.loadIngredients();
      expect(ingredientStore.loading).toBe(true);

      await loadPromise;
      expect(ingredientStore.loading).toBe(false);
    });

    it('should handle loading errors', async () => {
      const error = new Error('Failed to load');
      vi.mocked(ingredientModelService.list).mockRejectedValue(error);

      await ingredientStore.loadIngredients();

      expect(ingredientStore.error).toBe('Failed to load ingredients: Failed to load');
      expect(ingredientStore.loading).toBe(false);
      expect(ingredientStore.ingredients).toEqual([]);
    });
  });

  describe('Selecting Ingredients', () => {
    it('should select ingredient by id', async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      await ingredientStore.loadIngredients();

      ingredientStore.selectIngredient('calcium');

      expect(ingredientStore.selectedId).toBe('calcium');
      expect(ingredientStore.selectedIngredient).toEqual(mockIngredients[0]);
    });

    it('should clear selection when id is null', () => {
      ingredientStore.selectIngredient('calcium');
      ingredientStore.selectIngredient(null);

      expect(ingredientStore.selectedId).toBeNull();
      expect(ingredientStore.selectedIngredient).toBeNull();
    });

    it('should return null for non-existent ingredient', async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      await ingredientStore.loadIngredients();

      ingredientStore.selectIngredient('non-existent');

      expect(ingredientStore.selectedId).toBe('non-existent');
      expect(ingredientStore.selectedIngredient).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      await ingredientStore.loadIngredients();
    });

    it('should create new ingredient', async () => {
      const newIngredient: Ingredient = {
        id: 'magnesium',
        keyname: 'Magnesium',
        displayName: 'Magnesium Sulfate',
        category: 'Micronutrient',
        sections: [],
        tests: [],
        metadata: {
          version: 1,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z'
        }
      };

      vi.mocked(ingredientModelService.create).mockResolvedValue('magnesium');
      vi.mocked(ingredientModelService.get).mockResolvedValue(newIngredient);

      const id = await ingredientStore.createIngredient(newIngredient);

      expect(id).toBe('magnesium');
      expect(ingredientModelService.create).toHaveBeenCalledWith(newIngredient);
      expect(ingredientStore.ingredients).toContainEqual(newIngredient);
    });

    it('should update existing ingredient', async () => {
      const updates = { displayName: 'Updated Calcium' };
      const updatedIngredient = { ...mockIngredients[0], ...updates };

      vi.mocked(ingredientModelService.update).mockResolvedValue(undefined);
      vi.mocked(ingredientModelService.get).mockResolvedValue(updatedIngredient);

      await ingredientStore.updateIngredient('calcium', updates);

      expect(ingredientModelService.update).toHaveBeenCalledWith('calcium', updates);
      expect(ingredientStore.ingredients[0].displayName).toBe('Updated Calcium');
    });

    it('should delete ingredient', async () => {
      vi.mocked(ingredientModelService.delete).mockResolvedValue(undefined);

      await ingredientStore.deleteIngredient('calcium');

      expect(ingredientModelService.delete).toHaveBeenCalledWith('calcium');
      expect(ingredientStore.ingredients).toHaveLength(1);
      expect(ingredientStore.ingredients[0].id).toBe('phosphate');
    });

    it('should clear selection when deleting selected ingredient', async () => {
      ingredientStore.selectIngredient('calcium');
      vi.mocked(ingredientModelService.delete).mockResolvedValue(undefined);

      await ingredientStore.deleteIngredient('calcium');

      expect(ingredientStore.selectedId).toBeNull();
      expect(ingredientStore.selectedIngredient).toBeNull();
    });
  });

  describe('Filtering and Searching', () => {
    beforeEach(async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      await ingredientStore.loadIngredients();
    });

    it('should filter by search query', () => {
      ingredientStore.setSearchQuery('calcium');

      const filtered = ingredientStore.filteredIngredients;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyname).toBe('Calcium');
    });

    it('should filter by category', () => {
      ingredientStore.setCategoryFilter('Micronutrient');

      const filtered = ingredientStore.filteredIngredients;
      expect(filtered).toHaveLength(2);
    });

    it('should apply both search and category filters', () => {
      ingredientStore.setSearchQuery('phosphate');
      ingredientStore.setCategoryFilter('Micronutrient');

      const filtered = ingredientStore.filteredIngredients;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyname).toBe('Phosphate');
    });

    it('should be case-insensitive in search', () => {
      ingredientStore.setSearchQuery('CALCIUM');

      const filtered = ingredientStore.filteredIngredients;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyname).toBe('Calcium');
    });

    it('should search in both keyname and displayName', () => {
      ingredientStore.setSearchQuery('gluconate');

      const filtered = ingredientStore.filteredIngredients;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].keyname).toBe('Calcium');
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      const unsorted: Ingredient[] = [
        {
          ...mockIngredients[1],
          displayName: 'A Phosphate',
          metadata: { ...mockIngredients[1].metadata!, updatedAt: '2024-01-03T00:00:00Z' }
        },
        {
          ...mockIngredients[0],
          displayName: 'Z Calcium',
          metadata: { ...mockIngredients[0].metadata!, updatedAt: '2024-01-01T00:00:00Z' }
        }
      ];
      vi.mocked(ingredientModelService.list).mockResolvedValue(unsorted);
      await ingredientStore.loadIngredients();
    });

    it('should sort by name', () => {
      ingredientStore.setSortBy('name');

      const sorted = ingredientStore.sortedIngredients;
      expect(sorted[0].displayName).toBe('A Phosphate');
      expect(sorted[1].displayName).toBe('Z Calcium');
    });

    it('should sort by category', () => {
      ingredientStore.setSortBy('category');

      const sorted = ingredientStore.sortedIngredients;
      // Both are Micronutrient, so should maintain stable sort
      expect(sorted).toHaveLength(2);
    });

    it('should sort by modified date', () => {
      ingredientStore.setSortBy('modified');

      const sorted = ingredientStore.sortedIngredients;
      expect(sorted[0].metadata?.updatedAt).toBe('2024-01-03T00:00:00Z');
      expect(sorted[1].metadata?.updatedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to ingredient list updates', () => {
      const unsubscribe = vi.fn();
      vi.mocked(ingredientModelService.subscribeToList).mockReturnValue(unsubscribe);

      ingredientStore.subscribeToUpdates();

      expect(ingredientModelService.subscribeToList).toHaveBeenCalled();
    });

    it('should handle real-time updates', () => {
      let callback: (ingredients: Ingredient[]) => void = () => {};
      vi.mocked(ingredientModelService.subscribeToList).mockImplementation((cb) => {
        callback = cb;
        return vi.fn();
      });

      ingredientStore.subscribeToUpdates();

      // Simulate real-time update
      const updatedIngredients = [...mockIngredients, {
        id: 'new',
        keyname: 'New',
        displayName: 'New Ingredient',
        category: 'Other',
        sections: [],
        tests: [],
        metadata: {
          version: 1,
          createdAt: '2024-01-04T00:00:00Z',
          updatedAt: '2024-01-04T00:00:00Z'
        }
      }];

      callback(updatedIngredients);

      expect(ingredientStore.ingredients).toEqual(updatedIngredients);
    });

    it('should dispose subscriptions', () => {
      const unsubscribe = vi.fn();
      vi.mocked(ingredientModelService.subscribeToList).mockReturnValue(unsubscribe);

      ingredientStore.subscribeToUpdates();
      ingredientStore.dispose();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    beforeEach(async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      await ingredientStore.loadIngredients();
    });

    it('should compute unique categories', () => {
      const categories = ingredientStore.categories;
      expect(categories).toEqual(['Micronutrient']);
    });

    it('should compute stats', () => {
      const stats = ingredientStore.stats;
      expect(stats.total).toBe(2);
      expect(stats.byCategory.Micronutrient).toBe(2);
    });

    it('should check if ingredient has variants', () => {
      const withVariants = {
        ...mockIngredients[0],
        variants: new Map([['NEO', { populationType: 'neonatal', overrides: {} }]])
      };
      
      vi.mocked(ingredientModelService.list).mockResolvedValue([withVariants]);
      ingredientStore.loadIngredients();

      expect(ingredientStore.hasVariants('calcium')).toBe(true);
      expect(ingredientStore.hasVariants('phosphate')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle create errors', async () => {
      vi.mocked(ingredientModelService.create).mockRejectedValue(new Error('Create failed'));

      await expect(ingredientStore.createIngredient(mockIngredients[0])).rejects.toThrow('Create failed');
      expect(ingredientStore.error).toBe('Failed to create ingredient: Create failed');
    });

    it('should handle update errors', async () => {
      vi.mocked(ingredientModelService.update).mockRejectedValue(new Error('Update failed'));

      await expect(ingredientStore.updateIngredient('calcium', {})).rejects.toThrow('Update failed');
      expect(ingredientStore.error).toBe('Failed to update ingredient: Update failed');
    });

    it('should handle delete errors', async () => {
      vi.mocked(ingredientModelService.delete).mockRejectedValue(new Error('Delete failed'));

      await expect(ingredientStore.deleteIngredient('calcium')).rejects.toThrow('Delete failed');
      expect(ingredientStore.error).toBe('Failed to delete ingredient: Delete failed');
    });

    it('should clear errors', () => {
      ingredientStore.setError('Some error');
      expect(ingredientStore.error).toBe('Some error');

      ingredientStore.clearError();
      expect(ingredientStore.error).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should delete multiple ingredients', async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      vi.mocked(ingredientModelService.delete).mockResolvedValue(undefined);
      await ingredientStore.loadIngredients();

      await ingredientStore.deleteMultiple(['calcium', 'phosphate']);

      expect(ingredientModelService.delete).toHaveBeenCalledTimes(2);
      expect(ingredientStore.ingredients).toEqual([]);
    });

    it('should update multiple ingredients', async () => {
      vi.mocked(ingredientModelService.list).mockResolvedValue(mockIngredients);
      vi.mocked(ingredientModelService.update).mockResolvedValue(undefined);
      vi.mocked(ingredientModelService.get).mockImplementation((id) => 
        Promise.resolve(mockIngredients.find(i => i.id === id)!)
      );
      await ingredientStore.loadIngredients();

      const updates = [
        { id: 'calcium', updates: { category: 'Updated' } },
        { id: 'phosphate', updates: { category: 'Updated' } }
      ];

      await ingredientStore.updateMultiple(updates);

      expect(ingredientModelService.update).toHaveBeenCalledTimes(2);
    });
  });
});