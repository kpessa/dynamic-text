/**
 * Ingredient Store
 * 
 * State management for ingredients using Svelte 5 runes.
 * Handles loading, selection, and CRUD operations.
 */

import type { Ingredient } from '../models';
import { ingredientModelService } from '../services/ingredientModelService';

class IngredientStore {
  // Private state with runes
  private _ingredients = $state<Ingredient[]>([]);
  private _selectedId = $state<string | null>(null);
  private _loading = $state(false);
  private _error = $state<string | null>(null);
  private _searchQuery = $state('');
  private _categoryFilter = $state<string | null>(null);
  private _sortBy = $state<'name' | 'category' | 'modified'>('name');

  // Public getters for reactive access
  get ingredients() { 
    return this._ingredients; 
  }

  get selectedId() {
    return this._selectedId;
  }

  get loading() {
    return this._loading;
  }

  get error() {
    return this._error;
  }

  get searchQuery() {
    return this._searchQuery;
  }

  get categoryFilter() {
    return this._categoryFilter;
  }

  get sortBy() {
    return this._sortBy;
  }

  // Derived values with $derived
  get selectedIngredient() {
    return $derived(() => 
      this._ingredients.find(i => i.id === this._selectedId) || null
    );
  }

  get filteredIngredients() {
    return $derived(() => {
      let filtered = this._ingredients;

      // Apply search filter
      if (this._searchQuery) {
        const query = this._searchQuery.toLowerCase();
        filtered = filtered.filter(ing => 
          ing.displayName?.toLowerCase().includes(query) ||
          ing.keyname.toLowerCase().includes(query)
        );
      }

      // Apply category filter
      if (this._categoryFilter) {
        filtered = filtered.filter(ing => ing.category === this._categoryFilter);
      }

      // Apply sorting
      return filtered.sort((a, b) => {
        switch (this._sortBy) {
          case 'category':
            return (a.category || '').localeCompare(b.category || '');
          case 'modified':
            return (b.metadata?.updatedAt || '').localeCompare(a.metadata?.updatedAt || '');
          case 'name':
          default:
            return (a.displayName || a.keyname).localeCompare(b.displayName || b.keyname);
        }
      });
    });
  }

  get categories() {
    return $derived(() => {
      const cats = new Set<string>();
      this._ingredients.forEach(ing => {
        if (ing.category) cats.add(ing.category);
      });
      return Array.from(cats).sort();
    });
  }

  get ingredientStats() {
    return $derived(() => ({
      total: this._ingredients.length,
      filtered: this.filteredIngredients.length,
      categories: this.categories.length
    }));
  }

  // Methods for state mutation
  setSearchQuery(query: string) {
    this._searchQuery = query;
  }

  setCategoryFilter(category: string | null) {
    this._categoryFilter = category;
  }

  setSortBy(sort: 'name' | 'category' | 'modified') {
    this._sortBy = sort;
  }

  selectIngredient(id: string | null) {
    this._selectedId = id;
  }

  clearFilters() {
    this._searchQuery = '';
    this._categoryFilter = null;
  }

  // Async operations
  async loadIngredients() {
    this._loading = true;
    this._error = null;
    
    try {
      this._ingredients = await ingredientModelService.list();
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to load ingredients';
      console.error('Failed to load ingredients:', error);
    } finally {
      this._loading = false;
    }
  }

  async createIngredient(ingredient: Ingredient) {
    this._loading = true;
    this._error = null;
    
    try {
      const id = await ingredientModelService.create(ingredient);
      ingredient.id = id;
      
      // Optimistic update
      this._ingredients = [...this._ingredients, ingredient];
      this._selectedId = id;
      
      return id;
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to create ingredient';
      throw error;
    } finally {
      this._loading = false;
    }
  }

  async updateIngredient(id: string, updates: Partial<Ingredient>) {
    this._loading = true;
    this._error = null;
    
    try {
      await ingredientModelService.update(id, updates);
      
      // Optimistic update
      this._ingredients = this._ingredients.map(ing =>
        ing.id === id ? { ...ing, ...updates } : ing
      );
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to update ingredient';
      throw error;
    } finally {
      this._loading = false;
    }
  }

  async deleteIngredient(id: string) {
    this._loading = true;
    this._error = null;
    
    try {
      await ingredientModelService.delete(id);
      
      // Optimistic update
      this._ingredients = this._ingredients.filter(ing => ing.id !== id);
      
      // Clear selection if deleted
      if (this._selectedId === id) {
        this._selectedId = null;
      }
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Failed to delete ingredient';
      throw error;
    } finally {
      this._loading = false;
    }
  }

  // Subscribe to real-time updates
  subscribeToUpdates() {
    return ingredientModelService.subscribeToList((ingredients) => {
      this._ingredients = ingredients;
    });
  }

  // Reset store
  reset() {
    this._ingredients = [];
    this._selectedId = null;
    this._loading = false;
    this._error = null;
    this._searchQuery = '';
    this._categoryFilter = null;
    this._sortBy = 'name';
  }
}

// Export singleton instance
export const ingredientStore = new IngredientStore();