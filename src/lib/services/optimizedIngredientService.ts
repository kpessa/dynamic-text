/**
 * Optimized Ingredient Service with Performance Enhancements
 * 
 * This service wraps the existing ingredientModelService with:
 * - Query optimization and pagination
 * - Caching layer
 * - Performance monitoring
 * - Debounced search
 */

import { 
  collection, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { ingredientModelService } from './ingredientModelService';
import { queryOptimizer } from './QueryOptimizer';
import { createPaginationManager, type PaginationManager } from './PaginationManager';
import { ingredientCache, CacheInvalidator } from './CacheService';
import { performanceMonitor } from './PerformanceMonitor';
import type { Ingredient } from '../models';

export interface OptimizedListOptions {
  healthSystem?: string;
  category?: string;
  searchTerm?: string;
  pageSize?: number;
  useCache?: boolean;
}

export class OptimizedIngredientService {
  private paginationManager: PaginationManager<Ingredient>;
  private searchDebounceTimer: NodeJS.Timeout | null = null;
  private readonly SEARCH_DEBOUNCE_MS = 300;
  
  constructor() {
    this.paginationManager = createPaginationManager<Ingredient>({
      pageSize: 50
    });
  }
  
  /**
   * List ingredients with optimizations
   */
  async listOptimized(options: OptimizedListOptions = {}): Promise<{
    ingredients: Ingredient[];
    hasMore: boolean;
    totalLoaded: number;
  }> {
    const cacheKey = `ingredients:list:${JSON.stringify(options)}`;
    
    // Check cache if enabled
    if (options.useCache !== false) {
      const cached = ingredientCache.get(cacheKey);
      if (cached) {
        console.log('🚀 Cache hit for ingredients list');
        return cached as any;
      }
    }
    
    return performanceMonitor.measure(
      'ingredients:list',
      async () => {
        const startTime = performance.now();
        
        // Build optimized query
        const baseQuery = collection(db, 'ingredients');
        const queryOptions = {
          pageSize: options.pageSize || 50,
          orderByField: 'createdAt',
          orderDirection: 'desc' as const,
          filters: {} as Record<string, any>
        };
        
        if (options.healthSystem) {
          queryOptions.filters.healthSystem = options.healthSystem;
        }
        
        if (options.category) {
          queryOptions.filters.category = options.category;
        }
        
        const optimized = queryOptimizer.optimizeQuery(baseQuery as any, queryOptions);
        
        // Execute query
        const snapshot = await getDocs(optimized.query);
        const ingredients: Ingredient[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          
          // Convert variants object back to Map
          if (data.variants && typeof data.variants === 'object') {
            data.variants = new Map(Object.entries(data.variants));
          }
          
          // Apply search filter if provided
          if (options.searchTerm) {
            const term = options.searchTerm.toLowerCase();
            if (
              data.displayName?.toLowerCase().includes(term) ||
              data.keyname?.toLowerCase().includes(term)
            ) {
              ingredients.push(data as Ingredient);
            }
          } else {
            ingredients.push(data as Ingredient);
          }
        });
        
        const result = {
          ingredients,
          hasMore: ingredients.length === queryOptions.pageSize,
          totalLoaded: ingredients.length
        };
        
        // Cache result
        if (options.useCache !== false) {
          ingredientCache.set(cacheKey, result);
        }
        
        // Log performance
        queryOptimizer.logQueryMetrics(
          'ingredients:list',
          startTime,
          ingredients.length
        );
        
        return result;
      },
      { 
        healthSystem: options.healthSystem,
        category: options.category,
        searchTerm: options.searchTerm,
        pageSize: options.pageSize
      }
    );
  }
  
  /**
   * Load paginated ingredients
   */
  async loadPage(
    pageNum: number,
    options: OptimizedListOptions = {}
  ): Promise<Ingredient[]> {
    return this.paginationManager.loadPage(
      pageNum,
      async (lastDoc) => {
        const baseQuery = collection(db, 'ingredients');
        const constraints = [];
        
        if (options.healthSystem) {
          constraints.push(where('healthSystem', '==', options.healthSystem));
        }
        
        if (options.category) {
          constraints.push(where('category', '==', options.category));
        }
        
        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(options.pageSize || 50));
        
        if (lastDoc) {
          constraints.push(startAfter(lastDoc));
        }
        
        const q = query(baseQuery, ...constraints);
        const snapshot = await getDocs(q);
        
        const data: Ingredient[] = [];
        let lastDocument: DocumentSnapshot | null = null;
        
        snapshot.forEach(doc => {
          const docData = doc.data();
          
          // Convert variants
          if (docData.variants && typeof docData.variants === 'object') {
            docData.variants = new Map(Object.entries(docData.variants));
          }
          
          data.push(docData as Ingredient);
          lastDocument = doc;
        });
        
        return {
          data,
          lastDoc: lastDocument,
          hasMore: data.length === (options.pageSize || 50)
        };
      }
    );
  }
  
  /**
   * Load next page for infinite scroll
   */
  async loadNextPage(options: OptimizedListOptions = {}): Promise<Ingredient[]> {
    return performanceMonitor.measure(
      'ingredients:nextPage',
      () => this.paginationManager.appendNextPage(
        async (lastDoc) => {
          const baseQuery = collection(db, 'ingredients');
          const constraints = [];
          
          if (options.healthSystem) {
            constraints.push(where('healthSystem', '==', options.healthSystem));
          }
          
          if (options.category) {
            constraints.push(where('category', '==', options.category));
          }
          
          constraints.push(orderBy('createdAt', 'desc'));
          constraints.push(limit(options.pageSize || 50));
          
          if (lastDoc) {
            constraints.push(startAfter(lastDoc));
          }
          
          const q = query(baseQuery, ...constraints);
          const snapshot = await getDocs(q);
          
          const data: Ingredient[] = [];
          let lastDocument: DocumentSnapshot | null = null;
          
          snapshot.forEach(doc => {
            const docData = doc.data();
            
            // Convert variants
            if (docData.variants && typeof docData.variants === 'object') {
              docData.variants = new Map(Object.entries(docData.variants));
            }
            
            data.push(docData as Ingredient);
            lastDocument = doc;
          });
          
          return {
            data,
            lastDoc: lastDocument,
            hasMore: data.length === (options.pageSize || 50)
          };
        }
      ),
      { pageSize: options.pageSize }
    );
  }
  
  /**
   * Search with debouncing
   */
  async searchDebounced(
    searchTerm: string,
    options: OptimizedListOptions = {}
  ): Promise<Ingredient[]> {
    return new Promise((resolve) => {
      // Clear existing timer
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      
      // Set new timer
      this.searchDebounceTimer = setTimeout(async () => {
        const result = await this.search(searchTerm, options);
        resolve(result);
      }, this.SEARCH_DEBOUNCE_MS);
    });
  }
  
  /**
   * Immediate search (no debounce)
   */
  async search(
    searchTerm: string,
    options: OptimizedListOptions = {}
  ): Promise<Ingredient[]> {
    const cacheKey = `ingredients:search:${searchTerm}:${JSON.stringify(options)}`;
    
    // Check cache
    const cached = ingredientCache.get(cacheKey);
    if (cached) {
      console.log('🚀 Cache hit for search');
      return cached as Ingredient[];
    }
    
    return performanceMonitor.measure(
      'ingredients:search',
      async () => {
        const result = await this.listOptimized({
          ...options,
          searchTerm,
          useCache: false // Don't double-cache
        });
        
        // Cache search results
        ingredientCache.set(cacheKey, result.ingredients, 60000); // 1 minute cache for search
        
        return result.ingredients;
      },
      { searchTerm, ...options }
    );
  }
  
  /**
   * Create ingredient with cache invalidation
   */
  async create(ingredient: Ingredient): Promise<string> {
    const id = await performanceMonitor.measure(
      'ingredients:create',
      () => ingredientModelService.create(ingredient),
      { keyname: ingredient.keyname }
    );
    
    // Invalidate relevant caches
    const keysToInvalidate = CacheInvalidator.onCreateKeys('ingredients');
    keysToInvalidate.forEach(pattern => {
      ingredientCache.invalidatePattern(pattern);
    });
    
    // Reset pagination
    this.paginationManager.reset();
    
    return id;
  }
  
  /**
   * Update ingredient with cache invalidation
   */
  async update(id: string, updates: Partial<Ingredient>): Promise<void> {
    await performanceMonitor.measure(
      'ingredients:update',
      () => ingredientModelService.update(id, updates),
      { id }
    );
    
    // Invalidate relevant caches
    const keysToInvalidate = CacheInvalidator.onUpdateKeys('ingredients', id);
    keysToInvalidate.forEach(pattern => {
      ingredientCache.invalidatePattern(pattern);
    });
    
    // Reset pagination
    this.paginationManager.reset();
  }
  
  /**
   * Delete ingredient with cache invalidation
   */
  async delete(id: string): Promise<void> {
    await performanceMonitor.measure(
      'ingredients:delete',
      () => ingredientModelService.delete(id),
      { id }
    );
    
    // Invalidate relevant caches
    const keysToInvalidate = CacheInvalidator.onDeleteKeys('ingredients', id);
    keysToInvalidate.forEach(pattern => {
      ingredientCache.invalidatePattern(pattern);
    });
    
    // Reset pagination
    this.paginationManager.reset();
  }
  
  /**
   * Get ingredient by ID with caching
   */
  async get(id: string): Promise<Ingredient | null> {
    const cacheKey = `ingredients:detail:${id}`;
    
    return ingredientCache.getOrFetch(
      cacheKey,
      () => performanceMonitor.measure(
        'ingredients:get',
        () => ingredientModelService.get(id),
        { id }
      )
    );
  }
  
  /**
   * Get pagination state
   */
  getPaginationState() {
    return this.paginationManager.getState();
  }
  
  /**
   * Reset pagination
   */
  resetPagination(): void {
    this.paginationManager.reset();
  }
  
  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.paginationManager.isLoading();
  }
  
  /**
   * Check if more pages available
   */
  hasMore(): boolean {
    return this.paginationManager.hasMorePages();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return ingredientCache.getStats();
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    ingredientCache.clear();
    this.paginationManager.reset();
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport() {
    return {
      list: performanceMonitor.generateReport('ingredients:list'),
      search: performanceMonitor.generateReport('ingredients:search'),
      create: performanceMonitor.generateReport('ingredients:create'),
      update: performanceMonitor.generateReport('ingredients:update'),
      delete: performanceMonitor.generateReport('ingredients:delete'),
      get: performanceMonitor.generateReport('ingredients:get'),
      nextPage: performanceMonitor.generateReport('ingredients:nextPage')
    };
  }
  
  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    performanceMonitor.logSummary();
  }
}

// Export singleton instance
export const optimizedIngredientService = new OptimizedIngredientService();

// Export for backward compatibility
export default optimizedIngredientService;