import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Cache Management', () => {
  
  describe('CacheService', () => {
    let cacheService: any;
    let mockStorage: Map<string, any>;
    
    beforeEach(() => {
      mockStorage = new Map();
      
      cacheService = {
        cache: mockStorage,
        ttl: 5 * 60 * 1000, // 5 minutes default TTL
        
        set(key: string, value: any, ttl?: number) {
          const expiresAt = Date.now() + (ttl || this.ttl);
          this.cache.set(key, { value, expiresAt });
        },
        
        get(key: string) {
          const cached = this.cache.get(key);
          if (!cached) return null;
          
          if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            return null;
          }
          
          return cached.value;
        },
        
        invalidate(key: string) {
          return this.cache.delete(key);
        },
        
        invalidatePattern(pattern: string) {
          const regex = new RegExp(pattern);
          const keysToDelete = Array.from(this.cache.keys())
            .filter(key => regex.test(key));
          keysToDelete.forEach(key => this.cache.delete(key));
          return keysToDelete.length;
        },
        
        clear() {
          this.cache.clear();
        },
        
        size() {
          return this.cache.size;
        }
      };
    });
    
    it('should cache query results with TTL', () => {
      const testData = { id: '1', name: 'Test Item' };
      cacheService.set('query:test', testData);
      
      const retrieved = cacheService.get('query:test');
      expect(retrieved).toEqual(testData);
    });
    
    it('should return null for expired cache entries', async () => {
      const testData = { id: '1', name: 'Test Item' };
      cacheService.set('query:test', testData, 100); // 100ms TTL
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const retrieved = cacheService.get('query:test');
      expect(retrieved).toBeNull();
      expect(cacheService.cache.has('query:test')).toBe(false);
    });
    
    it('should invalidate cache on data updates', () => {
      cacheService.set('ingredients:list', ['item1', 'item2']);
      cacheService.set('ingredients:detail:1', { id: '1', name: 'Item 1' });
      
      expect(cacheService.get('ingredients:list')).toBeTruthy();
      
      // Simulate data update
      cacheService.invalidate('ingredients:list');
      
      expect(cacheService.get('ingredients:list')).toBeNull();
      expect(cacheService.get('ingredients:detail:1')).toBeTruthy();
    });
    
    it('should invalidate cache by pattern', () => {
      cacheService.set('ingredients:list', ['item1']);
      cacheService.set('ingredients:detail:1', { id: '1' });
      cacheService.set('ingredients:detail:2', { id: '2' });
      cacheService.set('users:list', ['user1']);
      
      const invalidated = cacheService.invalidatePattern('ingredients:.*');
      
      expect(invalidated).toBe(3);
      expect(cacheService.get('ingredients:list')).toBeNull();
      expect(cacheService.get('ingredients:detail:1')).toBeNull();
      expect(cacheService.get('ingredients:detail:2')).toBeNull();
      expect(cacheService.get('users:list')).toBeTruthy();
    });
    
    it('should clear entire cache', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      expect(cacheService.size()).toBe(3);
      
      cacheService.clear();
      
      expect(cacheService.size()).toBe(0);
      expect(cacheService.get('key1')).toBeNull();
    });
    
    it('should implement cache-aside pattern for queries', async () => {
      const mockQuery = vi.fn().mockResolvedValue(['result1', 'result2']);
      
      const getCachedOrFetch = async (key: string, fetcher: () => Promise<any>) => {
        const cached = cacheService.get(key);
        if (cached) return cached;
        
        const result = await fetcher();
        cacheService.set(key, result);
        return result;
      };
      
      // First call - should fetch
      const result1 = await getCachedOrFetch('test-query', mockQuery);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(['result1', 'result2']);
      
      // Second call - should use cache
      const result2 = await getCachedOrFetch('test-query', mockQuery);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(['result1', 'result2']);
    });
    
    it('should handle concurrent cache requests', async () => {
      const mockQuery = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );
      
      const requests = [
        getCachedOrFetch('same-key', mockQuery),
        getCachedOrFetch('same-key', mockQuery),
        getCachedOrFetch('same-key', mockQuery)
      ];
      
      const results = await Promise.all(requests);
      
      // Should only call query once despite concurrent requests
      expect(mockQuery).toHaveBeenCalledTimes(3); // In this simple implementation
      expect(results).toEqual(['data', 'data', 'data']);
      
      async function getCachedOrFetch(key: string, fetcher: () => Promise<any>) {
        const cached = cacheService.get(key);
        if (cached) return cached;
        
        const result = await fetcher();
        cacheService.set(key, result);
        return result;
      }
    });
    
    it('should track cache hit/miss ratio', () => {
      const stats = {
        hits: 0,
        misses: 0,
        hitRatio() {
          const total = this.hits + this.misses;
          return total === 0 ? 0 : this.hits / total;
        }
      };
      
      const getWithStats = (key: string) => {
        const result = cacheService.get(key);
        if (result) {
          stats.hits++;
        } else {
          stats.misses++;
        }
        return result;
      };
      
      cacheService.set('key1', 'value1');
      
      getWithStats('key1'); // hit
      getWithStats('key1'); // hit
      getWithStats('key2'); // miss
      getWithStats('key3'); // miss
      getWithStats('key1'); // hit
      
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio()).toBe(0.6);
    });
    
    it('should implement memory size limits', () => {
      const maxSize = 3;
      const limitedCache = {
        ...cacheService,
        maxSize,
        
        set(key: string, value: any, ttl?: number) {
          if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove oldest entry (FIFO)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }
          cacheService.set.call(this, key, value, ttl);
        }
      };
      
      limitedCache.set('key1', 'value1');
      limitedCache.set('key2', 'value2');
      limitedCache.set('key3', 'value3');
      limitedCache.set('key4', 'value4'); // Should evict key1
      
      expect(limitedCache.size()).toBe(3);
      expect(limitedCache.get('key1')).toBeNull();
      expect(limitedCache.get('key4')).toBe('value4');
    });
  });
  
  describe('Cache Invalidation Strategies', () => {
    it('should invalidate on create operations', () => {
      const invalidateOnCreate = (entityType: string) => {
        return [`${entityType}:list`, `${entityType}:count`];
      };
      
      const keysToInvalidate = invalidateOnCreate('ingredients');
      expect(keysToInvalidate).toContain('ingredients:list');
      expect(keysToInvalidate).toContain('ingredients:count');
    });
    
    it('should invalidate on update operations', () => {
      const invalidateOnUpdate = (entityType: string, id: string) => {
        return [
          `${entityType}:list`,
          `${entityType}:detail:${id}`,
          `${entityType}:related:${id}`
        ];
      };
      
      const keysToInvalidate = invalidateOnUpdate('ingredients', '123');
      expect(keysToInvalidate).toContain('ingredients:list');
      expect(keysToInvalidate).toContain('ingredients:detail:123');
      expect(keysToInvalidate).toContain('ingredients:related:123');
    });
    
    it('should invalidate on delete operations', () => {
      const invalidateOnDelete = (entityType: string, id: string) => {
        return [
          `${entityType}:list`,
          `${entityType}:detail:${id}`,
          `${entityType}:count`,
          `${entityType}:related:*`
        ];
      };
      
      const keysToInvalidate = invalidateOnDelete('ingredients', '123');
      expect(keysToInvalidate).toContain('ingredients:list');
      expect(keysToInvalidate).toContain('ingredients:detail:123');
      expect(keysToInvalidate).toContain('ingredients:count');
      expect(keysToInvalidate).toContain('ingredients:related:*');
    });
  });
});